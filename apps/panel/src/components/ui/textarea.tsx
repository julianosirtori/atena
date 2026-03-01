import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-warm-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'min-h-[88px] rounded-lg border border-warm-200 bg-white px-3 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-y',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
