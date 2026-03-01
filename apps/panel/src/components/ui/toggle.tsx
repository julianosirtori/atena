import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
          checked ? 'bg-amber-600' : 'bg-warm-300',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
            'mt-0.5',
          )}
        />
      </button>
      {label && <span className="text-sm text-warm-700">{label}</span>}
    </label>
  )
}
