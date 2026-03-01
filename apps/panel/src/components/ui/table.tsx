import { cn } from '@/lib/utils'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-warm-200 bg-white">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-warm-100 bg-warm-50">
      {children}
    </thead>
  )
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-medium text-warm-500 uppercase tracking-wider', className)}>
      {children}
    </th>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-warm-100">{children}</tbody>
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-warm-50',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-warm-700', className)}>{children}</td>
}
