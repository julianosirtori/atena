import { useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMessages } from '@/hooks/use-conversations'
import { MessageBubble } from './message-bubble'
import { Spinner } from '@/components/ui/spinner'
import type { ConversationWithLead } from '@/types'
import { cn, formatPhone } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { STATUS_CONFIG } from '@/lib/constants'

interface ChatViewProps {
  conversation: ConversationWithLead
  className?: string
  showSidebar?: boolean
  onToggleSidebar?: () => void
}

export function ChatView({ conversation, className, showSidebar, onToggleSidebar }: ChatViewProps) {
  const navigate = useNavigate()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessages(
    conversation.id,
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)

  // Pages are newest-first from infinite query; reverse pages to get oldest-first, then flatMap preserves ASC within each page
  const allMessages = data?.pages ? [...data.pages].reverse().flatMap((p) => p.data) : []

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [isLoading, conversation.id])

  // Infinite scroll up to load older messages
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollTop < 100) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const statusCfg = STATUS_CONFIG[conversation.status]

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-warm-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/inbox')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100 sm:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar name={conversation.leadName} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-warm-900">
            {conversation.leadName ?? formatPhone(conversation.leadPhone)}
          </h3>
          <div className="flex items-center gap-1.5">
            <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
          </div>
        </div>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-warm-500 transition-colors hover:bg-warm-100 hover:text-warm-700"
            title={showSidebar ? 'Fechar detalhes' : 'Ver detalhes'}
          >
            {showSidebar ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}
        <div ref={topSentinelRef} />
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : (
          allMessages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>
    </div>
  )
}
