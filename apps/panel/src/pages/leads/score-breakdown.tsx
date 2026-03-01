import { useState } from 'react'
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react'
import { useLeadEvents } from '@/hooks/use-leads'
import { Spinner } from '@/components/ui/spinner'
import { formatRelativeTime, cn } from '@/lib/utils'

interface ScoreBreakdownProps {
  leadId: string
}

export function ScoreBreakdown({ leadId }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading } = useLeadEvents(leadId, { eventType: 'score_change' })

  const events = data?.data ?? []

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-warm-500 hover:text-warm-700 transition-colors"
      >
        <ChevronDown
          size={14}
          className={cn('transition-transform', expanded && 'rotate-180')}
        />
        Ver detalhamento
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Spinner size="sm" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-warm-400">Nenhuma alteração de score registrada.</p>
          ) : (
            events.map((event) => {
              const from = Number(event.fromValue ?? 0)
              const to = Number(event.toValue ?? 0)
              const delta = to - from
              const isPositive = delta > 0

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2 text-xs"
                >
                  {isPositive ? (
                    <TrendingUp size={14} className="shrink-0 text-emerald-500" />
                  ) : (
                    <TrendingDown size={14} className="shrink-0 text-red-500" />
                  )}
                  <span
                    className={cn(
                      'font-semibold',
                      isPositive ? 'text-emerald-600' : 'text-red-600',
                    )}
                  >
                    {isPositive ? '+' : ''}{delta}
                  </span>
                  <span className="text-warm-500">
                    {from} &rarr; {to}
                  </span>
                  <span className="ml-auto text-warm-400">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
