import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Table } from '../../components/ui/Table.js'
import { Select } from '../../components/ui/Select.js'
import { Button } from '../../components/ui/Button.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { EmptyState } from '../../components/ui/EmptyState.js'
import { formatDate } from '../../lib/format.js'
import type { SecurityIncident, PaginatedResponse, SingleResponse } from '../../types/api.types.js'

const severityColors: Record<string, 'gray' | 'yellow' | 'red' | 'purple'> = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
  critical: 'purple',
}

export function SecurityIncidentsPage() {
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const queryFilters = { ...filters, page: String(page), limit: '20' }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.securityIncidents.list(tenantId || '', queryFilters),
    queryFn: () => api.get<PaginatedResponse<SecurityIncident>>('/security-incidents', queryFilters),
    enabled: !!tenantId,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ incidentId, resolvedBy }: { incidentId: string; resolvedBy: string }) =>
      api.put<SingleResponse<SecurityIncident>>(`/security-incidents/${incidentId}`, { resolvedBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.securityIncidents.list(tenantId || '', queryFilters) })
    },
  })

  const incidents = data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Incidentes de Seguranca</h1>

      <Card>
        <div className="flex flex-wrap gap-3">
          <Select
            value={filters.severity || ''}
            onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(1) }}
            options={[
              { value: '', label: 'Todas as severidades' },
              { value: 'low', label: 'Baixa' },
              { value: 'medium', label: 'Media' },
              { value: 'high', label: 'Alta' },
              { value: 'critical', label: 'Critica' },
            ]}
          />
          <Select
            value={filters.resolved || ''}
            onChange={(e) => { setFilters({ ...filters, resolved: e.target.value }); setPage(1) }}
            options={[
              { value: '', label: 'Todos' },
              { value: 'false', label: 'Pendentes' },
              { value: 'true', label: 'Resolvidos' },
            ]}
          />
        </div>
      </Card>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : incidents.length === 0 ? (
          <EmptyState title="Nenhum incidente encontrado" />
        ) : (
          <div className="divide-y">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge color={severityColors[incident.severity] || 'gray'}>
                      {incident.severity}
                    </Badge>
                    <span className="text-sm font-medium">{incident.incidentType.replace(/_/g, ' ')}</span>
                    {incident.resolved ? (
                      <Badge color="green">Resolvido</Badge>
                    ) : (
                      <Badge color="red">Pendente</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatDate(incident.createdAt)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
                    >
                      {expanded === incident.id ? 'Ocultar' : 'Detalhes'}
                    </Button>
                    {!incident.resolved && (
                      <Button
                        size="sm"
                        onClick={() =>
                          resolveMutation.mutate({
                            incidentId: incident.id,
                            resolvedBy: '00000000-0000-0000-0000-000000000000',
                          })
                        }
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
                {expanded === incident.id && (
                  <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                    {incident.leadMessage && (
                      <div>
                        <span className="font-medium text-gray-500">Mensagem do Lead:</span>
                        <p className="mt-1">{incident.leadMessage}</p>
                      </div>
                    )}
                    {incident.aiResponse && (
                      <div>
                        <span className="font-medium text-gray-500">Resposta IA:</span>
                        <p className="mt-1">{incident.aiResponse}</p>
                      </div>
                    )}
                    {incident.detectionLayer && (
                      <p><span className="font-medium text-gray-500">Camada:</span> {incident.detectionLayer}</p>
                    )}
                    {incident.actionTaken && (
                      <p><span className="font-medium text-gray-500">Acao:</span> {incident.actionTaken}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
