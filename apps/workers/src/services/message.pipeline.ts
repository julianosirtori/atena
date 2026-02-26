import { db } from '@atena/database'
import { tenants, leads, conversations, messages } from '@atena/database'
import { eq, and, desc } from 'drizzle-orm'
import { MockAdapter, ZApiAdapter, MetaWhatsAppAdapter } from '@atena/channels'
import type { ChannelAdapter } from '@atena/channels'
import type { TenantForPrompt, LeadForPrompt, MessageForPrompt, HandoffDecision } from '@atena/shared'
import { withRetry, CircuitBreakerOpenError } from '@atena/shared'
import type { Queue } from 'bullmq'
import { sanitizeInput } from './prompt.guard.js'
import { buildSystemPrompt, buildUserPrompt } from './prompt.builder.js'
import { parseAIResponse } from './response.parser.js'
import { validateResponse } from './response.validator.js'
import { updateScore, shouldAutoHandoff } from './scoring.service.js'
import { logSanitizationIncident, logValidationIncident, logAIFailureIncident } from './security-incident.service.js'
import { classifyAIError } from '../lib/ai-error.classifier.js'
import { triggerHandoff } from './handoff.service.js'
import type { AIService } from './ai.service.js'
import { logger } from '../lib/logger.js'

export interface ProcessMessageJob {
  tenantId: string
  leadId: string
  conversationId: string
  messageId: string
  correlationId?: string
}

const GENERIC_FALLBACK_MSG =
  'Desculpe, estou com dificuldades no momento. Vou te conectar com um de nossos consultores.'

function resolveChannelAdapter(tenant: {
  whatsappProvider: string | null
  whatsappConfig: unknown
}): ChannelAdapter {
  const config = tenant.whatsappConfig as Record<string, string> | null
  const instanceId = config?.instanceId

  if (!instanceId || instanceId === 'mock') {
    return new MockAdapter()
  }

  if (tenant.whatsappProvider === 'meta_cloud' && config) {
    return new MetaWhatsAppAdapter({
      token: config.token || '',
      phoneNumberId: config.phoneNumberId || '',
      appSecret: config.appSecret || '',
      verifyToken: config.verifyToken || '',
    })
  }

  // Default to Z-API
  if (config) {
    return new ZApiAdapter({
      instanceId: config.instanceId || '',
      token: config.token || '',
      webhookSecret: config.webhookSecret || '',
    })
  }

  return new MockAdapter()
}

function toTenantForPrompt(tenant: typeof tenants.$inferSelect): TenantForPrompt {
  return {
    businessName: tenant.businessName,
    businessDescription: tenant.businessDescription,
    productsInfo: tenant.productsInfo,
    pricingInfo: tenant.pricingInfo,
    faq: tenant.faq,
    businessHours: tenant.businessHours,
    paymentMethods: tenant.paymentMethods,
    customInstructions: tenant.customInstructions,
    handoffRules: tenant.handoffRules,
  }
}

function toLeadForPrompt(lead: typeof leads.$inferSelect): LeadForPrompt {
  return {
    name: lead.name,
    phone: lead.phone,
    score: lead.score,
    stage: lead.stage,
    channel: lead.channel,
    tags: lead.tags,
  }
}

export async function processMessage(
  job: ProcessMessageJob,
  aiService: AIService,
  notificationQueue?: Queue,
): Promise<void> {
  const log = logger.child({ tenantId: job.tenantId, leadId: job.leadId, conversationId: job.conversationId, correlationId: job.correlationId })

  // 1. Load entities
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, job.tenantId))
    .limit(1)

  if (!tenant) {
    log.error('Tenant not found, skipping job')
    return
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, job.leadId), eq(leads.tenantId, job.tenantId)))
    .limit(1)

  if (!lead) {
    log.error('Lead not found, skipping job')
    return
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, job.conversationId), eq(conversations.tenantId, job.tenantId)))
    .limit(1)

  if (!conversation) {
    log.error('Conversation not found, skipping job')
    return
  }

  // 2. Check conversation status — skip AI for human-handled conversations
  if (conversation.status === 'human') {
    log.info('Conversation in human mode, skipping AI processing')
    return
  }

  // Handle closed conversations — reopen logic
  if (conversation.status === 'closed') {
    const closedAt = conversation.closedAt
    const now = new Date()
    const daysSinceClosed = closedAt
      ? (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    if (daysSinceClosed < 7) {
      // Reopen same conversation
      await db
        .update(conversations)
        .set({ status: 'ai', closedAt: null, updatedAt: now })
        .where(eq(conversations.id, conversation.id))
      log.info('Reopened closed conversation (< 7 days)')
    } else {
      // This would create a new conversation in a full implementation
      // For E-002 we just reopen since the webhook already created/found the conversation
      await db
        .update(conversations)
        .set({ status: 'ai', closedAt: null, updatedAt: now })
        .where(eq(conversations.id, conversation.id))
      log.info('Reopened closed conversation (>= 7 days, simplified for E-002)')
    }
  }

  // 3. Load the inbound message
  const [inboundMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, job.messageId))
    .limit(1)

  if (!inboundMessage) {
    log.error('Message not found, skipping job')
    return
  }

  // 4. Sanitize input
  const sanitizationResult = sanitizeInput(inboundMessage.content)
  log.info({ flags: sanitizationResult.flags, isClean: sanitizationResult.isClean }, 'Input sanitized')

  // Update message with injection flags
  if (sanitizationResult.flags.length > 0) {
    await db
      .update(messages)
      .set({ injectionFlags: sanitizationResult.flags })
      .where(eq(messages.id, job.messageId))
  }

  // 5. Check for explicit handoff before AI call
  const explicitHandoff = sanitizationResult.flags.includes('explicit_handoff')

  // 6. Build prompts
  const tenantForPrompt = toTenantForPrompt(tenant)
  const leadForPrompt = toLeadForPrompt(lead)

  // Load conversation history
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, job.conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(11) // 10 + current

  // Exclude the current message and reverse to chronological order
  const historyMessages: MessageForPrompt[] = recentMessages
    .filter((m) => m.id !== job.messageId)
    .reverse()
    .map((m) => ({
      senderType: m.senderType as MessageForPrompt['senderType'],
      content: m.content,
      createdAt: m.createdAt!,
    }))

  const systemPrompt = buildSystemPrompt(tenantForPrompt)
  const userPrompt = buildUserPrompt(leadForPrompt, historyMessages, sanitizationResult.cleanMessage)

  // 7. Call AI
  let rawText: string
  let tokensUsed = 0
  try {
    const aiResult = await aiService.call(systemPrompt, userPrompt)
    rawText = aiResult.rawText
    tokensUsed = aiResult.tokensUsed
  } catch (error) {
    const isCircuitOpen = error instanceof CircuitBreakerOpenError
    const classified = isCircuitOpen
      ? { category: 'circuit_breaker_open' as const, retryable: false }
      : classifyAIError(error)

    log.error(
      { error, errorCategory: classified.category, isCircuitOpen },
      'AI call failed, using fallback',
    )

    const fallbackMsg = tenant.fallbackMessage ?? GENERIC_FALLBACK_MSG

    await saveOutboundMessage(job, fallbackMsg, 'ai', {
      intent: 'other',
      confidence: 0,
      tokens_used: 0,
      error_category: classified.category,
    })

    await logAIFailureIncident(
      job.tenantId,
      job.conversationId,
      job.leadId,
      classified.category,
      error instanceof Error ? error.message : String(error),
    )

    await triggerHandoff({
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      leadId: job.leadId,
      reason: `AI service failure: ${classified.category}`,
      handoffRules: tenant.handoffRules,
    })

    return
  }

  // 8. Parse AI response
  const parsed = parseAIResponse(rawText)
  log.info({
    intent: parsed.intent,
    confidence: parsed.confidence,
    shouldHandoff: parsed.shouldHandoff,
    scoreDelta: parsed.scoreDelta,
  }, 'AI response parsed')

  // 9. Validate response
  const validation = validateResponse(parsed.response, tenantForPrompt)
  log.info({ valid: validation.valid, reason: validation.reason }, 'Response validated')

  let responseToSend: string
  let forceHandoff = false

  if (!validation.valid) {
    responseToSend = GENERIC_FALLBACK_MSG
    forceHandoff = true

    // Log security incident
    await logValidationIncident(
      job.tenantId,
      job.conversationId,
      job.leadId,
      inboundMessage.content,
      parsed.response,
      { reason: validation.reason, severity: validation.severity },
    )
  } else {
    responseToSend = parsed.response
  }

  // 10. Save outbound message
  await saveOutboundMessage(job, responseToSend, 'ai', {
    intent: parsed.intent,
    confidence: parsed.confidence,
    tokens_used: tokensUsed,
    extracted_info: parsed.extractedInfo,
  })

  // 11. Update score
  const currentScore = lead.score
  const currentStage = lead.stage as 'new' | 'qualifying' | 'hot' | 'human' | 'converted' | 'lost'
  const scoreResult = await updateScore(
    job.leadId,
    job.tenantId,
    currentScore,
    currentStage,
    parsed.scoreDelta,
    'ai',
  )
  log.info({
    oldScore: currentScore,
    newScore: scoreResult.newScore,
    stageChanged: scoreResult.stageChanged,
  }, 'Score updated')

  // 12. Evaluate handoff decision
  const handoffDecision = evaluateHandoff({
    aiShouldHandoff: parsed.shouldHandoff,
    aiHandoffReason: parsed.handoffReason,
    aiConfidence: parsed.confidence,
    aiIntent: parsed.intent,
    explicitHandoff,
    forceHandoff,
    validationReason: validation.reason,
    newScore: scoreResult.newScore,
    aiMessagesCount: (conversation.aiMessagesCount ?? 0) + 1,
    handoffRules: tenant.handoffRules,
  })

  if (handoffDecision.shouldHandoff) {
    await triggerHandoff({
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      leadId: job.leadId,
      reason: handoffDecision.reason!,
      handoffRules: tenant.handoffRules,
    })
  }

  // 13. Send message via channel adapter
  const adapter = resolveChannelAdapter(tenant)
  if (lead.phone) {
    try {
      await withRetry(() => adapter.sendMessage(lead.phone!, responseToSend), {
        maxRetries: 2,
        baseDelay: 500,
        onRetry: (error, attempt, delayMs) => {
          log.warn({ error, attempt, delayMs }, 'Channel send retry')
        },
      })
      log.info('Outbound message sent via channel')
    } catch (error) {
      log.error({ error }, 'Failed to send via channel adapter')
    }
  }

  // 14. Update conversation counters
  await db
    .update(conversations)
    .set({
      aiMessagesCount: (conversation.aiMessagesCount ?? 0) + 1,
      aiModel: 'gpt-4o',
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, job.conversationId))
}

function evaluateHandoff(params: {
  aiShouldHandoff: boolean
  aiHandoffReason: string | null
  aiConfidence: number
  aiIntent: string
  explicitHandoff: boolean
  forceHandoff: boolean
  validationReason?: string
  newScore: number
  aiMessagesCount: number
  handoffRules: TenantForPrompt['handoffRules']
}): HandoffDecision {
  // Validation failure always triggers handoff
  if (params.forceHandoff) {
    return {
      shouldHandoff: true,
      reason: `Validation failed: ${params.validationReason}`,
      source: 'validation_failure',
    }
  }

  // Explicit handoff keywords detected
  if (params.explicitHandoff) {
    return {
      shouldHandoff: true,
      reason: 'Lead solicitou atendente humano',
      source: 'explicit',
    }
  }

  // AI decided to handoff
  if (params.aiShouldHandoff) {
    return {
      shouldHandoff: true,
      reason: params.aiHandoffReason || 'AI decided to handoff',
      source: 'ai',
    }
  }

  // Low confidence
  if (params.aiConfidence < 70) {
    return {
      shouldHandoff: true,
      reason: `Confiança baixa: ${params.aiConfidence}%`,
      source: 'confidence',
    }
  }

  // Intent-based handoff
  if (params.handoffRules.handoff_intents.includes(params.aiIntent)) {
    return {
      shouldHandoff: true,
      reason: `Intent ${params.aiIntent} configurado para handoff`,
      source: 'intent',
    }
  }

  // Score threshold
  if (shouldAutoHandoff(params.newScore, params.handoffRules)) {
    return {
      shouldHandoff: true,
      reason: `Score ${params.newScore} >= threshold ${params.handoffRules.score_threshold}`,
      source: 'score',
    }
  }

  // Max AI turns
  if (params.aiMessagesCount >= params.handoffRules.max_ai_turns) {
    return {
      shouldHandoff: true,
      reason: `Max AI turns reached: ${params.aiMessagesCount}/${params.handoffRules.max_ai_turns}`,
      source: 'max_turns',
    }
  }

  return { shouldHandoff: false, reason: null, source: 'ai' }
}

async function saveOutboundMessage(
  job: ProcessMessageJob,
  content: string,
  senderType: 'ai' | 'system',
  aiMetadata: Record<string, unknown>,
): Promise<void> {
  await db.insert(messages).values({
    tenantId: job.tenantId,
    conversationId: job.conversationId,
    direction: 'outbound',
    senderType,
    content,
    contentType: 'text',
    aiMetadata,
    deliveryStatus: 'queued',
    correlationId: job.correlationId,
  })
}

