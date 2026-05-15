
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text, phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by owner" on public.profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create type public.alert_severity as enum ('info','advisory','warning','critical');
create type public.alert_type as enum ('earthquake','flood','wildfire','storm','tsunami','heatwave','landslide','other');

create table public.disaster_alerts (
  id uuid primary key default gen_random_uuid(),
  type public.alert_type not null,
  severity public.alert_severity not null default 'advisory',
  title text not null, description text,
  latitude double precision not null, longitude double precision not null,
  radius_km numeric not null default 10,
  source text, expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.disaster_alerts enable row level security;
create policy "Disaster alerts viewable by everyone"
  on public.disaster_alerts for select using (true);
create index disaster_alerts_created_at_idx on public.disaster_alerts (created_at desc);

create type public.sos_status as enum ('active','acknowledged','resolved','cancelled');
create table public.sos_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.sos_status not null default 'active',
  severity public.alert_severity not null default 'critical',
  message text,
  latitude double precision, longitude double precision,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sos_reports enable row level security;
create policy "Users view own SOS" on public.sos_reports for select using (auth.uid() = user_id);
create policy "Users create own SOS" on public.sos_reports for insert with check (auth.uid() = user_id);
create policy "Users update own SOS" on public.sos_reports for update using (auth.uid() = user_id);
create policy "Users delete own SOS" on public.sos_reports for delete using (auth.uid() = user_id);
create trigger sos_updated_at before update on public.sos_reports
  for each row execute function public.set_updated_at();

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, phone text not null, relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.emergency_contacts enable row level security;
create policy "Contacts: select own" on public.emergency_contacts for select using (auth.uid() = user_id);
create policy "Contacts: insert own" on public.emergency_contacts for insert with check (auth.uid() = user_id);
create policy "Contacts: update own" on public.emergency_contacts for update using (auth.uid() = user_id);
create policy "Contacts: delete own" on public.emergency_contacts for delete using (auth.uid() = user_id);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alert_radius_km numeric not null default 25,
  push_enabled boolean not null default true,
  sound_enabled boolean not null default true,
  min_severity public.alert_severity not null default 'advisory',
  share_location boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
create policy "Prefs: select own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "Prefs: insert own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "Prefs: update own" on public.user_preferences for update using (auth.uid() = user_id);
create trigger prefs_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.disaster_alerts;
alter publication supabase_realtime add table public.sos_reports;
