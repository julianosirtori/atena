import { NavLink } from 'react-router-dom'
import { Inbox, Users, BarChart3, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConversations } from '@/hooks/use-conversations'

const links = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/protecoes', label: 'Proteção', icon: Shield },
  { to: '/settings', label: 'Config', icon: Settings },
]

export function MobileNav() {
  const { data: waitingData } = useConversations({ status: 'waiting_human', limit: 1 })
  const waitingCount = waitingData?.meta?.total ?? 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-warm-200 bg-white safe-bottom md:hidden">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-amber-600' : 'text-warm-400',
            )
          }
        >
          <div className="relative">
            <link.icon size={20} />
            {link.to === '/inbox' && waitingCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {waitingCount > 99 ? '99+' : waitingCount}
              </span>
            )}
          </div>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
