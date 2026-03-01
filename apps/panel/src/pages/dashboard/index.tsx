import { Users, MessageSquare, TrendingUp, PhoneForwarded } from 'lucide-react'
import { useDashboard } from '@/hooks/use-dashboard'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { MetricCard } from './metric-card'
import { ConversationsChart } from './conversations-chart'
import { TopIntentsList } from './top-intents-list'
import { LeadsProgress } from './leads-progress'
import { ActivityFeed } from './activity-feed'
import { SystemStatus } from './system-status'

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const d = data?.data
  if (!d) return null

  const totalConversations = Object.values(d.conversationsByStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Users} label="Leads hoje" value={d.leadsToday} />
        <MetricCard icon={Users} label="Leads no mês" value={d.leadsMonth} />
        <MetricCard icon={TrendingUp} label="Score médio" value={d.avgScore} />
        <MetricCard
          icon={PhoneForwarded}
          label="Taxa de handoff"
          value={`${Math.round(d.handoffRate * 100)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConversationsChart data={d.conversationsByStatus} />
        <TopIntentsList intents={d.topIntents} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeadsProgress current={d.leadsMonth} limit={d.leadsLimit} />
        <SystemStatus />
      </div>

      <ActivityFeed />
    </div>
  )
}
