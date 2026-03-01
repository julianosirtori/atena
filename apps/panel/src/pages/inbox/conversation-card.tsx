import type { ConversationWithLead } from '@/types'
import { cn, formatRelativeTime, formatPhone, truncate } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG, CHANNEL_CONFIG } from '@/lib/constants'
import { MessageCircle, Instagram } from 'lucide-react'

interface ConversationCardProps {
  conversation: ConversationWithLead
  isActive: boolean
  onClick: () => void
}

const channelIcons = {
  whatsapp: MessageCircle,
  instagram: Instagram,
}

export function ConversationCard({ conversation, isActive, onClick }: ConversationCardProps) {
  const statusCfg = STATUS_CONFIG[conversation.status]
  const ChannelIcon = channelIcons[conversation.channel]

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
        isActive ? 'bg-amber-50 border border-amber-200' : 'hover:bg-warm-50 border border-transparent',
      )}
    >
      <Avatar name={conversation.leadName} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-warm-900">
            {conversation.leadName ?? formatPhone(conversation.leadPhone)}
          </span>
          <span className="shrink-0 text-[10px] text-warm-400">
            {formatRelativeTime(conversation.createdAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
          <ChannelIcon size={12} className="text-warm-400" />
        </div>
        {conversation.aiSummary && (
          <p className="mt-1 text-xs text-warm-500 leading-relaxed">
            {truncate(conversation.aiSummary, 80)}
          </p>
        )}
      </div>
    </button>
  )
}
