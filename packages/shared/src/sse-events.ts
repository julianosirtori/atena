export type SSEEventType =
  | 'new_message'
  | 'conversation_updated'
  | 'lead_updated'
  | 'handoff_triggered'

export interface SSEEventData {
  conversationId?: string
  leadId?: string
  messageId?: string
  status?: string
  handoffReason?: string
  source?: string
}

export interface SSEEvent {
  type: SSEEventType
  data: SSEEventData
  timestamp: string
}
