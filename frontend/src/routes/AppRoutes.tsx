import type { ReactNode } from 'react'
import { useData } from '../context/DataContext'
import { MasterAdminPage } from '../pages/MasterAdminPage'
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


function FeatureGate({ feature, children }: { feature: string; children: ReactNode }) {
  const { meta } = useData()
  if (!meta) return <div className="center-pad"><Spinner /></div>
  if (meta.features?.[feature] === false) return <div className="center-pad"><h2>Feature not enabled</h2><p>Contact your master administrator to enable this module for your account.</p></div>
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/master" element={<MasterAdminPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<FeatureGate feature="dashboard"><DashboardPage /></FeatureGate>} />
          <Route path="leads" element={<FeatureGate feature="leads"><ContactsPage key="leads" mode="leads" /></FeatureGate>} />
          <Route path="clients" element={<FeatureGate feature="leads"><ContactsPage key="clients" mode="clients" /></FeatureGate>} />
          <Route path="contacts/:id" element={<FeatureGate feature="leads"><ContactDetailPage /></FeatureGate>} />
          <Route path="properties" element={<FeatureGate feature="properties"><PropertiesPage /></FeatureGate>} />
          <Route path="deals" element={<FeatureGate feature="deals"><DealsPage /></FeatureGate>} />
          <Route path="visits" element={<FeatureGate feature="visits"><VisitsPage /></FeatureGate>} />
          <Route path="tasks" element={<FeatureGate feature="tasks"><TasksPage /></FeatureGate>} />
          <Route path="communications" element={<FeatureGate feature="communications"><CommunicationsPage /></FeatureGate>} />
          <Route path="marketing" element={<FeatureGate feature="marketing"><MarketingPage /></FeatureGate>} />
          <Route path="agents" element={<FeatureGate feature="team"><AgentsPage /></FeatureGate>} />
          <Route path="reports" element={<FeatureGate feature="reports"><ReportsPage /></FeatureGate>} />
          <Route path="documents" element={<FeatureGate feature="documents"><DocumentsPage /></FeatureGate>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<div className="center-pad"><h2>Page not found</h2></div>} />
        </Route>
      </Route>
    </Routes>
  )
}
