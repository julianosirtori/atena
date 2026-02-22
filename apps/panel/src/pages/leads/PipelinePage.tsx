import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ScoreGauge } from '../../components/ui/ScoreGauge.js'
import { timeAgo } from '../../lib/format.js'
import type { Lead, LeadStage, PaginatedResponse, SingleResponse } from '../../types/api.types.js'

const stages: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'Novo', color: 'border-gray-300' },
  { key: 'qualifying', label: 'Qualificando', color: 'border-blue-400' },
  { key: 'hot', label: 'Quente', color: 'border-red-400' },
  { key: 'human', label: 'Humano', color: 'border-yellow-400' },
  { key: 'converted', label: 'Convertido', color: 'border-green-400' },
  { key: 'lost', label: 'Perdido', color: 'border-gray-400' },
]

export function PipelinePage() {
  const { tenantId } = useTenant()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.leads.list(tenantId || '', { limit: '200' }),
    queryFn: () => api.get<PaginatedResponse<Lead>>('/leads', { limit: '200' }),
    enabled: !!tenantId,
  })

  const updateMutation = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: LeadStage }) =>
      api.put<SingleResponse<Lead>>(`/leads/${leadId}`, { stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.list(tenantId || '', { limit: '200' }) })
    },
  })

  const leads = data?.data ?? []

  function handleDragStart(e: React.DragEvent, leadId: string) {
    e.dataTransfer.setData('text/plain', leadId)
  }

  function handleDrop(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    if (leadId) {
      updateMutation.mutate({ leadId, stage })
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.key)
          return (
            <div
              key={stage.key}
              className={`min-w-[260px] flex-shrink-0 rounded-xl border-t-4 bg-white p-3 shadow-sm ${stage.color}`}
              onDrop={(e) => handleDrop(e, stage.key)}
              onDragOver={handleDragOver}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{stage.label}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {stageLeads.length}
                </span>
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{lead.name || 'Sem nome'}</p>
                        <p className="truncate text-xs text-gray-500">{lead.phone || lead.instagramId}</p>
                      </div>
                      <ScoreGauge score={lead.score} size="sm" />
                    </div>
                    {lead.lastMessageAt && (
                      <p className="mt-1 text-xs text-gray-400">{timeAgo(lead.lastMessageAt)}</p>
                    )}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lead.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
