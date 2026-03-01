import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { QuickReplyBar } from '@/pages/inbox/quick-reply-bar'

const mockReplies = [
  { id: 'qr-1', label: 'Horário', text: 'Nosso horário é 9h às 18h.' },
  { id: 'qr-2', label: 'Preço', text: 'R$ 99,90' },
]

describe('QuickReplyBar', () => {
  it('renders reply buttons', () => {
    renderWithProviders(<QuickReplyBar replies={mockReplies} onSelect={() => {}} />)
    expect(screen.getByText('Horário')).toBeInTheDocument()
    expect(screen.getByText('Preço')).toBeInTheDocument()
  })

  it('calls onSelect with reply text', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderWithProviders(<QuickReplyBar replies={mockReplies} onSelect={onSelect} />)
    await user.click(screen.getByText('Horário'))
    expect(onSelect).toHaveBeenCalledWith('Nosso horário é 9h às 18h.')
  })

  it('returns null when no replies', () => {
    const { container } = renderWithProviders(
      <QuickReplyBar replies={[]} onSelect={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
