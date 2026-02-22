export interface AgentForNotification {
  id: string
  name: string
  telegramChatId: string | null
  notificationPreferences: {
    telegram: boolean
    web_push: boolean
    sound: boolean
  } | null
  isOnline: boolean | null
}

export interface ReplyModeState {
  conversationId: string
  leadId: string
  tenantId: string
  agentId: string
}
