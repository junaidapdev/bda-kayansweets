import { useAuth } from '../../hooks/useAuth'
import { useSuppliers } from '../../hooks/useSuppliers'
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders'
import { useCreditNotes } from '../../hooks/useCreditNotes'
import { useTargetProgress } from '../../hooks/useTargetProgress'
import { useAnalyticsSummary } from '../../hooks/useAnalyticsSummary'
import { useMissingQuarterlyNotes } from '../../hooks/useMissingQuarterlyNotes'
import Skeleton from '../../components/Skeleton'
import { TAB_LABELS } from '../../constants/appConstants'
import AnalyticsSummaryCards from './AnalyticsSummaryCards'
import LeakageBreakdown from './LeakageBreakdown'
import SupplierPerformanceTable from './SupplierPerformanceTable'
import AnalyticsAlerts from './AnalyticsAlerts'
import TargetTracker from './TargetTracker'
import TargetAlerts from './TargetAlerts'

export default function AnalyticsPage() {
  const { canEdit } = useAuth()
  const { suppliers, loading: suppliersLoading } = useSuppliers()
  const { orders } = usePurchaseOrders()
  const { creditNotes, loading: creditNotesLoading } = useCreditNotes()
  const { progress, loading: progressLoading, error: progressError } = useTargetProgress(suppliers)
  const analytics = useAnalyticsSummary(creditNotes)
  const missingNotes = useMissingQuarterlyNotes(orders, creditNotes, suppliers)

  const isLoading = suppliersLoading || creditNotesLoading || progressLoading

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{TAB_LABELS.ANALYTICS}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94a3b8' }}>
          Track what suppliers owe, what you have collected, and what is still outstanding.
          {!canEdit && ' (Read-only view)'}
        </p>
      </div>

      {isLoading ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px' }}>
                <Skeleton height={12} width="50%" />
                <div style={{ marginTop: 12 }}><Skeleton height={28} width="70%" /></div>
                <div style={{ marginTop: 6 }}><Skeleton height={10} width="80%" /></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
                {[1, 2, 3].map((j) => (
                  <div key={j} style={{ marginBottom: 14 }}><Skeleton height={20} /></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Row 1: Summary cards */}
          <AnalyticsSummaryCards totals={analytics.totals} />

          {/* Needs Attention — hidden for now */}
          {/* <AnalyticsAlerts creditNotes={creditNotes} missingNotes={missingNotes} /> */}

          {/* Supplier Scorecard — full width */}
          <div style={{ marginBottom: 24 }}>
            {/* By Rebate Type — hidden for now */}
            {/* <LeakageBreakdown data={analytics.leakageByType} totalLeakage={analytics.totals.totalLeakage} /> */}
            <SupplierPerformanceTable suppliers={analytics.supplierPerformance} />
          </div>

          {/* Purchase Targets — hidden for now */}
          {/* <TargetAlerts progress={progress} />
          {progressError ? (
            <div style={{ padding: 24, color: '#ef4444', fontSize: 14, marginBottom: 24 }}>{progressError}</div>
          ) : (
            <TargetTracker progress={progress} creditNotes={creditNotes} />
          )} */}
        </>
      )}
    </div>
  )
}
