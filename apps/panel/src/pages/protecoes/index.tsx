import { useState } from 'react'
import { Shield, ShieldAlert, ChevronDown } from 'lucide-react'
import { useSecurityIncidents } from '@/hooks/use-security-incidents'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Pagination } from '@/components/shared/pagination'
import { SEVERITY_CONFIG, INCIDENT_TYPE_LABEL, DETECTION_LAYER_LABEL, ACTION_TAKEN_LABEL } from '@/lib/constants'
import { formatRelativeTime, cn } from '@/lib/utils'

export default function ProtecoesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useSecurityIncidents({ page, limit: 20 })

  const incidents = data?.data ?? []
  const meta = data?.meta

  const bySeverity = incidents.reduce(
    (acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const totalBlocked = incidents.filter((i) => i.actionTaken === 'blocked').length

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Proteções" subtitle="Incidentes de segurança detectados pela IA" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-warm-500">Total bloqueados</p>
              <p className="mt-1 font-heading text-2xl font-bold text-warm-900">{totalBlocked}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <ShieldAlert size={20} className="text-red-500" />
            </div>
          </div>
        </Card>
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev]
          return (
            <Card key={sev}>
              <p className="text-xs font-medium uppercase text-warm-500">{cfg.label}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-warm-900">
                {bySeverity[sev] ?? 0}
              </p>
            </Card>
          )
        })}
      </div>

      {/* Incidents list */}
      {incidents.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-8">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Shield size={24} className="text-emerald-500" />
            </div>
            <p className="text-sm text-warm-500">Nenhum incidente registrado.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

function IncidentCard({ incident }: { incident: { id: string; incidentType: string; severity: string; actionTaken: string | null; detectionLayer: string | null; leadMessage: string | null; aiResponse: string | null; resolved: boolean; createdAt: string } }) {
  const [expanded, setExpanded] = useState(false)
  const sevCfg = SEVERITY_CONFIG[incident.severity as keyof typeof SEVERITY_CONFIG]

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge color={sevCfg?.color} bg={sevCfg?.bg}>
            {sevCfg?.label ?? incident.severity}
          </Badge>
          <span className="text-sm font-medium text-warm-800 truncate">
            {INCIDENT_TYPE_LABEL[incident.incidentType as keyof typeof INCIDENT_TYPE_LABEL] ?? incident.incidentType}
          </span>
          {incident.actionTaken && (
            <Badge>
              {ACTION_TAKEN_LABEL[incident.actionTaken] ?? incident.actionTaken}
            </Badge>
          )}
          {incident.resolved && (
            <Badge color="text-emerald-700" bg="bg-emerald-100">Resolvido</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-warm-400">{formatRelativeTime(incident.createdAt)}</span>
          <ChevronDown
            size={16}
            className={cn('text-warm-400 transition-transform', expanded && 'rotate-180')}
          />
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-warm-100 pt-3">
          {incident.detectionLayer && (
            <div className="text-xs text-warm-500">
              <span className="font-medium">Camada:</span>{' '}
              {DETECTION_LAYER_LABEL[incident.detectionLayer] ?? incident.detectionLayer}
            </div>
          )}
          {incident.leadMessage && (
            <div>
              <p className="text-xs font-medium text-warm-500 mb-1">Mensagem do lead:</p>
              <p className="rounded-lg bg-warm-50 p-2 text-sm text-warm-700">{incident.leadMessage}</p>
            </div>
          )}
          {incident.aiResponse && (
            <div>
              <p className="text-xs font-medium text-warm-500 mb-1">Resposta da IA:</p>
              <p className="rounded-lg bg-blue-50 p-2 text-sm text-blue-800">{incident.aiResponse}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
