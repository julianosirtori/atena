import type { QuickReply } from '@/types'

interface QuickReplyBarProps {
  replies: QuickReply[]
  onSelect: (text: string) => void
}

export function QuickReplyBar({ replies, onSelect }: QuickReplyBarProps) {
  if (replies.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 border-t border-warm-100 scrollbar-hide">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          onClick={() => onSelect(reply.text)}
          className="shrink-0 rounded-full border border-warm-200 bg-white px-3 py-1.5 text-xs font-medium text-warm-700 transition-colors hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
          title={reply.text}
        >
          {reply.label}
        </button>
      ))}
    </div>
  )
}
