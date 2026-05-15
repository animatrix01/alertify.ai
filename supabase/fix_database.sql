-- ============================================================
-- SafetyFlux / Alertify — Full Database Fix Script
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────────
-- STEP 1: Create ENUMs (skip if already exist)
-- ─────────────────────────────────────────────
do $$ begin
  create type public.alert_severity as enum ('info','advisory','warning','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_type as enum ('earthquake','flood','wildfire','storm','tsunami','heatwave','landslide','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sos_status as enum ('active','acknowledged','resolved','cancelled');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────
-- STEP 2: set_updated_at trigger function
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ─────────────────────────────────────────────
-- STEP 3: profiles table
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles viewable by owner" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;

create policy "Profiles viewable by owner" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- STEP 4: disaster_alerts table + FIX RLS
-- ─────────────────────────────────────────────
-- Grant table-level SELECT to anon and authenticated roles
grant select on public.disaster_alerts to anon, authenticated;
grant select on public.user_preferences to authenticated;
grant insert, update on public.user_preferences to authenticated;
grant insert on public.disaster_alerts to authenticated;
grant select, insert, update, delete on public.sos_reports to authenticated;
grant select, insert, update, delete on public.emergency_contacts to authenticated;
grant select, insert, update on public.profiles to authenticated;
create table if not exists public.disaster_alerts (
  id uuid primary key default gen_random_uuid(),
  type public.alert_type not null,
  severity public.alert_severity not null default 'advisory',
  title text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  radius_km numeric not null default 10,
  source text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.disaster_alerts enable row level security;

-- Drop old/broken policies and recreate clean
drop policy if exists "Disaster alerts viewable by everyone" on public.disaster_alerts;
drop policy if exists "Anyone can read disaster alerts" on public.disaster_alerts;

-- Allow EVERYONE (including unauthenticated) to read alerts
create policy "Disaster alerts viewable by everyone"
  on public.disaster_alerts
  for select
  using (true);

-- Allow authenticated users to insert alerts (for testing)
drop policy if exists "Authenticated users can insert alerts" on public.disaster_alerts;
create policy "Authenticated users can insert alerts"
  on public.disaster_alerts
  for insert
  to authenticated
  with check (true);

-- Index for performance
create index if not exists disaster_alerts_created_at_idx on public.disaster_alerts (created_at desc);

-- Add to realtime (ignore error if already added)
do $$ begin
  alter publication supabase_realtime add table public.disaster_alerts;
exception when others then null; end $$;

-- ─────────────────────────────────────────────
-- STEP 5: sos_reports table
-- ─────────────────────────────────────────────
create table if not exists public.sos_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.sos_status not null default 'active',
  severity public.alert_severity not null default 'critical',
  message text,
  latitude double precision,
  longitude double precision,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sos_reports enable row level security;

drop policy if exists "Users view own SOS" on public.sos_reports;
drop policy if exists "Users create own SOS" on public.sos_reports;
drop policy if exists "Users update own SOS" on public.sos_reports;
drop policy if exists "Users delete own SOS" on public.sos_reports;

create policy "Users view own SOS" on public.sos_reports for select using (auth.uid() = user_id);
create policy "Users create own SOS" on public.sos_reports for insert with check (auth.uid() = user_id);
create policy "Users update own SOS" on public.sos_reports for update using (auth.uid() = user_id);
create policy "Users delete own SOS" on public.sos_reports for delete using (auth.uid() = user_id);

drop trigger if exists sos_updated_at on public.sos_reports;
create trigger sos_updated_at before update on public.sos_reports
  for each row execute function public.set_updated_at();

do $$ begin
  alter publication supabase_realtime add table public.sos_reports;
exception when others then null; end $$;

-- ─────────────────────────────────────────────
-- STEP 6: emergency_contacts table
-- ─────────────────────────────────────────────
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.emergency_contacts enable row level security;

drop policy if exists "Contacts: select own" on public.emergency_contacts;
drop policy if exists "Contacts: insert own" on public.emergency_contacts;
drop policy if exists "Contacts: update own" on public.emergency_contacts;
drop policy if exists "Contacts: delete own" on public.emergency_contacts;

create policy "Contacts: select own" on public.emergency_contacts for select using (auth.uid() = user_id);
create policy "Contacts: insert own" on public.emergency_contacts for insert with check (auth.uid() = user_id);
create policy "Contacts: update own" on public.emergency_contacts for update using (auth.uid() = user_id);
create policy "Contacts: delete own" on public.emergency_contacts for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- STEP 7: user_preferences — FIX MISSING COLUMNS
-- ─────────────────────────────────────────────
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alert_radius_km numeric not null default 25,
  push_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  min_severity public.alert_severity not null default 'advisory',
  share_location boolean not null default true,
  updated_at timestamptz not null default now()
);

-- If the table already existed without some columns, add them safely
alter table public.user_preferences
  add column if not exists alert_radius_km numeric not null default 25;

alter table public.user_preferences
  add column if not exists push_enabled boolean not null default true;

alter table public.user_preferences
  add column if not exists sound_enabled boolean not null default true;

alter table public.user_preferences
  add column if not exists min_severity public.alert_severity not null default 'advisory';

alter table public.user_preferences
  add column if not exists share_location boolean not null default true;

alter table public.user_preferences
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_preferences enable row level security;

drop policy if exists "Prefs: select own" on public.user_preferences;
drop policy if exists "Prefs: insert own" on public.user_preferences;
drop policy if exists "Prefs: update own" on public.user_preferences;

create policy "Prefs: select own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "Prefs: insert own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "Prefs: update own" on public.user_preferences for update using (auth.uid() = user_id);

drop trigger if exists prefs_updated_at on public.user_preferences;
create trigger prefs_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- STEP 8: handle_new_user — auto-create profile + prefs on signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- STEP 9: Storage bucket for SOS images
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sos-images', 'sos-images', true)
on conflict (id) do nothing;

drop policy if exists "SOS images public read" on storage.objects;
drop policy if exists "SOS images user upload" on storage.objects;
drop policy if exists "SOS images user update" on storage.objects;
drop policy if exists "SOS images user delete" on storage.objects;

create policy "SOS images public read"
  on storage.objects for select
  using (bucket_id = 'sos-images');

create policy "SOS images user upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'sos-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "SOS images user update"
  on storage.objects for update to authenticated
  using (bucket_id = 'sos-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "SOS images user delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sos-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────────────────────────────────────
-- STEP 10: Backfill preferences for existing users
-- (creates a row for any user who signed up before the trigger existed)
-- ─────────────────────────────────────────────
insert into public.user_preferences (user_id)
select id from auth.users
where id not in (select user_id from public.user_preferences)
on conflict (user_id) do nothing;

-- ─────────────────────────────────────────────
-- DONE — verify with these selects:
-- ─────────────────────────────────────────────
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_preferences'
order by ordinal_position;

select policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'disaster_alerts';
