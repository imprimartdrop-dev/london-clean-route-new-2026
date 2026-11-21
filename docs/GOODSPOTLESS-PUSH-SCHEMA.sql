-- GOODSPOTLESS WEB PUSH v1 (2026-11-21)
-- Apply ONLY to hrypzfgvjlniuhnglmzm. Never to CWX.
-- Holds private admin subscriptions; no public customer data.
-- Supabase Vault stores the VAPID private key separately; it is NOT versioned in Git.

begin;

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 2000),
  p256dh text not null check (char_length(p256dh) between 20 and 500),
  auth_key text not null check (char_length(auth_key) between 8 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_push_subscriptions_user_idx
  on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;
create policy "Goodspotless admin manages own push endpoints"
  on public.admin_push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()) and (select private.has_role('admin'::public.app_role)))
  with check (user_id = (select auth.uid()) and (select private.has_role('admin'::public.app_role)));

-- Only service_role can retrieve the VAPID private key. Not available to browser users.
create or replace function public.goodspotless_push_vapid_private_key()
returns text language sql stable security definer
set search_path = ''
as $$
  select decrypted_secret
    from vault.decrypted_secrets
   where name = 'goodspotless_web_push_vapid_private'
   limit 1;
$$;
revoke all on function public.goodspotless_push_vapid_private_key() from public, anon, authenticated;
grant execute on function public.goodspotless_push_vapid_private_key() to service_role;

commit;

-- After migrating, an operator sets the PRIVATE key once in Supabase Vault.
-- Do NOT add its literal value to this file, any frontend, or a commit.
