import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react'
import type { Message, DeliveryStatus } from '@/types'
import { cn, formatRelativeTime } from '@/lib/utils'
import { SENDER_COLOR } from '@/lib/constants'
import { AiMetadataBadge } from './ai-metadata-badge'

function DeliveryStatusIcon({ status }: { status: DeliveryStatus }) {
  switch (status) {
    case 'queued':
      return <Clock size={12} className="text-current opacity-50" />
    case 'sent':
      return <Check size={12} className="text-current opacity-50" />
    case 'delivered':
      return <CheckCheck size={12} className="text-current opacity-50" />
    case 'read':
      return <CheckCheck size={12} className="text-blue-500" />
    case 'failed':
      return (
        <span title="Falha na entrega">
          <AlertCircle size={12} className="text-red-500" />
        </span>
      )
    default:
      return null
  }
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 sm:max-w-[70%]',
          isOutbound ? 'rounded-br-md' : 'rounded-bl-md',
          SENDER_COLOR[message.senderType],
        )}
      >
        {message.senderType !== 'lead' && (
          <div className="mb-0.5 text-[10px] font-medium uppercase opacity-60">
            {message.senderType === 'ai'
              ? 'IA'
              : message.senderType === 'agent'
                ? 'Agente'
                : 'Sistema'}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-50">
          <span>{formatRelativeTime(message.createdAt)}</span>
          {isOutbound && <DeliveryStatusIcon status={message.deliveryStatus} />}
        </div>
        {message.senderType === 'ai' && (
          <AiMetadataBadge
            metadata={message.aiMetadata}
            injectionFlags={message.injectionFlags}
            validationResult={message.validationResult}
          />
        )}
      </div>
    </div>
  )
}
