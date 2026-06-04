import { useState, useCallback } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingCart, ClipboardCheck, BarChart3, Building2, Activity, Download, LogOut, UserRound } from 'lucide-react'
import { ROUTES, TAB_LABELS, APP_NAME } from '../constants/appConstants'
import { useAuth } from '../hooks/useAuth'
import { exportAllData } from '../lib/exportData'

const NAV_ITEMS = [
  { to: ROUTES.PURCHASES, label: TAB_LABELS.PURCHASES, icon: ShoppingCart },
  { to: ROUTES.AUDIT, label: TAB_LABELS.AUDIT, icon: ClipboardCheck },
  { to: ROUTES.ANALYTICS, label: TAB_LABELS.ANALYTICS, icon: BarChart3 },
  { to: ROUTES.SUPPLIERS, label: TAB_LABELS.SUPPLIERS, icon: Building2 },
  { to: ROUTES.ACTIVITY, label: TAB_LABELS.ACTIVITY, icon: Activity },
]

export default function Layout() {
  const { logout } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleExport = useCallback(async () => {
    setExporting(true)
    const result = await exportAllData()
    setExporting(false)
    if (!result.success) {
      alert('Export failed: ' + (result.error ?? 'Unknown error'))
    }
  }, [])

  const handleLogout = useCallback(async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }, [logout])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: '#1e293b',
        color: '#f8fafc',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>{APP_NAME}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            title="Download a full backup of all data as CSV files"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#cbd5e1',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              cursor: exporting ? 'wait' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            <Download size={13} />
            {exporting ? 'Exporting…' : 'Backup'}
          </button>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#0f766e',
            color: '#ccfbf1',
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 9px',
            borderRadius: 6,
          }}>
            <UserRound size={13} />
            Admin
          </span>

          <button
            onClick={handleLogout}
            disabled={signingOut}
            title="Sign out"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#cbd5e1',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: 6,
              cursor: signingOut ? 'wait' : 'pointer',
              opacity: signingOut ? 0.6 : 1,
            }}
          >
            <LogOut size={13} />
            {signingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        padding: '0 24px',
      }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.PURCHASES}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#0f172a' : '#64748b',
              borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <main style={{ flex: 1, padding: 24, background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  )
}
