import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { useTenantContext } from '@/contexts/tenant-context'
import { Spinner } from '@/components/ui/spinner'

export function RootLayout() {
  const { isLoading, tenantId } = useTenantContext()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="font-heading text-xl font-semibold text-warm-900">Nenhum tenant encontrado</h1>
          <p className="mt-2 text-sm text-warm-500">Configure um tenant no banco de dados para começar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-warm-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
