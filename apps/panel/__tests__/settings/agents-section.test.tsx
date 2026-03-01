import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { AgentsSection } from '@/pages/settings/agents-section'

describe('AgentsSection', () => {
  it('renders agent list with new agent button', async () => {
    renderWithProviders(<AgentsSection />)
    await waitFor(
      () => {
        const buttons = screen.getAllByText('Novo agente')
        expect(buttons.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 3000 },
    )
  })

  it('displays agents from API', async () => {
    renderWithProviders(<AgentsSection />)
    await waitFor(
      () => {
        expect(screen.getByText('Agente Teste')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByText('agente@teste.com')).toBeInTheDocument()
  })
})
