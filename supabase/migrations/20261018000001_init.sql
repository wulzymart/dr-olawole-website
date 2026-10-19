-- =====================================================================
-- Personal doctor website: core schema
-- Apply with the Supabase SQL editor, the Supabase CLI, or the connector.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Admin access. Only the person whose email is stored in app_config
-- (key = 'admin_email') becomes an admin when they sign up.
-- ---------------------------------------------------------------------
create table public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
-- No policies: readable only with the service role.

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins read own admin row" on public.admins
  for select using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = lower(coalesce((select value from public.app_config where key = 'admin_email'), '')) then
    insert into public.admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Public site identity (readable by everyone)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id               smallint primary key default 1 check (id = 1),
  doctor_name      text not null default 'Dr Olawole Olawale Martins',
  short_name       text not null default 'Dr Olawole',
  post_nominals    text not null default 'MBBS',
  specialty        text not null default 'Resident Doctor in Family Medicine',
  headline         text not null default 'Know the facts. Live healthier.',
  tagline          text not null default 'Clear, evidence-based guidance on prevention, chronic conditions and everyday health, in plain language.',
  short_bio        text not null default '',
  about_html       text not null default '',
  credentials      jsonb not null default '[]'::jsonb,   -- [{title, detail}]
  experience       jsonb not null default '[]'::jsonb,   -- [{role, place, period, summary}]
  education        jsonb not null default '[]'::jsonb,   -- [{title, place, year}]
  interests        jsonb not null default '[]'::jsonb,   -- [{title, detail}]
  approach         jsonb not null default '[]'::jsonb,   -- [{title, detail}]
  engagements      jsonb not null default '[]'::jsonb,   -- [string]
  mdcn_number      text,
  photo_url        text,
  contact_email    text,
  phone            text,
  whatsapp_number  text,
  location         text,
  socials          jsonb not null default '{}'::jsonb,
  seo_description  text,
  timezone         text not null default 'Africa/Lagos',
  updated_at       timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "anyone can read site settings" on public.site_settings
  for select using (true);
create policy "admins manage site settings" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Private settings (admin only): booking rules, payments, notifications
-- ---------------------------------------------------------------------
create table public.private_settings (
  id                    smallint primary key default 1 check (id = 1),
  slot_interval_minutes int  not null default 15 check (slot_interval_minutes between 5 and 120),
  buffer_minutes        int  not null default 10 check (buffer_minutes between 0 and 120),
  min_notice_hours      int  not null default 6  check (min_notice_hours between 0 and 720),
  max_advance_days      int  not null default 60 check (max_advance_days between 1 and 365),
  hold_minutes          int  not null default 20 check (hold_minutes between 5 and 240),
  bank_hold_hours       int  not null default 24 check (bank_hold_hours between 1 and 168),
  default_meet_url      text,
  phone_instructions    text,
  payments              jsonb not null default '{"paystack": false, "flutterwave": false, "bank_transfer": true}'::jsonb,
  bank_details          jsonb not null default '{}'::jsonb,
  notify                jsonb not null default '{"email": true, "whatsapp": false, "reminder_hours": [24, 1]}'::jsonb,
  updated_at            timestamptz not null default now()
);
alter table public.private_settings enable row level security;
create policy "admins manage private settings" on public.private_settings
  for all using (public.is_admin()) with check (public.is_admin());
create trigger private_settings_updated before update on public.private_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Encrypted integration secrets (API keys). Values are encrypted by the
-- app (AES-256-GCM) before they are written. RLS is on and there are no
-- policies, so only the server (service role) can read or write.
-- ---------------------------------------------------------------------
create table public.integration_secrets (
  key         text primary key,
  ciphertext  text not null,
  hint        text,
  updated_at  timestamptz not null default now()
);
alter table public.integration_secrets enable row level security;

-- ---------------------------------------------------------------------
-- Consultation types (duration options and price)
-- ---------------------------------------------------------------------
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  summary          text not null default '',
  description      text not null default '',
  duration_minutes int  not null check (duration_minutes between 5 and 480),
  -- NGN price in kobo (100 kobo = 1 naira). USD price in cents; null means
  -- the option is not offered to patients paying in USD.
  price_ngn_kobo   int  not null check (price_ngn_kobo >= 0),
  price_usd_cents  int  check (price_usd_cents is null or price_usd_cents >= 0),
  modes            text[] not null default array['meet', 'whatsapp']
                   check (cardinality(modes) >= 1 and modes <@ array['meet', 'phone', 'whatsapp']),
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.services enable row level security;
create policy "anyone can read active services" on public.services
  for select using (is_active or public.is_admin());
create policy "admins manage services" on public.services
  for all using (public.is_admin()) with check (public.is_admin());
create trigger services_updated before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Availability: weekly hours (ISO weekday 1 = Monday ... 7 = Sunday)
-- and date exceptions (time off or special hours). Times are wall-clock
-- times in site_settings.timezone.
-- ---------------------------------------------------------------------
create table public.availability_rules (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);
alter table public.availability_rules enable row level security;
create policy "admins manage availability rules" on public.availability_rules
  for all using (public.is_admin()) with check (public.is_admin());

create table public.availability_exceptions (
  id         uuid primary key default gen_random_uuid(),
  on_date    date not null,
  is_closed  boolean not null default true,
  start_time time,
  end_time   time,
  note       text,
  check (is_closed or (start_time is not null and end_time is not null and end_time > start_time))
);
alter table public.availability_exceptions enable row level security;
create policy "admins manage availability exceptions" on public.availability_exceptions
  for all using (public.is_admin()) with check (public.is_admin());
create index availability_exceptions_date_idx on public.availability_exceptions (on_date);

-- ---------------------------------------------------------------------
-- Bookings. Patients never touch this table directly: the server uses
-- the service role. Admins can read and manage everything.
-- ---------------------------------------------------------------------
create table public.bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  access_token      text not null,
  service_id        uuid references public.services (id) on delete set null,
  service_name      text not null,
  duration_minutes  int  not null,
  amount_minor      int  not null check (amount_minor >= 0),  -- kobo for NGN, cents for USD
  currency          text not null default 'NGN' check (currency in ('NGN', 'USD')),
  patient_name      text not null,
  patient_email     text not null,
  patient_phone     text not null,
  patient_whatsapp  text,
  reason            text,
  meeting_mode      text not null check (meeting_mode in ('meet', 'phone', 'whatsapp')),
  patient_timezone  text,
  patient_country   text,   -- ISO code detected from the request; decides the currency
  consent_at        timestamptz not null,
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  status            text not null default 'pending_payment'
                    check (status in ('pending_payment', 'awaiting_verification', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired')),
  payment_status    text not null default 'unpaid'
                    check (payment_status in ('unpaid', 'pending_verification', 'paid', 'failed', 'refunded', 'waived')),
  payment_method    text check (payment_method in ('paystack', 'flutterwave', 'bank_transfer', 'free')),
  payment_reference text,
  paid_at           timestamptz,
  meeting_url       text,
  hold_expires_at   timestamptz,
  reminders_sent    jsonb not null default '{}'::jsonb,
  cancelled_reason  text,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_at > start_at),
  -- Two live bookings can never overlap: the database is the final referee.
  constraint no_double_booking exclude using gist (tstzrange(start_at, end_at, '[)') with &&)
    where (status in ('pending_payment', 'awaiting_verification', 'confirmed'))
);
alter table public.bookings enable row level security;
create policy "admins manage bookings" on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());
create trigger bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();
create index bookings_start_idx on public.bookings (start_at);
create index bookings_status_idx on public.bookings (status);
create index bookings_email_idx on public.bookings (lower(patient_email));

-- Releases slots held for unpaid bookings once the hold has lapsed.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.bookings
     set status = 'expired', payment_status = 'unpaid'
   where status = 'pending_payment'
     and hold_expires_at is not null
     and hold_expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.expire_stale_holds() from public, anon, authenticated;
grant execute on function public.expire_stale_holds() to service_role;

-- ---------------------------------------------------------------------
-- Consultation documentation (private to the doctor)
-- ---------------------------------------------------------------------
create table public.consultation_notes (
  booking_id      uuid primary key references public.bookings (id) on delete cascade,
  clinical_html   text not null default '',
  clinical_json   jsonb,
  summary_html    text not null default '',
  summary_json    jsonb,
  summary_sent_at timestamptz,
  follow_up_on    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.consultation_notes enable row level security;
create policy "admins manage consultation notes" on public.consultation_notes
  for all using (public.is_admin()) with check (public.is_admin());
create trigger consultation_notes_updated before update on public.consultation_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------
create table public.posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text not null default '',
  cover_url       text,
  cover_alt       text,
  content_html    text not null default '',
  content_json    jsonb,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  category        text,
  tags            text[] not null default '{}',
  seo_title       text,
  seo_description text,
  reading_minutes int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "anyone can read published posts" on public.posts
  for select using ((status = 'published' and published_at <= now()) or public.is_admin());
create policy "admins manage posts" on public.posts
  for all using (public.is_admin()) with check (public.is_admin());
create trigger posts_updated before update on public.posts
  for each row execute function public.set_updated_at();
create index posts_published_idx on public.posts (published_at desc) where status = 'published';

-- ---------------------------------------------------------------------
-- Payment audit trail (webhook payloads)
-- ---------------------------------------------------------------------
create table public.payment_events (
  id         uuid primary key default gen_random_uuid(),
  provider   text not null,
  event_type text,
  reference  text,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.payment_events enable row level security;
create policy "admins read payment events" on public.payment_events
  for select using (public.is_admin());
create index payment_events_reference_idx on public.payment_events (reference);

-- ---------------------------------------------------------------------
-- Media storage (images and videos used in articles and notes)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do nothing;

create policy "admins read media" on storage.objects
  for select using (bucket_id = 'media' and public.is_admin());
create policy "admins upload media" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());
create policy "admins update media" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());
create policy "admins delete media" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
