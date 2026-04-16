import { useState, useEffect, useCallback } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import SupplierSelect from './SupplierSelect'
import { purchaseSchema } from '../../validations/purchaseSchema'
import { NOTES_MAX_LENGTH } from '../../constants/appConstants'
import type { ISupplier } from '../../interfaces/ISupplier'
import type { IPurchaseFormData } from '../../interfaces/IPurchaseFormData'
import type { IPurchaseOrderWithSupplier } from '../../interfaces/IPurchaseOrder'
import logger from '../../lib/logger'

interface PurchaseFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: IPurchaseFormData) => Promise<void>
  suppliers: ISupplier[]
  editing?: IPurchaseOrderWithSupplier | null
}

interface FieldErrors {
  supplier_id?: string
  purchase_amount?: string
  order_date?: string
  notes?: string
}

const INITIAL_FORM: IPurchaseFormData = {
  supplier_id: '',
  purchase_amount: 0,
  order_date: new Date().toISOString().slice(0, 10),
  notes: '',
}

export default function PurchaseFormModal({ open, onClose, onSubmit, suppliers, editing }: PurchaseFormModalProps) {
  const [form, setForm] = useState<IPurchaseFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          supplier_id: editing.supplier_id,
          purchase_amount: editing.purchase_amount,
          order_date: editing.order_date,
          notes: editing.notes ?? '',
        })
      } else {
        setForm(INITIAL_FORM)
      }
      setErrors({})
    }
  }, [open, editing])

  const handleSubmit = useCallback(async () => {
    const parsed = purchaseSchema.safeParse({
      ...form,
      purchase_amount: Number(form.purchase_amount),
    })

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      await onSubmit(parsed.data)
      onClose()
    } catch (err) {
      logger.error('PurchaseFormModal submit', err)
    } finally {
      setSubmitting(false)
    }
  }, [form, onSubmit, onClose])

  const updateField = <K extends keyof IPurchaseFormData>(key: K, value: IPurchaseFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Purchase Order' : 'New Purchase Order'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SupplierSelect
          suppliers={suppliers}
          value={form.supplier_id}
          onChange={(v) => updateField('supplier_id', v)}
          error={errors.supplier_id}
        />

        {/* Purchase Amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Purchase Amount (SR)</label>
          <input
            type="number"
            value={form.purchase_amount || ''}
            onChange={(e) => updateField('purchase_amount', Number(e.target.value))}
            placeholder="0.00"
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: errors.purchase_amount ? '1px solid #ef4444' : '1px solid #d1d5db',
              fontSize: 14,
            }}
          />
          {errors.purchase_amount && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.purchase_amount}</span>}
        </div>

        {/* Order Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Order Date</label>
          <input
            type="date"
            value={form.order_date}
            onChange={(e) => updateField('order_date', e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: errors.order_date ? '1px solid #ef4444' : '1px solid #d1d5db',
              fontSize: 14,
            }}
          />
          {errors.order_date && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.order_date}</span>}
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
            Notes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            maxLength={NOTES_MAX_LENGTH}
            rows={3}
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              border: errors.notes ? '1px solid #ef4444' : '1px solid #d1d5db',
              fontSize: 14,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'flex-end' }}>
            {form.notes.length}/{NOTES_MAX_LENGTH}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editing ? 'Update Order' : 'Create Order'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
