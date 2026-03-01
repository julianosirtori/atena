import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import ProtecoesPage from '@/pages/protecoes'

describe('ProtecoesPage', () => {
  it('renders page header', async () => {
    renderWithProviders(<ProtecoesPage />)
    await waitFor(() => {
      expect(screen.getByText('Proteções')).toBeInTheDocument()
    })
  })

  it('shows empty state when no incidents', async () => {
    renderWithProviders(<ProtecoesPage />)
    await waitFor(() => {
      expect(screen.getByText('Nenhum incidente registrado.')).toBeInTheDocument()
    })
  })
})
