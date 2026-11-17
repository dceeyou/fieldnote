-- Fieldnote (Agriculture Management System) - Supabase Schema
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Lands
create table if not exists public.lands (
  id text primary key,
  name text not null,
  location text,
  area_value numeric,
  area_unit text check (area_unit in ('acre', 'perch')),
  area_in_acres numeric,
  notes text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Crops
create table if not exists public.crops (
  id text primary key,
  name text not null,
  description text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Land Crops Junction
create table if not exists public.land_crops (
  id text primary key,
  land_id text references public.lands(id) on delete cascade not null,
  crop_id text references public.crops(id) on delete cascade not null,
  notes text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. Categories
create table if not exists public.categories (
  id text primary key,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  description text,
  keywords text[] default '{}',
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. Fertilizers
create table if not exists public.fertilizers (
  id text primary key,
  name text not null,
  type text,
  default_unit text,
  notes text,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. Transactions
create table if not exists public.transactions (
  id text primary key,
  date text not null,
  type text not null check (type in ('income', 'expense')),
  land_id text references public.lands(id) on delete restrict not null,
  crop_id text references public.crops(id) on delete set null,
  category_id text references public.categories(id) on delete restrict not null,
  description text not null,
  amount numeric not null check (amount > 0),
  payment_method text,
  reference_number text,
  notes text,
  source text default 'manual' not null,
  import_batch_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 7. Fertilizer Applications
create table if not exists public.fertilizer_applications (
  id text primary key,
  land_id text references public.lands(id) on delete cascade not null,
  crop_id text references public.crops(id) on delete cascade not null,
  fertilizer_id text references public.fertilizers(id) on delete cascade not null,
  application_date text not null,
  quantity numeric,
  unit text,
  cost numeric,
  reminder_interval text,
  next_due_date text,
  status text default 'scheduled' not null check (status in ('scheduled', 'completed', 'cancelled')),
  actual_completed_date text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Backward-compatible migration if column does not yet exist
alter table if exists public.fertilizer_applications add column if not exists reminder_interval text;

-- Enable Row Level Security (RLS) on all tables
alter table public.lands enable row level security;
alter table public.crops enable row level security;
alter table public.land_crops enable row level security;
alter table public.categories enable row level security;
alter table public.fertilizers enable row level security;
alter table public.transactions enable row level security;
alter table public.fertilizer_applications enable row level security;

-- Strict single-user administrator policies (authenticated only; anon/unauthenticated requests are denied)
create policy "Authenticated access to lands" on public.lands for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated access to crops" on public.crops for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated access to land_crops" on public.land_crops for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated access to categories" on public.categories for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated access to fertilizers" on public.fertilizers for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated access to transactions" on public.transactions for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated access to fertilizer_applications" on public.fertilizer_applications for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Indexes for optimal query performance
create index if not exists idx_transactions_date on public.transactions(date desc);
create index if not exists idx_transactions_land_id on public.transactions(land_id);
create index if not exists idx_transactions_crop_id on public.transactions(crop_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_fertilizer_apps_land_id on public.fertilizer_applications(land_id);
create index if not exists idx_fertilizer_apps_due_date on public.fertilizer_applications(next_due_date);
