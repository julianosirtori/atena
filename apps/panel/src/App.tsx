import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.js'
import { Spinner } from './components/ui/Spinner.js'

const DashboardPage = lazy(() => import('./pages/DashboardPage.js'))
const LeadsListPage = lazy(() => import('./pages/leads/LeadsListPage.js'))
const LeadDetailPage = lazy(() => import('./pages/leads/LeadDetailPage.js'))
const PipelinePage = lazy(() => import('./pages/leads/PipelinePage.js'))
const ConversationsListPage = lazy(() => import('./pages/conversations/ConversationsListPage.js'))
const ChatViewPage = lazy(() => import('./pages/conversations/ChatViewPage.js'))
const EventsTimelinePage = lazy(() => import('./pages/events/EventsTimelinePage.js'))
const SecurityIncidentsPage = lazy(() => import('./pages/events/SecurityIncidentsPage.js'))
const TenantSettingsPage = lazy(() => import('./pages/settings/TenantSettingsPage.js'))
const AgentsListPage = lazy(() => import('./pages/settings/AgentsListPage.js'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.js'))

function PageLoader() {
  return (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<LeadsListPage />} />
          <Route path="leads/:leadId" element={<LeadDetailPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="conversations" element={<ConversationsListPage />} />
          <Route path="conversations/:conversationId" element={<ChatViewPage />} />
          <Route path="events" element={<EventsTimelinePage />} />
          <Route path="security" element={<SecurityIncidentsPage />} />
          <Route path="settings" element={<TenantSettingsPage />} />
          <Route path="settings/agents" element={<AgentsListPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
