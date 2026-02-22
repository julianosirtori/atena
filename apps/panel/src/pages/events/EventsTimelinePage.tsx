import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Select } from '../../components/ui/Select.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { EmptyState } from '../../components/ui/EmptyState.js'
import { Badge } from '../../components/ui/Badge.js'
import { formatDate } from '../../lib/format.js'
import type { LeadEvent } from '../../types/api.types.js'

const eventTypeOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'stage_change', label: 'Mudanca de Estagio' },
  { value: 'score_change', label: 'Mudanca de Score' },
  { value: 'assigned', label: 'Atribuido' },
  { value: 'unassigned', label: 'Desatribuido' },
  { value: 'tag_added', label: 'Tag Adicionada' },
  { value: 'tag_removed', label: 'Tag Removida' },
  { value: 'handoff', label: 'Handoff' },
  { value: 'follow_up_sent', label: 'Follow-up Enviado' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
  { value: 'reopened', label: 'Reaberto' },
]

const eventColors: Record<string, 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple'> = {
  stage_change: 'blue',
  score_change: 'purple',
  assigned: 'green',
  unassigned: 'gray',
  tag_added: 'cyan' as 'blue',
  tag_removed: 'gray',
  handoff: 'yellow',
  follow_up_sent: 'blue',
  converted: 'green',
  lost: 'red',
  reopened: 'blue',
}

export function EventsTimelinePage() {
  const { tenantId } = useTenant()
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = { page: String(page), limit: '50' }
  if (eventType) params.eventType = eventType

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leadEvents.list(tenantId || '', eventType || undefined),
    queryFn: () => api.get<{ data: LeadEvent[] }>('/events', params),
    enabled: !!tenantId,
  })

  const events = data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Eventos</h1>

      <Card>
        <Select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1) }}
          options={eventTypeOptions}
        />
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : events.length === 0 ? (
          <EmptyState title="Nenhum evento encontrado" />
        ) : (
          <div className="space-y-4">
            {events.map((evt) => (
              <div key={evt.id} className="flex items-start gap-4 border-l-2 border-gray-200 pl-4">
                <Badge color={eventColors[evt.eventType] || 'gray'}>
                  {evt.eventType.replace(/_/g, ' ')}
                </Badge>
                <div className="flex-1">
                  {evt.fromValue && (
                    <p className="text-sm">
                      <span className="text-gray-500">{evt.fromValue}</span>
                      {' → '}
                      <span className="font-medium">{evt.toValue}</span>
                    </p>
                  )}
                  {!evt.fromValue && evt.toValue && (
                    <p className="text-sm font-medium">{evt.toValue}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatDate(evt.createdAt)} - {evt.createdBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
