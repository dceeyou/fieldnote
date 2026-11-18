-- AgriFlow - RLS Hardening Migration (Replaces deprecated auth.role() with initPlan-optimized auth.uid())
-- Preserves all existing production data; blocks unauthenticated and anonymous access.

alter table public.lands enable row level security;
alter table public.crops enable row level security;
alter table public.land_crops enable row level security;
alter table public.categories enable row level security;
alter table public.fertilizers enable row level security;
alter table public.transactions enable row level security;
alter table public.fertilizer_applications enable row level security;

drop policy if exists "Authenticated access to lands" on public.lands;
drop policy if exists "Authenticated access to crops" on public.crops;
drop policy if exists "Authenticated access to land_crops" on public.land_crops;
drop policy if exists "Authenticated access to categories" on public.categories;
drop policy if exists "Authenticated access to fertilizers" on public.fertilizers;
drop policy if exists "Authenticated access to transactions" on public.transactions;
drop policy if exists "Authenticated access to fertilizer_applications" on public.fertilizer_applications;

create policy "Authenticated access to lands"
  on public.lands for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "Authenticated access to crops"
  on public.crops for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "Authenticated access to land_crops"
  on public.land_crops for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "Authenticated access to categories"
  on public.categories for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "Authenticated access to fertilizers"
  on public.fertilizers for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "Authenticated access to transactions"
  on public.transactions for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

create policy "Authenticated access to fertilizer_applications"
  on public.fertilizer_applications for all to authenticated
  using ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true')
  with check ((select auth.uid()) is not null and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
