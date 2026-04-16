import { formatAmount } from '../../lib/formatters'
import type { SupplierPerformance } from '../../hooks/useAnalyticsSummary'

interface SupplierPerformanceTableProps {
  suppliers: SupplierPerformance[]
}

/** Mini inline bar showing collection rate */
function CollectionBar({ percent }: { percent: number }) {
  const capped = Math.min(Math.max(percent, 0), 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
        <div style={{
          height: '100%',
          width: `${capped}%`,
          background: capped >= 75 ? '#22c55e' : capped >= 40 ? '#eab308' : '#ef4444',
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
        {capped.toFixed(0)}%
      </span>
    </div>
  )
}

export default function SupplierPerformanceTable({ suppliers }: SupplierPerformanceTableProps) {
  if (suppliers.length === 0) return null

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    borderBottom: '2px solid #f1f5f9',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '14px 14px',
    fontSize: 14,
    color: '#1e293b',
    borderBottom: '1px solid #f8fafc',
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      height: '100%',
      boxSizing: 'border-box' as const,
    }}>
      <div style={{ padding: '18px 20px 0' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Supplier Scorecard
        </h3>
        <p style={{ margin: '2px 0 10px', fontSize: 11, color: '#94a3b8' }}>
          Sorted by highest uncollected first
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Supplier</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Owed (SR)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Collected (SR)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Uncollected (SR)</th>
              <th style={{ ...thStyle, minWidth: 120 }}>Collection Rate</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => {
              const collectionRate = s.expected > 0 ? (s.received / s.expected) * 100 : 100

              return (
                <tr key={s.supplierId} style={{ transition: 'background 0.15s' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {s.supplierName}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#475569' }}>
                    {formatAmount(s.expected)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#16a34a', fontWeight: 500 }}>
                    {formatAmount(s.received)}
                  </td>
                  <td style={{
                    ...tdStyle,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: s.leakage > 0 ? '#dc2626' : '#16a34a',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {s.leakage > 0 ? formatAmount(s.leakage) : '—'}
                  </td>
                  <td style={tdStyle}>
                    <CollectionBar percent={collectionRate} />
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          {suppliers.length > 1 && (() => {
            const totalOwed = suppliers.reduce((sum, r) => sum + r.expected, 0)
            const totalCollected = suppliers.reduce((sum, r) => sum + r.received, 0)
            const totalUncollected = suppliers.reduce((sum, r) => sum + r.leakage, 0)
            const totalRate = totalOwed > 0 ? (totalCollected / totalOwed) * 100 : 100

            return (
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ ...tdStyle, fontWeight: 700, borderBottom: 'none' }}>All Suppliers</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#475569', borderBottom: 'none' }}>
                    {formatAmount(totalOwed)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#16a34a', borderBottom: 'none' }}>
                    {formatAmount(totalCollected)}
                  </td>
                  <td style={{
                    ...tdStyle, textAlign: 'right', fontWeight: 700, borderBottom: 'none',
                    color: totalUncollected > 0 ? '#dc2626' : '#16a34a',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {totalUncollected > 0 ? formatAmount(totalUncollected) : '—'}
                  </td>
                  <td style={{ ...tdStyle, borderBottom: 'none' }}>
                    <CollectionBar percent={totalRate} />
                  </td>
                </tr>
              </tfoot>
            )
          })()}
        </table>
      </div>
    </div>
  )
}
