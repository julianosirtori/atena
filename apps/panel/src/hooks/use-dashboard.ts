import { useQuery } from '@tanstack/react-query'
import { getDashboard, getBillingCounts } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'

export function useDashboard() {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['dashboard', tenantId],
    queryFn: () => getDashboard(tenantId!),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  })
}

export function useBillingCounts() {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['billing-counts', tenantId],
    queryFn: () => getBillingCounts(tenantId!),
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  })
}
