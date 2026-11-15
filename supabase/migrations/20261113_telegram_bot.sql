-- GOODSPOTLESS ONLY: Telegram / quote workflow schema extension.
-- Run ONLY in Supabase project hrypzfgvjlniuhnglmzm, AFTER docs/supabase-schema.sql.
-- NEVER apply to any CWX / renovations project.
-- First-run migration. Do not re-run after success without review.
begin;

alter table public.enquiries
  add column if not exists telegram_delivery_status text not null default 'pending',
  add column if not exists telegram_message_id bigint,
  add column if not exists whatsapp_sent_at timestamptz,
  add column if not exists admin_notes text,
  add column if not exists confirmed_date date,
  add column if not exists confirmed_time time;

alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries
  add constraint enquiries_status_check
  check (status in ('new', 'in_review', 'information_requested', 'quoted', 'booked', 'completed', 'declined'));

alter table public.enquiries
  add constraint enquiries_telegram_delivery_status_check
  check (telegram_delivery_status in ('pending', 'sent', 'failed'));

alter table public.quote_events drop constraint if exists quote_events_type_check;
alter table public.quote_events
  add constraint quote_events_type_check
  check (type in (
    'created','status_changed','quote_set','note','telegram_notified',
    'telegram_action','whatsapp_opened','whatsapp_marked_sent','booking_confirmed'
  ));

create table if not exists public.telegram_processed_updates (
  update_id bigint primary key,
  processed_at timestamptz not null default now()
);
alter table public.telegram_processed_updates enable row level security;
revoke all on public.telegram_processed_updates from anon, authenticated;

-- Restrict both submission metadata and photo objects to the future LCR administrator.
-- All customer records are processed by server-side Edge Functions using a project-local
-- secret/service role key; there is no public direct INSERT/SELECT policy.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('lcr-private-enquiry-photos', 'lcr-private-enquiry-photos', false, 8388608,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do nothing;

-- docs/supabase-schema.sql now places the admin authorization helper in
-- private.has_role(), with execution restricted to authenticated users.
-- Verify real administrator access, non-admin denial, private storage access,
-- and webhook authentication before production.
-- Telegram webhooks are guarded by TELEGRAM_WEBHOOK_SECRET, admin user and admin chat IDs.

commit;
