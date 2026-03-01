import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getConversations, getConversation, getMessages, getNotes, createNote, sendMessage } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { toast } from 'sonner'

export function useConversations(filters: {
  page?: number
  limit?: number
  status?: string
  channel?: string
} = {}) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['conversations', tenantId, filters],
    queryFn: () => getConversations(tenantId!, filters),
    enabled: !!tenantId,
  })
}

export function useConversation(conversationId: string | undefined) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['conversation', tenantId, conversationId],
    queryFn: () => getConversation(tenantId!, conversationId!),
    enabled: !!tenantId && !!conversationId,
  })
}

export function useMessages(conversationId: string | undefined) {
  const { tenantId } = useTenantContext()
  return useInfiniteQuery({
    queryKey: ['messages', tenantId, conversationId],
    queryFn: ({ pageParam }) =>
      getMessages(tenantId!, conversationId!, { cursor: pageParam, limit: 50 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    enabled: !!tenantId && !!conversationId,
  })
}

export function useNotes(conversationId: string | undefined) {
  const { tenantId } = useTenantContext()
  return useQuery({
    queryKey: ['notes', tenantId, conversationId],
    queryFn: () => getNotes(tenantId!, conversationId!),
    enabled: !!tenantId && !!conversationId,
  })
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (body: { content: string; senderAgentId: string }) =>
      sendMessage(tenantId!, conversationId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', tenantId, conversationId] })
      qc.invalidateQueries({ queryKey: ['conversations', tenantId] })
    },
    onError: () => {
      toast.error('Erro ao enviar mensagem')
    },
  })
}

export function useCreateNote(conversationId: string) {
  const qc = useQueryClient()
  const { tenantId } = useTenantContext()

  return useMutation({
    mutationFn: (body: { agentId: string; content: string }) =>
      createNote(tenantId!, conversationId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', tenantId, conversationId] })
      toast.success('Nota adicionada')
    },
    onError: () => {
      toast.error('Erro ao adicionar nota')
    },
  })
}
