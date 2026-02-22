import type { ConversationStatus, LeadStage } from '../../types/api.types.js'

const stageLabels: Record<LeadStage, string> = {
  new: 'Novo',
  qualifying: 'Qualificando',
  hot: 'Quente',
  human: 'Humano',
  converted: 'Convertido',
  lost: 'Perdido',
}

const stageColors: Record<LeadStage, string> = {
  new: 'bg-gray-100 text-gray-700',
  qualifying: 'bg-blue-100 text-blue-700',
  hot: 'bg-red-100 text-red-700',
  human: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-gray-200 text-gray-500',
}

const statusLabels: Record<ConversationStatus, string> = {
  ai: 'IA',
  waiting_human: 'Aguardando',
  human: 'Humano',
  closed: 'Encerrada',
}

const statusColors: Record<ConversationStatus, string> = {
  ai: 'bg-blue-100 text-blue-700',
  waiting_human: 'bg-yellow-100 text-yellow-800',
  human: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColors[stage]}`}>
      {stageLabels[stage]}
    </span>
  )
}

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  )
}
