import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutList, Columns3, Search, Users } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { LeadTable } from './lead-table'
import { LeadKanban } from './lead-kanban'
import { cn } from '@/lib/utils'
import { STAGE_CONFIG } from '@/lib/constants'

type View = 'table' | 'kanban'

const stageFilterOptions = [
  { value: '', label: 'Todos os estágios' },
  ...Object.entries(STAGE_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
]

const channelFilterOptions = [
  { value: '', label: 'Todos os canais' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
]

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>('table')

  const page = Number(searchParams.get('page') ?? '1')
  const stage = searchParams.get('stage') ?? ''
  const channel = searchParams.get('channel') ?? ''
  const search = searchParams.get('search') ?? ''

  const filters = {
    page,
    limit: view === 'kanban' ? 100 : 20,
    ...(stage && { stage }),
    ...(channel && { channel }),
    ...(search && { search }),
  }

  const { data, isLoading } = useLeads(filters)
  const leads = data?.data ?? []
  const meta = data?.meta

  function updateParam(key: string, value: string) {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value)
      } else {
        prev.delete(key)
      }
      if (key !== 'page') prev.delete('page')
      return prev
    })
  }

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-4">
      <PageHeader
        title="Leads"
        subtitle={meta ? `${meta.total} leads` : undefined}
        actions={
          <div className="flex gap-1 rounded-lg bg-warm-100 p-0.5">
            <button
              onClick={() => setView('table')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                view === 'table' ? 'bg-white shadow-sm text-warm-900' : 'text-warm-400',
              )}
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                view === 'kanban' ? 'bg-white shadow-sm text-warm-900' : 'text-warm-400',
              )}
            >
              <Columns3 size={16} />
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            value={search}
            onChange={(e) => updateParam('search', e.target.value)}
            placeholder="Buscar lead..."
            className="h-11 w-full rounded-lg border border-warm-200 bg-white pl-9 pr-3 text-sm text-warm-900 placeholder:text-warm-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <Select
          options={stageFilterOptions}
          value={stage}
          onChange={(e) => updateParam('stage', e.target.value)}
        />
        <Select
          options={channelFilterOptions}
          value={channel}
          onChange={(e) => updateParam('channel', e.target.value)}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum lead encontrado"
          description="Leads aparecerão aqui quando começarem a enviar mensagens."
        />
      ) : view === 'table' ? (
        <LeadTable
          leads={leads}
          page={page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={(p) => updateParam('page', String(p))}
        />
      ) : (
        <LeadKanban leads={leads} />
      )}
    </div>
  )
}
