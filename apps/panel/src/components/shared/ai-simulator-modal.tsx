import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Bot, User } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { simulateAi } from '@/lib/api'
import { useTenantContext } from '@/contexts/tenant-context'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  intent?: string
  confidence?: number
}

interface AiSimulatorModalProps {
  open: boolean
  onClose: () => void
}

export function AiSimulatorModal({ open, onClose }: AiSimulatorModalProps) {
  const { tenantId } = useTenantContext()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const simulate = useMutation({
    mutationFn: (message: string) => simulateAi(tenantId!, { message }),
    onSuccess: (data) => {
      const response = data.data
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'ai',
          content: response.response,
          intent: response.intent,
          confidence: response.confidence,
        },
      ])
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'ai',
          content: 'Erro ao processar mensagem. Tente novamente.',
        },
      ])
    },
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || simulate.isPending) return

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
    ])
    setInput('')
    simulate.mutate(trimmed)
  }

  function handleClear() {
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Testar IA" className="max-w-2xl">
      <div className="flex flex-col h-[60vh]">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot size={32} className="mb-2 text-warm-300" />
              <p className="text-sm text-warm-400">
                Envie uma mensagem para testar como sua IA responde.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              {msg.role === 'ai' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Bot size={14} className="text-blue-600" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-xl px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-amber-600 text-white'
                    : 'bg-warm-100 text-warm-800',
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'ai' && msg.intent && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge className="text-[10px]">
                      {msg.intent}
                    </Badge>
                    {msg.confidence !== undefined && (
                      <Badge className="text-[10px]">
                        {Math.round(msg.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <User size={14} className="text-amber-600" />
                </div>
              )}
            </div>
          ))}
          {simulate.isPending && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Bot size={14} className="text-blue-600" />
              </div>
              <div className="rounded-xl bg-warm-100 px-3 py-2">
                <Spinner size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 border-t border-warm-100 p-4">
          <Button variant="ghost" size="icon" onClick={handleClear} title="Limpar conversa">
            <Trash2 size={16} />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem de teste..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 placeholder:text-warm-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || simulate.isPending}
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </Modal>
  )
}
