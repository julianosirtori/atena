import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { NotesSection } from '@/pages/inbox/notes-section'

describe('NotesSection', () => {
  it('renders notes section with form', async () => {
    renderWithProviders(<NotesSection conversationId="test-conv-id" />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Adicionar nota...')).toBeInTheDocument()
    })
    expect(screen.getByText('Adicionar')).toBeInTheDocument()
  })
})
