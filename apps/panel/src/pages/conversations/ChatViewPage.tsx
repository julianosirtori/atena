import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useRef, useEffect, useState } from 'react'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConversationStatusBadge } from '../../components/ui/StatusBadge.js'
import { Badge } from '../../components/ui/Badge.js'
import { formatDate } from '../../lib/format.js'
import type {
  Conversation,
  Message,
  ConversationNote,
  SingleResponse,
  CursorResponse,
  ListResponse,
} from '../../types/api.types.js'

export default function ChatViewPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: convData } = useQuery({
    queryKey: queryKeys.conversations.detail(tenantId || '', conversationId || ''),
    queryFn: () =>
      api.get<SingleResponse<Conversation>>(`/conversations/${conversationId}`),
    enabled: !!tenantId && !!conversationId,
  })

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.messages.list(tenantId || '', conversationId || ''),
    queryFn: ({ pageParam }) => {
      const params: Record<string, string> = { limit: '50' }
      if (pageParam) params.cursor = pageParam
      return api.get<CursorResponse<Message>>(
        `/conversations/${conversationId}/messages`,
        params,
      )
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!tenantId && !!conversationId,
  })

  const { data: notesData } = useQuery({
    queryKey: queryKeys.notes.list(tenantId || '', conversationId || ''),
    queryFn: () =>
      api.get<ListResponse<ConversationNote>>(
        `/conversations/${conversationId}/notes`,
      ),
    enabled: !!tenantId && !!conversationId,
  })

  const addNoteMutation = useMutation({
    mutationFn: (body: { agentId: string; content: string }) =>
      api.post(`/conversations/${conversationId}/notes`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notes.list(tenantId || '', conversationId || ''),
      })
    },
  })

  // Scroll to bottom on first load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView()
  }, [messagesData?.pages?.length])

  const conversation = convData?.data
  const allMessages =
    messagesData?.pages.flatMap((page) => page.data) ?? []
  const notes = notesData?.data ?? []

  if (!conversation) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/conversations" className="text-sm text-gray-500 hover:text-gray-700">
          Conversas
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-bold">Conversa</h1>
        <ConversationStatusBadge status={conversation.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Chat area */}
        <div className="lg:col-span-3">
          <Card padding={false} className="flex h-[calc(100vh-200px)] flex-col">
            {/* Messages */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
              {hasNextPage && (
                <div className="mb-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Carregando...' : 'Carregar anteriores'}
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {allMessages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Conversation Info */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Informacoes</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd><ConversationStatusBadge status={conversation.status} /></dd>
              </div>
              <div>
                <dt className="text-gray-500">Canal</dt>
                <dd className="capitalize">{conversation.channel}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Mensagens IA</dt>
                <dd>{conversation.aiMessagesCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Mensagens Lead</dt>
                <dd>{conversation.leadMessagesCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Mensagens Humano</dt>
                <dd>{conversation.humanMessagesCount}</dd>
              </div>
              {conversation.handoffReason && (
                <div>
                  <dt className="text-gray-500">Motivo Handoff</dt>
                  <dd className="text-xs">{conversation.handoffReason}</dd>
                </div>
              )}
              {conversation.aiSummary && (
                <div>
                  <dt className="text-gray-500">Resumo IA</dt>
                  <dd className="text-xs">{conversation.aiSummary}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Aberta em</dt>
                <dd className="text-xs">{formatDate(conversation.openedAt)}</dd>
              </div>
              {conversation.closedAt && (
                <div>
                  <dt className="text-gray-500">Encerrada em</dt>
                  <dd className="text-xs">{formatDate(conversation.closedAt)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Notes */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold">Notas</h3>
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg bg-yellow-50 p-2 text-sm">
                  <p>{note.content}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
            <NoteForm
              onSubmit={(content) => {
                addNoteMutation.mutate({
                  agentId: '00000000-0000-0000-0000-000000000000', // placeholder
                  content,
                })
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const [showMeta, setShowMeta] = useState(false)

  const isInbound = message.direction === 'inbound'
  const isSystem = message.senderType === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-800">
          {message.content}
        </span>
      </div>
    )
  }

  const bubbleColors: Record<string, string> = {
    lead: 'bg-gray-100 text-gray-900',
    ai: 'bg-blue-500 text-white',
    agent: 'bg-green-500 text-white',
  }

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${bubbleColors[message.senderType] || 'bg-gray-100'}`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-xs ${isInbound ? 'text-gray-400' : 'text-white/70'}`}>
            {formatDate(message.createdAt)}
          </span>
          {message.senderType === 'ai' && message.aiMetadata?.intent && (
            <button
              onClick={() => setShowMeta(!showMeta)}
              className="text-xs underline opacity-70 hover:opacity-100"
            >
              {showMeta ? 'ocultar' : 'metadata'}
            </button>
          )}
        </div>
        {showMeta && message.aiMetadata && (
          <div className="mt-2 rounded bg-black/10 p-2 text-xs">
            {message.aiMetadata.intent && <p>Intent: {message.aiMetadata.intent}</p>}
            {message.aiMetadata.confidence != null && (
              <p>Confianca: {message.aiMetadata.confidence}%</p>
            )}
            {message.aiMetadata.tokens_used != null && (
              <p>Tokens: {message.aiMetadata.tokens_used}</p>
            )}
            {message.injectionFlags && message.injectionFlags.length > 0 && (
              <p>Flags: {message.injectionFlags.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteForm({ onSubmit }: { onSubmit: (content: string) => void }) {
  const [content, setContent] = useState('')

  return (
    <div className="mt-3 flex gap-2">
      <Input
        placeholder="Adicionar nota..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && content.trim()) {
            onSubmit(content.trim())
            setContent('')
          }
        }}
        className="flex-1"
      />
      <Button
        size="sm"
        onClick={() => {
          if (content.trim()) {
            onSubmit(content.trim())
            setContent('')
          }
        }}
      >
        +
      </Button>
    </div>
  )
}
