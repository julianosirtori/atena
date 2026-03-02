import { cn } from '@/lib/utils'
import type { SSEStatus } from '@/hooks/use-sse'

const config: Record<SSEStatus, { color: string; label: string; pulse?: boolean }> = {
  connected: { color: 'bg-emerald-500', label: 'Conectado' },
  reconnecting: { color: 'bg-amber-400', label: 'Reconectando...', pulse: true },
  disconnected: { color: 'bg-red-500', label: 'Desconectado' },
}

interface SSEStatusIndicatorProps {
  status: SSEStatus
}

export function SSEStatusIndicator({ status }: SSEStatusIndicatorProps) {
  const cfg = config[status]

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-4" title={cfg.label}>
      <div
        className={cn(
          'h-2.5 w-2.5 rounded-full shadow-sm',
          cfg.color,
          cfg.pulse && 'animate-pulse',
        )}
      />
    </div>
  )
}
