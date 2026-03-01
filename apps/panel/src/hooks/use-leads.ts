import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeads, getLead, updateLead, getLeadEvents, getAllEvents } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { toast } from 'sonner'
import type { Lead } from '@/types'

export function useLeads(filters: {
  page?: number
  limit?: number
  stage?: string
  channel?: string
  search?: string
  minScore?: number
  maxScore?: number
} = {}) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['leads', tenantId, filters],
    queryFn: () => getLeads(tenantId!, filters),
    enabled: !!tenantId,
  })
}

export function useLead(leadId: string | undefined) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['lead', tenantId, leadId],
    queryFn: () => getLead(tenantId!, leadId!),
    enabled: !!tenantId && !!leadId,
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: ({ leadId, body }: { leadId: string; body: Partial<Lead> }) =>
      updateLead(tenantId!, leadId, body),
    onMutate: async ({ leadId, body }) => {
      await qc.cancelQueries({ queryKey: ['lead', tenantId, leadId] })
      const prev = qc.getQueryData(['lead', tenantId, leadId])
      qc.setQueryData(['lead', tenantId, leadId], (old: unknown) => {
        if (!old || typeof old !== 'object' || !('data' in old)) return old
        return { ...(old as Record<string, unknown>), data: { ...(old as { data: Lead }).data, ...body } }
      })
      return { prev }
    },
    onError: (_err, { leadId }, context) => {
      if (context?.prev) qc.setQueryData(['lead', tenantId, leadId], context.prev)
      toast.error('Erro ao atualizar lead')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['leads', tenantId] })
    },
    onSuccess: () => {
      toast.success('Lead atualizado')
    },
  })
}

export function useLeadEvents(leadId: string | undefined, filters: { eventType?: string } = {}) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['lead-events', tenantId, leadId, filters],
    queryFn: () => getLeadEvents(tenantId!, leadId!, filters),
    enabled: !!tenantId && !!leadId,
  })
}

export function useAllEvents(filters: { page?: number; limit?: number; eventType?: string } = {}) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['all-events', tenantId, filters],
    queryFn: () => getAllEvents(tenantId!, filters),
    enabled: !!tenantId,
  })
}
