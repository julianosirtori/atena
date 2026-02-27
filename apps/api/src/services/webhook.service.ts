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

export async function findTenantByInstanceId(instanceId: string) {
  const rows = await db
    .select({ id: tenants.id, whatsappProvider: tenants.whatsappProvider })
    .from(tenants)
    .where(
      and(
        sql`${tenants.whatsappConfig}->>'instanceId' = ${instanceId}`,
        eq(tenants.whatsappProvider, 'zapi'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function findTenantByPhoneNumberId(phoneNumberId: string) {
  const rows = await db
    .select({ id: tenants.id, whatsappProvider: tenants.whatsappProvider })
    .from(tenants)
    .where(
      and(
        sql`${tenants.whatsappConfig}->>'phoneNumberId' = ${phoneNumberId}`,
        eq(tenants.whatsappProvider, 'meta_cloud'),
      ),
    )
    .limit(1)

  return rows[0] ?? null
}

export async function upsertLead(
  tenantId: string,
  phone: string,
  channel: 'whatsapp' | 'instagram',
  senderName?: string,
) {
  const now = new Date()

  const existing = await db
    .select({ id: leads.id, name: leads.name })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), eq(leads.phone, phone)))
    .limit(1)

  if (existing[0]) {
    const updates: Record<string, unknown> = { lastContactAt: now, lastMessageAt: now, updatedAt: now }
    // Fill name if not set yet
    if (!existing[0].name && senderName) {
      updates.name = senderName
    }
    await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, existing[0].id))

    return existing[0]
  }

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId,
      phone,
      channel,
      name: senderName || null,
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
  correlationId?: string,
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
      correlationId,
    })
    .returning({ id: messages.id })

  return message
}

async function processInboundCommon(
  tenantId: string,
  inbound: InboundMessage,
  correlationId?: string,
) {
  const lead = await upsertLead(tenantId, inbound.from, inbound.channel, inbound.senderName)

  // Count lead for billing (never blocks message processing)
  try {
    await countLeadIfNew(tenantId, lead.id)
  } catch {
    // Billing failure must not block message processing
  }

  const conversation = await findOrCreateConversation(tenantId, lead.id, inbound.channel)
  const message = await saveInboundMessage(tenantId, conversation.id, inbound, correlationId)

  const queue = getMessageQueue()
  await queue.add('process-message', {
    tenantId,
    leadId: lead.id,
    conversationId: conversation.id,
    messageId: message.id,
    correlationId,
  })

  return { tenantId, leadId: lead.id, conversationId: conversation.id, messageId: message.id }
}

export async function processInboundZApi(
  instanceId: string,
  inbound: InboundMessage,
  correlationId?: string,
) {
  const tenant = await findTenantByInstanceId(instanceId)

  if (!tenant) {
    throw new WebhookError('Tenant not found', 404)
  }

  return processInboundCommon(tenant.id, inbound, correlationId)
}

export async function processInboundMetaWhatsApp(
  phoneNumberId: string,
  inbound: InboundMessage,
  correlationId?: string,
) {
  const tenant = await findTenantByPhoneNumberId(phoneNumberId)

  if (!tenant) {
    throw new WebhookError('Tenant not found', 404)
  }

  return processInboundCommon(tenant.id, inbound, correlationId)
}
