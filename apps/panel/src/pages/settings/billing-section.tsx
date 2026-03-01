import { Badge } from '@/components/ui/badge'
import { PLAN_CONFIG, BILLING_STATUS_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Tenant } from '@/types'
import { useAgents } from '@/hooks/use-agents'
import { useBillingCounts } from '@/hooks/use-dashboard'

interface BillingSectionProps {
  tenant: Tenant
}

export function BillingSection({ tenant }: BillingSectionProps) {
  const { data: agentsData } = useAgents()
  const { data: billingData } = useBillingCounts()

  const planCfg = PLAN_CONFIG[tenant.plan]
  const statusCfg = BILLING_STATUS_CONFIG[tenant.billingStatus]
  const agentCount = agentsData?.data?.length ?? 0

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonth = billingData?.data?.find((m) => m.yearMonth === yearMonth)
  const leadsUsed = currentMonth?.leadCount ?? 0
  const leadsLimit = tenant.leadsLimit
  const pct = leadsLimit > 0 ? Math.min((leadsUsed / leadsLimit) * 100, 100) : 0
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={planCfg.color} bg={planCfg.bg}>
          {planCfg.label}
        </Badge>
        <Badge color={statusCfg.color} bg={statusCfg.bg}>
          {statusCfg.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-warm-600">Leads utilizados</span>
          <span className="font-medium text-warm-900">
            {leadsUsed} / {leadsLimit}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-warm-100">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-right text-xs text-warm-400">{Math.round(pct)}%</p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-warm-600">Agentes</span>
        <span className="font-medium text-warm-900">
          {agentCount} / {tenant.agentsLimit}
        </span>
      </div>

      {tenant.billingStatus === 'trial' && tenant.trialEndsAt && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-warm-600">Trial expira</span>
          <span className="font-medium text-amber-600">
            {formatDistanceToNow(new Date(tenant.trialEndsAt), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      )}
    </div>
  )
}
