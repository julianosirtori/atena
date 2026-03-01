import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ConversationList } from '@/pages/inbox/conversation-list'

describe('ConversationList', () => {
  it('renders search and tabs', async () => {
    renderWithProviders(
      <ConversationList activeId={undefined} onSelect={() => {}} />,
    )
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar conversa...')).toBeInTheDocument()
    })
    expect(screen.getByText('Todas')).toBeInTheDocument()
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByText('Aguardando')).toBeInTheDocument()
  })

  it('renders conversations from API', async () => {
    renderWithProviders(
      <ConversationList activeId={undefined} onSelect={() => {}} />,
    )
    await waitFor(
      () => {
        expect(screen.getByText('Lead Teste')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })
})
