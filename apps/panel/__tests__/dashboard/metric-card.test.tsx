import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { renderWithProviders } from '@/test/test-utils'
import { MetricCard } from '@/pages/dashboard/metric-card'

describe('MetricCard', () => {
  it('renders label and value', () => {
    renderWithProviders(<MetricCard icon={Users} label="Leads hoje" value={42} />)
    expect(screen.getByText('Leads hoje')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value', () => {
    renderWithProviders(<MetricCard icon={Users} label="Taxa" value="85%" />)
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders trend', () => {
    renderWithProviders(
      <MetricCard icon={Users} label="Leads" value={10} trend="+20%" trendUp />,
    )
    expect(screen.getByText('+20%')).toBeInTheDocument()
  })
})
