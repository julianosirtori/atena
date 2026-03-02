import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/lib/env'

export type SSEStatus = 'connected' | 'disconnected' | 'reconnecting'

interface SSEEventData {
  conversationId?: string
  leadId?: string
  messageId?: string
  status?: string
  handoffReason?: string
  source?: string
}

interface UseSSEOptions {
  onEvent?: (type: string, data: SSEEventData) => void
}

export function useSSE(tenantId: string | null, options?: UseSSEOptions) {
  const [status, setStatus] = useState<SSEStatus>('disconnected')
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)
  const onEventRef = useRef(options?.onEvent)

  // Keep callback ref up to date
  onEventRef.current = options?.onEvent

  const invalidateQueries = useCallback(
    (type: string, data: SSEEventData) => {
      if (!tenantId) return

      switch (type) {
        case 'new_message':
          if (data.conversationId) {
            queryClient.invalidateQueries({
              queryKey: ['messages', tenantId, data.conversationId],
            })
          }
          queryClient.invalidateQueries({
            queryKey: ['conversations', tenantId],
          })
          break

        case 'conversation_updated':
          queryClient.invalidateQueries({
            queryKey: ['conversations', tenantId],
          })
          if (data.conversationId) {
            queryClient.invalidateQueries({
              queryKey: ['conversation', tenantId, data.conversationId],
            })
          }
          break

        case 'lead_updated':
          queryClient.invalidateQueries({
            queryKey: ['leads', tenantId],
          })
          if (data.leadId) {
            queryClient.invalidateQueries({
              queryKey: ['lead', tenantId, data.leadId],
            })
          }
          break

        case 'handoff_triggered':
          queryClient.invalidateQueries({
            queryKey: ['conversations', tenantId],
          })
          queryClient.invalidateQueries({
            queryKey: ['dashboard', tenantId],
          })
          break
      }
    },
    [tenantId, queryClient],
  )

  const connect = useCallback(() => {
    if (!tenantId) return

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `${API_URL}/api/v1/tenants/${tenantId}/events/stream`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setStatus('connected')
      retryCountRef.current = 0
    })

    const eventTypes = [
      'new_message',
      'conversation_updated',
      'lead_updated',
      'handoff_triggered',
    ]

    for (const type of eventTypes) {
      es.addEventListener(type, (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data)
          const data: SSEEventData = parsed.data ?? parsed
          invalidateQueries(type, data)
          onEventRef.current?.(type, data)
        } catch {
          // Ignore malformed events
        }
      })
    }

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      setStatus('reconnecting')

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000)
      retryCountRef.current++

      retryTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [tenantId, invalidateQueries])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      setStatus('disconnected')
    }
  }, [connect])

  return { status }
}
