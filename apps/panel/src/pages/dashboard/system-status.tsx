import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getHealthStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

export function SystemStatus() {
  const { data, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealthStatus,
    refetchInterval: 30_000,
    retry: 1,
  })

  const isOnline = !!data && !isError
  const responseTime = data?.responseTimeMs

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-warm-800">Status do sistema</h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                isOnline ? 'bg-emerald-400' : 'bg-red-400',
              )}
            />
            <span className={cn('text-sm font-medium', isOnline ? 'text-emerald-600' : 'text-red-600')}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {responseTime !== undefined && (
            <p className="mt-1 text-xs text-warm-400">{responseTime}ms de resposta</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <Activity size={20} className="text-amber-600" />
        </div>
      </div>
    </Card>
  )
}
