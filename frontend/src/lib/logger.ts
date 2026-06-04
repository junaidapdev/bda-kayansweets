import supabase from './supabaseClient'
import type { Database, JsonValue } from '../types/database'

const isProd = import.meta.env.PROD

export type DiagnosticLogLevel = 'info' | 'warn' | 'error'
export type DiagnosticMetadata = Record<string, unknown>

export interface DiagnosticLogEvent {
  level: DiagnosticLogLevel
  event_type: string
  message: string
  metadata?: DiagnosticMetadata
  request_context?: DiagnosticMetadata
}

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue)
  }

  if (typeof value === 'object') {
    const output: Record<string, JsonValue> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child !== undefined) output[key] = toJsonValue(child)
    }
    return output
  }

  return String(value)
}

function toJsonObject(value?: DiagnosticMetadata): Record<string, JsonValue> {
  if (!value) return {}
  return toJsonValue(value) as Record<string, JsonValue>
}

function getDefaultRequestContext(): Record<string, JsonValue> {
  const context: Record<string, JsonValue> = {
    source: 'frontend',
    client_timestamp: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    context.route = `${window.location.pathname}${window.location.search}`
  }

  if (typeof navigator !== 'undefined') {
    context.user_agent = navigator.userAgent
  }

  return context
}

function writeConsole(level: DiagnosticLogLevel, ...args: unknown[]): void {
  if (isProd) return

  if (level === 'error') {
    console.error('[KNC]', ...args)
    return
  }

  if (level === 'warn') {
    console.warn('[KNC]', ...args)
    return
  }

  console.info('[KNC]', ...args)
}

function writeDiagnosticConsole(event: DiagnosticLogEvent): void {
  writeConsole(event.level, {
    level: event.level,
    event_type: event.event_type,
    message: event.message,
    metadata: event.metadata,
    request_context: event.request_context,
  })
}

async function insertDiagnosticEvent(event: DiagnosticLogEvent): Promise<void> {
  const metadata = toJsonObject(event.metadata)
  const requestContext = {
    ...getDefaultRequestContext(),
    ...toJsonObject(event.request_context),
  }

  const payload: AuditLogInsert = {
    event_type: event.event_type,
    entity_type: 'frontend',
    action: `diagnostic_${event.level}`,
    metadata: {
      ...metadata,
      level: event.level,
      message: event.message,
    },
    request_context: requestContext,
  }

  const { error } = await supabase.from('audit_logs').insert(payload)
  if (error) writeConsole('warn', 'diagnostic log insert failed', error)
}

function diagnostic(event: DiagnosticLogEvent): void {
  writeDiagnosticConsole(event)

  void insertDiagnosticEvent(event).catch((err) => {
    writeConsole('warn', 'diagnostic logger failed', err)
  })
}

const logger = {
  log: (...args: unknown[]): void => {
    if (!isProd) console.log('[KNC]', ...args)
  },
  warn: (...args: unknown[]): void => {
    writeConsole('warn', ...args)
  },
  error: (...args: unknown[]): void => {
    writeConsole('error', ...args)
  },
  info: (...args: unknown[]): void => {
    writeConsole('info', ...args)
  },
  diagnostic,
}

export default logger
