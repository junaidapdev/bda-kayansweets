import { useState, useCallback } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { ShoppingCart, ClipboardCheck, BarChart3, Building2, Download } from 'lucide-react'
import { ROUTES, TAB_LABELS, APP_NAME } from '../constants/appConstants'
import { ROLES, type Role } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { exportAllData } from '../lib/exportData'

const NAV_ITEMS = [
  { to: ROUTES.PURCHASES, label: TAB_LABELS.PURCHASES, icon: ShoppingCart },
  { to: ROUTES.AUDIT, label: TAB_LABELS.AUDIT, icon: ClipboardCheck },
  { to: ROUTES.ANALYTICS, label: TAB_LABELS.ANALYTICS, icon: BarChart3 },
  { to: ROUTES.SUPPLIERS, label: TAB_LABELS.SUPPLIERS, icon: Building2 },
]

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: ROLES.ACCOUNTS, label: 'Accounts Team' },
  { value: ROLES.PURCHASE_MANAGER, label: 'Purchase Manager' },
]

export default function Layout() {
  const { role, setRole } = useAuth()
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    setExporting(true)
    const result = await exportAllData()
    setExporting(false)
    if (!result.success) {
      alert('Export failed: ' + (result.error ?? 'Unknown error'))
    }
  }, [])

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

          <span style={{ fontSize: 13, color: '#94a3b8' }}>Role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            style={{
              background: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {role === ROLES.PURCHASE_MANAGER && (
            <span style={{
              background: '#0f766e',
              color: '#ccfbf1',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              letterSpacing: '0.02em',
            }}>
              READ-ONLY
            </span>
          )}
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
