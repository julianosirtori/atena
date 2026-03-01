import { z } from 'zod'

// Tenant
export const tenantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  businessName: z.string().min(1).optional(),
  businessDescription: z.string().optional(),
  productsInfo: z.string().optional(),
  pricingInfo: z.string().optional(),
  faq: z.string().optional(),
  businessHours: z.string().optional(),
  paymentMethods: z.string().optional(),
  customInstructions: z.string().optional(),
  fallbackMessage: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'scale']).optional(),
  leadsLimit: z.number().int().positive().optional(),
  agentsLimit: z.number().int().positive().optional(),
  whatsappProvider: z.enum(['zapi', 'meta_cloud']).optional(),
  whatsappConfig: z.record(z.unknown()).optional(),
  instagramConfig: z.record(z.unknown()).optional(),
  telegramBotConfig: z.record(z.unknown()).optional(),
  handoffRules: z
    .object({
      score_threshold: z.number().int().min(0).max(100),
      max_ai_turns: z.number().int().min(1).max(50),
      business_hours_only: z.boolean(),
      handoff_intents: z.array(z.string()),
      auto_handoff_on_price: z.boolean(),
      follow_up_enabled: z.boolean(),
      follow_up_delay_hours: z.number().int().min(1).max(168),
    })
    .optional(),
})

// Agent
export const agentCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'agent']).default('agent'),
  telegramChatId: z.string().optional(),
  maxConcurrent: z.number().int().min(1).max(50).default(10),
  notificationPreferences: z
    .object({
      telegram: z.boolean(),
      web_push: z.boolean(),
      sound: z.boolean(),
    })
    .optional(),
})

export const agentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'agent']).optional(),
  isActive: z.boolean().optional(),
  telegramChatId: z.string().nullable().optional(),
  maxConcurrent: z.number().int().min(1).max(50).optional(),
  notificationPreferences: z
    .object({
      telegram: z.boolean(),
      web_push: z.boolean(),
      sound: z.boolean(),
    })
    .optional(),
})

// Lead
export const leadFiltersSchema = z.object({
  stage: z
    .enum(['new', 'qualifying', 'hot', 'human', 'converted', 'lost'])
    .optional(),
  channel: z.enum(['whatsapp', 'instagram']).optional(),
  search: z.string().optional(),
  minScore: z.coerce.number().int().optional(),
  maxScore: z.coerce.number().int().optional(),
  tags: z.string().optional(), // comma-separated
})

export const leadUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  stage: z
    .enum(['new', 'qualifying', 'hot', 'human', 'converted', 'lost'])
    .optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
})

// Conversation filters
export const conversationFiltersSchema = z.object({
  status: z.enum(['ai', 'waiting_human', 'human', 'closed']).optional(),
  channel: z.enum(['whatsapp', 'instagram']).optional(),
})

// Messages cursor pagination
export const messageCursorSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// Note
export const noteCreateSchema = z.object({
  agentId: z.string().uuid(),
  content: z.string().min(1),
})

// Security incident
export const securityIncidentFiltersSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  resolved: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  incidentType: z
    .enum([
      'injection_attempt',
      'prompt_leak',
      'off_topic',
      'over_promise',
      'validation_failed',
      'identity_leak',
    ])
    .optional(),
})

export const securityIncidentResolveSchema = z.object({
  resolvedBy: z.string().uuid(),
})

// Campaign
const utmRuleSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
})

const campaignHandoffRulesSchema = z.object({
  score_threshold: z.number().int().min(0).max(100).optional(),
  max_ai_turns: z.number().int().min(1).max(50).optional(),
  business_hours_only: z.boolean().optional(),
  handoff_intents: z.array(z.string()).optional(),
  auto_handoff_on_price: z.boolean().optional(),
  follow_up_enabled: z.boolean().optional(),
  follow_up_delay_hours: z.number().int().min(1).max(168).optional(),
})

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['launch', 'promotion', 'recurring', 'evergreen', 'other']).default('other'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  autoActivate: z.boolean().default(false),
  productsInfo: z.string().optional(),
  pricingInfo: z.string().optional(),
  faq: z.string().optional(),
  customInstructions: z.string().optional(),
  fallbackMessage: z.string().optional(),
  handoffRules: campaignHandoffRulesSchema.optional(),
  utmRules: z.array(utmRuleSchema).default([]),
  isDefault: z.boolean().default(false),
  goalLeads: z.number().int().positive().optional(),
  goalConversions: z.number().int().positive().optional(),
})

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['launch', 'promotion', 'recurring', 'evergreen', 'other']).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  autoActivate: z.boolean().optional(),
  productsInfo: z.string().nullable().optional(),
  pricingInfo: z.string().nullable().optional(),
  faq: z.string().nullable().optional(),
  customInstructions: z.string().nullable().optional(),
  fallbackMessage: z.string().nullable().optional(),
  handoffRules: campaignHandoffRulesSchema.nullable().optional(),
  utmRules: z.array(utmRuleSchema).optional(),
  isDefault: z.boolean().optional(),
  goalLeads: z.number().int().positive().nullable().optional(),
  goalConversions: z.number().int().positive().nullable().optional(),
})

export const campaignFiltersSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  type: z.enum(['launch', 'promotion', 'recurring', 'evergreen', 'other']).optional(),
})

// Lead event filters
export const leadEventFiltersSchema = z.object({
  eventType: z
    .enum([
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
      'campaign_joined',
      'campaign_completed',
      'pipeline_stage_moved',
      'automation_triggered',
    ])
    .optional(),
})
