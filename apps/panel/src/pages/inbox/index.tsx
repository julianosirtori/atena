import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ConversationList } from './conversation-list'
import { ChatView } from './chat-view'
import { ConversationDetailSidebar } from './conversation-detail-sidebar'
import type { ConversationWithLead } from '@/types'
import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'

export default function InboxPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<ConversationWithLead | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  const activeId = conversationId ?? selected?.id

  function handleSelect(c: ConversationWithLead) {
    setSelected(c)
    navigate(`/inbox/${c.id}`)
  }

  const showChat = !!activeId && !!selected

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list: hidden on mobile when chat is open */}
      <ConversationList
        activeId={activeId}
        onSelect={handleSelect}
        className={cn(
          'w-full sm:w-80 lg:w-96 shrink-0',
          showChat && 'hidden sm:flex',
        )}
      />

      {/* Chat view */}
      {showChat ? (
        <>
          <ChatView
            conversation={selected}
            className={cn('flex-1 min-w-0', !showChat && 'hidden sm:flex')}
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar((v) => !v)}
          />
          <ConversationDetailSidebar
            conversation={selected}
            open={showSidebar}
            onClose={() => setShowSidebar(false)}
          />
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center sm:flex">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-warm-100">
              <MessageSquare size={24} className="text-warm-400" />
            </div>
            <p className="text-sm text-warm-500">Selecione uma conversa</p>
          </div>
        </div>
      )}
    </div>
  )
}
