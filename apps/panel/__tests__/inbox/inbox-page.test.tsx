import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import InboxPage from '@/pages/inbox'

describe('InboxPage', () => {
  it('renders conversation list', async () => {
    renderWithProviders(<InboxPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar conversa...')).toBeInTheDocument()
    })
  })

  it('shows empty state placeholder', async () => {
    renderWithProviders(<InboxPage />)
    await waitFor(() => {
      expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument()
    })
  })
})
