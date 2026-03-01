import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TenantProvider } from '@/contexts/tenant-context'
import type { ReactElement } from 'react'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

interface WrapperOptions {
  initialEntries?: string[]
}

function createWrapper({ initialEntries = ['/'] }: WrapperOptions = {}) {
  const queryClient = createTestQueryClient()

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>
    )
  }
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & WrapperOptions,
) {
  const { initialEntries, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: createWrapper({ initialEntries }),
    ...renderOptions,
  })
}

export { createTestQueryClient }
