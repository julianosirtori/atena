import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({ children, className, padding = 'md', onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-warm-200 bg-white shadow-sm',
        paddings[padding],
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}
