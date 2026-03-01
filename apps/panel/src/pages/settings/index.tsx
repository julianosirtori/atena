import { useState } from 'react'
import { ChevronDown, Building2, Radio, PhoneForwarded, Users } from 'lucide-react'
import { useTenantContext } from '@/contexts/tenant-context'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { BusinessSection } from './business-section'
import { ChannelsSection } from './channels-section'
import { HandoffSection } from './handoff-section'
import { AgentsSection } from './agents-section'

const sections = [
  { id: 'business', label: 'Dados do negócio', icon: Building2 },
  { id: 'channels', label: 'Canais', icon: Radio },
  { id: 'handoff', label: 'Regras de handoff', icon: PhoneForwarded },
  { id: 'agents', label: 'Agentes', icon: Users },
] as const

type SectionId = (typeof sections)[number]['id']

export default function SettingsPage() {
  const { tenant } = useTenantContext()
  const [openSection, setOpenSection] = useState<SectionId | null>('business')

  if (!tenant) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  function toggle(id: SectionId) {
    setOpenSection(openSection === id ? null : id)
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <PageHeader title="Configurações" subtitle={tenant.businessName} />

      {sections.map((section) => {
        const isOpen = openSection === section.id
        const Icon = section.icon

        return (
          <div key={section.id} className="rounded-xl border border-warm-200 bg-white overflow-hidden">
            <button
              onClick={() => toggle(section.id)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Icon size={16} className="text-amber-600" />
                </div>
                <span className="font-medium text-warm-900">{section.label}</span>
              </div>
              <ChevronDown
                size={16}
                className={cn('text-warm-400 transition-transform', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && (
              <div className="border-t border-warm-100 px-4 py-4">
                {section.id === 'business' && <BusinessSection tenant={tenant} />}
                {section.id === 'channels' && <ChannelsSection tenant={tenant} />}
                {section.id === 'handoff' && <HandoffSection tenant={tenant} />}
                {section.id === 'agents' && <AgentsSection />}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
