import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
}

export function MetricCard({ icon: Icon, label, value, trend, trendUp }: MetricCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-warm-500 uppercase">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold text-warm-900">{value}</p>
          {trend && (
            <p
              className={`mt-0.5 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <Icon size={20} className="text-amber-600" />
        </div>
      </div>
    </Card>
  )
}
