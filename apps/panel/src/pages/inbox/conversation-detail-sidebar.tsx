import type { ConversationWithLead } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { STATUS_CONFIG, STAGE_CONFIG } from '@/lib/constants'
import { formatPhone, formatRelativeTime } from '@/lib/utils'
import { NotesSection } from './notes-section'
import { useConversation } from '@/hooks/use-conversations'
import { Clock, MessageSquare, User, Bot, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationDetailSidebarProps {
  conversation: ConversationWithLead
  open: boolean
  onClose: () => void
}

export function ConversationDetailSidebar({ conversation, open, onClose }: ConversationDetailSidebarProps) {
  const { data: detailData } = useConversation(conversation.id)
  const detail = detailData?.data
  const statusCfg = STATUS_CONFIG[conversation.status]
  const stageCfg = STAGE_CONFIG[conversation.leadStage]

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          // Base styles
          'flex flex-col border-l border-warm-200 bg-white overflow-y-auto transition-all duration-200',
          // Mobile: fixed overlay from right
          'fixed inset-y-0 right-0 z-50 w-80 lg:relative lg:inset-auto lg:z-auto',
          // Show/hide
          open
            ? 'translate-x-0 lg:w-80'
            : 'translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0 lg:overflow-hidden',
        )}
      >
        {/* Close button (mobile only) */}
        <div className="flex items-center justify-between border-b border-warm-100 p-4 lg:hidden">
          <span className="text-xs font-medium uppercase text-warm-500">Detalhes</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 hover:bg-warm-100 hover:text-warm-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lead info */}
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
    </>
  )
}
