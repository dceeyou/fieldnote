-- Category Management Enhancement: Keywords and performance indexes
alter table if exists public.categories add column if not exists keywords text[] default '{}';
create index if not exists idx_categories_type on public.categories(type);
create index if not exists idx_categories_name on public.categories(name);
