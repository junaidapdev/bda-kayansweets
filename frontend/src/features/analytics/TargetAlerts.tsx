import { Target } from 'lucide-react'
import { TARGET_ALERT_THRESHOLD_PERCENT } from '../../constants/appConstants'
import { formatAmount, formatPercent } from '../../lib/formatters'
import type { TargetProgress } from '../../hooks/useTargetProgress'

interface TargetAlertsProps {
  progress: TargetProgress[]
}

interface AlertItem {
  supplierName: string
  year: number
  period: string
  current: number
  target: number
  percent: number
  remaining: number
}

export default function TargetAlerts({ progress }: TargetAlertsProps) {
  const alerts: AlertItem[] = []

  for (const p of progress) {
    const rules = p.supplier.rebate_rules

    if (p.monthlyProgressPercent >= TARGET_ALERT_THRESHOLD_PERCENT && p.monthlyProgressPercent < 100) {
      const target = rules.monthly_target ?? 0
      alerts.push({
        supplierName: p.supplier.name, year: p.year, period: 'Monthly',
        current: p.purchases.monthly, target, percent: p.monthlyProgressPercent,
        remaining: target - p.purchases.monthly,
      })
    }
    if (p.quarterlyProgressPercent >= TARGET_ALERT_THRESHOLD_PERCENT && p.quarterlyProgressPercent < 100) {
      const target = rules.quarterly_target ?? 0
      alerts.push({
        supplierName: p.supplier.name, year: p.year, period: 'Quarterly',
        current: p.purchases.quarterly, target, percent: p.quarterlyProgressPercent,
        remaining: target - p.purchases.quarterly,
      })
    }
    if (p.yearlyProgressPercent >= TARGET_ALERT_THRESHOLD_PERCENT && p.yearlyProgressPercent < 100) {
      const target = rules.yearly_target ?? 0
      alerts.push({
        supplierName: p.supplier.name, year: p.year, period: 'Yearly',
        current: p.purchases.yearly, target, percent: p.yearlyProgressPercent,
        remaining: target - p.purchases.yearly,
      })
    }
  }

  if (alerts.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`,
      gap: 12,
      marginBottom: 20,
    }}>
      {alerts.map((a, i) => (
        <div
          key={`${a.supplierName}-${a.year}-${a.period}-${i}`}
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex', gap: 10,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Target size={15} color="#16a34a" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#166534' }}>
              {a.supplierName} — {a.period} target almost reached
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#15803d' }}>
              {formatPercent(a.percent)} complete — only {formatAmount(a.remaining)} remaining
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
