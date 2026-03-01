import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { LeadScoreGauge } from '@/pages/leads/lead-score-gauge'

describe('LeadScoreGauge', () => {
  it('renders score value', () => {
    renderWithProviders(<LeadScoreGauge score={75} />)
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('renders low score', () => {
    renderWithProviders(<LeadScoreGauge score={10} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
