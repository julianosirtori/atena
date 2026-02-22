import { useQuery } from '@tanstack/react-query'
import { useTenant } from '../hooks/useTenant.js'
import { api } from '../lib/api-client.js'
import { queryKeys } from '../lib/query-keys.js'
import { Card } from '../components/ui/Card.js'
import { Spinner } from '../components/ui/Spinner.js'
import { formatNumber } from '../lib/format.js'
import type { DashboardData, SingleResponse } from '../types/api.types.js'

export default function DashboardPage() {
  const { tenantId, tenant } = useTenant()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.data(tenantId || ''),
    queryFn: () => api.get<SingleResponse<DashboardData>>('/dashboard'),
    enabled: !!tenantId,
  })

  if (isLoading || !data) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  const d = data.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {tenant && <p className="text-sm text-gray-500">{tenant.businessName}</p>}
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Leads Hoje" value={d.leadsToday} />
        <MetricCard label="Leads no Mes" value={d.leadsMonth} />
        <MetricCard label="Limite de Leads" value={d.leadsLimit} />
        <MetricCard label="Score Medio" value={d.avgScore} />
      </div>

      {/* Usage bar */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Uso de Leads</h2>
        <div className="mb-1 flex justify-between text-sm">
          <span>{formatNumber(d.leadsMonth)} usados</span>
          <span>{formatNumber(d.leadsLimit)} limite</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${
              d.leadsMonth / d.leadsLimit > 0.8 ? 'bg-danger' : 'bg-primary'
            }`}
            style={{ width: `${Math.min((d.leadsMonth / d.leadsLimit) * 100, 100)}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Handoff Rate */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Taxa de Handoff (30 dias)</h2>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">{d.handoffRate}%</span>
            <span className="mb-1 text-sm text-gray-500">das conversas</span>
          </div>
        </Card>

        {/* Conversations by status */}
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Conversas por Status</h2>
          <div className="space-y-2">
            {Object.entries(d.conversationsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm capitalize">{status.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Intents */}
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Top Intencoes</h2>
          {d.topIntents.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados de intencoes ainda.</p>
          ) : (
            <div className="space-y-2">
              {d.topIntents.map((item) => {
                const maxCount = d.topIntents[0]?.count || 1
                return (
                  <div key={item.intent} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm">{item.intent}</span>
                    <div className="flex-1">
                      <div className="h-5 overflow-hidden rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-primary/80"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{formatNumber(value)}</p>
    </Card>
  )
}
