import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.js'
import { useState } from 'react'
import { useTenant } from '../../hooks/useTenant.js'
import { Spinner } from '../ui/Spinner.js'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isLoading, error, tenants } = useTenant()

  if (isLoading && tenants.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error && tenants.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-sm rounded-lg bg-white p-6 text-center shadow-lg">
          <p className="text-lg font-semibold text-gray-800">Falha ao conectar</p>
          <p className="mt-2 text-sm text-gray-500">
            Nao foi possivel conectar ao servidor. Verifique se a API esta rodando em localhost:3000.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 text-lg font-semibold text-primary">Atena</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
