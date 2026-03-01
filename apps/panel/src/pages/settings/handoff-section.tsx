import { useState, useEffect } from 'react'
import type { Tenant, HandoffRules } from '@/types'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdateTenant } from '@/hooks/use-tenant'

interface HandoffSectionProps {
  tenant: Tenant
}

export function HandoffSection({ tenant }: HandoffSectionProps) {
  const updateTenant = useUpdateTenant()
  const [rules, setRules] = useState<HandoffRules>(tenant.handoffRules)
  const [intentInput, setIntentInput] = useState('')

  useEffect(() => {
    setRules(tenant.handoffRules)
  }, [tenant])

  function handleSave() {
    updateTenant.mutate({ handoffRules: rules })
  }

  function addIntent() {
    const trimmed = intentInput.trim()
    if (trimmed && !rules.handoff_intents.includes(trimmed)) {
      setRules({ ...rules, handoff_intents: [...rules.handoff_intents, trimmed] })
      setIntentInput('')
    }
  }

  function removeIntent(intent: string) {
    setRules({ ...rules, handoff_intents: rules.handoff_intents.filter((i) => i !== intent) })
  }

  return (
    <div className="space-y-6">
      <Slider
        label="Score para handoff"
        value={rules.score_threshold}
        onChange={(v) => setRules({ ...rules, score_threshold: v })}
        min={0}
        max={100}
      />

      <Slider
        label="Máximo de turnos IA"
        value={rules.max_ai_turns}
        onChange={(v) => setRules({ ...rules, max_ai_turns: v })}
        min={1}
        max={50}
      />

      <Slider
        label="Delay follow-up (horas)"
        value={rules.follow_up_delay_hours}
        onChange={(v) => setRules({ ...rules, follow_up_delay_hours: v })}
        min={1}
        max={168}
      />

      <Toggle
        label="Apenas horário comercial"
        checked={rules.business_hours_only}
        onChange={(v) => setRules({ ...rules, business_hours_only: v })}
      />

      <Toggle
        label="Handoff automático em preço"
        checked={rules.auto_handoff_on_price}
        onChange={(v) => setRules({ ...rules, auto_handoff_on_price: v })}
      />

      <Toggle
        label="Follow-up habilitado"
        checked={rules.follow_up_enabled}
        onChange={(v) => setRules({ ...rules, follow_up_enabled: v })}
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-warm-700">
          Intenções de handoff
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {rules.handoff_intents.map((intent) => (
            <span
              key={intent}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700"
            >
              {intent}
              <button
                type="button"
                onClick={() => removeIntent(intent)}
                className="ml-0.5 text-amber-500 hover:text-amber-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={intentInput}
            onChange={(e) => setIntentInput(e.target.value)}
            placeholder="Ex: reclamação"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIntent())}
          />
          <Button type="button" variant="secondary" onClick={addIntent}>
            Adicionar
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} loading={updateTenant.isPending}>
        Salvar regras
      </Button>
    </div>
  )
}
