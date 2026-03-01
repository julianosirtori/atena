import { useState } from 'react'
import { Search, Inbox as InboxIcon } from 'lucide-react'
import { useConversations } from '@/hooks/use-conversations'
import { ConversationCard } from './conversation-card'
import { Tabs } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/shared/empty-state'
import type { ConversationStatus, ConversationWithLead } from '@/types'
import { cn } from '@/lib/utils'

type TabValue = 'all' | ConversationStatus

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ai', label: 'IA' },
  { value: 'waiting_human', label: 'Aguardando' },
  { value: 'human', label: 'Humano' },
  { value: 'closed', label: 'Fechada' },
]

interface ConversationListProps {
  activeId: string | undefined
  onSelect: (c: ConversationWithLead) => void
  className?: string
}

export function ConversationList({ activeId, onSelect, className }: ConversationListProps) {
  const [tab, setTab] = useState<TabValue>('all')
  const [search, setSearch] = useState('')

  const filters = {
    ...(tab !== 'all' && { status: tab }),
    limit: 50,
  }

  const { data, isLoading } = useConversations(filters)
  const conversations = data?.data ?? []

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.leadName?.toLowerCase().includes(search.toLowerCase()) ||
          c.leadPhone?.includes(search),
      )
    : conversations

  return (
    <div className={cn('flex flex-col border-r border-warm-200 bg-white', className)}>
      {/* Search */}
      <div className="border-b border-warm-100 p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="h-9 w-full rounded-lg bg-warm-50 pl-9 pr-3 text-sm text-warm-900 placeholder:text-warm-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onChange={setTab} tabs={tabs} className="px-3" />

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="Nenhuma conversa"
            description="As conversas aparecerão aqui quando leads enviarem mensagens."
          />
        ) : (
          filtered.map((c) => (
            <ConversationCard
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
              onClick={() => onSelect(c)}
            />
          ))
        )}
      </div>
    </div>
  )
}
