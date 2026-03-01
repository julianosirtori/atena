import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cn(
        'fixed inset-0 m-auto w-full max-w-lg rounded-2xl border-0 bg-white p-0 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        'max-md:fixed max-md:inset-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:m-0 max-md:max-w-full max-md:rounded-b-none max-md:animate-[slideUp_0.2s_ease-out]',
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-warm-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 transition-colors hover:bg-warm-100 hover:text-warm-600"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="p-5">{children}</div>
    </dialog>
  )
}
