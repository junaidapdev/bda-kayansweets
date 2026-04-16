import { format, parseISO, differenceInDays } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/Button'
import StatusBadge from '../../components/StatusBadge'
import OverdueBadge from './OverdueBadge'
import { DATE_FORMAT, CREDIT_NOTE_STATUS, CREDIT_NOTE_STATUS_LABELS, OVERDUE_THRESHOLD_DAYS, type CreditNoteStatus } from '../../constants/appConstants'
import { REBATE_LAYER_LABELS, type RebateLayer } from '../../constants/bdaRules'
import { formatAmount } from '../../lib/formatters'
import type { ICreditNoteWithSupplier } from '../../interfaces/ICreditNote'

interface AuditTableProps {
  creditNotes: ICreditNoteWithSupplier[]
  onEdit: (note: ICreditNoteWithSupplier) => void
  onDelete: (note: ICreditNoteWithSupplier) => void
}


function statusVariant(status: CreditNoteStatus): 'success' | 'warning' | 'error' {
  if (status === CREDIT_NOTE_STATUS.RECEIVED) return 'success'
  if (status === CREDIT_NOTE_STATUS.DISPUTED) return 'error'
  return 'warning'
}

function isOverdue(note: ICreditNoteWithSupplier): boolean {
  if (note.status !== CREDIT_NOTE_STATUS.PENDING) return false
  return differenceInDays(new Date(), parseISO(note.period_end)) > OVERDUE_THRESHOLD_DAYS
}

function rowBackground(note: ICreditNoteWithSupplier): string | undefined {
  if (note.status === CREDIT_NOTE_STATUS.PENDING) return undefined
  if (note.received_amount < note.expected_amount) return '#fef2f2' // red tint
  return '#f0fdf4' // green tint
}

export default function AuditTable({ creditNotes, onEdit, onDelete }: AuditTableProps) {
  const { canEdit } = useAuth()

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'left',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 12px',
    fontSize: 14,
    color: '#1e293b',
    borderBottom: '1px solid #f1f5f9',
  }

  return (
    <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Supplier</th>
            <th style={thStyle}>Rebate Type</th>
            <th style={thStyle}>Period</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Expected (SR)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Received (SR)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Diff (SR)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Diff %</th>
            <th style={thStyle}>Status</th>
            {canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {creditNotes.map((note) => {
            const diff = note.expected_amount - note.received_amount
            const diffPercent = note.expected_amount > 0
              ? (diff / note.expected_amount) * 100
              : 0
            const overdue = isOverdue(note)
            const bg = rowBackground(note)

            return (
              <tr key={note.id} style={{ background: bg }}>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {note.suppliers?.name ?? '—'}
                    {overdue && <OverdueBadge />}
                  </div>
                </td>
                <td style={{ ...tdStyle, fontSize: 13 }}>
                  {REBATE_LAYER_LABELS[note.rebate_type as RebateLayer] ?? note.rebate_type}
                </td>
                <td style={tdStyle}>
                  {format(parseISO(note.period_start), DATE_FORMAT)} — {format(parseISO(note.period_end), DATE_FORMAT)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(note.expected_amount)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(note.received_amount)}
                </td>
                <td style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  color: diff > 0 ? '#dc2626' : diff < 0 ? '#16a34a' : '#64748b',
                }}>
                  {diff > 0 ? '-' : diff < 0 ? '+' : ''}{formatAmount(Math.abs(diff))}
                </td>
                <td style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  color: diff > 0 ? '#dc2626' : diff < 0 ? '#16a34a' : '#64748b',
                }}>
                  {diffPercent !== 0 ? `${diffPercent.toFixed(1)}%` : '—'}
                </td>
                <td style={tdStyle}>
                  <StatusBadge
                    label={CREDIT_NOTE_STATUS_LABELS[note.status]}
                    variant={statusVariant(note.status)}
                  />
                </td>
                {canEdit && (
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 2 }}>
                      <Button variant="ghost" onClick={() => onEdit(note)} style={{ padding: '4px 8px' }}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => onDelete(note)}
                        style={{ padding: '4px 8px', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
