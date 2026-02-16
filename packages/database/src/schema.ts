import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// JSONB type interfaces
// ---------------------------------------------------------------------------

export interface HandoffRules {
  score_threshold: number
  max_ai_turns: number
  business_hours_only: boolean
  handoff_intents: string[]
  auto_handoff_on_price: boolean
  follow_up_enabled: boolean
  follow_up_delay_hours: number
}

export interface NotificationPreferences {
  telegram: boolean
  web_push: boolean
  sound: boolean
}

export interface AiMetadata {
  intent?: string
  confidence?: number
  extracted_info?: Record<string, unknown>
  tokens_used?: number
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const planEnum = pgEnum('plan', ['starter', 'pro', 'scale'])

export const billingStatusEnum = pgEnum('billing_status', [
  'trial',
  'active',
  'past_due',
  'cancelled',
])

export const whatsappProviderEnum = pgEnum('whatsapp_provider', [
  'zapi',
  'meta_cloud',
])

export const agentRoleEnum = pgEnum('agent_role', ['admin', 'agent'])

export const channelEnum = pgEnum('channel', ['whatsapp', 'instagram'])

export const leadStageEnum = pgEnum('lead_stage', [
  'new',
  'qualifying',
  'hot',
  'human',
  'converted',
  'lost',
])

export const conversationStatusEnum = pgEnum('conversation_status', [
  'ai',
  'waiting_human',
  'human',
  'closed',
])

export const messageDirectionEnum = pgEnum('message_direction', [
  'inbound',
  'outbound',
])

export const senderTypeEnum = pgEnum('sender_type', [
  'lead',
  'ai',
  'agent',
  'system',
])

export const contentTypeEnum = pgEnum('content_type', [
  'text',
  'image',
  'audio',
  'video',
  'document',
])

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
])

export const validationResultEnum = pgEnum('validation_result', [
  'valid',
  'blocked',
  'modified',
])

export const eventTypeEnum = pgEnum('event_type', [
  'stage_change',
  'score_change',
  'assigned',
  'unassigned',
  'tag_added',
  'tag_removed',
  'handoff',
  'follow_up_sent',
  'converted',
  'lost',
  'reopened',
])

export const messageTypeEnum = pgEnum('message_type', [
  'follow_up',
  'reminder',
  'campaign',
])

export const scheduledStatusEnum = pgEnum('scheduled_status', [
  'pending',
  'sent',
  'cancelled',
  'failed',
])

export const incidentTypeEnum = pgEnum('incident_type', [
  'injection_attempt',
  'prompt_leak',
  'off_topic',
  'over_promise',
  'validation_failed',
  'identity_leak',
])

export const severityEnum = pgEnum('severity', [
  'low',
  'medium',
  'high',
  'critical',
])

export const detectionLayerEnum = pgEnum('detection_layer', [
  'sanitization',
  'prompt',
  'validation',
])

export const actionTakenEnum = pgEnum('action_taken', [
  'blocked',
  'handoff',
  'generic_response',
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// 1. Tenants
export const tenants = pgTable(
  'tenants',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    slug: text().unique().notNull(),

    plan: planEnum().notNull().default('starter'),
    leadsLimit: integer('leads_limit').notNull().default(300),
    agentsLimit: integer('agents_limit').notNull().default(1),

    businessName: text('business_name').notNull(),
    businessDescription: text('business_description'),
    productsInfo: text('products_info'),
    pricingInfo: text('pricing_info'),
    faq: text(),
    businessHours: text('business_hours'),
    paymentMethods: text('payment_methods'),
    customInstructions: text('custom_instructions'),

    whatsappProvider: whatsappProviderEnum('whatsapp_provider').default('zapi'),
    whatsappConfig: jsonb('whatsapp_config').default({}),
    instagramConfig: jsonb('instagram_config').default({}),
    telegramBotConfig: jsonb('telegram_bot_config').default({}),

    handoffRules: jsonb('handoff_rules')
      .$type<HandoffRules>()
      .notNull()
      .default({
        score_threshold: 60,
        max_ai_turns: 15,
        business_hours_only: false,
        handoff_intents: ['complaint'],
        auto_handoff_on_price: false,
        follow_up_enabled: false,
        follow_up_delay_hours: 24,
      }),

    stripeCustomerId: text('stripe_customer_id'),
    billingStatus: billingStatusEnum('billing_status')
      .notNull()
      .default('trial'),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_tenants_slug').on(t.slug)],
)

// 2. Agents
export const agents = pgTable(
  'agents',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    name: text().notNull(),
    email: text().notNull(),
    passwordHash: text('password_hash').notNull(),
    role: agentRoleEnum().notNull().default('agent'),

    isActive: boolean('is_active').default(true),
    isOnline: boolean('is_online').default(false),
    maxConcurrent: integer('max_concurrent').default(10),
    activeConversations: integer('active_conversations').default(0),

    telegramChatId: text('telegram_chat_id'),
    notificationPreferences: jsonb('notification_preferences')
      .$type<NotificationPreferences>()
      .default({
        telegram: true,
        web_push: true,
        sound: true,
      }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_agents_tenant_email').on(t.tenantId, t.email),
    index('idx_agents_tenant').on(t.tenantId),
  ],
)

// 3. Leads
export const leads = pgTable(
  'leads',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    name: text(),
    phone: text(),
    instagramId: text('instagram_id'),
    email: text(),
    avatarUrl: text('avatar_url'),

    channel: channelEnum().notNull(),
    source: text(),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),

    stage: leadStageEnum().notNull().default('new'),
    score: integer().notNull().default(0),
    tags: text().array().default(sql`'{}'::text[]`),

    assignedTo: uuid('assigned_to').references(() => agents.id),

    lastCountedMonth: text('last_counted_month'),

    metadata: jsonb().default({}),

    firstContactAt: timestamp('first_contact_at', {
      withTimezone: true,
    }).defaultNow(),
    lastContactAt: timestamp('last_contact_at', {
      withTimezone: true,
    }).defaultNow(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_leads_phone')
      .on(t.tenantId, t.phone)
      .where(sql`${t.phone} IS NOT NULL`),
    uniqueIndex('idx_leads_instagram')
      .on(t.tenantId, t.instagramId)
      .where(sql`${t.instagramId} IS NOT NULL`),
    index('idx_leads_tenant').on(t.tenantId),
    index('idx_leads_stage').on(t.tenantId, t.stage),
    index('idx_leads_score').on(t.tenantId, t.score),
    index('idx_leads_campaign')
      .on(t.tenantId, t.utmCampaign)
      .where(sql`${t.utmCampaign} IS NOT NULL`),
    index('idx_leads_last_message')
      .on(t.tenantId, t.lastMessageAt)
      .where(sql`${t.lastMessageAt} IS NOT NULL`),
  ],
)

// 4. Conversations
export const conversations = pgTable(
  'conversations',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),

    channel: channelEnum().notNull(),
    status: conversationStatusEnum().notNull().default('ai'),

    assignedAgentId: uuid('assigned_agent_id').references(() => agents.id),

    aiMessagesCount: integer('ai_messages_count').default(0),
    humanMessagesCount: integer('human_messages_count').default(0),
    leadMessagesCount: integer('lead_messages_count').default(0),
    firstResponseTimeMs: integer('first_response_time_ms'),

    aiModel: text('ai_model').default('claude-sonnet-4-20250514'),
    aiSummary: text('ai_summary'),

    handoffReason: text('handoff_reason'),
    handoffAt: timestamp('handoff_at', { withTimezone: true }),

    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_conversations_tenant').on(t.tenantId),
    index('idx_conversations_lead').on(t.leadId),
    index('idx_conversations_status').on(t.tenantId, t.status),
    index('idx_conversations_waiting')
      .on(t.tenantId, t.handoffAt)
      .where(sql`${t.status} = 'waiting_human'`),
  ],
)

// 5. Conversation Notes
export const conversationNotes = pgTable(
  'conversation_notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),

    content: text().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_notes_conversation').on(t.conversationId, t.createdAt),
  ],
)

// 6. Messages
export const messages = pgTable(
  'messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    direction: messageDirectionEnum().notNull(),
    senderType: senderTypeEnum('sender_type').notNull(),
    senderAgentId: uuid('sender_agent_id').references(() => agents.id),

    content: text().notNull(),
    contentType: contentTypeEnum('content_type').default('text'),
    mediaUrl: text('media_url'),

    aiMetadata: jsonb('ai_metadata').$type<AiMetadata>().default({}),

    deliveryStatus: deliveryStatusEnum('delivery_status').default('sent'),
    externalId: text('external_id'),

    injectionFlags: text('injection_flags')
      .array()
      .default(sql`'{}'::text[]`),
    validationResult: validationResultEnum('validation_result').default(
      'valid',
    ),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_messages_conversation').on(t.conversationId, t.createdAt),
    index('idx_messages_tenant').on(t.tenantId),
  ],
)

// 7. Lead Events
export const leadEvents = pgTable(
  'lead_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),

    eventType: eventTypeEnum('event_type').notNull(),
    fromValue: text('from_value'),
    toValue: text('to_value'),

    createdBy: text('created_by').notNull(),
    metadata: jsonb().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_lead_events_lead').on(t.leadId, t.createdAt)],
)

// 8. Monthly Lead Counts
export const monthlyLeadCounts = pgTable(
  'monthly_lead_counts',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    yearMonth: text('year_month').notNull(),
    leadCount: integer('lead_count').notNull().default(0),
    notified80: boolean('notified_80').default(false),
    notified100: boolean('notified_100').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_monthly_lead_counts_unique').on(t.tenantId, t.yearMonth),
  ],
)

// 9. Scheduled Messages
export const scheduledMessages = pgTable(
  'scheduled_messages',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    messageType: messageTypeEnum('message_type').notNull(),
    content: text(),
    scheduledFor: timestamp('scheduled_for', {
      withTimezone: true,
    }).notNull(),

    status: scheduledStatusEnum().notNull().default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    cancelledReason: text('cancelled_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_scheduled_pending')
      .on(t.scheduledFor)
      .where(sql`${t.status} = 'pending'`),
  ],
)

// 10. Security Incidents
export const securityIncidents = pgTable(
  'security_incidents',
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id),
    leadId: uuid('lead_id').references(() => leads.id),

    incidentType: incidentTypeEnum('incident_type').notNull(),
    severity: severityEnum().notNull().default('low'),

    leadMessage: text('lead_message'),
    aiResponse: text('ai_response'),
    detectionLayer: detectionLayerEnum('detection_layer'),
    actionTaken: actionTakenEnum('action_taken'),

    resolved: boolean().default(false),
    resolvedBy: uuid('resolved_by').references(() => agents.id),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_security_tenant').on(t.tenantId, t.createdAt),
    index('idx_security_unresolved')
      .on(t.tenantId)
      .where(sql`${t.resolved} = false`),
  ],
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  agents: many(agents),
  leads: many(leads),
  conversations: many(conversations),
  messages: many(messages),
  leadEvents: many(leadEvents),
  monthlyLeadCounts: many(monthlyLeadCounts),
  conversationNotes: many(conversationNotes),
  scheduledMessages: many(scheduledMessages),
  securityIncidents: many(securityIncidents),
}))

export const agentsRelations = relations(agents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [agents.tenantId],
    references: [tenants.id],
  }),
  assignedLeads: many(leads),
  assignedConversations: many(conversations),
  conversationNotes: many(conversationNotes),
  sentMessages: many(messages),
}))

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
  assignedAgent: one(agents, {
    fields: [leads.assignedTo],
    references: [agents.id],
  }),
  conversations: many(conversations),
  leadEvents: many(leadEvents),
  scheduledMessages: many(scheduledMessages),
  securityIncidents: many(securityIncidents),
}))

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [conversations.tenantId],
      references: [tenants.id],
    }),
    lead: one(leads, {
      fields: [conversations.leadId],
      references: [leads.id],
    }),
    assignedAgent: one(agents, {
      fields: [conversations.assignedAgentId],
      references: [agents.id],
    }),
    messages: many(messages),
    notes: many(conversationNotes),
    scheduledMessages: many(scheduledMessages),
    securityIncidents: many(securityIncidents),
  }),
)

export const conversationNotesRelations = relations(
  conversationNotes,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [conversationNotes.tenantId],
      references: [tenants.id],
    }),
    conversation: one(conversations, {
      fields: [conversationNotes.conversationId],
      references: [conversations.id],
    }),
    agent: one(agents, {
      fields: [conversationNotes.agentId],
      references: [agents.id],
    }),
  }),
)

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [messages.tenantId],
    references: [tenants.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  senderAgent: one(agents, {
    fields: [messages.senderAgentId],
    references: [agents.id],
  }),
}))

export const leadEventsRelations = relations(leadEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leadEvents.tenantId],
    references: [tenants.id],
  }),
  lead: one(leads, {
    fields: [leadEvents.leadId],
    references: [leads.id],
  }),
}))

export const monthlyLeadCountsRelations = relations(
  monthlyLeadCounts,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [monthlyLeadCounts.tenantId],
      references: [tenants.id],
    }),
  }),
)

export const scheduledMessagesRelations = relations(
  scheduledMessages,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [scheduledMessages.tenantId],
      references: [tenants.id],
    }),
    lead: one(leads, {
      fields: [scheduledMessages.leadId],
      references: [leads.id],
    }),
    conversation: one(conversations, {
      fields: [scheduledMessages.conversationId],
      references: [conversations.id],
    }),
  }),
)

export const securityIncidentsRelations = relations(
  securityIncidents,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [securityIncidents.tenantId],
      references: [tenants.id],
    }),
    conversation: one(conversations, {
      fields: [securityIncidents.conversationId],
      references: [conversations.id],
    }),
    lead: one(leads, {
      fields: [securityIncidents.leadId],
      references: [leads.id],
    }),
    resolvedByAgent: one(agents, {
      fields: [securityIncidents.resolvedBy],
      references: [agents.id],
    }),
  }),
)
