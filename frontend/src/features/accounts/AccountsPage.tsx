import { useState, useCallback, useMemo } from 'react'
import { ClipboardCheck, Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCreditNotes, type CreditNoteCreateData } from '../../hooks/useCreditNotes'
import { useSuppliers } from '../../hooks/useSuppliers'
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders'
import { useMissingQuarterlyNotes, type MissingQuarterlyNote } from '../../hooks/useMissingQuarterlyNotes'
import Button from '../../components/Button'
import ConfirmModal from '../../components/ConfirmModal'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import { TAB_LABELS, CREDIT_NOTE_STATUS, type CreditNoteStatus } from '../../constants/appConstants'
import AuditTable from './AuditTable'
import CreditNoteModal, { type CreditNotePrefill } from './CreditNoteModal'
import MissingQuarterlyAlerts from './MissingQuarterlyAlerts'
import StatusFilter from './StatusFilter'
import type { ICreditNoteWithSupplier } from '../../interfaces/ICreditNote'
import logger from '../../lib/logger'

type FilterValue = CreditNoteStatus | 'all'

export default function AccountsPage() {
  const { canEdit } = useAuth()
  const { creditNotes, loading, error, create, update, softDelete } = useCreditNotes()
  const { suppliers } = useSuppliers()
  const { orders } = usePurchaseOrders()
  const missingQuarterlyNotes = useMissingQuarterlyNotes(orders, creditNotes, suppliers)

  const [filter, setFilter] = useState<FilterValue>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ICreditNoteWithSupplier | null>(null)
  const [prefill, setPrefill] = useState<CreditNotePrefill | null>(null)
  const [deleting, setDeleting] = useState<ICreditNoteWithSupplier | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtered = useMemo(() => {
    if (filter === 'all') return creditNotes
    return creditNotes.filter((n) => n.status === filter)
  }, [creditNotes, filter])

  const counts = useMemo(() => {
    const c: Record<FilterValue, number> = {
      all: creditNotes.length,
      [CREDIT_NOTE_STATUS.PENDING]: 0,
      [CREDIT_NOTE_STATUS.RECEIVED]: 0,
      [CREDIT_NOTE_STATUS.DISPUTED]: 0,
    }
    for (const note of creditNotes) c[note.status]++
    return c
  }, [creditNotes])

  const handleNew = useCallback(() => { setEditing(null); setPrefill(null); setModalOpen(true) }, [])
  const handleEdit = useCallback((note: ICreditNoteWithSupplier) => { setEditing(note); setPrefill(null); setModalOpen(true) }, [])
  const handleClose = useCallback(() => { setModalOpen(false); setEditing(null); setPrefill(null) }, [])

  const handleEditExisting = useCallback((note: ICreditNoteWithSupplier) => {
    // Close current modal then reopen in edit mode for the existing note
    setModalOpen(false)
    setPrefill(null)
    // Small delay so the close animation completes before reopening
    setTimeout(() => {
      setEditing(note)
      setModalOpen(true)
    }, 150)
  }, [])

  const handleSuggestedCreate = useCallback((item: MissingQuarterlyNote) => {
    setEditing(null)
    setPrefill({
      supplierId: item.supplierId,
      rebateType: 'quarterly_bonus',
      quarter: item.quarter,
      year: item.year,
    })
    setModalOpen(true)
  }, [])

  const handleDeleteRequest = useCallback((note: ICreditNoteWithSupplier) => {
    setDeleting(note)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const result = await softDelete(deleting.id)
      if (!result.success) {
        logger.error('Delete credit note', result.error)
      }
    } catch (err) {
      logger.error('Delete credit note', err)
    } finally {
      setDeleteLoading(false)
      setDeleting(null)
    }
  }, [deleting, softDelete])

  const handleDeleteCancel = useCallback(() => {
    setDeleting(null)
  }, [])

  const handleSubmit = useCallback(async (data: CreditNoteCreateData) => {
    if (editing) {
      const result = await update(editing.id, data)
      if (!result.success) throw new Error(result.error)
    } else {
      const result = await create(data)
      if (!result.success) throw new Error(result.error)
    }
  }, [editing, create, update])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{TAB_LABELS.AUDIT}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            Verify credit notes and reconcile supplier rebates.
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleNew}>
            <Plus size={16} />
            New Credit Note
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={20} />)}
          </div>
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>
          {logger.error('AccountsPage', error) ?? error}
        </div>
      ) : (
        <>
          {canEdit && missingQuarterlyNotes.length > 0 && (
            <MissingQuarterlyAlerts
              missing={missingQuarterlyNotes}
              onCreateClick={handleSuggestedCreate}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <StatusFilter value={filter} onChange={setFilter} counts={counts} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck size={40} color="#cbd5e1" />}
              title={filter === 'all' ? 'No audit records yet' : `No ${filter} credit notes`}
              description={canEdit && filter === 'all' ? 'Add credit notes to begin reconciling rebates.' : undefined}
              action={canEdit && filter === 'all' ? (
                <Button onClick={handleNew}><Plus size={14} /> New Credit Note</Button>
              ) : undefined}
            />
          ) : (
            <AuditTable creditNotes={filtered} onEdit={handleEdit} onDelete={handleDeleteRequest} />
          )}
        </>
      )}

      {canEdit && (
        <CreditNoteModal
          open={modalOpen}
          onClose={handleClose}
          onSubmit={handleSubmit}
          suppliers={suppliers}
          editing={editing}
          prefill={prefill}
          onEditExisting={handleEditExisting}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Credit Note"
        message={
          deleting
            ? `Are you sure you want to delete the ${deleting.suppliers?.name ?? ''} credit note for ${deleting.period_start} to ${deleting.period_end}? This action can be undone by an administrator.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}
