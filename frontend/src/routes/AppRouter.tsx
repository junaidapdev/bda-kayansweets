import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '../constants/appConstants'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import PurchasesPage from '../features/purchases/PurchasesPage'
import AccountsPage from '../features/accounts/AccountsPage'
import AnalyticsPage from '../features/analytics/AnalyticsPage'
import SuppliersPage from '../features/suppliers/SuppliersPage'
import ActivityLogPage from '../features/activity/ActivityLogPage'
import LoginPage from '../features/auth/LoginPage'

function AuthGate() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#64748b',
        fontSize: 14,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) return <LoginPage />

  return <Layout />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AuthGate />}>
            <Route path={ROUTES.PURCHASES} element={<PurchasesPage />} />
            <Route path={ROUTES.AUDIT} element={<AccountsPage />} />
            <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            <Route path={ROUTES.SUPPLIERS} element={<SuppliersPage />} />
            <Route path={ROUTES.ACTIVITY} element={<ActivityLogPage />} />
            <Route path="*" element={<Navigate to={ROUTES.PURCHASES} replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
