import type { Lead } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { formatPhone } from '@/lib/utils'
import { CHANNEL_CONFIG } from '@/lib/constants'
import { MessageCircle, Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeadKanbanCardProps {
  lead: Lead
  onClick: () => void
}

const channelIcons = { whatsapp: MessageCircle, instagram: Instagram }

export function LeadKanbanCard({ lead, onClick }: LeadKanbanCardProps) {
  const ChannelIcon = channelIcons[lead.channel]

  const scoreColor =
    lead.score >= 61
      ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
      : lead.score >= 21
        ? 'text-amber-600 border-amber-200 bg-amber-50'
        : 'text-warm-500 border-warm-200 bg-warm-50'

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-warm-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={lead.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-warm-900">
            {lead.name ?? formatPhone(lead.phone)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <ChannelIcon size={12} className="text-warm-400" />
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold',
                scoreColor,
              )}
            >
              {lead.score}
            </span>
          </div>
          {lead.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lead.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-warm-100 px-1.5 py-0.5 text-[10px] text-warm-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
