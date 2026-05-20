import { useMemo, useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react'
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

type SortField =
  | 'supplier'
  | 'rebate_type'
  | 'period'
  | 'expected_amount'
  | 'received_amount'
  | 'diff'
  | 'diff_percent'
  | 'status'

type SortDir = 'asc' | 'desc'

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

function noteDiff(note: ICreditNoteWithSupplier): number {
  return note.expected_amount - note.received_amount
}

function noteDiffPercent(note: ICreditNoteWithSupplier): number {
  return note.expected_amount > 0 ? (noteDiff(note) / note.expected_amount) * 100 : 0
}

export default function AuditTable({ creditNotes, onEdit, onDelete }: AuditTableProps) {
  const { canEdit } = useAuth()
  const [sortField, setSortField] = useState<SortField>('supplier')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sortedCreditNotes = useMemo(() => {
    return [...creditNotes].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'supplier':
          cmp = (a.suppliers?.name ?? '').localeCompare(b.suppliers?.name ?? '')
          break
        case 'rebate_type':
          cmp = (
            REBATE_LAYER_LABELS[a.rebate_type as RebateLayer] ?? a.rebate_type
          ).localeCompare(REBATE_LAYER_LABELS[b.rebate_type as RebateLayer] ?? b.rebate_type)
          break
        case 'period':
          cmp = a.period_start.localeCompare(b.period_start)
          if (cmp === 0) cmp = a.period_end.localeCompare(b.period_end)
          break
        case 'expected_amount':
          cmp = a.expected_amount - b.expected_amount
          break
        case 'received_amount':
          cmp = a.received_amount - b.received_amount
          break
        case 'diff':
          cmp = noteDiff(a) - noteDiff(b)
          break
        case 'diff_percent':
          cmp = noteDiffPercent(a) - noteDiffPercent(b)
          break
        case 'status':
          cmp = CREDIT_NOTE_STATUS_LABELS[a.status].localeCompare(CREDIT_NOTE_STATUS_LABELS[b.status])
          break
      }

      if (cmp === 0) {
        cmp = a.period_end.localeCompare(b.period_end)
        if (cmp === 0) cmp = a.created_at.localeCompare(b.created_at)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [creditNotes, sortDir, sortField])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortableLabel = (label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {label} <ArrowUpDown size={12} />
    </span>
  )

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
    cursor: 'pointer',
    userSelect: 'none',
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
            <th style={thStyle} onClick={() => toggleSort('supplier')}>{sortableLabel('Supplier')}</th>
            <th style={thStyle} onClick={() => toggleSort('rebate_type')}>{sortableLabel('Rebate Type')}</th>
            <th style={thStyle} onClick={() => toggleSort('period')}>{sortableLabel('Period')}</th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('expected_amount')}>{sortableLabel('Expected (SR)')}</th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('received_amount')}>{sortableLabel('Received (SR)')}</th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('diff')}>{sortableLabel('Diff (SR)')}</th>
            <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('diff_percent')}>{sortableLabel('Diff %')}</th>
            <th style={thStyle} onClick={() => toggleSort('status')}>{sortableLabel('Status')}</th>
            {canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sortedCreditNotes.map((note) => {
            const diff = noteDiff(note)
            const diffPercent = noteDiffPercent(note)
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
