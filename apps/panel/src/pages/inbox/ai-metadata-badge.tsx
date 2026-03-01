import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain } from 'lucide-react'
import type { AiMetadata } from '@/types'
import { cn } from '@/lib/utils'

interface AiMetadataBadgeProps {
  metadata: AiMetadata
  injectionFlags: string[]
  validationResult: string
}

export function AiMetadataBadge({ metadata, injectionFlags, validationResult }: AiMetadataBadgeProps) {
  const [open, setOpen] = useState(false)

  const hasData = metadata.intent || metadata.confidence !== undefined || injectionFlags.length > 0

  if (!hasData) return null

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600 transition-colors hover:bg-blue-100"
      >
        <Brain size={10} />
        IA
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg bg-warm-50 p-2 text-xs text-warm-600 space-y-1">
          {metadata.intent && (
            <div>
              <span className="font-medium">Intenção:</span> {metadata.intent}
            </div>
          )}
          {metadata.confidence !== undefined && (
            <div>
              <span className="font-medium">Confiança:</span>{' '}
              <span
                className={cn(
                  'font-medium',
                  metadata.confidence >= 80
                    ? 'text-emerald-600'
                    : metadata.confidence >= 50
                      ? 'text-amber-600'
                      : 'text-red-600',
                )}
              >
                {metadata.confidence}%
              </span>
            </div>
          )}
          {metadata.tokens_used && (
            <div>
              <span className="font-medium">Tokens:</span> {metadata.tokens_used}
            </div>
          )}
          {injectionFlags.length > 0 && (
            <div className="text-red-600">
              <span className="font-medium">Flags:</span> {injectionFlags.join(', ')}
            </div>
          )}
          {validationResult !== 'valid' && (
            <div className="text-amber-600">
              <span className="font-medium">Validação:</span> {validationResult}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
