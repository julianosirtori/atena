export const queryKeys = {
  tenants: {
    all: ['tenants'] as const,
    detail: (id: string) => ['tenants', id] as const,
  },
  agents: {
    list: (tenantId: string) => ['agents', tenantId] as const,
  },
  leads: {
    list: (tenantId: string, filters?: Record<string, string>) =>
      ['leads', tenantId, filters] as const,
    detail: (tenantId: string, leadId: string) =>
      ['leads', tenantId, leadId] as const,
  },
  conversations: {
    list: (tenantId: string, filters?: Record<string, string>) =>
      ['conversations', tenantId, filters] as const,
    detail: (tenantId: string, conversationId: string) =>
      ['conversations', tenantId, conversationId] as const,
  },
  messages: {
    list: (tenantId: string, conversationId: string) =>
      ['messages', tenantId, conversationId] as const,
  },
  notes: {
    list: (tenantId: string, conversationId: string) =>
      ['notes', tenantId, conversationId] as const,
  },
  leadEvents: {
    list: (tenantId: string, leadId?: string) =>
      ['leadEvents', tenantId, leadId] as const,
  },
  securityIncidents: {
    list: (tenantId: string, filters?: Record<string, string>) =>
      ['securityIncidents', tenantId, filters] as const,
  },
  billing: {
    monthlyCounts: (tenantId: string) =>
      ['billing', 'monthly-counts', tenantId] as const,
  },
  dashboard: {
    data: (tenantId: string) => ['dashboard', tenantId] as const,
  },
} as const
