import { NavLink } from 'react-router-dom'
import { Inbox, Users, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/settings', label: 'Config', icon: Settings },
]

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-warm-200 bg-white safe-bottom md:hidden">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-amber-600' : 'text-warm-400',
            )
          }
        >
          <link.icon size={20} />
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
