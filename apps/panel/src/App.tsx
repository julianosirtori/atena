import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { TenantProvider } from '@/contexts/tenant-context'
import { router } from '@/router'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif' },
          }}
        />
      </TenantProvider>
    </QueryClientProvider>
  )
}
