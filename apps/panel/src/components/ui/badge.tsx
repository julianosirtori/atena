import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  color?: string
  bg?: string
  className?: string
}

export function Badge({ children, color, bg, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        color,
        bg,
        !color && !bg && 'bg-warm-100 text-warm-700',
        className,
      )}
    >
      {children}
    </span>
  )
}
