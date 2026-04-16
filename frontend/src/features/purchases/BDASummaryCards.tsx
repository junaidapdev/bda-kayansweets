import { useState, useMemo } from 'react'
import { CheckCircle, Clock, ChevronDown, ChevronUp, Lock, ShoppingCart } from 'lucide-react'
import { formatAmount, formatPercent } from '../../lib/formatters'
import type { SupplierTotal } from '../../hooks/useSupplierTotals'
import type { QuarterBreakdown, YearBreakdown } from '../../lib/bdaCalculator'

interface BDASummaryCardsProps {
  totals: SupplierTotal[]
}

const Q_LABELS = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec']

const palette = {
  earned:     { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
  inProgress: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
  future:     { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8', dot: '#cbd5e1' },
  locked:     { bg: '#fefce8', border: '#fef08a', text: '#a16207', dot: '#eab308' },
} as const

function statusPalette(s: string) {
  return s === 'completed' ? palette.earned : s === 'in_progress' ? palette.inProgress : palette.future
}
function statusLabel(s: string) {
  return s === 'completed' ? 'Earned' : s === 'in_progress' ? 'In Progress' : 'Future'
}

// ── Tiny quarter indicator (collapsed view) ─────────
function MiniDot({ quarter }: { quarter: QuarterBreakdown }) {
  const p = statusPalette(quarter.status)
  const isEarned = quarter.status === 'completed'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: p.dot,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isEarned ? `0 0 0 2px ${palette.earned.border}` : 'none',
      }}>
        {isEarned ? <CheckCircle size={10} color="#fff" /> :
         quarter.status === 'in_progress' ? <Clock size={9} color="#fff" /> :
         <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: 0.4 }} />}
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: p.text, lineHeight: 1 }}>Q{quarter.quarterId}</span>
    </div>
  )
}

function MiniYearDot({ progress }: { progress: YearBreakdown }) {
  if (progress.bonus.rate <= 0) return null
  const isEarned = progress.status === 'completed'
  const p = isEarned ? palette.earned : palette.locked
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, background: p.dot,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isEarned ? `0 0 0 2px ${palette.earned.border}` : 'none',
      }}>
        {isEarned ? <CheckCircle size={10} color="#fff" /> : <Lock size={9} color="#fff" />}
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: p.text, lineHeight: 1 }}>Yr</span>
    </div>
  )
}

function MiniConnector({ status }: { status: string }) {
  const c = status === 'completed' ? '#86efac' : status === 'in_progress' ? '#93c5fd' : '#e2e8f0'
  return <div style={{ width: 12, height: 2, background: c, borderRadius: 1, marginTop: 8 }} />
}

// ── Expanded quarter detail (light green bg) ────────
function QuarterDetail({ quarter }: { quarter: QuarterBreakdown }) {
  if (quarter.status === 'future' && quarter.rebates.purchases <= 0) return null
  const { status, quarterId, rebates } = quarter
  const p = statusPalette(status)
  const isCompleted = status === 'completed'

  const rows: { label: string; rate: string; value: string; locked: boolean }[] = []
  if (rebates.monthly.amount > 0 || rebates.monthly.rate > 0)
    rows.push({ label: 'Monthly', rate: formatPercent(rebates.monthly.rate), value: formatAmount(rebates.monthly.amount), locked: false })
  if (rebates.rent.amount > 0 || rebates.rent.rate > 0)
    rows.push({ label: 'Rent', rate: formatPercent(rebates.rent.rate), value: formatAmount(rebates.rent.amount), locked: false })
  if (rebates.bonus.rate > 0)
    rows.push({ label: 'Q. Bonus', rate: formatPercent(rebates.bonus.rate), value: isCompleted ? formatAmount(rebates.bonus.amount) : 'Locked', locked: !isCompleted })
  if (rows.length === 0) return null

  return (
    <div style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: p.text }}>Q{quarterId} · {Q_LABELS[quarterId - 1]}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: p.text, background: p.border, padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {statusLabel(status)}
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', opacity: r.locked ? 0.5 : 1 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>{r.label} <span style={{ color: '#94a3b8' }}>({r.rate})</span></span>
          <span style={{ fontSize: 11, fontWeight: 600, color: r.locked ? '#a16207' : p.text, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 3 }}>
            {r.locked && <Lock size={8} />}{r.value}
          </span>
        </div>
      ))}
      {/* Subtotal — lighter weight than the card total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px dashed ${p.border}`, marginTop: 4, paddingTop: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>Subtotal</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{formatAmount(rebates.subtotal)}</span>
      </div>
    </div>
  )
}

// ── Expanded yearly bonus (visually elevated) ───────
function YearBonusDetail({ progress }: { progress: YearBreakdown }) {
  if (progress.bonus.rate <= 0) return null
  const isEarned = progress.status === 'completed'

  return (
    <div style={{
      background: isEarned ? '#dcfce7' : '#fef9c3',
      border: `1.5px solid ${isEarned ? '#86efac' : '#fde047'}`,
      borderRadius: 8,
      padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isEarned ? '#14532d' : '#854d0e' }}>
          Yearly Bonus
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700,
          color: isEarned ? '#14532d' : '#854d0e',
          background: isEarned ? '#86efac' : '#fde047',
          padding: '2px 7px', borderRadius: 3,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {isEarned ? 'Earned' : 'In Progress'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', opacity: isEarned ? 1 : 0.55 }}>
        <span style={{ fontSize: 11, color: isEarned ? '#166534' : '#713f12' }}>
          Rate: {formatPercent(progress.bonus.rate)}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: isEarned ? '#14532d' : '#854d0e',
          fontVariantNumeric: 'tabular-nums',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {!isEarned && <Lock size={9} />}
          {isEarned ? formatAmount(progress.bonus.amount) : 'Locked until completion'}
        </span>
      </div>
    </div>
  )
}

// ── Empty state for cards with no purchases ─────────
function EmptyCard({ supplierName, year }: { supplierName: string; year: number }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      {/* Name + year */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, alignSelf: 'flex-start' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{supplierName}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 3 }}>{year}</span>
      </div>
      <ShoppingCart size={28} color="#cbd5e1" strokeWidth={1.5} />
      <p style={{ margin: '10px 0 2px', fontSize: 13, fontWeight: 600, color: '#64748b' }}>No purchases yet</p>
      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Add purchases to start earning rebates</p>
    </div>
  )
}

// ── Compact supplier card ───────────────────────────
function SupplierCard({ item }: { item: SupplierTotal }) {
  const [expanded, setExpanded] = useState(false)
  const { supplier, year, purchases, bda } = item
  const { quarters, yearProgress, totalExpectedRebate } = bda

  const hasData = purchases.yearly > 0
  const hasYearBonus = yearProgress.bonus.rate > 0

  // If no purchases at all, show clean empty state
  if (!hasData) {
    return <EmptyCard supplierName={supplier.name} year={year} />
  }

  // Only show quarters that have actual purchase data.
  // Empty quarters (even if calendar-started) are hidden to avoid clutter.
  const visibleQuarters = quarters.filter((q) => q.rebates.purchases > 0)

  // Check if there's any detail content to expand into
  const hasDetailContent = visibleQuarters.length > 0 || hasYearBonus

  const targetAmt = supplier.target_amount
  const hasTarget = targetAmt != null && targetAmt > 0
  const targetPct = hasTarget ? Math.min(Math.round((purchases.yearly / targetAmt) * 100), 100) : 0

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 16px 0' }}>
        {/* Name + year (no CURRENT badge — kept at year level only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {supplier.name}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 3, flexShrink: 0 }}>
            {year}
          </span>
        </div>

        {/* ── Two key numbers ───────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {/* Purchases — neutral */}
          <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purchases</p>
            <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(purchases.yearly)}
            </p>
          </div>
          {/* Earned — money earned but not yet received */}
          <div style={{
            flex: 1,
            background: totalExpectedRebate > 0 ? '#ecfdf5' : '#f8fafc',
            border: totalExpectedRebate > 0 ? '1.5px solid #86efac' : '1px solid transparent',
            borderRadius: 8,
            padding: '8px 10px',
          }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle size={9} /> Earned
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(totalExpectedRebate)}
            </p>
          </div>
        </div>

        {/* ── Mini quarter timeline ─────────────────── */}
        {visibleQuarters.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            {visibleQuarters.map((q, i) => (
              <div key={q.quarterId} style={{ display: 'contents' }}>
                <MiniDot quarter={q} />
                {(i < visibleQuarters.length - 1 || hasYearBonus) && (
                  <MiniConnector status={q.status} />
                )}
              </div>
            ))}
            {hasYearBonus && <MiniYearDot progress={yearProgress} />}
          </div>
        )}

        {/* ── Annual target ────────────────────────── */}
        {hasTarget && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
                Annual Target: {formatAmount(targetAmt)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: targetPct >= 100 ? '#15803d' : '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                Progress: {targetPct}%
              </span>
            </div>
            <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${targetPct}%`,
                background: targetPct >= 100 ? '#22c55e' : '#3b82f6',
                borderRadius: 2,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Expand toggle (only if there's content to show) */}
      {hasDetailContent && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            width: '100%', padding: '8px 0', marginTop: 10,
            border: 'none', borderTop: '1px solid #f1f5f9',
            background: expanded ? '#f8fafc' : 'transparent',
            cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#94a3b8',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
          onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide' : 'Details'}
        </button>
      )}

      {/* ── Expanded detail (same filter as timeline) ─ */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleQuarters.map((q) => <QuarterDetail key={q.quarterId} quarter={q} />)}
          <YearBonusDetail progress={yearProgress} />
        </div>
      )}
    </div>
  )
}

// ── Main export ─────────────────────────────────────
export default function BDASummaryCards({ totals }: BDASummaryCardsProps) {
  if (totals.length === 0) return null

  const yearGroups = useMemo(() => {
    const map = new Map<number, SupplierTotal[]>()
    for (const t of totals) {
      const arr = map.get(t.year) ?? []
      arr.push(t)
      map.set(t.year, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0])
  }, [totals])

  const currentYear = new Date().getFullYear()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
      {yearGroups.map(([year, items]) => (
        <div key={year}>
          {/* Year header — sole location for CURRENT badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{year}</span>
            {year === currentYear && (
              <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: '#3b82f6', padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current
              </span>
            )}
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {/* Card grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
            alignItems: 'start',
          }}>
            {items.map((item) => (
              <SupplierCard key={`${item.supplier.id}_${item.year}`} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
