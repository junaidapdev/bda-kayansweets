import { useState, useCallback } from 'react'
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSuppliers } from '../../hooks/useSuppliers'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import SupplierFormModal from './SupplierFormModal'
import { TAB_LABELS } from '../../constants/appConstants'
import { formatAmount } from '../../lib/formatters'
import type { ISupplier } from '../../interfaces/ISupplier'
import type { SupplierFormData } from '../../validations/supplierSchema'
import logger from '../../lib/logger'

function fmtRate(val: number | undefined): string {
  if (val == null || val === 0) return '—'
  return `${val}%`
}

export default function SuppliersPage() {
  const { canEdit } = useAuth()
  const { suppliers, loading, error, create, update, remove } = useSuppliers()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ISupplier | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleNew = useCallback(() => { setEditing(null); setModalOpen(true) }, [])
  const handleEdit = useCallback((s: ISupplier) => { setEditing(s); setModalOpen(true) }, [])
  const handleClose = useCallback(() => { setModalOpen(false); setEditing(null) }, [])

  const handleSubmit = useCallback(async (data: SupplierFormData) => {
    if (editing) {
      const result = await update(editing.id, data)
      if (!result.success) throw new Error(result.error)
    } else {
      const result = await create(data)
      if (!result.success) throw new Error(result.error)
    }
  }, [editing, create, update])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this supplier and all its related purchases, credit notes, and points? This cannot be undone.')) return
    setDeletingId(id)
    const result = await remove(id)
    if (!result.success) logger.error('SuppliersPage delete', result.error)
    setDeletingId(null)
  }, [remove])

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left',
    borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    padding: '12px 12px', fontSize: 14, color: '#1e293b', borderBottom: '1px solid #f1f5f9',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{TAB_LABELS.SUPPLIERS}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            Manage supplier profiles and stacked rebate rules.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleNew}><Plus size={16} /> New Supplier</Button>
        )}
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} height={20} />)}
          </div>
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>{error}</div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={<Building2 size={40} color="#cbd5e1" />}
          title="No suppliers yet"
          description={canEdit ? 'Add your first supplier to start tracking rebates.' : undefined}
          action={canEdit ? <Button onClick={handleNew}><Plus size={14} /> New Supplier</Button> : undefined}
        />
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Annual Target</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Monthly %</th>

                <th style={{ ...thStyle, textAlign: 'right' }}>Q. Bonus %</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Yearly %</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Rent</th>
                {canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const r = s.rebate_rules ?? {}
                const rentDisplay = r.rent_value != null && r.rent_value > 0
                  ? r.rent_type === 'fixed' ? formatAmount(r.rent_value) : `${r.rent_value}%`
                  : '—'

                return (
                  <tr key={s.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{s.name}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {s.target_amount != null ? formatAmount(s.target_amount) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtRate(r.monthly_rate)}</td>

                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtRate(r.quarterly_bonus_rate)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtRate(r.yearly_rate)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{rentDisplay}</td>
                    {canEdit && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <Button variant="ghost" onClick={() => handleEdit(s)} style={{ padding: '4px 8px' }}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" onClick={() => handleDelete(s.id)}
                            disabled={deletingId === s.id} style={{ padding: '4px 8px', color: '#ef4444' }}>
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
      )}

      {canEdit && (
        <SupplierFormModal open={modalOpen} onClose={handleClose} onSubmit={handleSubmit} editing={editing} />
      )}
    </div>
  )
}
