import { cn, getInitials } from '@/lib/utils'

const colors = [
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
]

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

interface AvatarProps {
  name: string | null
  src?: string | null
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const displayName = name ?? '?'

  if (src) {
    return (
      <img
        src={src}
        alt={displayName}
        loading="lazy"
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium',
        sizes[size],
        hashColor(displayName),
        className,
      )}
    >
      {getInitials(displayName)}
    </div>
  )
}
