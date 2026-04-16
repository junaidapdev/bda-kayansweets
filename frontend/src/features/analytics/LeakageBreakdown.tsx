import { formatAmount } from '../../lib/formatters'
import type { LeakageByType } from '../../hooks/useAnalyticsSummary'

interface LeakageBreakdownProps {
  data: LeakageByType[]
  totalLeakage: number
}

export default function LeakageBreakdown({ data, totalLeakage }: LeakageBreakdownProps) {
  if (data.length === 0) return null

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '18px 20px',
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          By Rebate Type
        </h3>
        {totalLeakage > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#dc2626',
            background: '#fef2f2', padding: '3px 10px', borderRadius: 20,
          }}>
            {formatAmount(totalLeakage)} uncollected
          </span>
        )}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: '#94a3b8' }}>
        Collected vs owed per category
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {data.map((item) => {
          const collectedPct = item.expected > 0 ? (item.received / item.expected) * 100 : 0
          const uncollectedPct = item.expected > 0 ? (item.leakage / item.expected) * 100 : 0

          return (
            <div key={item.type}>
              {/* Label + uncollected value */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                  {item.label}
                  <span style={{
                    fontSize: 10, fontWeight: 500, color: '#94a3b8',
                    marginLeft: 6,
                  }}>
                    {item.count} note{item.count !== 1 ? 's' : ''}
                  </span>
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                  color: item.leakage > 0 ? '#dc2626' : '#16a34a',
                }}>
                  {item.leakage > 0 ? `${uncollectedPct.toFixed(0)}% uncollected` : 'Fully collected'}
                </span>
              </div>

              {/* Stacked bar */}
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                {item.received > 0 && (
                  <div style={{
                    height: '100%',
                    width: `${Math.min(collectedPct, 100)}%`,
                    background: '#22c55e',
                    transition: 'width 0.3s',
                  }} />
                )}
                {item.leakage > 0 && (
                  <div style={{
                    height: '100%',
                    width: `${Math.min(uncollectedPct, 100)}%`,
                    background: '#fca5a5',
                    transition: 'width 0.3s',
                  }} />
                )}
              </div>

              {/* Owed / Collected */}
              <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                <span>Owed <strong style={{ color: '#475569' }}>{formatAmount(item.expected)}</strong></span>
                <span>Collected <strong style={{ color: '#16a34a' }}>{formatAmount(item.received)}</strong></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
