import { cn } from '@/lib/utils'

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  tabs: { value: T; label: string; count?: number }[]
  className?: string
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: TabsProps<T>) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-warm-200 scrollbar-hide', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            value === tab.value
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-warm-500 hover:text-warm-700',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                value === tab.value ? 'bg-amber-100 text-amber-700' : 'bg-warm-100 text-warm-500',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
