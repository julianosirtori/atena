import { NavLink } from 'react-router-dom'
import { Inbox, Users, BarChart3, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TenantSelector } from './tenant-selector'
import { useConversations } from '@/hooks/use-conversations'

const links = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/protecoes', label: 'Proteções', icon: Shield },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { data: waitingData } = useConversations({ status: 'waiting_human', limit: 1 })
  const waitingCount = waitingData?.meta?.total ?? 0

  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-warm-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-warm-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white font-heading font-bold text-sm">
          A
        </div>
        <span className="font-heading text-lg font-semibold text-warm-900">Atena</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-warm-600 hover:bg-warm-50 hover:text-warm-800',
              )
            }
          >
            <link.icon size={20} />
            <span className="flex-1">{link.label}</span>
            {link.to === '/inbox' && waitingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {waitingCount > 99 ? '99+' : waitingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-warm-100 p-3">
        <TenantSelector />
      </div>
    </aside>
  )
}
