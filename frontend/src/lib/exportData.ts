import supabase from './supabaseClient'

// ── CSV helpers ─────────────────────────────────────────

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','))
  }
  return lines.join('\n')
}

function downloadFile(content: string, filename: string) {
  // BOM ensures Excel reads UTF-8 correctly (preserves Arabic, special chars)
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Export function ─────────────────────────────────────

/**
 * Downloads three CSV files containing a full backup of all user data:
 *   - suppliers_<date>.csv
 *   - purchases_<date>.csv
 *   - credit_notes_<date>.csv
 */
export async function exportAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    const [suppliersRes, purchasesRes, creditNotesRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchase_orders').select('*, suppliers(name)').order('order_date', { ascending: false }),
      supabase.from('credit_notes').select('*, suppliers(name)').is('deleted_at', null).order('period_start', { ascending: false }),
    ])

    if (suppliersRes.error) throw suppliersRes.error
    if (purchasesRes.error) throw purchasesRes.error
    if (creditNotesRes.error) throw creditNotesRes.error

    const dateStr = new Date().toISOString().slice(0, 10)

    // ── Suppliers ──
    const supplierRows = (suppliersRes.data ?? []).map((s) => ({
      name: s.name,
      monthly_rate: s.rebate_rules?.monthly_rate ?? '',
      quarterly_bonus_rate: s.rebate_rules?.quarterly_bonus_rate ?? '',
      yearly_rate: s.rebate_rules?.yearly_rate ?? '',
      rent_type: s.rebate_rules?.rent_type ?? '',
      rent_value: s.rebate_rules?.rent_value ?? '',
      monthly_target: s.rebate_rules?.monthly_target ?? '',
      quarterly_target: s.rebate_rules?.quarterly_target ?? '',
      yearly_target: s.rebate_rules?.yearly_target ?? '',
      target_amount: s.target_amount ?? '',
      created_at: s.created_at,
    }))
    const supplierCsv = toCsv(
      ['name', 'monthly_rate', 'quarterly_bonus_rate', 'yearly_rate', 'rent_type', 'rent_value', 'monthly_target', 'quarterly_target', 'yearly_target', 'target_amount', 'created_at'],
      supplierRows,
    )

    // ── Purchases ──
    const purchaseRows = (purchasesRes.data ?? []).map((p) => ({
      supplier: (p.suppliers as { name: string } | null)?.name ?? '',
      order_date: p.order_date,
      purchase_amount: p.purchase_amount,
      notes: p.notes ?? '',
      created_at: p.created_at,
    }))
    const purchaseCsv = toCsv(
      ['supplier', 'order_date', 'purchase_amount', 'notes', 'created_at'],
      purchaseRows,
    )

    // ── Credit Notes ──
    const creditNoteRows = (creditNotesRes.data ?? []).map((cn) => ({
      supplier: (cn.suppliers as { name: string } | null)?.name ?? '',
      rebate_type: cn.rebate_type,
      period_start: cn.period_start,
      period_end: cn.period_end,
      expected_amount: cn.expected_amount,
      received_amount: cn.received_amount,
      status: cn.status,
      verified_by: cn.verified_by ?? '',
      verified_at: cn.verified_at ?? '',
      created_at: cn.created_at,
    }))
    const creditNoteCsv = toCsv(
      ['supplier', 'rebate_type', 'period_start', 'period_end', 'expected_amount', 'received_amount', 'status', 'verified_by', 'verified_at', 'created_at'],
      creditNoteRows,
    )

    // Trigger the three downloads with small spacing so browsers allow them
    downloadFile(supplierCsv, `suppliers_${dateStr}.csv`)
    await new Promise((r) => setTimeout(r, 300))
    downloadFile(purchaseCsv, `purchases_${dateStr}.csv`)
    await new Promise((r) => setTimeout(r, 300))
    downloadFile(creditNoteCsv, `credit_notes_${dateStr}.csv`)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Export failed' }
  }
}
