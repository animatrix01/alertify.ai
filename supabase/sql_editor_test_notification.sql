-- =============================================================================
-- ONE FILE — test notification + your profile & preferences
-- =============================================================================
-- 1) Dashboard → Authentication → Users → copy one user's UUID.
-- 2) In THIS file, replace ONLY the placeholder UUID in the DECLARE line below
--    (search: 11111111-1111-4111-8111-111111111111  →  replace with yours).
-- 3) Run the whole script in SQL Editor once.
--
-- What it does:
--   • Ensures types + profiles + user_preferences + disaster_alerts exist
--   • Drops and recreates ONLY disaster_alerts (so columns always match the app)
--   • Grants + RLS so PostgREST does not return "permission denied"
--   • Adds Realtime on disaster_alerts (ignored if already added)
--   • Inserts / upserts ONE profile + ONE user_preferences row for your user
--   • Inserts ONE test disaster_alerts row (fires Realtime INSERT in the app)
-- =============================================================================

-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- Replace this UUID with your Auth user id (keep single quotes):
-- <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

do $main$
declare
  v_user uuid := '369519b3-fedc-4f72-938f-198e26521e33'::uuid;
begin
  if v_user = '369519b3-fedc-4f72-938f-198e26521e33'::uuid then
    raise exception
      'Edit sql_editor_test_notification.sql: set v_user to your real user UUID from Authentication → Users (replace 11111111-1111-4111-8111-111111111111).';
  end if;

  if not exists (select 1 from auth.users u where u.id = v_user) then
    raise exception
      'No auth.users row for that UUID. Sign up once in your app, then paste that user''s id.';
  end if;

  -- types
  begin
    create type public.alert_severity as enum ('info','advisory','warning','critical');
  exception when duplicate_object then null;
  end;
  begin
    create type public.alert_type as enum ('earthquake','flood','wildfire','storm','tsunami','heatwave','landslide','other');
  exception when duplicate_object then null;
  end;

  -- profiles
  create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text,
    avatar_url text,
    phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  alter table public.profiles enable row level security;
  drop policy if exists "Profiles viewable by owner" on public.profiles;
  create policy "Profiles viewable by owner" on public.profiles for select using (auth.uid() = id);
  drop policy if exists "Users insert own profile" on public.profiles;
  create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
  drop policy if exists "Users update own profile" on public.profiles;
  create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

  -- user_preferences
  create table if not exists public.user_preferences (
    user_id uuid primary key references auth.users (id) on delete cascade,
    alert_radius_km numeric not null default 25,
    push_enabled boolean not null default true,
    sound_enabled boolean not null default true,
    min_severity public.alert_severity not null default 'info',
    share_location boolean not null default true,
    updated_at timestamptz not null default now()
  );
  alter table public.user_preferences enable row level security;
  drop policy if exists "Prefs: select own" on public.user_preferences;
  create policy "Prefs: select own" on public.user_preferences for select using (auth.uid() = user_id);
  drop policy if exists "Prefs: insert own" on public.user_preferences;
  create policy "Prefs: insert own" on public.user_preferences for insert with check (auth.uid() = user_id);
  drop policy if exists "Prefs: update own" on public.user_preferences;
  create policy "Prefs: update own" on public.user_preferences for update using (auth.uid() = user_id);

  create or replace function public.set_updated_at()
  returns trigger language plpgsql as $fn$
  begin new.updated_at := now(); return new; end;
  $fn$;

  drop trigger if exists profiles_updated_at on public.profiles;
  create trigger profiles_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
  drop trigger if exists prefs_updated_at on public.user_preferences;
  create trigger prefs_updated_at before update on public.user_preferences
    for each row execute function public.set_updated_at();

  -- one profile row
  insert into public.profiles (id, display_name)
  values (v_user, 'Test user')
  on conflict (id) do update set display_name = excluded.display_name;

  -- one preferences row (push on, min severity info for notifications)
  insert into public.user_preferences (user_id, push_enabled, min_severity)
  values (v_user, true, 'info'::public.alert_severity)
  on conflict (user_id) do update
    set push_enabled = excluded.push_enabled,
        min_severity = excluded.min_severity;

  -- disaster_alerts: recreate clean
  drop table if exists public.disaster_alerts cascade;
  create table public.disaster_alerts (
    id uuid primary key default gen_random_uuid(),
    type public.alert_type not null,
    severity public.alert_severity not null default 'warning',
    title text not null,
    description text,
    latitude double precision not null,
    longitude double precision not null,
    radius_km numeric not null default 10,
    source text,
    expires_at timestamptz,
    created_at timestamptz not null default now()
  );
  alter table public.disaster_alerts enable row level security;
  drop policy if exists "Disaster alerts viewable by everyone" on public.disaster_alerts;
  create policy "Disaster alerts viewable by everyone"
    on public.disaster_alerts for select to anon, authenticated using (true);
  drop policy if exists "Disaster alerts insert authenticated" on public.disaster_alerts;
  create policy "Disaster alerts insert authenticated"
    on public.disaster_alerts for insert to authenticated with check (true);
  create index if not exists disaster_alerts_created_at_idx on public.disaster_alerts (created_at desc);

  grant usage on schema public to anon, authenticated;
  grant select, insert, update on table public.profiles to authenticated;
  grant select, insert, update on table public.user_preferences to authenticated;
  grant select on table public.disaster_alerts to anon, authenticated;
  grant insert on table public.disaster_alerts to authenticated;

  begin
    alter publication supabase_realtime add table public.disaster_alerts;
  exception
    when duplicate_object then null;
    when others then
      if sqlerrm ilike '%already%' then null;
      else raise;
      end if;
  end;

  insert into public.disaster_alerts (
    title, description, type, severity, latitude, longitude, radius_km, source
  ) values (
    'Test disaster alert',
    'Seed row for Alertify notification test.',
    'flood',
    'warning',
    19.076, 72.8777, 15,
    'sql_editor_test_notification'
  );
end
$main$;
