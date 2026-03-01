import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTenants, getTenant, updateTenant } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { toast } from 'sonner'

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: getTenants,
  })
}

export function useTenantDetail(id: string | null) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => getTenant(id!),
    enabled: !!id,
  })
}

export function useUpdateTenant() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (body: Parameters<typeof updateTenant>[1]) =>
      updateTenant(tenantId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', tenantId] })
      toast.success('Configurações salvas')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações')
    },
  })
}
