import { eq, and, ne, sql } from 'drizzle-orm'
import { db, tenants, leads, conversations, messages } from '@atena/database'
import type { InboundMessage } from '@atena/channels'
import { getMessageQueue } from '../lib/queue.js'
import { countLeadIfNew } from './billing.service.js'

export class WebhookError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'WebhookError'
    this.statusCode = statusCode
  }
}

export async function findTenantByWebhookSecret(secret: string) {
  const rows = await db
    .select({ id: tenants.id, whatsappProvider: tenants.whatsappProvider })
    .from(tenants)
    .where(
      and(
        sql`${tenants.whatsappConfig}->>'webhookSecret' = ${secret}`,
        eq(tenants.whatsappProvider, 'zapi'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function upsertLead(
  tenantId: string,
  phone: string,
  channel: 'whatsapp' | 'instagram',
) {
  const now = new Date()

  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, phone)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(leads)
      .set({ lastContactAt: now, lastMessageAt: now, updatedAt: now })
      .where(eq(leads.id, existing[0].id))

    return existing[0]
  }

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId,
      phone,
      channel,
      stage: 'new',
      score: 0,
      firstContactAt: now,
      lastContactAt: now,
      lastMessageAt: now,
    })
    .returning({ id: leads.id })

  return lead
}

export async function findOrCreateConversation(
  tenantId: string,
  leadId: string,
  channel: 'whatsapp' | 'instagram',
) {
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.leadId, leadId),
        ne(conversations.status, 'closed'),
      ),
    )
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      tenantId,
      leadId,
      channel,
      status: 'ai',
    })
    .returning({ id: conversations.id })

  return conversation
}

export async function saveInboundMessage(
  tenantId: string,
  conversationId: string,
  inbound: InboundMessage,
) {
  const contentType =
    inbound.mediaType ?? ('text' as const)

  const [message] = await db
    .insert(messages)
    .values({
      tenantId,
      conversationId,
      direction: 'inbound',
      senderType: 'lead',
      content: inbound.content,
      contentType,
      mediaUrl: inbound.mediaUrl,
      externalId: inbound.externalId,
      deliveryStatus: 'delivered',
    })
    .returning({ id: messages.id })

  return message
}

export async function processInboundWhatsApp(
  webhookToken: string,
  inbound: InboundMessage,
) {
  const tenant = await findTenantByWebhookSecret(webhookToken)

  if (!tenant) {
    throw new WebhookError('Tenant not found', 404)
  }

  const lead = await upsertLead(tenant.id, inbound.from, inbound.channel)

  // Count lead for billing (never blocks message processing)
  try {
    await countLeadIfNew(tenant.id, lead.id)
  } catch {
    // Billing failure must not block message processing
  }

  const conversation = await findOrCreateConversation(tenant.id, lead.id, inbound.channel)
  const message = await saveInboundMessage(tenant.id, conversation.id, inbound)

  const queue = getMessageQueue()
  await queue.add('process-message', {
    tenantId: tenant.id,
    leadId: lead.id,
    conversationId: conversation.id,
    messageId: message.id,
  })

  return { tenantId: tenant.id, leadId: lead.id, conversationId: conversation.id, messageId: message.id }
}
