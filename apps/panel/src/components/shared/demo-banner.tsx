import { X, Sparkles } from 'lucide-react'
import { dismissDemo } from '@/lib/demo-data'

interface DemoBannerProps {
  onDismiss: () => void
}

export function DemoBanner({ onDismiss }: DemoBannerProps) {
  function handleDismiss() {
    dismissDemo()
    onDismiss()
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
      <Sparkles size={16} className="shrink-0 text-amber-500" />
      <p className="flex-1 text-xs text-amber-700">
        Dados de demonstração. Desaparecem quando seus dados reais chegarem.
      </p>
      <button onClick={handleDismiss} className="shrink-0 text-amber-400 hover:text-amber-600">
        <X size={14} />
      </button>
    </div>
  )
}
