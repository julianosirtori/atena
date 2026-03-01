import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warm-100">
        <Icon size={24} className="text-warm-400" />
      </div>
      <h3 className="font-heading text-base font-semibold text-warm-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-warm-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
