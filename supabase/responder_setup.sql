-- ============================================================
-- Alertify — Responder / Staff System Setup
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add role column to profiles
alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'responder', 'admin'));

-- 2. Extend sos_reports with responder fields
alter table public.sos_reports
  add column if not exists responder_notes text;

alter table public.sos_reports
  add column if not exists assigned_staff uuid references auth.users(id);

alter table public.sos_reports
  add column if not exists resolved_at timestamptz;

alter table public.sos_reports
  add column if not exists ai_summary text;

alter table public.sos_reports
  add column if not exists ai_priority text
  check (ai_priority in ('low', 'medium', 'high', 'critical'));

-- 3. Grant responders read access to ALL sos_reports (not just their own)
-- Normal users can only see their own (existing policy stays)
create policy "Responders view all SOS"
  on public.sos_reports for select
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('responder', 'admin')
    )
  );

-- Drop the old user-only select policy (replaced above)
drop policy if exists "Users view own SOS" on public.sos_reports;

-- 4. Allow responders to update any SOS (to change status, add notes)
create policy "Responders update any SOS"
  on public.sos_reports for update
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('responder', 'admin')
    )
  );

-- Drop old user-only update policy (replaced above)
drop policy if exists "Users update own SOS" on public.sos_reports;

-- 5. Grant responders read access to all profiles (to show user info on SOS cards)
create policy "Responders view all profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    OR exists (
      select 1 from public.profiles p2
      where p2.id = auth.uid()
      and p2.role in ('responder', 'admin')
    )
  );

-- Drop old owner-only select policy (replaced above)
drop policy if exists "Profiles viewable by owner" on public.profiles;

-- 6. Add sos_reports to realtime (if not already)
do $$ begin
  alter publication supabase_realtime add table public.sos_reports;
exception when others then null; end $$;

-- 7. Set the staff account role
-- IMPORTANT: Replace the UUID below with the actual UUID of alertify.staff@gmail.com
-- Find it in: Supabase Dashboard → Authentication → Users
-- UPDATE public.profiles SET role = 'responder' WHERE id = 'PASTE-STAFF-UUID-HERE';

-- ============================================================
-- Verify
-- ============================================================
select id, display_name, role from public.profiles limit 10;
