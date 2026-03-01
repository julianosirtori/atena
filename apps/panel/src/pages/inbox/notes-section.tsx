import { useState } from 'react'
import { StickyNote } from 'lucide-react'
import { useNotes, useCreateNote } from '@/hooks/use-conversations'
import { useAgents } from '@/hooks/use-agents'
import { formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface NotesSectionProps {
  conversationId: string
}

export function NotesSection({ conversationId }: NotesSectionProps) {
  const { data: notesData } = useNotes(conversationId)
  const { data: agentsData } = useAgents()
  const createNote = useCreateNote(conversationId)
  const [content, setContent] = useState('')

  const notes = notesData?.data ?? []
  const agents = agentsData?.data ?? []
  const firstAgent = agents[0]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !firstAgent) return
    createNote.mutate(
      { agentId: firstAgent.id, content: content.trim() },
      { onSuccess: () => setContent('') },
    )
  }

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-warm-500">
        <StickyNote size={14} />
        Notas
      </h4>

      {notes.length > 0 && (
        <div className="mb-3 space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg bg-amber-50 p-2.5 text-sm">
              <p className="text-warm-700">{note.content}</p>
              <p className="mt-1 text-[10px] text-warm-400">
                {formatRelativeTime(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Adicionar nota..."
          className="min-h-[60px] text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || !firstAgent}
          loading={createNote.isPending}
        >
          Adicionar
        </Button>
      </form>
    </div>
  )
}
