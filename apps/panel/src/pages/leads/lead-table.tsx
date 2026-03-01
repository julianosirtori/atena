import { useNavigate } from 'react-router-dom'
import type { Lead } from '@/types'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { STAGE_CONFIG, CHANNEL_CONFIG } from '@/lib/constants'
import { formatPhone, formatRelativeTime, cn } from '@/lib/utils'
import { Pagination } from '@/components/shared/pagination'

interface LeadTableProps {
  leads: Lead[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function LeadTable({ leads, page, totalPages, onPageChange }: LeadTableProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {/* Mobile card view */}
      <div className="space-y-2 md:hidden">
        {leads.map((lead) => {
          const stageCfg = STAGE_CONFIG[lead.stage]
          return (
            <div
              key={lead.id}
              onClick={() => navigate(`/leads/${lead.id}`)}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-warm-200 bg-white p-3 transition-shadow hover:shadow-md"
            >
              <Avatar name={lead.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-warm-900">
                  {lead.name ?? formatPhone(lead.phone)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge color={stageCfg.color} bg={stageCfg.bg}>{stageCfg.label}</Badge>
                  <span className="text-xs text-warm-500">{lead.score} pts</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <Thead>
            <tr>
              <Th>Lead</Th>
              <Th>Telefone</Th>
              <Th>Canal</Th>
              <Th>Estágio</Th>
              <Th>Score</Th>
              <Th>Último contato</Th>
              <Th>Tags</Th>
            </tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => {
              const stageCfg = STAGE_CONFIG[lead.stage]
              const scoreColor =
                lead.score >= 61 ? 'text-emerald-600' : lead.score >= 21 ? 'text-amber-600' : 'text-warm-500'
              return (
                <Tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lead.name} size="sm" />
                      <span className="font-medium text-warm-900">{lead.name ?? 'Sem nome'}</span>
                    </div>
                  </Td>
                  <Td>{formatPhone(lead.phone)}</Td>
                  <Td>{CHANNEL_CONFIG[lead.channel].label}</Td>
                  <Td>
                    <Badge color={stageCfg.color} bg={stageCfg.bg}>{stageCfg.label}</Badge>
                  </Td>
                  <Td>
                    <span className={cn('font-bold', scoreColor)}>{lead.score}</span>
                  </Td>
                  <Td className="text-warm-500">{lead.lastContactAt ? formatRelativeTime(lead.lastContactAt) : '-'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.slice(0, 2).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                      {lead.tags.length > 2 && (
                        <Badge>+{lead.tags.length - 2}</Badge>
                      )}
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
