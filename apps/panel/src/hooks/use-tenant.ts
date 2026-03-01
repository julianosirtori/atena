import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTenants, getTenant, updateTenant, getChannelStatus } from '@/lib/api'
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

export function useChannelStatus(options?: { enabled?: boolean; refetchInterval?: number }) {
  const { tenantId } = useTenantContext()

  return useQuery({
    queryKey: ['channel-status', tenantId],
    queryFn: () => getChannelStatus(tenantId!),
    enabled: (options?.enabled ?? true) && !!tenantId,
    refetchInterval: options?.refetchInterval ?? 60_000,
  })
}
