import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LeadsProgressProps {
  current: number
  limit: number
}

export function LeadsProgress({ current, limit }: LeadsProgressProps) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  const textColor = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <Card>
      <h3 className="mb-1 font-heading text-sm font-semibold text-warm-800">Leads do mês</h3>
      <p className="mb-3 text-xs text-warm-500">
        <span className={cn('font-bold', textColor)}>{current}</span> de {limit} leads utilizados
      </p>
      <div className="h-3 overflow-hidden rounded-full bg-warm-100">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-xs text-warm-400">{Math.round(pct)}%</p>
    </Card>
  )
}
