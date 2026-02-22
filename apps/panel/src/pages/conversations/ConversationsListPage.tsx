import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Table } from '../../components/ui/Table.js'
import { Select } from '../../components/ui/Select.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { EmptyState } from '../../components/ui/EmptyState.js'
import { ConversationStatusBadge } from '../../components/ui/StatusBadge.js'
import { Button } from '../../components/ui/Button.js'
import { timeAgo } from '../../lib/format.js'
import type { Conversation, PaginatedResponse } from '../../types/api.types.js'

export function ConversationsListPage() {
  const { tenantId } = useTenant()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const queryFilters = { ...filters, page: String(page), limit: '20' }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.conversations.list(tenantId || '', queryFilters),
    queryFn: () => api.get<PaginatedResponse<Conversation>>('/conversations', queryFilters),
    enabled: !!tenantId,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversas</h1>

      <Card>
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.status || ''}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'ai', label: 'IA' },
              { value: 'waiting_human', label: 'Aguardando Humano' },
              { value: 'human', label: 'Humano' },
              { value: 'closed', label: 'Encerrada' },
            ]}
          />
          <Select
            value={filters.channel || ''}
            onChange={(e) => { setFilters({ ...filters, channel: e.target.value }); setPage(1) }}
            options={[
              { value: '', label: 'Todos os canais' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'instagram', label: 'Instagram' },
            ]}
          />
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="Nenhuma conversa encontrada" />
        ) : (
          <>
            <Table
              data={data.data}
              keyExtractor={(c) => c.id}
              onRowClick={(c) => navigate(`/conversations/${c.id}`)}
              columns={[
                {
                  key: 'lead',
                  header: 'Lead',
                  render: (c) => (
                    <div>
                      <p className="font-medium">{c.leadName || 'Sem nome'}</p>
                      <p className="text-xs text-gray-500">{c.leadPhone || '-'}</p>
                    </div>
                  ),
                },
                { key: 'channel', header: 'Canal', render: (c) => <span className="capitalize">{c.channel}</span> },
                { key: 'status', header: 'Status', render: (c) => <ConversationStatusBadge status={c.status} /> },
                {
                  key: 'messages',
                  header: 'Mensagens',
                  render: (c) => (
                    <span className="text-sm text-gray-600">
                      {(c.aiMessagesCount || 0) + (c.humanMessagesCount || 0) + (c.leadMessagesCount || 0)}
                    </span>
                  ),
                },
                { key: 'summary', header: 'Resumo', render: (c) => (
                  <span className="text-sm text-gray-500 line-clamp-1">{c.aiSummary || '-'}</span>
                )},
                { key: 'createdAt', header: 'Criada', render: (c) => (
                  <span className="text-sm text-gray-500">{timeAgo(c.createdAt)}</span>
                )},
              ]}
            />
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-gray-500">{data.meta.total} conversa{data.meta.total !== 1 ? 's' : ''}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="flex items-center px-2 text-sm text-gray-600">{page} / {data.meta.totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Proximo</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
