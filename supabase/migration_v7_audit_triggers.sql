-- Migration v7: Audit triggers for core business tables
--
-- Adds reusable row-level auditing for suppliers, purchase_orders,
-- credit_notes, and point_ledger. This migration intentionally does NOT
-- modify frontend code or add an Activity Log page.

BEGIN;

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    audit_entity_type text;
    audit_action      text;
    audit_event_type  text;
    audit_entity_id   uuid;
    audit_old_data    jsonb;
    audit_new_data    jsonb;
    audit_changed     text[];
BEGIN
    audit_entity_type := CASE TG_TABLE_NAME
        WHEN 'suppliers' THEN 'supplier'
        WHEN 'purchase_orders' THEN 'purchase_order'
        WHEN 'credit_notes' THEN 'credit_note'
        WHEN 'point_ledger' THEN 'point_ledger'
        ELSE TG_TABLE_NAME
    END;

    audit_action := CASE TG_OP
        WHEN 'INSERT' THEN 'create'
        WHEN 'UPDATE' THEN 'update'
        WHEN 'DELETE' THEN 'delete'
        ELSE lower(TG_OP)
    END;

    audit_event_type := audit_entity_type || '.' || CASE TG_OP
        WHEN 'INSERT' THEN 'created'
        WHEN 'UPDATE' THEN 'updated'
        WHEN 'DELETE' THEN 'deleted'
        ELSE lower(TG_OP)
    END;

    IF TG_OP = 'INSERT' THEN
        audit_entity_id := NEW.id;
        audit_old_data := NULL;
        audit_new_data := to_jsonb(NEW);
        audit_changed := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        audit_entity_id := NEW.id;
        audit_old_data := to_jsonb(OLD);
        audit_new_data := to_jsonb(NEW);

        SELECT COALESCE(array_agg(changed.key ORDER BY changed.key), ARRAY[]::text[])
          INTO audit_changed
          FROM (
              SELECT new_values.key
                FROM jsonb_each(audit_new_data) AS new_values(key, value)
                LEFT JOIN jsonb_each(audit_old_data) AS old_values(key, value)
                  ON old_values.key = new_values.key
               WHERE new_values.value IS DISTINCT FROM old_values.value
          ) AS changed;
    ELSIF TG_OP = 'DELETE' THEN
        audit_entity_id := OLD.id;
        audit_old_data := to_jsonb(OLD);
        audit_new_data := NULL;
        audit_changed := NULL;
    END IF;

    INSERT INTO public.audit_logs (
        actor_user_id,
        actor_email,
        event_type,
        entity_type,
        entity_id,
        action,
        old_data,
        new_data,
        changed_fields,
        metadata,
        request_context
    )
    VALUES (
        auth.uid(),
        NULLIF(auth.jwt() ->> 'email', ''),
        audit_event_type,
        audit_entity_type,
        audit_entity_id,
        audit_action,
        audit_old_data,
        audit_new_data,
        audit_changed,
        jsonb_build_object(
            'source', 'database_trigger',
            'schema', TG_TABLE_SCHEMA,
            'table', TG_TABLE_NAME,
            'operation', TG_OP
        ),
        '{}'::jsonb
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_audit_event() IS
  'Reusable trigger function that writes insert, update, and delete row changes to public.audit_logs.';

DROP TRIGGER IF EXISTS trg_audit_suppliers ON public.suppliers;
CREATE TRIGGER trg_audit_suppliers
AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_purchase_orders ON public.purchase_orders;
CREATE TRIGGER trg_audit_purchase_orders
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_credit_notes ON public.credit_notes;
CREATE TRIGGER trg_audit_credit_notes
AFTER INSERT OR UPDATE OR DELETE ON public.credit_notes
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_point_ledger ON public.point_ledger;
CREATE TRIGGER trg_audit_point_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.point_ledger
FOR EACH ROW
EXECUTE FUNCTION public.log_audit_event();

REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon;

COMMIT;
