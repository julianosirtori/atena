export interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'pro' | 'scale'
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
  whatsappProvider: 'zapi' | 'meta_cloud' | null
  whatsappConfig: Record<string, unknown>
  instagramConfig: Record<string, unknown>
  telegramBotConfig: Record<string, unknown>
  handoffRules: HandoffRules
  billingStatus: 'trial' | 'active' | 'past_due' | 'cancelled'
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}

export interface HandoffRules {
  score_threshold: number
  max_ai_turns: number
  business_hours_only: boolean
  handoff_intents: string[]
  auto_handoff_on_price: boolean
  follow_up_enabled: boolean
  follow_up_delay_hours: number
}

export interface Agent {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent'
  isActive: boolean | null
  isOnline: boolean | null
  maxConcurrent: number | null
  activeConversations: number | null
  telegramChatId: string | null
  notificationPreferences: { telegram: boolean; web_push: boolean; sound: boolean } | null
  createdAt: string
}

export interface Lead {
  id: string
  tenantId: string
  name: string | null
  phone: string | null
  instagramId: string | null
  email: string | null
  avatarUrl: string | null
  channel: 'whatsapp' | 'instagram'
  source: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  stage: LeadStage
  score: number
  tags: string[] | null
  assignedTo: string | null
  metadata: Record<string, unknown>
  firstContactAt: string
  lastContactAt: string
  lastMessageAt: string | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

export type LeadStage = 'new' | 'qualifying' | 'hot' | 'human' | 'converted' | 'lost'

export interface Conversation {
  id: string
  tenantId: string
  leadId: string
  channel: 'whatsapp' | 'instagram'
  status: ConversationStatus
  assignedAgentId: string | null
  aiMessagesCount: number | null
  humanMessagesCount: number | null
  leadMessagesCount: number | null
  firstResponseTimeMs: number | null
  aiModel: string | null
  aiSummary: string | null
  handoffReason: string | null
  handoffAt: string | null
  openedAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
  leadName?: string | null
  leadPhone?: string | null
  leadScore?: number
  leadStage?: LeadStage
}

export type ConversationStatus = 'ai' | 'waiting_human' | 'human' | 'closed'

export interface Message {
  id: string
  tenantId: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  senderType: 'lead' | 'ai' | 'agent' | 'system'
  senderAgentId: string | null
  content: string
  contentType: 'text' | 'image' | 'audio' | 'video' | 'document'
  mediaUrl: string | null
  aiMetadata: AiMetadata
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  externalId: string | null
  injectionFlags: string[] | null
  validationResult: 'valid' | 'blocked' | 'modified'
  createdAt: string
}

export interface AiMetadata {
  intent?: string
  confidence?: number
  extracted_info?: Record<string, unknown>
  tokens_used?: number
}

export interface ConversationNote {
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
  eventType: string
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
  incidentType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  leadMessage: string | null
  aiResponse: string | null
  detectionLayer: string | null
  actionTaken: string | null
  resolved: boolean | null
  resolvedBy: string | null
  createdAt: string
}

export interface MonthlyLeadCount {
  id: string
  tenantId: string
  yearMonth: string
  leadCount: number
  notified80: boolean | null
  notified100: boolean | null
  createdAt: string
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

// API response wrappers
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface SingleResponse<T> {
  data: T
}

export interface ListResponse<T> {
  data: T[]
}

export interface CursorResponse<T> {
  data: T[]
  meta: {
    nextCursor?: string
  }
}
