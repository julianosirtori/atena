import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { ConversationsChart } from '@/pages/dashboard/conversations-chart'

describe('ConversationsChart', () => {
  it('renders chart title', () => {
    const data = { ai: 10, waiting_human: 3, human: 2, closed: 15 }
    renderWithProviders(<ConversationsChart data={data} />)
    expect(screen.getByText('Conversas por status')).toBeInTheDocument()
  })
})
