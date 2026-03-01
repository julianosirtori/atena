import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSecurityIncidents, resolveSecurityIncident } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { toast } from 'sonner'

export function useSecurityIncidents(filters: {
  page?: number
  limit?: number
  severity?: string
  resolved?: string
  incidentType?: string
} = {}) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['security-incidents', tenantId, filters],
    queryFn: () => getSecurityIncidents(tenantId!, filters),
    enabled: !!tenantId,
  })
}

export function useResolveIncident() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: ({ incidentId, resolvedBy }: { incidentId: string; resolvedBy: string }) =>
      resolveSecurityIncident(tenantId!, incidentId, { resolvedBy }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-incidents', tenantId] })
      toast.success('Incidente resolvido')
    },
    onError: () => {
      toast.error('Erro ao resolver incidente')
    },
  })
}
