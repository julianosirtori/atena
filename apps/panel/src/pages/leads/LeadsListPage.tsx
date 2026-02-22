import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Table } from '../../components/ui/Table.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { EmptyState } from '../../components/ui/EmptyState.js'
import { StageBadge } from '../../components/ui/StatusBadge.js'
import { ScoreGauge } from '../../components/ui/ScoreGauge.js'
import { Button } from '../../components/ui/Button.js'
import { timeAgo } from '../../lib/format.js'
import type { Lead, PaginatedResponse } from '../../types/api.types.js'

export default function LeadsListPage() {
  const { tenantId } = useTenant()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const queryFilters = { ...filters, page: String(page), limit: '20' }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leads.list(tenantId || '', queryFilters),
    queryFn: () => api.get<PaginatedResponse<Lead>>('/leads', queryFilters),
    enabled: !!tenantId,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leads</h1>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={filters.search || ''}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1) }}
            className="w-64"
          />
          <Select
            value={filters.stage || ''}
            onChange={(e) => { setFilters({ ...filters, stage: e.target.value }); setPage(1) }}
            options={[
              { value: '', label: 'Todos os estagios' },
              { value: 'new', label: 'Novo' },
              { value: 'qualifying', label: 'Qualificando' },
              { value: 'hot', label: 'Quente' },
              { value: 'human', label: 'Humano' },
              { value: 'converted', label: 'Convertido' },
              { value: 'lost', label: 'Perdido' },
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

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState title="Nenhum lead encontrado" />
        ) : (
          <>
            <Table
              data={data.data}
              keyExtractor={(l) => l.id}
              onRowClick={(l) => navigate(`/leads/${l.id}`)}
              columns={[
                { key: 'name', header: 'Nome', render: (l) => (
                  <div>
                    <p className="font-medium">{l.name || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500">{l.phone || l.instagramId}</p>
                  </div>
                )},
                { key: 'channel', header: 'Canal', render: (l) => (
                  <span className="text-sm capitalize">{l.channel}</span>
                )},
                { key: 'stage', header: 'Estagio', render: (l) => <StageBadge stage={l.stage} /> },
                { key: 'score', header: 'Score', render: (l) => <ScoreGauge score={l.score} size="sm" /> },
                { key: 'tags', header: 'Tags', render: (l) => (
                  <div className="flex flex-wrap gap-1">
                    {(l.tags || []).map((tag) => (
                      <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{tag}</span>
                    ))}
                  </div>
                )},
                { key: 'lastMessage', header: 'Ultima Mensagem', render: (l) => (
                  <span className="text-sm text-gray-500">{l.lastMessageAt ? timeAgo(l.lastMessageAt) : '-'}</span>
                )},
              ]}
            />
            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-gray-500">
                {data.meta.total} lead{data.meta.total !== 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center px-2 text-sm text-gray-600">
                  {page} / {data.meta.totalPages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
                  Proximo
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
