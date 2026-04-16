import { formatAmount, formatPercent } from '../../lib/formatters'
import type { TargetProgress } from '../../hooks/useTargetProgress'
import type { ICreditNoteWithSupplier } from '../../interfaces/ICreditNote'

interface TargetTrackerProps {
  progress: TargetProgress[]
  creditNotes: ICreditNoteWithSupplier[]
}

interface BarInfo {
  label: string
  current: number
  target: number
  percent: number
}

function progressColor(pct: number): string {
  if (pct >= 100) return '#22c55e'
  if (pct >= 75) return '#eab308'
  return '#ef4444'
}

function getReceivedForSupplierYear(
  creditNotes: ICreditNoteWithSupplier[],
  supplierId: string,
  year: number,
): number {
  let total = 0
  for (const cn of creditNotes) {
    if (cn.supplier_id !== supplierId) continue
    const noteYear = new Date(cn.period_start + 'T00:00:00').getFullYear()
    if (noteYear !== year) continue
    total += cn.received_amount
  }
  return total
}

function getPendingExpectedForSupplierYear(
  creditNotes: ICreditNoteWithSupplier[],
  supplierId: string,
  year: number,
): number {
  let total = 0
  for (const cn of creditNotes) {
    if (cn.supplier_id !== supplierId) continue
    if (cn.status !== 'pending') continue
    const noteYear = new Date(cn.period_start + 'T00:00:00').getFullYear()
    if (noteYear !== year) continue
    total += cn.expected_amount
  }
  return total
}

export default function TargetTracker({ progress, creditNotes }: TargetTrackerProps) {
  if (progress.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
          Purchase Targets
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Track purchase volume against supplier targets
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 14,
        alignItems: 'start',
      }}>
        {progress.map((p) => {
          const rules = p.supplier.rebate_rules
          const bars: BarInfo[] = []

          if ((rules.monthly_target ?? 0) > 0)
            bars.push({ label: 'Monthly', current: p.purchases.monthly, target: rules.monthly_target ?? 0, percent: p.monthlyProgressPercent })
          if ((rules.quarterly_target ?? 0) > 0)
            bars.push({ label: 'Quarterly', current: p.purchases.quarterly, target: rules.quarterly_target ?? 0, percent: p.quarterlyProgressPercent })
          if ((rules.yearly_target ?? 0) > 0)
            bars.push({ label: 'Yearly', current: p.purchases.yearly, target: rules.yearly_target ?? 0, percent: p.yearlyProgressPercent })
          if (p.supplier.target_amount != null && p.supplier.target_amount > 0) {
            const pct = (p.purchases.yearly / p.supplier.target_amount) * 100
            bars.push({ label: 'Annual', current: p.purchases.yearly, target: p.supplier.target_amount, percent: pct })
          }

          if (bars.length === 0) return null

          const collected = getReceivedForSupplierYear(creditNotes, p.supplier.id, p.year)
          const awaiting = getPendingExpectedForSupplierYear(creditNotes, p.supplier.id, p.year)
          const isCurrentYear = p.year === new Date().getFullYear()

          return (
            <div key={`${p.supplier.id}_${p.year}`} style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{p.supplier.name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 500, color: '#64748b',
                  background: '#f1f5f9', padding: '1px 6px', borderRadius: 4,
                }}>{p.year}</span>
                {isCurrentYear && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#2563eb',
                    background: '#dbeafe', padding: '1px 6px', borderRadius: 4,
                  }}>Current</span>
                )}
              </div>

              {/* Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bars.map((bar) => (
                  <div key={bar.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                      <span style={{ fontWeight: 500 }}>{bar.label}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(bar.current)} / {formatAmount(bar.target)}
                        <span style={{ marginLeft: 4, fontWeight: 600, color: progressColor(bar.percent) }}>
                          {formatPercent(Math.min(bar.percent, 100))}
                        </span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(bar.percent, 100)}%`,
                        background: progressColor(bar.percent),
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Rebate summary */}
              <div style={{
                display: 'flex', gap: 12, marginTop: 10, paddingTop: 10,
                borderTop: '1px solid #f1f5f9', fontSize: 11,
              }}>
                <span style={{ color: '#94a3b8' }}>Collected <strong style={{ color: '#16a34a' }}>{formatAmount(collected)}</strong></span>
                <span style={{ color: '#94a3b8' }}>Awaiting <strong style={{ color: '#d97706' }}>{formatAmount(awaiting)}</strong></span>
                <span style={{ color: '#94a3b8' }}>Total <strong style={{ color: '#0f172a' }}>{formatAmount(collected + awaiting)}</strong></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
