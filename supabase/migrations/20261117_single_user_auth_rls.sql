-- AgriFlow / Fieldnote - Single-User Authentication & RLS Hardening
-- Run this migration in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wucafifrqdesiirqxlww/sql

-- ============================================================================
-- 1. Ensure Row Level Security (RLS) is enabled on all application tables
-- ============================================================================
alter table public.lands enable row level security;
alter table public.crops enable row level security;
alter table public.land_crops enable row level security;
alter table public.categories enable row level security;
alter table public.fertilizers enable row level security;
alter table public.transactions enable row level security;
alter table public.fertilizer_applications enable row level security;

-- ============================================================================
-- 2. Drop previously existing open / permissive public policies
-- ============================================================================
drop policy if exists "Allow all operations on lands" on public.lands;
drop policy if exists "Allow all operations on crops" on public.crops;
drop policy if exists "Allow all operations on land_crops" on public.land_crops;
drop policy if exists "Allow all operations on categories" on public.categories;
drop policy if exists "Allow all operations on fertilizers" on public.fertilizers;
drop policy if exists "Allow all operations on transactions" on public.transactions;
drop policy if exists "Allow all operations on fertilizer_applications" on public.fertilizer_applications;

-- Drop any previous variants if present
drop policy if exists "Authenticated access to lands" on public.lands;
drop policy if exists "Authenticated access to crops" on public.crops;
drop policy if exists "Authenticated access to land_crops" on public.land_crops;
drop policy if exists "Authenticated access to categories" on public.categories;
drop policy if exists "Authenticated access to fertilizers" on public.fertilizers;
drop policy if exists "Authenticated access to transactions" on public.transactions;
drop policy if exists "Authenticated access to fertilizer_applications" on public.fertilizer_applications;

-- ============================================================================
-- 3. Create strict authenticated-only policies for all CRUD operations
--    Only authenticated administrator sessions (auth.role() = 'authenticated')
--    can read, insert, update, or delete records. Unauthenticated / anon requests
--    are completely denied.
-- ============================================================================

-- Lands
create policy "Authenticated access to lands"
  on public.lands
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Crops
create policy "Authenticated access to crops"
  on public.crops
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Land Crops Junction
create policy "Authenticated access to land_crops"
  on public.land_crops
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Categories
create policy "Authenticated access to categories"
  on public.categories
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Fertilizers
create policy "Authenticated access to fertilizers"
  on public.fertilizers
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Financial Transactions
create policy "Authenticated access to transactions"
  on public.transactions
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Fertilizer Applications
create policy "Authenticated access to fertilizer_applications"
  on public.fertilizer_applications
  for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
