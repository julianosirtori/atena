import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Spinner } from '../../components/ui/Spinner.js'
import type { Tenant, SingleResponse } from '../../types/api.types.js'

export function TenantSettingsPage() {
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tenants.detail(tenantId || ''),
    queryFn: () => api.get<SingleResponse<Tenant>>(`/tenants/${tenantId}`),
    enabled: !!tenantId,
  })

  const mutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      api.put<SingleResponse<Tenant>>(`/tenants/${tenantId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.detail(tenantId || '') })
    },
  })

  const tenant = data?.data

  if (isLoading || !tenant) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuracoes</h1>

      <SettingsSection
        title="Informacoes do Negocio"
        tenant={tenant}
        fields={[
          { key: 'businessName', label: 'Nome do Negocio', type: 'text' },
          { key: 'businessDescription', label: 'Descricao', type: 'textarea' },
          { key: 'productsInfo', label: 'Produtos/Servicos', type: 'textarea' },
          { key: 'pricingInfo', label: 'Precos', type: 'textarea' },
          { key: 'faq', label: 'FAQ', type: 'textarea' },
          { key: 'businessHours', label: 'Horario de Funcionamento', type: 'text' },
          { key: 'paymentMethods', label: 'Metodos de Pagamento', type: 'text' },
          { key: 'customInstructions', label: 'Instrucoes Personalizadas', type: 'textarea' },
        ]}
        onSave={(updates) => mutation.mutate(updates)}
        isSaving={mutation.isPending}
      />

      <SettingsSection
        title="WhatsApp"
        tenant={tenant}
        fields={[
          { key: 'whatsappProvider', label: 'Provedor', type: 'select', options: ['zapi', 'meta_cloud'] },
        ]}
        onSave={(updates) => mutation.mutate(updates)}
        isSaving={mutation.isPending}
      />

      <HandoffRulesSection
        tenant={tenant}
        onSave={(handoffRules) => mutation.mutate({ handoffRules })}
        isSaving={mutation.isPending}
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Plano & Faturamento</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="text-sm text-gray-500">Plano</span>
            <p className="font-medium capitalize">{tenant.plan}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Limite de Leads</span>
            <p className="font-medium">{tenant.leadsLimit}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <p className="font-medium capitalize">{tenant.billingStatus}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface Field {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: string[]
}

function SettingsSection({
  title,
  tenant,
  fields,
  onSave,
  isSaving,
}: {
  title: string
  tenant: Tenant
  fields: Field[]
  onSave: (updates: Record<string, unknown>) => void
  isSaving: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const f of fields) {
      initial[f.key] = (tenant as unknown as Record<string, string | null>)[f.key] ?? ''
    }
    return initial
  })

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="space-y-4">
        {fields.map((field) =>
          field.type === 'textarea' ? (
            <div key={field.key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
              <textarea
                value={values[field.key]}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ) : field.type === 'select' ? (
            <div key={field.key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
              <select
                value={values[field.key]}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              key={field.key}
              label={field.label}
              value={values[field.key]}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
            />
          ),
        )}
        <Button onClick={() => onSave(values)} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </Card>
  )
}

function HandoffRulesSection({
  tenant,
  onSave,
  isSaving,
}: {
  tenant: Tenant
  onSave: (rules: Tenant['handoffRules']) => void
  isSaving: boolean
}) {
  const [rules, setRules] = useState(tenant.handoffRules)

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Regras de Handoff</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Threshold de Score: {rules.score_threshold}
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={rules.score_threshold}
            onChange={(e) => setRules({ ...rules, score_threshold: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <Input
          label="Max Turnos IA"
          type="number"
          value={String(rules.max_ai_turns)}
          onChange={(e) => setRules({ ...rules, max_ai_turns: Number(e.target.value) })}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="biz-hours"
            checked={rules.business_hours_only}
            onChange={(e) => setRules({ ...rules, business_hours_only: e.target.checked })}
          />
          <label htmlFor="biz-hours" className="text-sm">Apenas em horario comercial</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-price"
            checked={rules.auto_handoff_on_price}
            onChange={(e) => setRules({ ...rules, auto_handoff_on_price: e.target.checked })}
          />
          <label htmlFor="auto-price" className="text-sm">Handoff automatico em perguntas de preco</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="follow-up"
            checked={rules.follow_up_enabled}
            onChange={(e) => setRules({ ...rules, follow_up_enabled: e.target.checked })}
          />
          <label htmlFor="follow-up" className="text-sm">Follow-up automatico</label>
        </div>
        <Button onClick={() => onSave(rules)} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Regras'}
        </Button>
      </div>
    </Card>
  )
}
