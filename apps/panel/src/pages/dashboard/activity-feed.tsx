import {
  ArrowRightLeft, TrendingUp, UserPlus, UserMinus, Tag, Tags,
  PhoneForwarded, Send, CheckCircle, XCircle, RotateCcw,
  Megaphone, Flag, GitBranch, Zap, Activity,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAllEvents } from '@/hooks/use-leads'
import { EVENT_TYPE_LABEL } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import type { EventType } from '@/types'

const EVENT_ICON: Record<EventType, typeof Activity> = {
  stage_change: ArrowRightLeft,
  score_change: TrendingUp,
  assigned: UserPlus,
  unassigned: UserMinus,
  tag_added: Tag,
  tag_removed: Tags,
  handoff: PhoneForwarded,
  follow_up_sent: Send,
  converted: CheckCircle,
  lost: XCircle,
  reopened: RotateCcw,
  campaign_joined: Megaphone,
  campaign_completed: Flag,
  pipeline_stage_moved: GitBranch,
  automation_triggered: Zap,
}

export function ActivityFeed() {
  const { data, isLoading } = useAllEvents({ limit: 10 })

  const events = data?.data ?? []

  return (
    <Card>
      <h3 className="mb-4 font-heading text-sm font-semibold text-warm-800">Atividade recente</h3>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-sm text-warm-400">Nenhuma atividade recente.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const Icon = EVENT_ICON[event.eventType] ?? Activity
            return (
              <div key={event.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warm-100">
                  <Icon size={14} className="text-warm-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-warm-800">
                    {EVENT_TYPE_LABEL[event.eventType]}
                  </p>
                  {(event.fromValue || event.toValue) && (
                    <p className="text-xs text-warm-500">
                      {event.fromValue && <span>{event.fromValue}</span>}
                      {event.fromValue && event.toValue && <span> &rarr; </span>}
                      {event.toValue && <span>{event.toValue}</span>}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-warm-400">
                  {formatRelativeTime(event.createdAt)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
