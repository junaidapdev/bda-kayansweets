import { useState, useCallback } from 'react'
import { ShoppingCart, Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useSupplierTotals } from '../../hooks/useSupplierTotals'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import { TAB_LABELS } from '../../constants/appConstants'
import PurchaseTable from './PurchaseTable'
import PurchaseFormModal from './PurchaseFormModal'
import BDASummaryCards from './BDASummaryCards'
import type { IPurchaseFormData } from '../../interfaces/IPurchaseFormData'
import type { IPurchaseOrderWithSupplier } from '../../interfaces/IPurchaseOrder'
import logger from '../../lib/logger'

export default function PurchasesPage() {
  const { canEdit } = useAuth()
  const { orders, loading, error, create, update, remove } = usePurchaseOrders()
  const { suppliers } = useSuppliers()
  const supplierTotals = useSupplierTotals(orders, suppliers)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<IPurchaseOrderWithSupplier | null>(null)

  const handleNew = useCallback(() => {
    setEditing(null)
    setModalOpen(true)
  }, [])

  const handleEdit = useCallback((order: IPurchaseOrderWithSupplier) => {
    setEditing(order)
    setModalOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const result = await remove(id)
    if (!result.success) logger.error('delete purchase failed', result.error)
  }, [remove])

  const handleSubmit = useCallback(async (data: IPurchaseFormData) => {
    if (editing) {
      const result = await update(editing.id, data)
      if (!result.success) throw new Error(result.error)
    } else {
      const result = await create(data)
      if (!result.success) throw new Error(result.error)
    }
  }, [editing, create, update])

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setEditing(null)
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{TAB_LABELS.PURCHASES}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            Log and manage purchase orders with supplier rebate targets.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleNew}>
            <Plus size={16} />
            New Order
          </Button>
        )}
      </div>

      {loading ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
                <Skeleton height={14} width="50%" />
                <div style={{ marginTop: 12 }}><Skeleton height={24} width="70%" /></div>
                <div style={{ marginTop: 10 }}><Skeleton height={8} /></div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={20} />)}
            </div>
          </div>
        </>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>{error}</div>
      ) : (
        <>
          <BDASummaryCards totals={supplierTotals} />
          {orders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={40} color="#cbd5e1" />}
              title="No purchase orders yet"
              description={canEdit ? 'Create your first purchase order to get started.' : 'No purchase orders have been logged.'}
              action={canEdit ? (
                <Button onClick={handleNew}><Plus size={14} /> New Order</Button>
              ) : undefined}
            />
          ) : (
            <PurchaseTable orders={orders} onEdit={handleEdit} onDelete={handleDelete} />
          )}
        </>
      )}

      {canEdit && (
        <PurchaseFormModal
          open={modalOpen}
          onClose={handleClose}
          onSubmit={handleSubmit}
          suppliers={suppliers}
          editing={editing}
        />
      )}
    </div>
  )
}
