import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  activateCampaign,
  pauseCampaign,
  completeCampaign,
  getCampaignMetrics,
} from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { toast } from 'sonner'
import type { Campaign } from '@/types'

export function useCampaigns(filters: {
  page?: number
  limit?: number
  status?: string
  type?: string
} = {}) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['campaigns', tenantId, filters],
    queryFn: () => getCampaigns(tenantId!, filters),
    enabled: !!tenantId,
  })
}

export function useCampaign(campaignId: string | undefined) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['campaign', tenantId, campaignId],
    queryFn: () => getCampaign(tenantId!, campaignId!),
    enabled: !!tenantId && !!campaignId,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createCampaign(tenantId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', tenantId] })
      toast.success('Campanha criada')
    },
    onError: () => {
      toast.error('Erro ao criar campanha')
    },
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: ({ campaignId, body }: { campaignId: string; body: Partial<Campaign> }) =>
      updateCampaign(tenantId!, campaignId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', tenantId] })
      toast.success('Campanha atualizada')
    },
    onError: () => {
      toast.error('Erro ao atualizar campanha')
    },
  })
}

export function useDeleteCampaign() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (campaignId: string) => deleteCampaign(tenantId!, campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', tenantId] })
      toast.success('Campanha removida')
    },
    onError: () => {
      toast.error('Erro ao remover campanha')
    },
  })
}

export function useActivateCampaign() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (campaignId: string) => activateCampaign(tenantId!, campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', tenantId] })
      toast.success('Campanha ativada')
    },
    onError: () => toast.error('Erro ao ativar campanha'),
  })
}

export function usePauseCampaign() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (campaignId: string) => pauseCampaign(tenantId!, campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', tenantId] })
      toast.success('Campanha pausada')
    },
    onError: () => toast.error('Erro ao pausar campanha'),
  })
}

export function useCompleteCampaign() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (campaignId: string) => completeCampaign(tenantId!, campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns', tenantId] })
      toast.success('Campanha concluída')
    },
    onError: () => toast.error('Erro ao concluir campanha'),
  })
}

export function useCampaignMetrics(campaignId: string | undefined) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['campaign-metrics', tenantId, campaignId],
    queryFn: () => getCampaignMetrics(tenantId!, campaignId!),
    enabled: !!tenantId && !!campaignId,
  })
}
