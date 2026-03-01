import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageInputProps {
  onSend: (content: string) => void
  isPending: boolean
  value: string
  onChange: (value: string) => void
}

export function MessageInput({ onSend, isPending, value, onChange }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isPending) return
    onSend(trimmed)
    onChange('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-warm-200 bg-white px-4 py-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem..."
        rows={1}
        className="flex-1 resize-none rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 placeholder:text-warm-400 transition-colors focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!value.trim() || isPending}
        loading={isPending}
      >
        <Send size={18} />
      </Button>
    </div>
  )
}
