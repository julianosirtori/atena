import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { MessageBubble } from '@/pages/inbox/message-bubble'
import type { Message } from '@/types'

const baseMessage: Message = {
  id: 'msg-1',
  tenantId: 't',
  conversationId: 'c',
  direction: 'inbound',
  senderType: 'lead',
  senderAgentId: null,
  content: 'Olá, bom dia!',
  contentType: 'text',
  mediaUrl: null,
  aiMetadata: {},
  deliveryStatus: 'delivered',
  externalId: null,
  injectionFlags: [],
  validationResult: 'valid',
  correlationId: null,
  createdAt: new Date().toISOString(),
}

describe('MessageBubble', () => {
  it('renders message content', () => {
    renderWithProviders(<MessageBubble message={baseMessage} />)
    expect(screen.getByText('Olá, bom dia!')).toBeInTheDocument()
  })

  it('renders AI message', () => {
    const aiMsg = { ...baseMessage, senderType: 'ai' as const, direction: 'outbound' as const }
    renderWithProviders(<MessageBubble message={aiMsg} />)
    expect(screen.getByText('Olá, bom dia!')).toBeInTheDocument()
  })

  it('renders agent message', () => {
    const agentMsg = { ...baseMessage, senderType: 'agent' as const, direction: 'outbound' as const }
    renderWithProviders(<MessageBubble message={agentMsg} />)
    expect(screen.getByText('Olá, bom dia!')).toBeInTheDocument()
  })
})
