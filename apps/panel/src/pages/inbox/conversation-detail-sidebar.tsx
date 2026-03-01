import type { ConversationWithLead } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { STATUS_CONFIG, STAGE_CONFIG } from '@/lib/constants'
import { formatPhone, formatRelativeTime } from '@/lib/utils'
import { NotesSection } from './notes-section'
import { useConversation } from '@/hooks/use-conversations'
import { Clock, MessageSquare, User, Bot } from 'lucide-react'

interface ConversationDetailSidebarProps {
  conversation: ConversationWithLead
}

export function ConversationDetailSidebar({ conversation }: ConversationDetailSidebarProps) {
  const { data: detailData } = useConversation(conversation.id)
  const detail = detailData?.data
  const statusCfg = STATUS_CONFIG[conversation.status]
  const stageCfg = STAGE_CONFIG[conversation.leadStage]

  return (
    <div className="hidden lg:flex lg:w-80 flex-col border-l border-warm-200 bg-white overflow-y-auto">
      <div className="border-b border-warm-100 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={conversation.leadName} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-sm font-semibold text-warm-900">
              {conversation.leadName ?? 'Sem nome'}
            </h3>
            <p className="text-xs text-warm-500">{formatPhone(conversation.leadPhone)}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
          <Badge color={stageCfg.color} bg={stageCfg.bg}>{stageCfg.label}</Badge>
          <Badge>Score: {conversation.leadScore}</Badge>
        </div>
      </div>

      <div className="border-b border-warm-100 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-warm-500">
          <Clock size={14} />
          <span>Aberta {formatRelativeTime(conversation.openedAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-warm-500">
          <Bot size={14} />
          <span>{conversation.aiMessagesCount} msgs IA</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-warm-500">
          <User size={14} />
          <span>{conversation.humanMessagesCount} msgs humano</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-warm-500">
          <MessageSquare size={14} />
          <span>{conversation.leadMessagesCount} msgs lead</span>
        </div>
      </div>

      {detail?.handoffReason && (
        <div className="border-b border-warm-100 p-4">
          <h4 className="mb-1 text-xs font-medium uppercase text-warm-500">Motivo do handoff</h4>
          <p className="text-sm text-warm-700">{detail.handoffReason}</p>
        </div>
      )}

      {detail?.aiSummary && (
        <div className="border-b border-warm-100 p-4">
          <h4 className="mb-1 text-xs font-medium uppercase text-warm-500">Resumo IA</h4>
          <p className="text-sm text-warm-600">{detail.aiSummary}</p>
        </div>
      )}

      <div className="p-4">
        <NotesSection conversationId={conversation.id} />
      </div>
    </div>
  )
}
