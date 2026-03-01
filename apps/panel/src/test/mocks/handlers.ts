import { http, HttpResponse } from 'msw'

const API_URL = ''

const mockTenant = {
  id: 'test-tenant-id',
  name: 'Test Tenant',
  slug: 'test-tenant',
  plan: 'starter' as const,
  leadsLimit: 300,
  agentsLimit: 3,
  businessName: 'Negócio Teste',
  businessDescription: 'Descrição do negócio teste',
  productsInfo: null,
  pricingInfo: null,
  faq: null,
  businessHours: 'Segunda a sexta, 9h às 18h',
  paymentMethods: null,
  customInstructions: null,
  fallbackMessage: null,
  whatsappProvider: 'zapi' as const,
  whatsappConfig: {},
  instagramConfig: {},
  telegramBotConfig: {},
  handoffRules: {
    score_threshold: 60,
    max_ai_turns: 15,
    business_hours_only: false,
    handoff_intents: ['complaint'],
    auto_handoff_on_price: false,
    follow_up_enabled: false,
    follow_up_delay_hours: 24,
  },
  quickReplies: [
    { id: 'qr-1', label: 'Horário', text: 'Nosso horário é de 9h às 18h.' },
    { id: 'qr-2', label: 'Preço', text: 'Consulte nossa tabela de preços.' },
  ],
  billingStatus: 'trial' as const,
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockAgent = {
  id: 'test-agent-id',
  tenantId: 'test-tenant-id',
  name: 'Agente Teste',
  email: 'agente@teste.com',
  role: 'admin' as const,
  isActive: true,
  isOnline: true,
  maxConcurrent: 10,
  activeConversations: 2,
  telegramChatId: null,
  notificationPreferences: { telegram: true, web_push: true, sound: true },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockLead = {
  id: 'test-lead-id',
  tenantId: 'test-tenant-id',
  name: 'Lead Teste',
  phone: '+5511999887766',
  instagramId: null,
  email: 'lead@teste.com',
  avatarUrl: null,
  channel: 'whatsapp' as const,
  source: 'google',
  utmSource: 'google',
  utmMedium: 'cpc',
  utmCampaign: null,
  stage: 'qualifying' as const,
  score: 45,
  tags: ['interessado'],
  assignedTo: null,
  activeCampaignId: null,
  firstContactAt: new Date().toISOString(),
  lastContactAt: new Date().toISOString(),
  lastMessageAt: new Date().toISOString(),
  convertedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockConversation = {
  id: 'test-conv-id',
  tenantId: 'test-tenant-id',
  leadId: 'test-lead-id',
  channel: 'whatsapp' as const,
  status: 'ai' as const,
  assignedAgentId: null,
  campaignId: null,
  aiMessagesCount: 3,
  humanMessagesCount: 0,
  leadMessagesCount: 4,
  firstResponseTimeMs: 1200,
  aiModel: 'claude-sonnet-4-20250514',
  aiSummary: 'Lead perguntou sobre preços.',
  handoffReason: null,
  handoffAt: null,
  openedAt: new Date().toISOString(),
  closedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  leadName: 'Lead Teste',
  leadPhone: '+5511999887766',
  leadScore: 45,
  leadStage: 'qualifying' as const,
}

const mockMessage = {
  id: 'test-msg-id',
  tenantId: 'test-tenant-id',
  conversationId: 'test-conv-id',
  direction: 'inbound' as const,
  senderType: 'lead' as const,
  senderAgentId: null,
  content: 'Olá, gostaria de saber o preço.',
  contentType: 'text' as const,
  mediaUrl: null,
  aiMetadata: {},
  deliveryStatus: 'delivered' as const,
  externalId: null,
  injectionFlags: [],
  validationResult: 'valid' as const,
  correlationId: null,
  createdAt: new Date().toISOString(),
}

const mockDashboard = {
  leadsToday: 5,
  leadsMonth: 42,
  leadsLimit: 300,
  avgScore: 38,
  handoffRate: 0.12,
  conversationsByStatus: { ai: 10, waiting_human: 3, human: 2, closed: 15 },
  topIntents: [
    { intent: 'preço', count: 15 },
    { intent: 'horário', count: 8 },
  ],
}

export const handlers = [
  // Health
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  }),

  // Tenants
  http.get(`${API_URL}/api/v1/tenants`, () => {
    return HttpResponse.json({
      data: [{ id: mockTenant.id, name: mockTenant.name, slug: mockTenant.slug, plan: mockTenant.plan }],
    })
  }),

  http.get(`${API_URL}/api/v1/tenants/:id`, () => {
    return HttpResponse.json({ data: mockTenant })
  }),

  http.put(`${API_URL}/api/v1/tenants/:id`, () => {
    return HttpResponse.json({ data: mockTenant })
  }),

  http.post(`${API_URL}/api/v1/tenants/:id/simulate`, () => {
    return HttpResponse.json({
      data: { response: 'Resposta simulada da IA', intent: 'greeting', confidence: 0.95 },
    })
  }),

  // Agents
  http.get(`${API_URL}/api/v1/tenants/:tenantId/agents`, () => {
    return HttpResponse.json({ data: [mockAgent] })
  }),

  // Leads
  http.get(`${API_URL}/api/v1/tenants/:tenantId/leads`, () => {
    return HttpResponse.json({
      data: [mockLead],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })
  }),

  http.get(`${API_URL}/api/v1/tenants/:tenantId/leads/:leadId`, () => {
    return HttpResponse.json({ data: mockLead })
  }),

  http.put(`${API_URL}/api/v1/tenants/:tenantId/leads/:leadId`, () => {
    return HttpResponse.json({ data: mockLead })
  }),

  // Lead Events
  http.get(`${API_URL}/api/v1/tenants/:tenantId/leads/:leadId/events`, () => {
    return HttpResponse.json({ data: [] })
  }),

  http.get(`${API_URL}/api/v1/tenants/:tenantId/events`, () => {
    return HttpResponse.json({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    })
  }),

  // Conversations
  http.get(`${API_URL}/api/v1/tenants/:tenantId/conversations`, () => {
    return HttpResponse.json({
      data: [mockConversation],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    })
  }),

  http.get(`${API_URL}/api/v1/tenants/:tenantId/conversations/:convId`, () => {
    return HttpResponse.json({ data: mockConversation })
  }),

  // Messages
  http.get(`${API_URL}/api/v1/tenants/:tenantId/conversations/:convId/messages`, () => {
    return HttpResponse.json({ data: [mockMessage], meta: {} })
  }),

  http.post(`${API_URL}/api/v1/tenants/:tenantId/conversations/:convId/messages`, () => {
    return HttpResponse.json({
      data: { ...mockMessage, direction: 'outbound', senderType: 'agent' },
    })
  }),

  // Notes
  http.get(`${API_URL}/api/v1/tenants/:tenantId/conversations/:convId/notes`, () => {
    return HttpResponse.json({ data: [] })
  }),

  // Security Incidents
  http.get(`${API_URL}/api/v1/tenants/:tenantId/security-incidents`, () => {
    return HttpResponse.json({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    })
  }),

  // Billing
  http.get(`${API_URL}/api/v1/tenants/:tenantId/billing/monthly-counts`, () => {
    return HttpResponse.json({ data: [] })
  }),

  // Dashboard
  http.get(`${API_URL}/api/v1/tenants/:tenantId/dashboard`, () => {
    return HttpResponse.json({ data: mockDashboard })
  }),
]
