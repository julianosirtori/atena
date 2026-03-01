import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from '@/hooks/use-agents'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { Spinner } from '@/components/ui/spinner'
import type { Agent } from '@/types'

export function AgentsSection() {
  const { data, isLoading } = useAgents()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' })

  const agents = data?.data ?? []

  function openCreate() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'agent' })
    setModalOpen(true)
  }

  function openEdit(agent: Agent) {
    setEditing(agent)
    setForm({ name: agent.name, email: agent.email, password: '', role: agent.role })
    setModalOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      updateAgent.mutate(
        { agentId: editing.id, body: { name: form.name, email: form.email, role: form.role as 'admin' | 'agent' } },
        { onSuccess: () => setModalOpen(false) },
      )
    } else {
      createAgent.mutate(form, { onSuccess: () => setModalOpen(false) })
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-warm-700">Agentes ({agents.length})</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Novo agente
        </Button>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between rounded-xl border border-warm-200 bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-warm-900">{agent.name}</span>
                <Badge>{agent.role === 'admin' ? 'Admin' : 'Agente'}</Badge>
                {agent.isActive ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-warm-300" />
                )}
              </div>
              <p className="text-xs text-warm-500">{agent.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <Toggle
                checked={agent.isActive}
                onChange={(v) => updateAgent.mutate({ agentId: agent.id, body: { isActive: v } })}
              />
              <Button variant="ghost" size="icon" onClick={() => openEdit(agent)}>
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteAgent.mutate(agent.id)}
              >
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar agente' : 'Novo agente'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {!editing && (
            <Input
              label="Senha"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
          <Select
            label="Papel"
            options={[
              { value: 'agent', label: 'Agente' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createAgent.isPending || updateAgent.isPending}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
