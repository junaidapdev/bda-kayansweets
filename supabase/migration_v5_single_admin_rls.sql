-- Migration v5: Single-admin authentication + RLS policies
--
-- Before running this migration in production:
-- 1. In Supabase Dashboard > Authentication > Users, create one confirmed user:
--    email: bda@kayan.com
--    password: use the private admin password outside source control
-- 2. Keep public signups disabled in Authentication settings.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_single_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '') = 'bda@kayan.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_single_admin() TO authenticated;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rebate_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "single admin full access" ON public.suppliers;
CREATE POLICY "single admin full access"
ON public.suppliers
FOR ALL
TO authenticated
USING (public.is_single_admin())
WITH CHECK (public.is_single_admin());

DROP POLICY IF EXISTS "single admin full access" ON public.purchase_orders;
CREATE POLICY "single admin full access"
ON public.purchase_orders
FOR ALL
TO authenticated
USING (public.is_single_admin())
WITH CHECK (public.is_single_admin());

DROP POLICY IF EXISTS "single admin full access" ON public.credit_notes;
CREATE POLICY "single admin full access"
ON public.credit_notes
FOR ALL
TO authenticated
USING (public.is_single_admin())
WITH CHECK (public.is_single_admin());

DROP POLICY IF EXISTS "single admin full access" ON public.rebate_accruals;
CREATE POLICY "single admin full access"
ON public.rebate_accruals
FOR ALL
TO authenticated
USING (public.is_single_admin())
WITH CHECK (public.is_single_admin());

DROP POLICY IF EXISTS "single admin full access" ON public.point_ledger;
CREATE POLICY "single admin full access"
ON public.point_ledger
FOR ALL
TO authenticated
USING (public.is_single_admin())
WITH CHECK (public.is_single_admin());

DROP POLICY IF EXISTS "single admin full access" ON public.user_profiles;
CREATE POLICY "single admin full access"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_single_admin())
WITH CHECK (public.is_single_admin());

INSERT INTO public.user_profiles (id, full_name, role)
SELECT id, 'BDA Kayan Admin', 'accounts'
FROM auth.users
WHERE email = 'bda@kayan.com'
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

COMMIT;
