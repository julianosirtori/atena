import { Card } from '@/components/ui/card'

interface TopIntentsListProps {
  intents: { intent: string; count: number }[]
}

export function TopIntentsList({ intents }: TopIntentsListProps) {
  const max = intents.length > 0 ? Math.max(...intents.map((i) => i.count)) : 1

  return (
    <Card>
      <h3 className="mb-4 font-heading text-sm font-semibold text-warm-800">Principais intenções</h3>
      {intents.length === 0 ? (
        <p className="text-sm text-warm-400">Nenhuma intenção detectada ainda.</p>
      ) : (
        <div className="space-y-3">
          {intents.slice(0, 8).map((item) => (
            <div key={item.intent}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-warm-700">{item.intent}</span>
                <span className="font-medium text-warm-900">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-warm-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
