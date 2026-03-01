import { useState, useEffect } from 'react'
import { CheckCircle, Circle, X, Rocket } from 'lucide-react'
import { useTenantContext } from '@/contexts/tenant-context'
import { useAgents } from '@/hooks/use-agents'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'atena:onboarding-dismissed'

interface Step {
  id: string
  label: string
  check: (ctx: { tenant: { businessDescription: string | null; whatsappConfig: Record<string, unknown> }; agentCount: number }) => boolean
}

const steps: Step[] = [
  {
    id: 'business',
    label: 'Configurar dados do negócio',
    check: ({ tenant }) => !!tenant.businessDescription,
  },
  {
    id: 'whatsapp',
    label: 'Conectar WhatsApp',
    check: ({ tenant }) => Object.keys(tenant.whatsappConfig ?? {}).length > 0,
  },
  {
    id: 'agent',
    label: 'Adicionar um agente',
    check: ({ agentCount }) => agentCount > 0,
  },
  {
    id: 'test',
    label: 'Enviar mensagem de teste',
    check: () => false, // Cannot auto-detect
  },
]

export function OnboardingChecklist() {
  const { tenant } = useTenantContext()
  const { data: agentsData } = useAgents()
  const [dismissed, setDismissed] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setDismissed(stored === 'true')
  }, [])

  if (!tenant || dismissed) return null

  // Only show for tenants created within last 7 days
  const createdAt = new Date(tenant.createdAt)
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceCreation > 7) return null

  const agentCount = agentsData?.data?.length ?? 0
  const ctx = { tenant, agentCount }

  const completedCount = steps.filter((s) => s.check(ctx)).length
  const allDone = completedCount === steps.length

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-4">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg transition-transform hover:scale-105"
        >
          <Rocket size={20} />
        </button>
      ) : (
        <div className="w-72 rounded-xl border border-warm-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-warm-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Rocket size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-warm-900">Primeiros passos</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-warm-400">{completedCount}/{steps.length}</span>
              <button onClick={() => setCollapsed(true)} className="p-1 text-warm-400 hover:text-warm-600">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {steps.map((step) => {
              const done = step.check(ctx)
              return (
                <div key={step.id} className="flex items-center gap-2.5">
                  {done ? (
                    <CheckCircle size={18} className="shrink-0 text-emerald-500" />
                  ) : (
                    <Circle size={18} className="shrink-0 text-warm-300" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      done ? 'text-warm-400 line-through' : 'text-warm-700',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {allDone && (
            <div className="border-t border-warm-100 px-4 py-3">
              <button
                onClick={handleDismiss}
                className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
              >
                Tudo pronto! Fechar
              </button>
            </div>
          )}

          {!allDone && (
            <div className="border-t border-warm-100 px-4 py-2">
              <button
                onClick={handleDismiss}
                className="text-xs text-warm-400 hover:text-warm-600"
              >
                Dispensar checklist
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
