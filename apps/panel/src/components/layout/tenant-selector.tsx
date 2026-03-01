import { useTenantContext } from '@/contexts/tenant-context'
import { Building2 } from 'lucide-react'

export function TenantSelector() {
  const { tenantId, tenants, setTenantId } = useTenantContext()

  if (tenants.length <= 1) {
    const current = tenants[0]
    if (!current) return null
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-warm-600">
        <Building2 size={16} className="text-warm-400" />
        <span className="truncate">{current.name}</span>
      </div>
    )
  }

  return (
    <select
      value={tenantId ?? ''}
      onChange={(e) => setTenantId(e.target.value)}
      className="w-full rounded-lg border border-warm-200 bg-warm-50 px-2 py-2 text-sm text-warm-700 focus:border-amber-500 focus:outline-none"
    >
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}
