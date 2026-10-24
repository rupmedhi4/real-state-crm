import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { DataProvider } from '../context/DataContext'
import { SearchProvider } from '../context/SearchContext'
import { AgentsPage } from '../pages/AgentsPage'
import { LoginPage, RegisterPage } from '../pages/AuthPages'
import { CommunicationsPage } from '../pages/CommunicationsPage'
import { ContactDetailPage } from '../pages/ContactDetailPage'
import { ContactsPage } from '../pages/ContactsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DealsPage } from '../pages/DealsPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { MarketingPage } from '../pages/MarketingPage'
import { PropertiesPage } from '../pages/PropertiesPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { TasksPage } from '../pages/TasksPage'
import { VisitsPage } from '../pages/VisitsPage'

/** Sends signed-out users to /login, remembering where they were going. */
function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="auth-page">
        <Spinner />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <DataProvider>
      <SearchProvider>
        <Outlet />
      </SearchProvider>
    </DataProvider>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="leads" element={<ContactsPage key="leads" mode="leads" />} />
          <Route path="clients" element={<ContactsPage key="clients" mode="clients" />} />
          <Route path="contacts/:id" element={<ContactDetailPage />} />
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="communications" element={<CommunicationsPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="center-pad"><h2>Page not found</h2></div>} />
        </Route>
      </Route>
    </Routes>
  )
}
