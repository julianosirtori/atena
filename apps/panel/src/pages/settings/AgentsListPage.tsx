import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTenant } from '../../hooks/useTenant.js'
import { api } from '../../lib/api-client.js'
import { queryKeys } from '../../lib/query-keys.js'
import { Card } from '../../components/ui/Card.js'
import { Button } from '../../components/ui/Button.js'
import { Table } from '../../components/ui/Table.js'
import { Modal } from '../../components/ui/Modal.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { EmptyState } from '../../components/ui/EmptyState.js'
import type { Agent, ListResponse, SingleResponse } from '../../types/api.types.js'

export function AgentsListPage() {
  const { tenantId } = useTenant()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Agent | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.agents.list(tenantId || ''),
    queryFn: () => api.get<ListResponse<Agent>>('/agents'),
    enabled: !!tenantId,
  })

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<SingleResponse<Agent>>('/agents', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(tenantId || '') })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id: string }) =>
      api.put<SingleResponse<Agent>>(`/agents/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(tenantId || '') })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(tenantId || '') })
    },
  })

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  const agents = data?.data ?? []

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agentes</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>Novo Agente</Button>
      </div>

      <Card padding={false}>
        {agents.length === 0 ? (
          <EmptyState title="Nenhum agente cadastrado" description="Crie o primeiro agente para comecar." />
        ) : (
          <Table
            data={agents}
            keyExtractor={(a) => a.id}
            columns={[
              { key: 'name', header: 'Nome', render: (a) => a.name },
              { key: 'email', header: 'Email', render: (a) => a.email },
              { key: 'role', header: 'Perfil', render: (a) => <Badge color={a.role === 'admin' ? 'purple' : 'blue'}>{a.role}</Badge> },
              {
                key: 'status',
                header: 'Status',
                render: (a) => (
                  <Badge color={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Ativo' : 'Inativo'}</Badge>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (a) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setModalOpen(true) }}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: a.id, isActive: !a.isActive })}
                    >
                      {a.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(a.id)}>
                      Excluir
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <AgentModal
        open={modalOpen}
        onClose={closeModal}
        agent={editing}
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, ...values })
          } else {
            createMutation.mutate(values)
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}

function AgentModal({
  open,
  onClose,
  agent,
  onSubmit,
  isSaving,
}: {
  open: boolean
  onClose: () => void
  agent: Agent | null
  onSubmit: (values: Record<string, unknown>) => void
  isSaving: boolean
}) {
  const [name, setName] = useState(agent?.name ?? '')
  const [email, setEmail] = useState(agent?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(agent?.role ?? 'agent')

  // Reset form when agent changes
  if (open && agent && name !== agent.name) {
    setName(agent.name)
    setEmail(agent.email)
    setRole(agent.role)
  }

  return (
    <Modal open={open} onClose={onClose} title={agent ? 'Editar Agente' : 'Novo Agente'}>
      <div className="space-y-4">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {!agent && (
          <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        <Select
          label="Perfil"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
          options={[
            { value: 'agent', label: 'Agente' },
            { value: 'admin', label: 'Administrador' },
          ]}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              const values: Record<string, unknown> = { name, email, role }
              if (!agent) values.password = password
              onSubmit(values)
            }}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
