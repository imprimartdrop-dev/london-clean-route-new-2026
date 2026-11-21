-- GOODSPOTLESS ADMIN OPERATIONS v1 (2026-11-21)
-- Target Supabase project ONLY: hrypzfgvjlniuhnglmzm (GOODSPOTLESS / Moderna Barbearia).
-- Never apply to the CWX or other Supabase projects.
-- No existing tables or public quote-form logic are modified.
-- This SQL is versioned with the GitHub application; it is not a Lovable migration.

begin;

create table if not exists public.cleaning_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 180),
  phone text,
  email text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cleaning_properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.cleaning_clients(id) on delete restrict,
  label text not null check (char_length(label) between 2 and 160),
  address_line1 text not null,
  postcode text not null,
  property_type text check (property_type in ('flat','house','office','other')),
  frequency text check (frequency in ('once','weekly','fortnightly','monthly')),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cleaning_properties_client_id_idx on public.cleaning_properties(client_id);

create table if not exists public.cleaning_staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 180),
  phone text,
  email text,
  hourly_rate_pence integer check (hourly_rate_pence >= 0),
  active boolean not null default true,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cleaning_visits (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.cleaning_properties(id) on delete restrict,
  staff_id uuid references public.cleaning_staff(id) on delete set null,
  scheduled_date date not null,
  start_time time,
  duration_minutes integer check (duration_minutes > 0 and duration_minutes <= 1440),
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  route_order integer check (route_order >= 0),
  price_pence integer check (price_pence >= 0),
  staff_cost_pence integer check (staff_cost_pence >= 0),
  supplies_cost_pence integer check (supplies_cost_pence >= 0),
  travel_cost_pence integer check (travel_cost_pence >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cleaning_visits_date_idx on public.cleaning_visits(scheduled_date);
create index if not exists cleaning_visits_staff_idx on public.cleaning_visits(staff_id,scheduled_date);

create table if not exists public.business_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  profit_share_percent numeric(5,2) check (profit_share_percent >= 0 and profit_share_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Investments and partner withdrawals are separate types and NEVER inflated into revenue/profit.
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  kind text not null check (kind in ('income','expense','investment','distribution')),
  category text not null,
  description text not null,
  amount_pence integer not null check (amount_pence > 0),
  paid_by_partner_id uuid references public.business_partners(id) on delete restrict,
  visit_id uuid references public.cleaning_visits(id) on delete set null,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_entries_entry_date_idx on public.finance_entries(entry_date);

-- Server-side RLS, DENY by default. Existing private.has_role is in a non-exposed schema.
-- Admin role is managed by a trusted operator, never self-assigned by the client.
alter table public.cleaning_clients enable row level security;
alter table public.cleaning_properties enable row level security;
alter table public.cleaning_staff enable row level security;
alter table public.cleaning_visits enable row level security;
alter table public.business_partners enable row level security;
alter table public.finance_entries enable row level security;

create policy "goodspotless admins manage clients" on public.cleaning_clients for all to authenticated
  using ((select private.has_role('admin'::public.app_role)))
  with check ((select private.has_role('admin'::public.app_role)));
create policy "goodspotless admins manage properties" on public.cleaning_properties for all to authenticated
  using ((select private.has_role('admin'::public.app_role)))
  with check ((select private.has_role('admin'::public.app_role)));
create policy "goodspotless admins manage staff" on public.cleaning_staff for all to authenticated
  using ((select private.has_role('admin'::public.app_role)))
  with check ((select private.has_role('admin'::public.app_role)));
create policy "goodspotless admins manage visits" on public.cleaning_visits for all to authenticated
  using ((select private.has_role('admin'::public.app_role)))
  with check ((select private.has_role('admin'::public.app_role)));
create policy "goodspotless admins manage partners" on public.business_partners for all to authenticated
  using ((select private.has_role('admin'::public.app_role)))
  with check ((select private.has_role('admin'::public.app_role)));
create policy "goodspotless admins manage finance" on public.finance_entries for all to authenticated
  using ((select private.has_role('admin'::public.app_role)))
  with check ((select private.has_role('admin'::public.app_role)));

insert into public.business_partners (name)
values ('Gabriel Assunção'), ('Wallafy')
on conflict (name) do nothing;

commit;

-- House alarm/access codes are deliberately NOT stored in these tables.
-- A future separate server-only encrypted secrets vault may be added after
-- access roles, assignment scoping, logging and retention are agreed.
