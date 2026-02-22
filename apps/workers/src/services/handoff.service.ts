import { db } from '@atena/database'
import { conversations, leads, leadEvents, messages } from '@atena/database'
import { eq, and } from 'drizzle-orm'
import { Queue } from 'bullmq'
import type { HandoffRules } from '@atena/database'
import { logger } from '../lib/logger.js'

type ConversationStatus = 'ai' | 'waiting_human' | 'human' | 'closed'

const VALID_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
  ai: ['waiting_human'],
  waiting_human: ['human', 'ai'],
  human: ['ai', 'closed'],
  closed: ['ai'],
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

const HANDOFF_TRANSITION_MSG =
  'Vou te conectar com um de nossos consultores para te ajudar com os detalhes. Um momento! 😊'

const TIMEOUT_APOLOGY_MSG =
  'Desculpe pela demora! Nosso atendente não pôde responder no momento. Vou continuar te ajudando por aqui. Como posso ajudar?'

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid transition: ${from} → ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

let notificationQueue: Queue | null = null
let scheduledQueue: Queue | null = null

export function setQueues(notification: Queue, scheduled: Queue): void {
  notificationQueue = notification
  scheduledQueue = scheduled
}

function validateTransition(from: ConversationStatus, to: ConversationStatus): void {
  const allowed = VALID_TRANSITIONS[from]
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError(from, to)
  }
}

async function cancelTimeoutJob(conversationId: string): Promise<void> {
  if (!scheduledQueue) return
  const jobId = `handoff-timeout:${conversationId}`
  try {
    const job = await scheduledQueue.getJob(jobId)
    if (job) {
      await job.remove()
    }
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to cancel timeout job')
  }
}

async function scheduleTimeoutJob(
  conversationId: string,
  tenantId: string,
  delayMs: number,
): Promise<void> {
  if (!scheduledQueue) return
  const jobId = `handoff-timeout:${conversationId}`
  try {
    await scheduledQueue.add(
      'handoff-timeout',
      { conversationId, tenantId },
      { jobId, delay: delayMs, removeOnComplete: true, removeOnFail: true },
    )
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to schedule timeout job')
  }
}

export interface TriggerHandoffParams {
  tenantId: string
  conversationId: string
  leadId: string
  reason: string
  handoffRules: HandoffRules
}

export async function triggerHandoff(params: TriggerHandoffParams): Promise<void> {
  const { tenantId, conversationId, leadId, reason, handoffRules } = params
  const log = logger.child({ tenantId, conversationId })

  // Load current conversation status
  const [conversation] = await db
    .select({ status: conversations.status })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .limit(1)

  if (!conversation) {
    log.error('Conversation not found for handoff')
    return
  }

  // Validate transition ai → waiting_human
  validateTransition(conversation.status as ConversationStatus, 'waiting_human')

  const now = new Date()

  // Update conversation status
  await db
    .update(conversations)
    .set({
      status: 'waiting_human',
      handoffReason: reason,
      handoffAt: now,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId))

  // Update lead stage
  await db
    .update(leads)
    .set({ stage: 'human', updatedAt: now })
    .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))

  // Save system transition message
  await db.insert(messages).values({
    tenantId,
    conversationId,
    direction: 'outbound',
    senderType: 'system',
    content: HANDOFF_TRANSITION_MSG,
    contentType: 'text',
    aiMetadata: {},
    deliveryStatus: 'queued',
  })

  // Record handoff event
  await db.insert(leadEvents).values({
    tenantId,
    leadId,
    eventType: 'handoff',
    toValue: 'waiting_human',
    createdBy: 'ai',
    metadata: { reason },
  })

  // Schedule timeout job
  const timeoutMs = handoffRules.follow_up_delay_hours
    ? handoffRules.follow_up_delay_hours * 60 * 60 * 1000
    : DEFAULT_TIMEOUT_MS
  await scheduleTimeoutJob(conversationId, tenantId, timeoutMs)

  // Enqueue notification
  if (notificationQueue) {
    const [lead] = await db
      .select({ name: leads.name, score: leads.score, channel: leads.channel })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1)

    await notificationQueue.add('notify-handoff', {
      tenantId,
      conversationId,
      leadId,
      leadName: lead?.name ?? null,
      leadScore: lead?.score ?? 0,
      leadChannel: lead?.channel ?? 'whatsapp',
      summary: reason,
    })
  }

  log.info({ reason }, 'Handoff triggered')
}

export async function assignToAgent(
  conversationId: string,
  agentId: string,
  tenantId: string,
): Promise<void> {
  const log = logger.child({ tenantId, conversationId, agentId })

  const [conversation] = await db
    .select({ status: conversations.status, leadId: conversations.leadId })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .limit(1)

  if (!conversation) {
    log.error('Conversation not found for assignment')
    return
  }

  validateTransition(conversation.status as ConversationStatus, 'human')

  const now = new Date()

  await db
    .update(conversations)
    .set({
      status: 'human',
      assignedAgentId: agentId,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId))

  // Increment agent active conversations
  const { agents } = await import('@atena/database')
  const { sql } = await import('drizzle-orm')
  await db
    .update(agents)
    .set({
      activeConversations: sql`${agents.activeConversations} + 1`,
      updatedAt: now,
    })
    .where(eq(agents.id, agentId))

  // Cancel timeout job
  await cancelTimeoutJob(conversationId)

  // Record event
  await db.insert(leadEvents).values({
    tenantId,
    leadId: conversation.leadId,
    eventType: 'assigned',
    toValue: agentId,
    createdBy: 'system',
    metadata: {},
  })

  log.info('Agent assigned to conversation')
}

export async function returnToAI(
  conversationId: string,
  agentId: string,
  tenantId: string,
): Promise<void> {
  const log = logger.child({ tenantId, conversationId, agentId })

  const [conversation] = await db
    .select({ status: conversations.status, leadId: conversations.leadId })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .limit(1)

  if (!conversation) {
    log.error('Conversation not found for return to AI')
    return
  }

  validateTransition(conversation.status as ConversationStatus, 'ai')

  const now = new Date()

  await db
    .update(conversations)
    .set({
      status: 'ai',
      assignedAgentId: null,
      handoffReason: null,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId))

  // Decrement agent active conversations
  const { agents } = await import('@atena/database')
  const { sql } = await import('drizzle-orm')
  await db
    .update(agents)
    .set({
      activeConversations: sql`GREATEST(${agents.activeConversations} - 1, 0)`,
      updatedAt: now,
    })
    .where(eq(agents.id, agentId))

  // Update lead stage back based on score
  await db
    .update(leads)
    .set({ stage: 'qualifying', updatedAt: now })
    .where(and(eq(leads.id, conversation.leadId), eq(leads.tenantId, tenantId)))

  // Record event
  await db.insert(leadEvents).values({
    tenantId,
    leadId: conversation.leadId,
    eventType: 'unassigned',
    fromValue: agentId,
    toValue: 'ai',
    createdBy: 'system',
    metadata: {},
  })

  log.info('Conversation returned to AI')
}

export async function closeConversation(
  conversationId: string,
  tenantId: string,
): Promise<void> {
  const log = logger.child({ tenantId, conversationId })

  const [conversation] = await db
    .select({
      status: conversations.status,
      leadId: conversations.leadId,
      assignedAgentId: conversations.assignedAgentId,
    })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .limit(1)

  if (!conversation) {
    log.error('Conversation not found for close')
    return
  }

  validateTransition(conversation.status as ConversationStatus, 'closed')

  const now = new Date()

  await db
    .update(conversations)
    .set({
      status: 'closed',
      closedAt: now,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId))

  // Decrement agent active conversations if assigned
  if (conversation.assignedAgentId) {
    const { agents } = await import('@atena/database')
    const { sql } = await import('drizzle-orm')
    await db
      .update(agents)
      .set({
        activeConversations: sql`GREATEST(${agents.activeConversations} - 1, 0)`,
        updatedAt: now,
      })
      .where(eq(agents.id, conversation.assignedAgentId))
  }

  log.info('Conversation closed')
}

export async function handleTimeout(
  conversationId: string,
  tenantId: string,
): Promise<void> {
  const log = logger.child({ tenantId, conversationId })

  const [conversation] = await db
    .select({ status: conversations.status, leadId: conversations.leadId })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.tenantId, tenantId)))
    .limit(1)

  if (!conversation) {
    log.error('Conversation not found for timeout')
    return
  }

  // Noop if already assigned to human
  if (conversation.status !== 'waiting_human') {
    log.info({ status: conversation.status }, 'Timeout noop — conversation no longer waiting_human')
    return
  }

  const now = new Date()

  // Revert to AI
  await db
    .update(conversations)
    .set({
      status: 'ai',
      handoffReason: null,
      updatedAt: now,
    })
    .where(eq(conversations.id, conversationId))

  // Send apology message
  await db.insert(messages).values({
    tenantId,
    conversationId,
    direction: 'outbound',
    senderType: 'system',
    content: TIMEOUT_APOLOGY_MSG,
    contentType: 'text',
    aiMetadata: {},
    deliveryStatus: 'queued',
  })

  // Update lead stage back
  await db
    .update(leads)
    .set({ stage: 'qualifying', updatedAt: now })
    .where(and(eq(leads.id, conversation.leadId), eq(leads.tenantId, tenantId)))

  // Record event
  await db.insert(leadEvents).values({
    tenantId,
    leadId: conversation.leadId,
    eventType: 'unassigned',
    toValue: 'ai',
    createdBy: 'system',
    metadata: { reason: 'timeout' },
  })

  log.info('Handoff timeout — reverted to AI')
}
