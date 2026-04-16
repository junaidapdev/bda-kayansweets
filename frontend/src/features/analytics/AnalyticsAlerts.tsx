import { Clock, FileX } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { OVERDUE_THRESHOLD_DAYS } from '../../constants/appConstants'
import { REBATE_LAYER_LABELS, type RebateLayer } from '../../constants/bdaRules'
import { formatAmount } from '../../lib/formatters'
import type { ICreditNoteWithSupplier } from '../../interfaces/ICreditNote'
import type { MissingQuarterlyNote } from '../../hooks/useMissingQuarterlyNotes'

interface AnalyticsAlertsProps {
  creditNotes: ICreditNoteWithSupplier[]
  missingNotes: MissingQuarterlyNote[]
}

export default function AnalyticsAlerts({ creditNotes, missingNotes }: AnalyticsAlertsProps) {
  const overdue = creditNotes.filter((n) =>
    n.status === 'pending' &&
    differenceInDays(new Date(), parseISO(n.period_end)) > OVERDUE_THRESHOLD_DAYS,
  )

  const hasAlerts = overdue.length > 0 || missingNotes.length > 0
  if (!hasAlerts) return null

  const totalAlerts = overdue.length + missingNotes.length

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
          Needs Attention
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: '#fff', background: '#ef4444',
          padding: '2px 8px', borderRadius: 10,
          minWidth: 20, textAlign: 'center',
        }}>
          {totalAlerts}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: totalAlerts <= 2 ? `repeat(${totalAlerts}, 1fr)` : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
        {/* Overdue — supplier hasn't paid */}
        {overdue.map((note) => {
          const daysLate = differenceInDays(new Date(), parseISO(note.period_end))
          return (
            <div
              key={note.id}
              style={{
                display: 'flex', gap: 12, padding: '12px 16px',
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Clock size={15} color="#dc2626" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
                  {note.suppliers?.name ?? '—'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b91c1c' }}>
                  {REBATE_LAYER_LABELS[note.rebate_type as RebateLayer] ?? note.rebate_type} credit note is <strong>{daysLate} days</strong> overdue
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#dc2626' }}>
                  Supplier owes {formatAmount(note.expected_amount)}
                </p>
              </div>
            </div>
          )
        })}

        {/* Missing — credit note not created */}
        {missingNotes.map((item) => (
          <div
            key={`${item.supplierId}_${item.year}_Q${item.quarter}`}
            style={{
              display: 'flex', gap: 12, padding: '12px 16px',
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileX size={15} color="#d97706" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                {item.supplierName}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a16207' }}>
                Q{item.quarter} {item.year} Quarterly Bonus — credit note not yet created
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#b45309' }}>
                Supplier owes {formatAmount(item.expectedAmount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
