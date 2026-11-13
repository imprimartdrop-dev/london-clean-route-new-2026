-- DRAFT ONLY — NOT APPLIED. For a brand-new, separate backend project.
-- Do not run against any existing project. Review before use.

create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  outward_code text not null unique,            -- e.g. NW6
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.enquiry_reference_seq start 1;

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('LCR-' || lpad(nextval('public.enquiry_reference_seq')::text, 4, '0')),
  status text not null default 'new' check (status in ('new','in_review','quoted','booked','completed','declined')),
  service text not null check (service in ('regular-domestic-cleaning','deep-cleaning','end-of-tenancy-cleaning','short-let-changeovers','office-cleaning','after-builders-cleaning')),
  home_type text not null check (home_type in ('flat','house','studio','office','other')),
  bedrooms smallint not null check (bedrooms between 0 and 10),
  bathrooms smallint not null check (bathrooms between 0 and 10),
  size_sqft integer check (size_sqft between 0 and 999999),
  frequency text not null check (frequency in ('once','weekly','fortnightly','monthly','unsure')),
  postcode text not null check (char_length(postcode) <= 8),
  outward_code text not null,
  preferred_date date not null,
  time_window text not null check (time_window in ('morning','afternoon','evening','flexible')),
  notes text check (char_length(notes) <= 1000),
  name text not null check (char_length(name) between 2 and 100),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email text not null check (char_length(email) <= 255),
  privacy_accepted_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  quote_price_pence integer check (quote_price_pence >= 0),
  locale text not null default 'en' check (locale in ('en','pt')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.enquiries (status);
create index on public.enquiries (outward_code);
create index on public.enquiries (preferred_date);

create table public.enquiry_photos (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  storage_path text not null,                   -- private bucket, signed URLs only
  mime_type text not null,
  size_bytes integer not null check (size_bytes <= 8388608),
  created_at timestamptz not null default now()
);
create index on public.enquiry_photos (enquiry_id);

create table public.quote_events (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  type text not null check (type in ('created','status_changed','quote_set','note','telegram_notified','whatsapp_opened')),
  actor text not null check (actor in ('system','admin','telegram')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.quote_events (enquiry_id);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  time_window text not null check (time_window in ('morning','afternoon','evening')),
  outward_code text,
  capacity smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  scheduled_day date not null,
  time_window text not null check (time_window in ('morning','afternoon','evening')),
  route_group text,                             -- e.g. outward-code cluster
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.jobs (enquiry_id);
create index on public.jobs (scheduled_day);

-- Roles live in their own table (never on a profile row).
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- RLS everywhere. Public visitors get NO direct table access: enquiries are
-- inserted by a server function (validation, rate limit, honeypot) using server credentials.
alter table public.service_areas enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_photos enable row level security;
alter table public.quote_events enable row level security;
alter table public.availability enable row level security;
alter table public.jobs enable row level security;
alter table public.user_roles enable row level security;

create policy "public reads active areas" on public.service_areas for select to anon, authenticated using (active);
create policy "admins manage areas" on public.service_areas for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage enquiries" on public.enquiries for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage photos" on public.enquiry_photos for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage events" on public.quote_events for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage availability" on public.availability for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins manage jobs" on public.jobs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
