import { Receipt, CircleCheckBig, Clock, CircleAlert } from 'lucide-react'
import { formatAmount } from '../../lib/formatters'
import type { AnalyticsTotals } from '../../hooks/useAnalyticsSummary'

interface AnalyticsSummaryCardsProps {
  totals: AnalyticsTotals
}

export default function AnalyticsSummaryCards({ totals }: AnalyticsSummaryCardsProps) {
  const collectionRate = totals.totalExpected > 0
    ? ((totals.totalReceived / totals.totalExpected) * 100).toFixed(1)
    : '0.0'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      marginBottom: 24,
    }}>
      {/* Supplier Owes */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Receipt size={16} color="#3b82f6" />
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Supplier Owes</span>
        </div>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
          {formatAmount(totals.totalExpected)}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Total rebates owed by suppliers
        </p>
      </div>

      {/* Collected */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CircleCheckBig size={16} color="#22c55e" />
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Collected</span>
        </div>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
          {formatAmount(totals.totalReceived)}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          {collectionRate}% collection rate
        </p>
      </div>

      {/* Awaiting Collection */}
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Clock size={16} color="#eab308" />
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Awaiting Collection</span>
        </div>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#a16207', fontVariantNumeric: 'tabular-nums' }}>
          {totals.totalPending}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Credit notes pending from suppliers
        </p>
      </div>

      {/* Uncollected */}
      <div style={{
        background: totals.totalLeakage > 0 ? '#fef2f2' : '#f0fdf4',
        border: `1px solid ${totals.totalLeakage > 0 ? '#fecaca' : '#bbf7d0'}`,
        borderRadius: 12,
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: totals.totalLeakage > 0 ? '#fee2e2' : '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CircleAlert size={16} color={totals.totalLeakage > 0 ? '#ef4444' : '#22c55e'} />
          </div>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Uncollected</span>
        </div>
        <p style={{
          margin: 0, fontSize: 24, fontWeight: 700,
          color: totals.totalLeakage > 0 ? '#dc2626' : '#16a34a',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatAmount(totals.totalLeakage)}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
          {totals.totalLeakage > 0 ? 'Money still owed to you' : 'All rebates collected'}
        </p>
      </div>
    </div>
  )
}
