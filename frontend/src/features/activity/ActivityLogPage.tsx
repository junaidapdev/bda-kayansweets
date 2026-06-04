import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Activity, RefreshCw, RotateCcw } from 'lucide-react'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import Skeleton from '../../components/Skeleton'
import { TAB_LABELS } from '../../constants/appConstants'
import { type ActivityLogFilters, useActivityLogs, type ActivityLog } from '../../hooks/useActivityLogs'
import type { JsonValue } from '../../types/database'

const EMPTY_FILTERS: ActivityLogFilters = {
  dateFrom: '',
  dateTo: '',
  eventType: '',
  entityType: '',
  action: '',
  actorEmail: '',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 36,
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
  color: '#0f172a',
  background: '#fff',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
}

function formatTimestamp(value: string): string {
  try {
    return format(parseISO(value), 'dd MMM yyyy, HH:mm')
  } catch {
    return value
  }
}

function formatJson(value: JsonValue | null): string {
  if (value == null) return 'null'
  return JSON.stringify(value, null, 2)
}

function hasJsonValue(value: JsonValue | null): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function badgeColor(action: string): { bg: string; text: string; border: string } {
  if (action.includes('delete') || action.includes('error')) {
    return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
  }
  if (action.includes('update') || action.includes('warn')) {
    return { bg: '#fffbeb', text: '#92400e', border: '#fde68a' }
  }
  if (action.includes('create') || action.includes('success')) {
    return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }
  }
  return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
}

function JsonDetails({ label, value }: { label: string; value: JsonValue | null }) {
  if (!hasJsonValue(value)) return null

  return (
    <details style={{
      border: '1px solid #e2e8f0',
      borderRadius: 6,
      background: '#f8fafc',
      overflow: 'hidden',
    }}>
      <summary style={{
        cursor: 'pointer',
        padding: '8px 10px',
        fontSize: 12,
        fontWeight: 600,
        color: '#475569',
      }}>
        {label}
      </summary>
      <pre style={{
        margin: 0,
        padding: 10,
        overflowX: 'auto',
        borderTop: '1px solid #e2e8f0',
        fontSize: 12,
        lineHeight: 1.5,
        color: '#334155',
        background: '#fff',
      }}>
        {formatJson(value)}
      </pre>
    </details>
  )
}

function ActivityLogRow({ log }: { log: ActivityLog }) {
  const colors = badgeColor(log.action)

  return (
    <article style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              background: colors.bg,
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {log.action}
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>{log.event_type}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflowWrap: 'anywhere' }}>
            {log.entity_type ?? 'system'}{log.entity_id ? ` · ${log.entity_id}` : ''}
          </div>
        </div>
        <time style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
          {formatTimestamp(log.created_at)}
        </time>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 8,
        fontSize: 12,
        color: '#475569',
      }}>
        <span><strong>Actor:</strong> {log.actor_email ?? log.actor_user_id ?? '—'}</span>
        <span><strong>Event:</strong> {log.event_type}</span>
        <span><strong>Entity:</strong> {log.entity_type ?? '—'}</span>
      </div>

      {log.changed_fields && log.changed_fields.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {log.changed_fields.map((field) => (
            <span key={field} style={{
              padding: '3px 7px',
              borderRadius: 999,
              background: '#f1f5f9',
              color: '#475569',
              fontSize: 12,
            }}>
              {field}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <JsonDetails label="Old data" value={log.old_data} />
        <JsonDetails label="New data" value={log.new_data} />
        <JsonDetails label="Metadata" value={log.metadata} />
        <JsonDetails label="Request context" value={log.request_context} />
      </div>
    </article>
  )
}

export default function ActivityLogPage() {
  const [filters, setFilters] = useState<ActivityLogFilters>(EMPTY_FILTERS)
  const { logs, loading, error, reload } = useActivityLogs(filters)

  const activeFilterCount = useMemo(() => (
    Object.values(filters).filter((value) => value.trim() !== '').length
  ), [filters])

  const updateFilter = <K extends keyof ActivityLogFilters>(key: K, value: ActivityLogFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => setFilters(EMPTY_FILTERS)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{TAB_LABELS.ACTIVITY}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            Review audit and diagnostic events across the app.
          </p>
        </div>
        <Button variant="secondary" onClick={reload} disabled={loading}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>

      <section style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}>
          <label style={labelStyle}>
            Date from
            <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Date to
            <input type="date" value={filters.dateTo} onChange={(e) => updateFilter('dateTo', e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Event type
            <input value={filters.eventType} onChange={(e) => updateFilter('eventType', e.target.value)} placeholder="credit_note.updated" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Entity type
            <input value={filters.entityType} onChange={(e) => updateFilter('entityType', e.target.value)} placeholder="credit_note" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Action
            <input value={filters.action} onChange={(e) => updateFilter('action', e.target.value)} placeholder="update" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Actor email
            <input value={filters.actorEmail} onChange={(e) => updateFilter('actorEmail', e.target.value)} placeholder="bda@kayan.com" style={inputStyle} />
          </label>
        </div>

        {activeFilterCount > 0 && (
          <div style={{ marginTop: 12 }}>
            <Button variant="ghost" onClick={clearFilters} style={{ padding: '5px 8px' }}>
              <RotateCcw size={14} />
              Clear filters
            </Button>
          </div>
        )}
      </section>

      <div style={{ marginBottom: 12, fontSize: 13, color: '#64748b' }}>
        {loading ? 'Loading logs...' : `${logs.length} events`}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
              <Skeleton height={16} width="35%" />
              <div style={{ marginTop: 12 }}><Skeleton height={12} width="70%" /></div>
              <div style={{ marginTop: 10 }}><Skeleton height={40} /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444', fontSize: 14 }}>{error}</div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Activity size={40} color="#cbd5e1" />}
          title="No activity found"
          description={activeFilterCount > 0 ? 'No logs match the current filters.' : 'No audit or diagnostic logs have been recorded yet.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {logs.map((log) => <ActivityLogRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
