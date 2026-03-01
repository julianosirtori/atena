import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import SettingsPage from '@/pages/settings'

describe('SettingsPage', () => {
  it('renders all section headers', async () => {
    renderWithProviders(<SettingsPage />)
    await waitFor(
      () => {
        expect(screen.getByText('Dados do negócio')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByText('Canais')).toBeInTheDocument()
    expect(screen.getByText('Regras de handoff')).toBeInTheDocument()
    expect(screen.getByText('Agentes')).toBeInTheDocument()
    expect(screen.getByText('Respostas rápidas')).toBeInTheDocument()
    expect(screen.getByText('Plano e cobrança')).toBeInTheDocument()
  })

  it('shows Testar IA button', async () => {
    renderWithProviders(<SettingsPage />)
    await waitFor(
      () => {
        const buttons = screen.getAllByText('Testar IA')
        expect(buttons.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 3000 },
    )
  })

  it('toggles accordion sections', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)
    await waitFor(
      () => {
        expect(screen.getByText('Dados do negócio')).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    await user.click(screen.getByText('Canais'))
  })
})
