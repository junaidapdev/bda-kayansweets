import { useState } from 'react'
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/Button'
import { DATE_FORMAT } from '../../constants/appConstants'
import { formatAmount } from '../../lib/formatters'
import type { IPurchaseOrderWithSupplier } from '../../interfaces/IPurchaseOrder'

type SortField = 'order_date' | 'supplier' | 'purchase_amount'
type SortDir = 'asc' | 'desc'

interface PurchaseTableProps {
  orders: IPurchaseOrderWithSupplier[]
  onEdit: (order: IPurchaseOrderWithSupplier) => void
  onDelete: (id: string) => void
}

export default function PurchaseTable({ orders, onEdit, onDelete }: PurchaseTableProps) {
  const { canEdit } = useAuth()
  const [sortField, setSortField] = useState<SortField>('order_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = [...orders].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'order_date':
        cmp = a.order_date.localeCompare(b.order_date)
        break
      case 'supplier':
        cmp = (a.suppliers?.name ?? '').localeCompare(b.suppliers?.name ?? '')
        break
      case 'purchase_amount':
        cmp = a.purchase_amount - b.purchase_amount
        break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    textAlign: 'left',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    userSelect: 'none',
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
            <th style={thStyle} onClick={() => toggleSort('order_date')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Date <ArrowUpDown size={12} />
              </span>
            </th>
            <th style={thStyle} onClick={() => toggleSort('supplier')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Supplier <ArrowUpDown size={12} />
              </span>
            </th>
            <th style={thStyle} onClick={() => toggleSort('purchase_amount')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Amount <ArrowUpDown size={12} />
              </span>
            </th>
            <th style={{ ...thStyle, cursor: 'default' }}>Notes</th>
            {canEdit && <th style={{ ...thStyle, cursor: 'default', textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((order) => (
            <tr key={order.id}>
              <td style={tdStyle}>{format(parseISO(order.order_date), DATE_FORMAT)}</td>
              <td style={tdStyle}>{order.suppliers?.name ?? '—'}</td>
              <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(order.purchase_amount)}
              </td>
              <td style={{ ...tdStyle, color: '#64748b', fontSize: 13 }}>
                {order.notes || '—'}
              </td>
              {canEdit && (
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <Button variant="ghost" onClick={() => onEdit(order)} style={{ padding: '4px 8px' }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" onClick={() => onDelete(order.id)} style={{ padding: '4px 8px', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
