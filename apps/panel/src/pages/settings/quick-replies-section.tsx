import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useUpdateTenant } from '@/hooks/use-tenant'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Tenant, QuickReply } from '@/types'

const MAX_REPLIES = 20

interface QuickRepliesSectionProps {
  tenant: Tenant
}

export function QuickRepliesSection({ tenant }: QuickRepliesSectionProps) {
  const updateTenant = useUpdateTenant()
  const replies = tenant.quickReplies ?? []

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuickReply | null>(null)
  const [form, setForm] = useState({ label: '', text: '' })

  function openCreate() {
    setEditing(null)
    setForm({ label: '', text: '' })
    setModalOpen(true)
  }

  function openEdit(reply: QuickReply) {
    setEditing(reply)
    setForm({ label: reply.label, text: reply.text })
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    const updated = replies.filter((r) => r.id !== id)
    updateTenant.mutate({ quickReplies: updated })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      const updated = replies.map((r) =>
        r.id === editing.id ? { ...r, label: form.label, text: form.text } : r,
      )
      updateTenant.mutate({ quickReplies: updated }, { onSuccess: () => setModalOpen(false) })
    } else {
      const newReply: QuickReply = {
        id: crypto.randomUUID(),
        label: form.label,
        text: form.text,
      }
      updateTenant.mutate(
        { quickReplies: [...replies, newReply] },
        { onSuccess: () => setModalOpen(false) },
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-warm-700">
          Respostas rápidas ({replies.length}/{MAX_REPLIES})
        </h3>
        <Button size="sm" onClick={openCreate} disabled={replies.length >= MAX_REPLIES}>
          <Plus size={16} />
          Nova resposta
        </Button>
      </div>

      {replies.length === 0 ? (
        <p className="py-4 text-center text-sm text-warm-400">
          Nenhuma resposta rápida cadastrada.
        </p>
      ) : (
        <div className="space-y-2">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="flex items-center justify-between rounded-xl border border-warm-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-warm-900">{reply.label}</span>
                <p className="truncate text-xs text-warm-500">{reply.text}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(reply)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(reply.id)}>
                  <Trash2 size={14} className="text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar resposta rápida' : 'Nova resposta rápida'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Atalho"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Ex: Horário"
            maxLength={50}
            required
          />
          <Textarea
            label="Mensagem"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            placeholder="Texto que será enviado ao lead"
            maxLength={500}
            rows={4}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={updateTenant.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
