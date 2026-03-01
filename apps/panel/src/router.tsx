import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RootLayout } from '@/components/layout/root-layout'
import { Spinner } from '@/components/ui/spinner'

const InboxPage = lazy(() => import('@/pages/inbox'))
const LeadsPage = lazy(() => import('@/pages/leads'))
const LeadDetailPage = lazy(() => import('@/pages/leads/lead-detail'))
const DashboardPage = lazy(() => import('@/pages/dashboard'))
const SettingsPage = lazy(() => import('@/pages/settings'))
const NotFoundPage = lazy(() => import('@/pages/not-found'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      {
        path: 'inbox',
        element: (
          <SuspenseWrapper>
            <InboxPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'inbox/:conversationId',
        element: (
          <SuspenseWrapper>
            <InboxPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'leads',
        element: (
          <SuspenseWrapper>
            <LeadsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'leads/:leadId',
        element: (
          <SuspenseWrapper>
            <LeadDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <SuspenseWrapper>
            <SettingsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '*',
        element: (
          <SuspenseWrapper>
            <NotFoundPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
])
