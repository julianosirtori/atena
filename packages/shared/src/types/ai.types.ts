export interface TenantForPrompt {
  businessName: string
  businessDescription: string | null
  productsInfo: string | null
  pricingInfo: string | null
  faq: string | null
  businessHours: string | null
  paymentMethods: string | null
  customInstructions: string | null
  handoffRules: {
    score_threshold: number
    max_ai_turns: number
    business_hours_only: boolean
    handoff_intents: string[]
    auto_handoff_on_price: boolean
    follow_up_enabled: boolean
    follow_up_delay_hours: number
  }
}

export interface LeadForPrompt {
  name: string | null
  phone: string | null
  score: number
  stage: string
  channel: string
  tags: string[] | null
}

export interface MessageForPrompt {
  senderType: 'lead' | 'ai' | 'agent' | 'system'
  content: string
  createdAt: Date
}

export interface ParsedAIResponse {
  response: string
  intent: 'greeting' | 'question' | 'buying' | 'complaint' | 'farewell' | 'spam' | 'other'
  confidence: number
  shouldHandoff: boolean
  handoffReason: string | null
  scoreDelta: number
  extractedInfo: {
    name?: string
    email?: string
    interest?: string
  }
}

export interface SanitizationResult {
  cleanMessage: string
  flags: string[]
  isClean: boolean
}

export interface ValidationResult {
  valid: boolean
  reason?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AICallResult {
  rawText: string
  tokensUsed: number
  responseTimeMs: number
}

export interface HandoffDecision {
  shouldHandoff: boolean
  reason: string | null
  source: 'ai' | 'score' | 'confidence' | 'max_turns' | 'explicit' | 'intent' | 'validation_failure'
}

export interface NotificationPayload {
  tenantId: string
  conversationId: string
  leadId: string
  leadName: string | null
  leadScore: number
  leadChannel: string
  summary: string
}
