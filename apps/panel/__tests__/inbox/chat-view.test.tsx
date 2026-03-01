import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ChatView } from '@/pages/inbox/chat-view'
import type { ConversationWithLead } from '@/types'

const mockConversation: ConversationWithLead = {
  id: 'test-conv-id',
  tenantId: 'test-tenant-id',
  leadId: 'test-lead-id',
  channel: 'whatsapp',
  status: 'ai',
  assignedAgentId: null,
  campaignId: null,
  aiMessagesCount: 3,
  humanMessagesCount: 0,
  leadMessagesCount: 4,
  firstResponseTimeMs: 1200,
  aiModel: 'claude-sonnet-4-20250514',
  aiSummary: null,
  handoffReason: null,
  handoffAt: null,
  openedAt: new Date().toISOString(),
  closedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  leadName: 'Lead Teste',
  leadPhone: '+5511999887766',
  leadScore: 45,
  leadStage: 'qualifying',
}

describe('ChatView', () => {
  it('renders lead name in header', async () => {
    renderWithProviders(<ChatView conversation={mockConversation} />)
    expect(screen.getByText('Lead Teste')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderWithProviders(<ChatView conversation={mockConversation} />)
    expect(screen.getByText('IA')).toBeInTheDocument()
  })

  it('renders messages', async () => {
    renderWithProviders(<ChatView conversation={mockConversation} />)
    await waitFor(() => {
      expect(screen.getByText('Olá, gostaria de saber o preço.')).toBeInTheDocument()
    })
  })

  it('does not show message input when status is ai', () => {
    renderWithProviders(<ChatView conversation={mockConversation} />)
    expect(screen.queryByPlaceholderText('Digite sua mensagem...')).not.toBeInTheDocument()
  })

  it('shows message input when status is human', async () => {
    const humanConv = { ...mockConversation, status: 'human' as const }
    renderWithProviders(<ChatView conversation={humanConv} />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Digite sua mensagem...')).toBeInTheDocument()
    })
  })
})
