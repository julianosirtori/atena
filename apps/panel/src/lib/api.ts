import { API_URL } from './env'
import type {
  Tenant,
  TenantListItem,
  Agent,
  Lead,
  ConversationWithLead,
  Conversation,
  Message,
  Note,
  LeadEvent,
  SecurityIncident,
  Campaign,
  CampaignMetrics,
  DashboardData,
  MonthlyLeadCount,
  PaginatedResponse,
  CursorResponse,
  SingleResponse,
  ListResponse,
} from '@/types'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// Tenants
export function getTenants() {
  return request<ListResponse<TenantListItem>>('/api/v1/tenants')
}

export function getTenant(id: string) {
  return request<SingleResponse<Tenant>>(`/api/v1/tenants/${id}`)
}

export function updateTenant(id: string, body: Partial<Tenant>) {
  return request<SingleResponse<Tenant>>(`/api/v1/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// Agents
export function getAgents(tenantId: string) {
  return request<ListResponse<Agent>>(`/api/v1/tenants/${tenantId}/agents`)
}

export function createAgent(tenantId: string, body: Record<string, unknown>) {
  return request<SingleResponse<Agent>>(`/api/v1/tenants/${tenantId}/agents`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAgent(tenantId: string, agentId: string, body: Partial<Agent>) {
  return request<SingleResponse<Agent>>(`/api/v1/tenants/${tenantId}/agents/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteAgent(tenantId: string, agentId: string) {
  return request<void>(`/api/v1/tenants/${tenantId}/agents/${agentId}`, {
    method: 'DELETE',
  })
}

// Leads
export function getLeads(
  tenantId: string,
  filters: {
    page?: number
    limit?: number
    stage?: string
    channel?: string
    search?: string
    minScore?: number
    maxScore?: number
    tags?: string
  } = {},
) {
  return request<PaginatedResponse<Lead>>(`/api/v1/tenants/${tenantId}/leads${qs(filters)}`)
}

export function getLead(tenantId: string, leadId: string) {
  return request<SingleResponse<Lead>>(`/api/v1/tenants/${tenantId}/leads/${leadId}`)
}

export function updateLead(tenantId: string, leadId: string, body: Partial<Lead>) {
  return request<SingleResponse<Lead>>(`/api/v1/tenants/${tenantId}/leads/${leadId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// Lead Events
export function getLeadEvents(
  tenantId: string,
  leadId: string,
  filters: { eventType?: string } = {},
) {
  return request<ListResponse<LeadEvent>>(
    `/api/v1/tenants/${tenantId}/leads/${leadId}/events${qs(filters)}`,
  )
}

export function getAllEvents(
  tenantId: string,
  filters: { page?: number; limit?: number; eventType?: string } = {},
) {
  return request<PaginatedResponse<LeadEvent>>(
    `/api/v1/tenants/${tenantId}/events${qs(filters)}`,
  )
}

// Conversations
export function getConversations(
  tenantId: string,
  filters: { page?: number; limit?: number; status?: string; channel?: string } = {},
) {
  return request<PaginatedResponse<ConversationWithLead>>(
    `/api/v1/tenants/${tenantId}/conversations${qs(filters)}`,
  )
}

export function getConversation(tenantId: string, conversationId: string) {
  return request<SingleResponse<Conversation>>(
    `/api/v1/tenants/${tenantId}/conversations/${conversationId}`,
  )
}

// Messages
export function getMessages(
  tenantId: string,
  conversationId: string,
  params: { cursor?: string; limit?: number } = {},
) {
  return request<CursorResponse<Message>>(
    `/api/v1/tenants/${tenantId}/conversations/${conversationId}/messages${qs(params)}`,
  )
}

// Notes
export function getNotes(tenantId: string, conversationId: string) {
  return request<ListResponse<Note>>(
    `/api/v1/tenants/${tenantId}/conversations/${conversationId}/notes`,
  )
}

export function createNote(
  tenantId: string,
  conversationId: string,
  body: { agentId: string; content: string },
) {
  return request<SingleResponse<Note>>(
    `/api/v1/tenants/${tenantId}/conversations/${conversationId}/notes`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

// Security Incidents
export function getSecurityIncidents(
  tenantId: string,
  filters: {
    page?: number
    limit?: number
    severity?: string
    resolved?: string
    incidentType?: string
  } = {},
) {
  return request<PaginatedResponse<SecurityIncident>>(
    `/api/v1/tenants/${tenantId}/security-incidents${qs(filters)}`,
  )
}

export function resolveSecurityIncident(
  tenantId: string,
  incidentId: string,
  body: { resolvedBy: string },
) {
  return request<SingleResponse<SecurityIncident>>(
    `/api/v1/tenants/${tenantId}/security-incidents/${incidentId}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

// Billing
export function getBillingCounts(tenantId: string) {
  return request<ListResponse<MonthlyLeadCount>>(
    `/api/v1/tenants/${tenantId}/billing/monthly-counts`,
  )
}

// Dashboard
export function getDashboard(tenantId: string) {
  return request<SingleResponse<DashboardData>>(`/api/v1/tenants/${tenantId}/dashboard`)
}

// Campaigns
export function getCampaigns(
  tenantId: string,
  filters: { page?: number; limit?: number; status?: string; type?: string } = {},
) {
  return request<PaginatedResponse<Campaign>>(
    `/api/v1/tenants/${tenantId}/campaigns${qs(filters)}`,
  )
}

export function getCampaign(tenantId: string, campaignId: string) {
  return request<SingleResponse<Campaign>>(
    `/api/v1/tenants/${tenantId}/campaigns/${campaignId}`,
  )
}

export function createCampaign(tenantId: string, body: Record<string, unknown>) {
  return request<SingleResponse<Campaign>>(`/api/v1/tenants/${tenantId}/campaigns`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCampaign(
  tenantId: string,
  campaignId: string,
  body: Partial<Campaign>,
) {
  return request<SingleResponse<Campaign>>(
    `/api/v1/tenants/${tenantId}/campaigns/${campaignId}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function deleteCampaign(tenantId: string, campaignId: string) {
  return request<void>(`/api/v1/tenants/${tenantId}/campaigns/${campaignId}`, {
    method: 'DELETE',
  })
}

export function activateCampaign(tenantId: string, campaignId: string) {
  return request<SingleResponse<Campaign>>(
    `/api/v1/tenants/${tenantId}/campaigns/${campaignId}/activate`,
    { method: 'POST' },
  )
}

export function pauseCampaign(tenantId: string, campaignId: string) {
  return request<SingleResponse<Campaign>>(
    `/api/v1/tenants/${tenantId}/campaigns/${campaignId}/pause`,
    { method: 'POST' },
  )
}

export function completeCampaign(tenantId: string, campaignId: string) {
  return request<SingleResponse<Campaign>>(
    `/api/v1/tenants/${tenantId}/campaigns/${campaignId}/complete`,
    { method: 'POST' },
  )
}

export function getCampaignMetrics(tenantId: string, campaignId: string) {
  return request<SingleResponse<CampaignMetrics>>(
    `/api/v1/tenants/${tenantId}/campaigns/${campaignId}/metrics`,
  )
}
