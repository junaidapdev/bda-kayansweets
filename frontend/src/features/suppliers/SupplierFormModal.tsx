import { useState, useEffect, useCallback } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { supplierSchema, type SupplierFormData } from '../../validations/supplierSchema'
import { RENT_TYPES, RENT_TYPE_LABELS, type RentType } from '../../constants/bdaRules'
import type { ISupplier } from '../../interfaces/ISupplier'
import logger from '../../lib/logger'

interface SupplierFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: SupplierFormData) => Promise<void>
  editing?: ISupplier | null
}

interface FieldErrors {
  name?: string
  target_amount?: string
  monthly_rate?: string
  quarterly_bonus_rate?: string
  yearly_rate?: string
  rent_type?: string
  rent_value?: string
  monthly_target?: string
  quarterly_target?: string
  yearly_target?: string
}

const EMPTY_FORM = {
  name: '',
  target_amount: '',
  monthly_rate: '',
  quarterly_bonus_rate: '',
  yearly_rate: '',
  rent_type: 'percentage' as RentType,
  rent_value: '',
  monthly_target: '',
  quarterly_target: '',
  yearly_target: '',
}

type FormState = typeof EMPTY_FORM

function supplierToForm(s: ISupplier): FormState {
  const r = s.rebate_rules ?? {}
  return {
    name: s.name,
    target_amount: s.target_amount != null ? String(s.target_amount) : '',
    monthly_rate: r.monthly_rate != null ? String(r.monthly_rate) : '',
    quarterly_bonus_rate: r.quarterly_bonus_rate != null ? String(r.quarterly_bonus_rate) : '',
    yearly_rate: r.yearly_rate != null ? String(r.yearly_rate) : '',
    rent_type: r.rent_type ?? 'percentage',
    rent_value: r.rent_value != null ? String(r.rent_value) : '',
    monthly_target: r.monthly_target != null ? String(r.monthly_target) : '',
    quarterly_target: r.quarterly_target != null ? String(r.quarterly_target) : '',
    yearly_target: r.yearly_target != null ? String(r.yearly_target) : '',
  }
}

function parseOptionalNumber(val: string): number | null {
  const n = parseFloat(val)
  return val.trim() === '' || isNaN(n) ? null : n
}

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  padding: '8px 10px',
  borderRadius: 6,
  border: hasError ? '1px solid #ef4444' : '1px solid #d1d5db',
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
})

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151' }

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  )
}

export default function SupplierFormModal({ open, onClose, onSubmit, editing }: SupplierFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editing ? supplierToForm(editing) : EMPTY_FORM)
      setErrors({})
    }
  }, [open, editing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as keyof FieldErrors]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = useCallback(async () => {
    const parsed = supplierSchema.safeParse({
      name: form.name,
      target_amount: parseOptionalNumber(form.target_amount),
      monthly_rate: parseOptionalNumber(form.monthly_rate),
      quarterly_bonus_rate: parseOptionalNumber(form.quarterly_bonus_rate),
      yearly_rate: parseOptionalNumber(form.yearly_rate),
      rent_type: form.rent_type,
      rent_value: parseOptionalNumber(form.rent_value),
      monthly_target: parseOptionalNumber(form.monthly_target),
      quarterly_target: parseOptionalNumber(form.quarterly_target),
      yearly_target: parseOptionalNumber(form.yearly_target),
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
      logger.error('SupplierFormModal submit', err)
    } finally {
      setSubmitting(false)
    }
  }, [form, onSubmit, onClose])

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Supplier' : 'New Supplier'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name + Target */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <Field label="Supplier Name" error={errors.name}>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Al Marai" style={inputStyle(!!errors.name)} />
          </Field>
          <Field label="Annual Target (SR)" error={errors.target_amount}>
            <input type="number" value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)}
              placeholder="Optional" min={0} style={inputStyle(!!errors.target_amount)} />
          </Field>
        </div>

        {/* Rebate Rates (Base + Milestone) */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <p style={sectionTitleStyle}>Rebate Rates (% of purchases)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Monthly %" error={errors.monthly_rate}>
              <input type="number" value={form.monthly_rate} onChange={(e) => set('monthly_rate', e.target.value)}
                placeholder="e.g. 2" min={0} max={100} step={0.01} style={inputStyle(!!errors.monthly_rate)} />
            </Field>
            <Field label="Quarterly Bonus %" error={errors.quarterly_bonus_rate}>
              <input type="number" value={form.quarterly_bonus_rate} onChange={(e) => set('quarterly_bonus_rate', e.target.value)}
                placeholder="e.g. 2.5" min={0} max={100} step={0.01} style={inputStyle(!!errors.quarterly_bonus_rate)} />
            </Field>
            <Field label="Yearly Bonus %" error={errors.yearly_rate}>
              <input type="number" value={form.yearly_rate} onChange={(e) => set('yearly_rate', e.target.value)}
                placeholder="e.g. 6" min={0} max={100} step={0.01} style={inputStyle(!!errors.yearly_rate)} />
            </Field>
          </div>
        </div>

        {/* Rent */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <p style={sectionTitleStyle}>Rent</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Rent Type" error={errors.rent_type}>
              <select value={form.rent_type} onChange={(e) => set('rent_type', e.target.value as RentType)}
                style={{ ...inputStyle(!!errors.rent_type), background: '#fff' }}>
                {RENT_TYPES.map((t) => <option key={t} value={t}>{RENT_TYPE_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label={form.rent_type === 'fixed' ? 'Rent Amount (SR)' : 'Rent %'} error={errors.rent_value}>
              <input type="number" value={form.rent_value} onChange={(e) => set('rent_value', e.target.value)}
                placeholder={form.rent_type === 'fixed' ? 'e.g. 500' : 'e.g. 1'} min={0} step={0.01}
                style={inputStyle(!!errors.rent_value)} />
            </Field>
          </div>
        </div>

        {/* Targets */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <p style={sectionTitleStyle}>Purchase Targets (SR)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Monthly" error={errors.monthly_target}>
              <input type="number" value={form.monthly_target} onChange={(e) => set('monthly_target', e.target.value)}
                placeholder="Optional" min={0} style={inputStyle(!!errors.monthly_target)} />
            </Field>
            <Field label="Quarterly" error={errors.quarterly_target}>
              <input type="number" value={form.quarterly_target} onChange={(e) => set('quarterly_target', e.target.value)}
                placeholder="Optional" min={0} style={inputStyle(!!errors.quarterly_target)} />
            </Field>
            <Field label="Yearly" error={errors.yearly_target}>
              <input type="number" value={form.yearly_target} onChange={(e) => set('yearly_target', e.target.value)}
                placeholder="Optional" min={0} style={inputStyle(!!errors.yearly_target)} />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : editing ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
