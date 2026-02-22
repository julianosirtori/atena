import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.js'
import { DashboardPage } from './pages/DashboardPage.js'
import { LeadsListPage } from './pages/leads/LeadsListPage.js'
import { LeadDetailPage } from './pages/leads/LeadDetailPage.js'
import { PipelinePage } from './pages/leads/PipelinePage.js'
import { ConversationsListPage } from './pages/conversations/ConversationsListPage.js'
import { ChatViewPage } from './pages/conversations/ChatViewPage.js'
import { EventsTimelinePage } from './pages/events/EventsTimelinePage.js'
import { SecurityIncidentsPage } from './pages/events/SecurityIncidentsPage.js'
import { TenantSettingsPage } from './pages/settings/TenantSettingsPage.js'
import { AgentsListPage } from './pages/settings/AgentsListPage.js'
import { NotFoundPage } from './pages/NotFoundPage.js'

export function App() {
  return (
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
  )
}
