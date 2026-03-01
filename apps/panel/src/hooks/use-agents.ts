import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAgents, createAgent, updateAgent, deleteAgent } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { toast } from 'sonner'
import type { Agent } from '@/types'

export function useAgents() {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['agents', tenantId],
    queryFn: () => getAgents(tenantId!),
    enabled: !!tenantId,
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createAgent(tenantId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', tenantId] })
      toast.success('Agente criado')
    },
    onError: () => {
      toast.error('Erro ao criar agente')
    },
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: ({ agentId, body }: { agentId: string; body: Partial<Agent> }) =>
      updateAgent(tenantId!, agentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', tenantId] })
      toast.success('Agente atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar agente')
    },
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (agentId: string) => deleteAgent(tenantId!, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', tenantId] })
      toast.success('Agente removido')
    },
    onError: () => {
      toast.error('Erro ao remover agente')
    },
  })
}
