-- AgriFlow - Hardened Single-Administrator RLS Migration (28 Granular Policies)
-- Drops ALL wide-open {public} policies and prior broad policies, then creates
-- explicit SELECT, INSERT, UPDATE, DELETE policies pinned to the confirmed
-- administrator UID (dceeyou@gmail.com) and non-anonymous JWT sessions.

BEGIN;

-- 1. Ensure Row Level Security is enabled on all 7 tables
ALTER TABLE public.lands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertilizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertilizer_applications ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL legacy wide-open {public} policies
DROP POLICY IF EXISTS "Allow all operations on lands" ON public.lands;
DROP POLICY IF EXISTS "Allow all operations on crops" ON public.crops;
DROP POLICY IF EXISTS "Allow all operations on land_crops" ON public.land_crops;
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all operations on fertilizers" ON public.fertilizers;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all operations on fertilizer_applications" ON public.fertilizer_applications;

-- 3. Drop any prior broad authenticated policies
DROP POLICY IF EXISTS "Authenticated access to lands" ON public.lands;
DROP POLICY IF EXISTS "Authenticated access to crops" ON public.crops;
DROP POLICY IF EXISTS "Authenticated access to land_crops" ON public.land_crops;
DROP POLICY IF EXISTS "Authenticated access to categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated access to fertilizers" ON public.fertilizers;
DROP POLICY IF EXISTS "Authenticated access to transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated access to fertilizer_applications" ON public.fertilizer_applications;

-- Drop granular policy names if re-running idempotently
DROP POLICY IF EXISTS "admin_select_lands" ON public.lands;
DROP POLICY IF EXISTS "admin_insert_lands" ON public.lands;
DROP POLICY IF EXISTS "admin_update_lands" ON public.lands;
DROP POLICY IF EXISTS "admin_delete_lands" ON public.lands;

DROP POLICY IF EXISTS "admin_select_crops" ON public.crops;
DROP POLICY IF EXISTS "admin_insert_crops" ON public.crops;
DROP POLICY IF EXISTS "admin_update_crops" ON public.crops;
DROP POLICY IF EXISTS "admin_delete_crops" ON public.crops;

DROP POLICY IF EXISTS "admin_select_land_crops" ON public.land_crops;
DROP POLICY IF EXISTS "admin_insert_land_crops" ON public.land_crops;
DROP POLICY IF EXISTS "admin_update_land_crops" ON public.land_crops;
DROP POLICY IF EXISTS "admin_delete_land_crops" ON public.land_crops;

DROP POLICY IF EXISTS "admin_select_categories" ON public.categories;
DROP POLICY IF EXISTS "admin_insert_categories" ON public.categories;
DROP POLICY IF EXISTS "admin_update_categories" ON public.categories;
DROP POLICY IF EXISTS "admin_delete_categories" ON public.categories;

DROP POLICY IF EXISTS "admin_select_fertilizers" ON public.fertilizers;
DROP POLICY IF EXISTS "admin_insert_fertilizers" ON public.fertilizers;
DROP POLICY IF EXISTS "admin_update_fertilizers" ON public.fertilizers;
DROP POLICY IF EXISTS "admin_delete_fertilizers" ON public.fertilizers;

DROP POLICY IF EXISTS "admin_select_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admin_insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admin_update_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admin_delete_transactions" ON public.transactions;

DROP POLICY IF EXISTS "admin_select_fertilizer_applications" ON public.fertilizer_applications;
DROP POLICY IF EXISTS "admin_insert_fertilizer_applications" ON public.fertilizer_applications;
DROP POLICY IF EXISTS "admin_update_fertilizer_applications" ON public.fertilizer_applications;
DROP POLICY IF EXISTS "admin_delete_fertilizer_applications" ON public.fertilizer_applications;

-- 4. Create 28 explicit per-command policies (4 per table) strictly scoped to
--    TO authenticated + confirmed single-admin UID + non-anonymous JWT

-- public.lands
CREATE POLICY "admin_select_lands" ON public.lands FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_lands" ON public.lands FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_lands" ON public.lands FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_lands" ON public.lands FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- public.crops
CREATE POLICY "admin_select_crops" ON public.crops FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_crops" ON public.crops FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_crops" ON public.crops FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_crops" ON public.crops FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- public.land_crops
CREATE POLICY "admin_select_land_crops" ON public.land_crops FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_land_crops" ON public.land_crops FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_land_crops" ON public.land_crops FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_land_crops" ON public.land_crops FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- public.categories
CREATE POLICY "admin_select_categories" ON public.categories FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_categories" ON public.categories FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_categories" ON public.categories FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- public.fertilizers
CREATE POLICY "admin_select_fertilizers" ON public.fertilizers FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_fertilizers" ON public.fertilizers FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_fertilizers" ON public.fertilizers FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_fertilizers" ON public.fertilizers FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- public.transactions
CREATE POLICY "admin_select_transactions" ON public.transactions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_transactions" ON public.transactions FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_transactions" ON public.transactions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

-- public.fertilizer_applications
CREATE POLICY "admin_select_fertilizer_applications" ON public.fertilizer_applications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_insert_fertilizer_applications" ON public.fertilizer_applications FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_update_fertilizer_applications" ON public.fertilizer_applications FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true')
  WITH CHECK ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');
CREATE POLICY "admin_delete_fertilizer_applications" ON public.fertilizer_applications FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = '89d50559-1a56-490f-adec-58c495f4966b'::uuid AND (SELECT auth.jwt()->>'is_anonymous') IS DISTINCT FROM 'true');

COMMIT;
