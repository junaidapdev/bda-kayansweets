import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import type { Database } from '../types/database'
import logger from '../lib/logger'

export type ActivityLog = Database['public']['Tables']['audit_logs']['Row']

export interface ActivityLogFilters {
  dateFrom: string
  dateTo: string
  eventType: string
  entityType: string
  action: string
  actorEmail: string
}

const PAGE_SIZE = 100

function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`
}

export function useActivityLogs(filters: ActivityLogFilters) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (filters.dateFrom) query = query.gte('created_at', startOfDayIso(filters.dateFrom))
    if (filters.dateTo) query = query.lte('created_at', endOfDayIso(filters.dateTo))
    if (filters.eventType.trim()) query = query.ilike('event_type', `%${filters.eventType.trim()}%`)
    if (filters.entityType.trim()) query = query.ilike('entity_type', `%${filters.entityType.trim()}%`)
    if (filters.action.trim()) query = query.ilike('action', `%${filters.action.trim()}%`)
    if (filters.actorEmail.trim()) query = query.ilike('actor_email', `%${filters.actorEmail.trim()}%`)

    const { data, error: fetchError } = await query

    if (fetchError) {
      logger.error('fetchActivityLogs', fetchError)
      setError('Unable to load activity logs.')
      setLogs([])
    } else {
      setError(null)
      setLogs((data ?? []) as ActivityLog[])
    }

    setLoading(false)
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  return { logs, loading, error, reload: load }
}
