// Enums as union types
export type Plan = 'starter' | 'pro' | 'scale'
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'cancelled'
export type WhatsappProvider = 'zapi' | 'meta_cloud'
export type AgentRole = 'admin' | 'agent'
export type Channel = 'whatsapp' | 'instagram'
export type LeadStage = 'new' | 'qualifying' | 'hot' | 'human' | 'converted' | 'lost'
export type ConversationStatus = 'ai' | 'waiting_human' | 'human' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'
export type SenderType = 'lead' | 'ai' | 'agent' | 'system'
export type ContentType = 'text' | 'image' | 'audio' | 'video' | 'document'
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type ValidationResult = 'valid' | 'blocked' | 'modified'
export type EventType =
  | 'stage_change'
  | 'score_change'
  | 'assigned'
  | 'unassigned'
  | 'tag_added'
  | 'tag_removed'
  | 'handoff'
  | 'follow_up_sent'
  | 'converted'
  | 'lost'
  | 'reopened'
  | 'campaign_joined'
  | 'campaign_completed'
  | 'pipeline_stage_moved'
  | 'automation_triggered'
export type IncidentType =
  | 'injection_attempt'
  | 'prompt_leak'
  | 'off_topic'
  | 'over_promise'
  | 'validation_failed'
  | 'identity_leak'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed'
export type CampaignType = 'launch' | 'promotion' | 'recurring' | 'evergreen' | 'other'

// JSONB types
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

export interface QuickReply {
  id: string
  label: string
  text: string
}

export interface UtmRule {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

// Entity interfaces
export interface Tenant {
  id: string
  name: string
  slug: string
  plan: Plan
  leadsLimit: number
  agentsLimit: number
  businessName: string
  businessDescription: string | null
  productsInfo: string | null
  pricingInfo: string | null
  faq: string | null
  businessHours: string | null
  paymentMethods: string | null
  customInstructions: string | null
  fallbackMessage: string | null
  whatsappProvider: WhatsappProvider | null
  whatsappConfig: Record<string, unknown>
  instagramConfig: Record<string, unknown>
  telegramBotConfig: Record<string, unknown>
  handoffRules: HandoffRules
  quickReplies: QuickReply[]
  billingStatus: BillingStatus
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TenantListItem {
  id: string
  name: string
  slug: string
  plan: Plan
}

export interface Agent {
  id: string
  tenantId: string
  name: string
  email: string
  role: AgentRole
  isActive: boolean
  isOnline: boolean
  maxConcurrent: number
  activeConversations: number
  telegramChatId: string | null
  notificationPreferences: NotificationPreferences
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  tenantId: string
  name: string | null
  phone: string | null
  instagramId: string | null
  email: string | null
  avatarUrl: string | null
  channel: Channel
  source: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  stage: LeadStage
  score: number
  tags: string[]
  assignedTo: string | null
  activeCampaignId: string | null
  firstContactAt: string
  lastContactAt: string
  lastMessageAt: string | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  tenantId: string
  leadId: string
  channel: Channel
  status: ConversationStatus
  assignedAgentId: string | null
  campaignId: string | null
  aiMessagesCount: number
  humanMessagesCount: number
  leadMessagesCount: number
  firstResponseTimeMs: number | null
  aiModel: string | null
  aiSummary: string | null
  handoffReason: string | null
  handoffAt: string | null
  openedAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationWithLead extends Conversation {
  leadName: string | null
  leadPhone: string | null
  leadScore: number
  leadStage: LeadStage
}

export interface Message {
  id: string
  tenantId: string
  conversationId: string
  direction: MessageDirection
  senderType: SenderType
  senderAgentId: string | null
  content: string
  contentType: ContentType
  mediaUrl: string | null
  aiMetadata: AiMetadata
  deliveryStatus: DeliveryStatus
  externalId: string | null
  injectionFlags: string[]
  validationResult: ValidationResult
  correlationId: string | null
  createdAt: string
}

export interface Note {
  id: string
  tenantId: string
  conversationId: string
  agentId: string
  content: string
  createdAt: string
}

export interface LeadEvent {
  id: string
  tenantId: string
  leadId: string
  eventType: EventType
  fromValue: string | null
  toValue: string | null
  createdBy: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface SecurityIncident {
  id: string
  tenantId: string
  conversationId: string | null
  leadId: string | null
  incidentType: IncidentType
  severity: Severity
  leadMessage: string | null
  aiResponse: string | null
  detectionLayer: string | null
  actionTaken: string | null
  resolved: boolean
  resolvedBy: string | null
  createdAt: string
}

export interface Campaign {
  id: string
  tenantId: string
  name: string
  description: string | null
  type: CampaignType
  status: CampaignStatus
  startDate: string | null
  endDate: string | null
  autoActivate: boolean
  productsInfo: string | null
  pricingInfo: string | null
  faq: string | null
  customInstructions: string | null
  fallbackMessage: string | null
  handoffRules: Partial<HandoffRules> | null
  utmRules: UtmRule[]
  isDefault: boolean
  goalLeads: number | null
  goalConversions: number | null
  createdAt: string
  updatedAt: string
}

export interface CampaignMetrics {
  totalLeads: number
  leadsByStage: Record<string, number>
  avgScore: number
  handoffRate: number
  conversionRate: number
  topIntents: { intent: string; count: number }[]
}

export interface DashboardData {
  leadsToday: number
  leadsMonth: number
  leadsLimit: number
  avgScore: number
  handoffRate: number
  conversationsByStatus: Record<string, number>
  topIntents: { intent: string; count: number }[]
}

export interface MonthlyLeadCount {
  id: string
  tenantId: string
  yearMonth: string
  leadCount: number
  createdAt: string
}

// Response wrappers
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CursorResponse<T> {
  data: T[]
  meta: {
    nextCursor?: string
  }
}

export interface SingleResponse<T> {
  data: T
}

export interface ListResponse<T> {
  data: T[]
}
