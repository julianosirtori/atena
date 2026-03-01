import type { LeadStage, ConversationStatus, SenderType, Channel, EventType, CampaignStatus, CampaignType, Severity, Plan, BillingStatus, IncidentType } from '@/types'

export const STAGE_CONFIG: Record<LeadStage, { label: string; color: string; bg: string }> = {
  new: { label: 'Novo', color: 'text-gray-700', bg: 'bg-gray-100' },
  qualifying: { label: 'Qualificando', color: 'text-blue-700', bg: 'bg-blue-100' },
  hot: { label: 'Quente', color: 'text-amber-700', bg: 'bg-amber-100' },
  human: { label: 'Humano', color: 'text-violet-700', bg: 'bg-violet-100' },
  converted: { label: 'Convertido', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  lost: { label: 'Perdido', color: 'text-red-700', bg: 'bg-red-100' },
}

export const STATUS_CONFIG: Record<ConversationStatus, { label: string; color: string; bg: string }> = {
  ai: { label: 'IA', color: 'text-blue-700', bg: 'bg-blue-100' },
  waiting_human: { label: 'Aguardando', color: 'text-amber-700', bg: 'bg-amber-100' },
  human: { label: 'Humano', color: 'text-violet-700', bg: 'bg-violet-100' },
  closed: { label: 'Fechada', color: 'text-gray-700', bg: 'bg-gray-100' },
}

export const SENDER_COLOR: Record<SenderType, string> = {
  lead: 'bg-slate-100 text-slate-800',
  ai: 'bg-blue-100 text-blue-800',
  agent: 'bg-emerald-100 text-emerald-800',
  system: 'bg-amber-100 text-amber-800',
}

export const CHANNEL_CONFIG: Record<Channel, { label: string; icon: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle' },
  instagram: { label: 'Instagram', icon: 'Instagram' },
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  stage_change: 'Mudou de estágio',
  score_change: 'Score alterado',
  assigned: 'Atribuído',
  unassigned: 'Desatribuído',
  tag_added: 'Tag adicionada',
  tag_removed: 'Tag removida',
  handoff: 'Transferido para humano',
  follow_up_sent: 'Follow-up enviado',
  converted: 'Convertido',
  lost: 'Perdido',
  reopened: 'Reaberto',
  campaign_joined: 'Entrou na campanha',
  campaign_completed: 'Completou campanha',
  pipeline_stage_moved: 'Moveu no pipeline',
  automation_triggered: 'Automação disparada',
}

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Rascunho', color: 'text-gray-700', bg: 'bg-gray-100' },
  active: { label: 'Ativa', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  paused: { label: 'Pausada', color: 'text-amber-700', bg: 'bg-amber-100' },
  completed: { label: 'Concluída', color: 'text-blue-700', bg: 'bg-blue-100' },
}

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  launch: 'Lançamento',
  promotion: 'Promoção',
  recurring: 'Recorrente',
  evergreen: 'Evergreen',
  other: 'Outro',
}

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string }> = {
  low: { label: 'Baixa', color: 'text-gray-700', bg: 'bg-gray-100' },
  medium: { label: 'Média', color: 'text-amber-700', bg: 'bg-amber-100' },
  high: { label: 'Alta', color: 'text-orange-700', bg: 'bg-orange-100' },
  critical: { label: 'Crítica', color: 'text-red-700', bg: 'bg-red-100' },
}

export const PLAN_CONFIG: Record<Plan, { label: string; color: string; bg: string }> = {
  starter: { label: 'Starter', color: 'text-gray-700', bg: 'bg-gray-100' },
  pro: { label: 'Pro', color: 'text-blue-700', bg: 'bg-blue-100' },
  scale: { label: 'Scale', color: 'text-violet-700', bg: 'bg-violet-100' },
}

export const BILLING_STATUS_CONFIG: Record<BillingStatus, { label: string; color: string; bg: string }> = {
  trial: { label: 'Trial', color: 'text-amber-700', bg: 'bg-amber-100' },
  active: { label: 'Ativo', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  past_due: { label: 'Inadimplente', color: 'text-red-700', bg: 'bg-red-100' },
  cancelled: { label: 'Cancelado', color: 'text-gray-700', bg: 'bg-gray-100' },
}

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  injection_attempt: 'Tentativa de injeção',
  prompt_leak: 'Vazamento de prompt',
  off_topic: 'Fora do tema',
  over_promise: 'Promessa excessiva',
  validation_failed: 'Falha na validação',
  identity_leak: 'Vazamento de identidade',
}

export const DETECTION_LAYER_LABEL: Record<string, string> = {
  sanitization: 'Sanitização',
  prompt: 'Prompt',
  validation: 'Validação',
}

export const ACTION_TAKEN_LABEL: Record<string, string> = {
  blocked: 'Bloqueado',
  handoff: 'Transferido',
  generic_response: 'Resposta genérica',
}
