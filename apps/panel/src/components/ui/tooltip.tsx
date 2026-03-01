import type { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-warm-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-warm-800" />
      </span>
    </span>
  )
}
