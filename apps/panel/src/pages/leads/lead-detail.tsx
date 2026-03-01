import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Phone, Mail, Tag, Calendar } from 'lucide-react'
import { useLead, useUpdateLead } from '@/hooks/use-leads'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { Avatar } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { STAGE_CONFIG, CHANNEL_CONFIG } from '@/lib/constants'
import { formatPhone, formatRelativeTime } from '@/lib/utils'
import { LeadScoreGauge } from './lead-score-gauge'
import { LeadEventTimeline } from './lead-event-timeline'
import type { LeadStage } from '@/types'

const stageOptions = Object.entries(STAGE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

export default function LeadDetailPage() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useLead(leadId)
  const updateLead = useUpdateLead()
  const [tab, setTab] = useState<'timeline' | 'conversations'>('timeline')

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const lead = data?.data
  if (!lead) return null

  const stageCfg = STAGE_CONFIG[lead.stage]

  function handleStageChange(stage: string) {
    if (!leadId) return
    updateLead.mutate({ leadId, body: { stage: stage as LeadStage } })
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
          <ArrowLeft size={20} />
        </Button>
        <PageHeader title={lead.name ?? 'Sem nome'} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Profile card */}
        <Card className="md:col-span-2">
          <div className="flex items-start gap-4">
            <Avatar name={lead.name} src={lead.avatarUrl} size="lg" />
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="font-heading text-lg font-semibold text-warm-900">
                {lead.name ?? 'Sem nome'}
              </h2>
              <div className="flex flex-wrap gap-3 text-sm text-warm-600">
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} /> {formatPhone(lead.phone)}
                  </span>
                )}
                {lead.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {lead.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {formatRelativeTime(lead.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge color={stageCfg.color} bg={stageCfg.bg}>{stageCfg.label}</Badge>
                <Badge>{CHANNEL_CONFIG[lead.channel].label}</Badge>
                {lead.tags.map((t) => (
                  <Badge key={t}>
                    <Tag size={10} className="mr-0.5" />
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Score card */}
        <Card className="flex flex-col items-center justify-center">
          <LeadScoreGauge score={lead.score} />
          <p className="mt-1 text-xs text-warm-500">Temperatura</p>
        </Card>
      </div>

      {/* Stage editor */}
      <Card>
        <div className="flex items-center gap-4">
          <Select
            label="Estágio"
            options={stageOptions}
            value={lead.stage}
            onChange={(e) => handleStageChange(e.target.value)}
          />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'timeline' as const, label: 'Timeline' },
          { value: 'conversations' as const, label: 'Conversas' },
        ]}
      />

      {tab === 'timeline' && leadId && (
        <Card>
          <LeadEventTimeline leadId={leadId} />
        </Card>
      )}

      {tab === 'conversations' && (
        <Card>
          <p className="py-4 text-center text-sm text-warm-400">
            Conversas deste lead aparecerão aqui.
          </p>
        </Card>
      )}
    </div>
  )
}
