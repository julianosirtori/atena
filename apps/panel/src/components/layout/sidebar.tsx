import { NavLink } from 'react-router-dom'
import { Inbox, Users, BarChart3, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TenantSelector } from './tenant-selector'

const links = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/protecoes', label: 'Proteções', icon: Shield },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
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
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-warm-100 p-3">
        <TenantSelector />
      </div>
    </aside>
  )
}
