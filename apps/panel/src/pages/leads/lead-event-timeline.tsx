import { useLeadEvents } from '@/hooks/use-leads'
import { EVENT_TYPE_LABEL } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import {
  ArrowRight,
  TrendingUp,
  UserPlus,
  UserMinus,
  Tag,
  PhoneForwarded,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Megaphone,
  Target,
  GitBranch,
  Zap,
} from 'lucide-react'
import type { EventType } from '@/types'

const eventIcons: Record<EventType, React.ElementType> = {
  stage_change: ArrowRight,
  score_change: TrendingUp,
  assigned: UserPlus,
  unassigned: UserMinus,
  tag_added: Tag,
  tag_removed: Tag,
  handoff: PhoneForwarded,
  follow_up_sent: Send,
  converted: CheckCircle,
  lost: XCircle,
  reopened: RotateCcw,
  campaign_joined: Megaphone,
  campaign_completed: Target,
  pipeline_stage_moved: GitBranch,
  automation_triggered: Zap,
}

const eventColors: Record<string, string> = {
  converted: 'text-emerald-500 bg-emerald-50',
  lost: 'text-red-500 bg-red-50',
  handoff: 'text-violet-500 bg-violet-50',
  score_change: 'text-amber-500 bg-amber-50',
  stage_change: 'text-blue-500 bg-blue-50',
}

interface LeadEventTimelineProps {
  leadId: string
}

export function LeadEventTimeline({ leadId }: LeadEventTimelineProps) {
  const { data, isLoading } = useLeadEvents(leadId)
  const events = data?.data ?? []

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (events.length === 0) {
    return <p className="py-4 text-center text-sm text-warm-400">Nenhum evento registrado.</p>
  }

  return (
    <div className="relative space-y-4 pl-8">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-warm-200" />

      {events.map((event) => {
        const Icon = eventIcons[event.eventType] ?? ArrowRight
        const colorClass = eventColors[event.eventType] ?? 'text-warm-500 bg-warm-100'

        return (
          <div key={event.id} className="relative flex gap-3">
            <div
              className={`absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full ${colorClass}`}
            >
              <Icon size={12} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-800">
                {EVENT_TYPE_LABEL[event.eventType]}
              </p>
              {(event.fromValue || event.toValue) && (
                <p className="text-xs text-warm-500">
                  {event.fromValue && <span>{event.fromValue}</span>}
                  {event.fromValue && event.toValue && <span> → </span>}
                  {event.toValue && <span className="font-medium">{event.toValue}</span>}
                </p>
              )}
              <p className="mt-0.5 text-[10px] text-warm-400">
                {formatRelativeTime(event.createdAt)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
