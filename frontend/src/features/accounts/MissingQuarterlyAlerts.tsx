import { AlertTriangle, Plus } from 'lucide-react'
import Button from '../../components/Button'
import { formatAmount } from '../../lib/formatters'
import type { MissingQuarterlyNote } from '../../hooks/useMissingQuarterlyNotes'

interface MissingQuarterlyAlertsProps {
  missing: MissingQuarterlyNote[]
  onCreateClick: (item: MissingQuarterlyNote) => void
}

export default function MissingQuarterlyAlerts({ missing, onCreateClick }: MissingQuarterlyAlertsProps) {
  if (missing.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      {missing.map((item) => {
        const key = `${item.supplierId}_${item.year}_Q${item.quarter}`
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '12px 16px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#92400e',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.supplierName} — Q{item.quarter} {item.year} quarterly credit note missing
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a16207' }}>
                  Purchases: {formatAmount(item.totalPurchases)} · Expected rebate: {formatAmount(item.expectedAmount)}
                </p>
              </div>
            </div>
            <Button
              onClick={() => onCreateClick(item)}
              style={{
                flexShrink: 0,
                fontSize: 12,
                padding: '6px 12px',
                gap: 4,
              }}
            >
              <Plus size={14} />
              Create Credit Note
            </Button>
          </div>
        )
      })}
    </div>
  )
}
