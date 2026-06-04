-- Migration v6: Audit log database foundation
--
-- Creates an append-only audit_logs table for future business audit events
-- and frontend diagnostic events. This migration intentionally does NOT add
-- audit triggers or frontend logging calls yet.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      timestamptz NOT NULL DEFAULT now(),

    actor_user_id   uuid,
    actor_email     text,

    event_type      text        NOT NULL,
    entity_type     text,
    entity_id       uuid,
    action          text        NOT NULL,

    old_data        jsonb,
    new_data        jsonb,
    changed_fields  text[],
    metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
    request_context jsonb       NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT audit_logs_event_type_not_blank
      CHECK (length(trim(event_type)) > 0),
    CONSTRAINT audit_logs_action_not_blank
      CHECK (length(trim(action)) > 0),
    CONSTRAINT audit_logs_actor_email_not_blank
      CHECK (actor_email IS NULL OR length(trim(actor_email)) > 0),
    CONSTRAINT audit_logs_entity_type_not_blank
      CHECK (entity_type IS NULL OR length(trim(entity_type)) > 0)
);

COMMENT ON TABLE public.audit_logs IS
  'Append-only audit and diagnostic event log. Data changes should be recorded here, but log rows should not be edited or deleted from the client.';

COMMENT ON COLUMN public.audit_logs.event_type IS
  'Specific event name, for example supplier.created, credit_note.updated, auth.login_failed, or diagnostic.supabase_error.';

COMMENT ON COLUMN public.audit_logs.entity_type IS
  'Business object type related to the event, for example supplier, purchase_order, credit_note, point_ledger, auth, or frontend.';

COMMENT ON COLUMN public.audit_logs.entity_id IS
  'UUID of the related business record when the event is tied to one record.';

COMMENT ON COLUMN public.audit_logs.action IS
  'General action category, for example create, update, delete, login_success, login_failed, or diagnostic_error.';

COMMENT ON COLUMN public.audit_logs.old_data IS
  'Previous row snapshot for update/delete audit events.';

COMMENT ON COLUMN public.audit_logs.new_data IS
  'New row snapshot for insert/update audit events.';

COMMENT ON COLUMN public.audit_logs.changed_fields IS
  'Field names that changed during an update event.';

COMMENT ON COLUMN public.audit_logs.metadata IS
  'Flexible event details that do not fit the core columns.';

COMMENT ON COLUMN public.audit_logs.request_context IS
  'Flexible request/session context such as route, user agent, correlation id, or client timestamp.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id
  ON public.audit_logs (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email
  ON public.audit_logs (actor_email);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
  ON public.audit_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin
  ON public.audit_logs USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_context_gin
  ON public.audit_logs USING gin (request_context);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "single admin read audit logs" ON public.audit_logs;
CREATE POLICY "single admin read audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_single_admin());

DROP POLICY IF EXISTS "single admin append audit logs" ON public.audit_logs;
CREATE POLICY "single admin append audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_single_admin());

COMMIT;
