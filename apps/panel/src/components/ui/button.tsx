import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

const variants = {
  primary: 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800',
  secondary: 'bg-warm-100 text-warm-800 hover:bg-warm-200 active:bg-warm-300 border border-warm-200',
  ghost: 'text-warm-600 hover:bg-warm-100 active:bg-warm-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
}

const buttonSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof buttonSizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-50',
          variants[variant],
          buttonSizes[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner size="sm" className="text-current" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
