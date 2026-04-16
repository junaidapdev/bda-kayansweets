import { useState, useEffect, useCallback, useMemo } from 'react'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import { creditNoteSchema } from '../../validations/creditNoteSchema'
import { CREDIT_NOTE_STATUS, CREDIT_NOTE_STATUS_LABELS, type CreditNoteStatus } from '../../constants/appConstants'
import { REBATE_LAYERS, REBATE_LAYER_LABELS, type RebateLayer } from '../../constants/bdaRules'
import { formatAmount } from '../../lib/formatters'
import { computeLayerAmount } from '../../lib/bdaCalculator'
import type { ISupplier } from '../../interfaces/ISupplier'
import type { ICreditNoteWithSupplier } from '../../interfaces/ICreditNote'
import { type CreditNoteCreateData, fetchPeriodPurchaseData, findDuplicateCreditNote } from '../../hooks/useCreditNotes'
import { ERROR_MESSAGES } from '../../constants/errorMessages'
import logger from '../../lib/logger'

// ── Period helpers ──────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1 (Jan – Mar)' },
  { value: 2, label: 'Q2 (Apr – Jun)' },
  { value: 3, label: 'Q3 (Jul – Sep)' },
  { value: 4, label: 'Q4 (Oct – Dec)' },
]

const pad2 = (n: number) => String(n).padStart(2, '0')

function computePeriodDates(
  rebateType: RebateLayer,
  year: number,
  month: number, // 0-11
  quarter: number, // 1-4
): { start: string; end: string } {
  if (rebateType === 'monthly' || rebateType === 'rent') {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      start: `${year}-${pad2(month + 1)}-01`,
      end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
    }
  }
  if (rebateType === 'quarterly_bonus') {
    const startMonth = (quarter - 1) * 3
    const endMonth = startMonth + 2
    const lastDay = new Date(year, endMonth + 1, 0).getDate()
    return {
      start: `${year}-${pad2(startMonth + 1)}-01`,
      end: `${year}-${pad2(endMonth + 1)}-${pad2(lastDay)}`,
    }
  }
  // yearly
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

/** How many months must have data for the period to be "complete". */
function monthsRequired(rebateType: RebateLayer): number {
  if (rebateType === 'quarterly_bonus') return 3
  if (rebateType === 'yearly') return 12
  return 1 // monthly / rent — always complete if there's any data
}

/** Does this layer require completeness to earn? */
function requiresCompleteness(rebateType: RebateLayer): boolean {
  return rebateType === 'quarterly_bonus' || rebateType === 'yearly'
}

// ── Year options (current year ± 2) ───────────────────
function yearOptions(): number[] {
  const now = new Date().getFullYear()
  return [now - 2, now - 1, now, now + 1]
}

// ── Component ──────────────────────────────────────────

export interface CreditNotePrefill {
  supplierId: string
  rebateType: RebateLayer
  quarter: number // 1-4
  year: number
}

interface CreditNoteModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreditNoteCreateData) => Promise<void>
  suppliers: ISupplier[]
  editing?: ICreditNoteWithSupplier | null
  prefill?: CreditNotePrefill | null
  onEditExisting?: (note: ICreditNoteWithSupplier) => void
}

interface FieldErrors {
  supplier_id?: string
  rebate_type?: string
  received_amount?: string
  status?: string
  period_start?: string
  period_end?: string
}

const STATUS_OPTIONS: { value: CreditNoteStatus; label: string }[] = [
  { value: CREDIT_NOTE_STATUS.PENDING, label: CREDIT_NOTE_STATUS_LABELS.pending },
  { value: CREDIT_NOTE_STATUS.RECEIVED, label: CREDIT_NOTE_STATUS_LABELS.received },
  { value: CREDIT_NOTE_STATUS.DISPUTED, label: CREDIT_NOTE_STATUS_LABELS.disputed },
]

export default function CreditNoteModal({ open, onClose, onSubmit, suppliers, editing, prefill, onEditExisting }: CreditNoteModalProps) {
  const now = useMemo(() => new Date(), [])

  // ── Core form state ─────────────────────────────────
  const [supplierId, setSupplierId] = useState('')
  const [rebateType, setRebateType] = useState<RebateLayer>('monthly')
  const [periodMonth, setPeriodMonth] = useState(now.getMonth()) // 0-11
  const [periodQuarter, setPeriodQuarter] = useState(Math.floor(now.getMonth() / 3) + 1)
  const [periodYear, setPeriodYear] = useState(now.getFullYear())
  const [receivedAmount, setReceivedAmount] = useState(0)
  const [status, setStatus] = useState<CreditNoteStatus>(CREDIT_NOTE_STATUS.PENDING as CreditNoteStatus)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  // ── Preview state ───────────────────────────────────
  const [totalPurchases, setTotalPurchases] = useState(0)
  const [expectedRebate, setExpectedRebate] = useState(0)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [periodComplete, setPeriodComplete] = useState(true)
  const [monthsFound, setMonthsFound] = useState(0)

  // ── Duplicate detection state ──────────────────────
  const [duplicateNote, setDuplicateNote] = useState<ICreditNoteWithSupplier | null>(null)

  // ── Derived period dates ────────────────────────────
  const periodDates = useMemo(
    () => computePeriodDates(rebateType, periodYear, periodMonth, periodQuarter),
    [rebateType, periodYear, periodMonth, periodQuarter],
  )

  // ── Reset form on open ──────────────────────────────
  useEffect(() => {
    if (!open) return
    if (editing) {
      setSupplierId(editing.supplier_id)
      setRebateType(editing.rebate_type)
      setReceivedAmount(editing.received_amount)
      setStatus(editing.status)
      // Parse existing period dates back into selectors
      const startDate = new Date(editing.period_start + 'T00:00:00')
      setPeriodYear(startDate.getFullYear())
      setPeriodMonth(startDate.getMonth())
      setPeriodQuarter(Math.floor(startDate.getMonth() / 3) + 1)
    } else if (prefill) {
      // Auto-fill from suggestion (e.g. missing quarterly credit note)
      setSupplierId(prefill.supplierId)
      setRebateType(prefill.rebateType)
      setPeriodQuarter(prefill.quarter)
      setPeriodYear(prefill.year)
      setPeriodMonth((prefill.quarter - 1) * 3) // first month of quarter
      setReceivedAmount(0)
      setStatus(CREDIT_NOTE_STATUS.PENDING as CreditNoteStatus)
    } else {
      setSupplierId('')
      setRebateType('monthly')
      setPeriodMonth(now.getMonth())
      setPeriodQuarter(Math.floor(now.getMonth() / 3) + 1)
      setPeriodYear(now.getFullYear())
      setReceivedAmount(0)
      setStatus(CREDIT_NOTE_STATUS.PENDING as CreditNoteStatus)
    }
    setErrors({})
    setTotalPurchases(0)
    setExpectedRebate(0)
    setPeriodComplete(true)
    setMonthsFound(0)
    setDuplicateNote(null)
  }, [open, editing, prefill, now])

  // ── Auto-calculate when supplier + period change ────
  useEffect(() => {
    if (!supplierId) {
      setTotalPurchases(0)
      setExpectedRebate(0)
      setPeriodComplete(true)
      setDuplicateNote(null)
      return
    }

    const supplier = suppliers.find((s) => s.id === supplierId)
    if (!supplier) return

    let cancelled = false
    setLoadingPreview(true)

    // Run purchase data fetch and duplicate check in parallel
    const purchasePromise = fetchPeriodPurchaseData(supplierId, periodDates.start, periodDates.end)
    const duplicatePromise = findDuplicateCreditNote(
      supplierId,
      rebateType,
      periodDates.start,
      periodDates.end,
      editing?.id, // exclude current record when editing
    )

    Promise.all([purchasePromise, duplicatePromise])
      .then(([{ total, monthsWithData }, existingNote]) => {
        if (cancelled) return

        setTotalPurchases(total)
        setMonthsFound(monthsWithData)
        setDuplicateNote(existingNote)

        const needed = monthsRequired(rebateType)
        const isComplete = monthsWithData >= needed

        setPeriodComplete(isComplete)

        if (requiresCompleteness(rebateType) && !isComplete) {
          setExpectedRebate(0)
        } else {
          const amount = computeLayerAmount(total, rebateType, supplier.rebate_rules)
          setExpectedRebate(amount)
        }
      })
      .catch((err) => logger.error('preview calculation', err))
      .finally(() => { if (!cancelled) setLoadingPreview(false) })

    return () => { cancelled = true }
  }, [supplierId, periodDates.start, periodDates.end, rebateType, suppliers, editing?.id])

  // ── Submit ──────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const formData = {
      supplier_id: supplierId,
      rebate_type: rebateType,
      period_start: periodDates.start,
      period_end: periodDates.end,
      received_amount: Number(receivedAmount),
      status,
    }

    const parsed = creditNoteSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    // ── Frontend duplicate guard (pre-submit) ──────────
    if (!editing && duplicateNote) {
      setErrors({ period_start: ERROR_MESSAGES.CREDIT_NOTE_DUPLICATE })
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      const payload: CreditNoteCreateData = {
        supplier_id: parsed.data.supplier_id,
        rebate_type: parsed.data.rebate_type,
        period_start: parsed.data.period_start,
        period_end: parsed.data.period_end,
        expected_amount: expectedRebate,
        received_amount: parsed.data.received_amount,
        status: parsed.data.status,
      }
      await onSubmit(payload)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === ERROR_MESSAGES.CREDIT_NOTE_DUPLICATE) {
        // Backend duplicate guard caught it — refresh duplicate state
        const existing = await findDuplicateCreditNote(
          parsed.data.supplier_id, parsed.data.rebate_type,
          parsed.data.period_start, parsed.data.period_end,
        )
        setDuplicateNote(existing)
        setErrors({ period_start: ERROR_MESSAGES.CREDIT_NOTE_DUPLICATE })
      } else {
        logger.error('CreditNoteModal submit', err)
      }
    } finally {
      setSubmitting(false)
    }
  }, [supplierId, rebateType, periodDates, receivedAmount, status, expectedRebate, onSubmit, onClose, editing, duplicateNote])

  // ── Helpers ─────────────────────────────────────────
  const clearError = (key: keyof FieldErrors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const diff = expectedRebate - Number(receivedAmount)
  const isLocked = requiresCompleteness(rebateType) && !periodComplete && totalPurchases > 0
  const needed = monthsRequired(rebateType)

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    padding: '8px 10px',
    borderRadius: 6,
    border: hasError ? '1px solid #ef4444' : '1px solid #d1d5db',
    fontSize: 14,
  })

  const selectStyle = (hasError?: boolean): React.CSSProperties => ({
    ...inputStyle(hasError),
    background: '#fff',
  })

  // ── Period label for display ────────────────────────
  const periodLabel = useMemo(() => {
    if (rebateType === 'monthly' || rebateType === 'rent') {
      return `${MONTH_NAMES[periodMonth]} ${periodYear}`
    }
    if (rebateType === 'quarterly_bonus') {
      return `Q${periodQuarter} ${periodYear}`
    }
    return `${periodYear}`
  }, [rebateType, periodMonth, periodQuarter, periodYear])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Credit Note' : 'New Credit Note'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Supplier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => { setSupplierId(e.target.value); clearError('supplier_id') }}
            style={selectStyle(!!errors.supplier_id)}
          >
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.supplier_id && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.supplier_id}</span>}
        </div>

        {/* Rebate Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Rebate Type</label>
          <select
            value={rebateType}
            onChange={(e) => { setRebateType(e.target.value as RebateLayer); clearError('rebate_type') }}
            style={selectStyle(!!errors.rebate_type)}
          >
            {REBATE_LAYERS.map((layer) => (
              <option key={layer} value={layer}>{REBATE_LAYER_LABELS[layer]}</option>
            ))}
          </select>
          {errors.rebate_type && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.rebate_type}</span>}
        </div>

        {/* ── Smart period selector ────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Period</label>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Month selector — for monthly / rent */}
            {(rebateType === 'monthly' || rebateType === 'rent') && (
              <select
                value={periodMonth}
                onChange={(e) => setPeriodMonth(Number(e.target.value))}
                style={{ ...selectStyle(), flex: 1 }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            )}

            {/* Quarter selector — for quarterly_bonus */}
            {rebateType === 'quarterly_bonus' && (
              <select
                value={periodQuarter}
                onChange={(e) => setPeriodQuarter(Number(e.target.value))}
                style={{ ...selectStyle(), flex: 1 }}
              >
                {QUARTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {/* Year selector — always present */}
            <select
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              style={{ ...selectStyle(), width: rebateType === 'yearly' ? '100%' : 100 }}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Show computed period dates */}
          <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {periodDates.start} to {periodDates.end}
          </span>
          {errors.period_start && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.period_start}</span>}
          {errors.period_end && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.period_end}</span>}
        </div>

        {/* ── Preview / Calculation ────────────────── */}
        {supplierId && (
          <div style={{
            background: isLocked ? '#fefce8' : '#f8fafc',
            border: `1px solid ${isLocked ? '#fde68a' : '#e2e8f0'}`,
            borderRadius: 8,
            padding: 14,
          }}>
            {loadingPreview ? (
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Calculating...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Purchases in period */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Purchases in {periodLabel}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(totalPurchases)}
                  </span>
                </div>

                {/* Locked warning */}
                {isLocked && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#9a3412',
                  }}>
                    <span style={{ fontSize: 14 }}>&#128274;</span>
                    <span>
                      <strong>Locked</strong> — {rebateType === 'quarterly_bonus' ? 'Quarter' : 'Year'} not complete
                      ({monthsFound} of {needed} months have data)
                    </span>
                  </div>
                )}

                {/* Expected rebate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>
                    Expected ({REBATE_LAYER_LABELS[rebateType]})
                  </span>
                  <span style={{
                    fontWeight: 600,
                    color: isLocked ? '#a16207' : '#059669',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {isLocked ? 'SR 0.00 (Locked)' : formatAmount(expectedRebate)}
                  </span>
                </div>

                {/* Difference */}
                {Number(receivedAmount) > 0 && !isLocked && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    paddingTop: 6,
                    borderTop: '1px solid #e2e8f0',
                  }}>
                    <span style={{ color: '#64748b' }}>Difference</span>
                    <span style={{
                      fontWeight: 600,
                      color: diff > 0 ? '#dc2626' : diff < 0 ? '#16a34a' : '#64748b',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {diff > 0 ? '-' : diff < 0 ? '+' : ''}{formatAmount(Math.abs(diff))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Duplicate warning ─────────────────────── */}
        {!editing && duplicateNote && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 15 }}>&#9888;&#65039;</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
                Credit note already exists for this period
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#b91c1c', lineHeight: 1.5 }}>
              A {REBATE_LAYER_LABELS[duplicateNote.rebate_type]} credit note for{' '}
              <strong>{duplicateNote.suppliers.name}</strong> ({periodDates.start} to {periodDates.end})
              already exists with status <strong>{duplicateNote.status}</strong>.
            </p>
            {onEditExisting && (
              <Button
                variant="secondary"
                onClick={() => { onEditExisting(duplicateNote); }}
                style={{ marginTop: 10, fontSize: 12, padding: '6px 12px' }}
              >
                Edit Existing Credit Note
              </Button>
            )}
          </div>
        )}

        {/* Received Amount */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Received Amount (SR)</label>
          <input
            type="number"
            value={receivedAmount}
            onChange={(e) => { setReceivedAmount(Number(e.target.value)); clearError('received_amount') }}
            placeholder="0.00"
            style={inputStyle(!!errors.received_amount)}
          />
          {errors.received_amount && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.received_amount}</span>}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as CreditNoteStatus); clearError('status') }}
            style={selectStyle(!!errors.status)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.status && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors.status}</span>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || (!editing && !!duplicateNote)}>
            {submitting ? 'Saving...' : editing ? 'Update' : 'Create Credit Note'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
