import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Lead, LeadStage } from '@/types'
import { STAGE_CONFIG } from '@/lib/constants'
import { useUpdateLead } from '@/hooks/use-leads'
import { LeadKanbanCard } from './lead-kanban-card'
import { cn } from '@/lib/utils'

const stages: LeadStage[] = ['new', 'qualifying', 'hot', 'human', 'converted', 'lost']

interface LeadKanbanProps {
  leads: Lead[]
}

function SortableCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <LeadKanbanCard lead={lead} onClick={onClick} />
    </div>
  )
}

export function LeadKanban({ leads }: LeadKanbanProps) {
  const navigate = useNavigate()
  const updateLead = useUpdateLead()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const grouped = stages.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage)
      return acc
    },
    {} as Record<LeadStage, Lead[]>,
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const leadId = String(active.id)
    const targetStage = over.id as LeadStage

    if (stages.includes(targetStage)) {
      const lead = leads.find((l) => l.id === leadId)
      if (lead && lead.stage !== targetStage) {
        updateLead.mutate({ leadId, body: { stage: targetStage } })
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const stageLeads = grouped[stage]

          return (
            <SortableContext
              key={stage}
              id={stage}
              items={stageLeads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                id={stage}
                className="flex w-64 shrink-0 flex-col rounded-xl bg-warm-50 p-2"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className={cn('text-xs font-semibold uppercase', config.color)}>
                    {config.label}
                  </span>
                  <span className="rounded-full bg-warm-200 px-1.5 py-0.5 text-[10px] font-medium text-warm-600">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {stageLeads.map((lead) => (
                    <SortableCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    />
                  ))}
                </div>
              </div>
            </SortableContext>
          )
        })}
      </div>

      <DragOverlay>
        {activeLead && <LeadKanbanCard lead={activeLead} onClick={() => {}} />}
      </DragOverlay>
    </DndContext>
  )
}
