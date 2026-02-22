import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { StageBadge } from '../../components/ui/StatusBadge.js'
import { ConversationStatusBadge } from '../../components/ui/StatusBadge.js'
import { ScoreGauge } from '../../components/ui/ScoreGauge.js'
import { Badge } from '../../components/ui/Badge.js'
import { formatDate, timeAgo } from '../../lib/format.js'
import type { Lead, Conversation, LeadEvent, SingleResponse, ListResponse } from '../../types/api.types.js'

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()

  const { data: leadData, isLoading } = useQuery({
    queryKey: queryKeys.leads.detail(tenantId || '', leadId || ''),
    queryFn: () => api.get<SingleResponse<Lead>>(`/leads/${leadId}`),
    enabled: !!tenantId && !!leadId,
  })

  const { data: conversationsData } = useQuery({
    queryKey: [...queryKeys.conversations.list(tenantId || ''), 'lead', leadId],
    queryFn: () => api.get<{ data: Conversation[] }>('/conversations', { page: '1', limit: '50' }),
    enabled: !!tenantId && !!leadId,
  })

  const { data: eventsData } = useQuery({
    queryKey: queryKeys.leadEvents.list(tenantId || '', leadId),
    queryFn: () => api.get<ListResponse<LeadEvent>>(`/leads/${leadId}/events`),
    enabled: !!tenantId && !!leadId,
  })

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put<SingleResponse<Lead>>(`/leads/${leadId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(tenantId || '', leadId || '') })
    },
  })

  const lead = leadData?.data
  const conversations = (conversationsData?.data || []).filter((c: Conversation) => c.leadId === leadId)
  const events = eventsData?.data || []

  if (isLoading || !lead) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/leads" className="text-sm text-gray-500 hover:text-gray-700">Leads</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">{lead.name || 'Sem nome'}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead info */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{lead.name || 'Sem nome'}</h2>
                <p className="text-sm text-gray-500">{lead.phone || lead.instagramId || lead.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StageBadge stage={lead.stage} />
                  <span className="text-sm capitalize text-gray-500">{lead.channel}</span>
                </div>
              </div>
              <ScoreGauge score={lead.score} size="lg" />
            </div>
          </Card>

          {/* Tags */}
          <TagsEditor
            tags={lead.tags || []}
            onSave={(tags) => updateMutation.mutate({ tags })}
          />

          {/* Conversations */}
          <Card>
            <h3 className="mb-3 font-semibold">Conversas</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma conversa encontrada.</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv: Conversation) => (
                  <Link
                    key={conv.id}
                    to={`/conversations/${conv.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                  >
                    <div>
                      <ConversationStatusBadge status={conv.status} />
                      <span className="ml-2 text-sm text-gray-500">{conv.aiSummary || 'Sem resumo'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{conv.createdAt ? timeAgo(conv.createdAt) : ''}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Events timeline */}
          <Card>
            <h3 className="mb-3 font-semibold">Historico de Eventos</h3>
            {events.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-3">
                {events.map((evt: LeadEvent) => (
                  <div key={evt.id} className="flex items-start gap-3 border-l-2 border-gray-200 pl-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{evt.eventType.replace(/_/g, ' ')}</p>
                      {evt.fromValue && (
                        <p className="text-xs text-gray-500">{evt.fromValue} → {evt.toValue}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(evt.createdAt)} - {evt.createdBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 font-semibold">Detalhes</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Canal</dt><dd className="capitalize">{lead.channel}</dd></div>
              <div><dt className="text-gray-500">Fonte</dt><dd>{lead.source || '-'}</dd></div>
              <div><dt className="text-gray-500">UTM Source</dt><dd>{lead.utmSource || '-'}</dd></div>
              <div><dt className="text-gray-500">UTM Medium</dt><dd>{lead.utmMedium || '-'}</dd></div>
              <div><dt className="text-gray-500">UTM Campaign</dt><dd>{lead.utmCampaign || '-'}</dd></div>
              <div><dt className="text-gray-500">Primeiro Contato</dt><dd>{formatDate(lead.firstContactAt)}</dd></div>
              <div><dt className="text-gray-500">Ultima Mensagem</dt><dd>{lead.lastMessageAt ? formatDate(lead.lastMessageAt) : '-'}</dd></div>
              {lead.convertedAt && <div><dt className="text-gray-500">Convertido em</dt><dd>{formatDate(lead.convertedAt)}</dd></div>}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TagsEditor({ tags, onSave }: { tags: string[]; onSave: (tags: string[]) => void }) {
  const [newTag, setNewTag] = useState('')

  return (
    <Card>
      <h3 className="mb-3 font-semibold">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} color="blue">
            {tag}
            <button
              onClick={() => onSave(tags.filter((t) => t !== tag))}
              className="ml-1 hover:text-red-500"
            >
              x
            </button>
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Nova tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTag.trim()) {
              onSave([...tags, newTag.trim()])
              setNewTag('')
            }
          }}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={() => {
            if (newTag.trim()) {
              onSave([...tags, newTag.trim()])
              setNewTag('')
            }
          }}
        >
          Adicionar
        </Button>
      </div>
    </Card>
  )
}
