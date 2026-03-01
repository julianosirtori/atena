import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { TenantProvider } from '@/contexts/tenant-context'
import LeadDetailPage from '@/pages/leads/lead-detail'

function renderLeadDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <MemoryRouter initialEntries={['/leads/test-lead-id']}>
          <Routes>
            <Route path="/leads/:leadId" element={<LeadDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  )
}

describe('LeadDetailPage', () => {
  it('renders lead detail with data', async () => {
    renderLeadDetail()
    await waitFor(
      () => {
        // Lead name appears in both PageHeader and profile card
        const matches = screen.getAllByText('Lead Teste')
        expect(matches.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 5000 },
    )
  })
})
