-- =============================================================================
-- RESET ONLY — run in Supabase SQL Editor when you need to re-run FULL SETUP
-- =============================================================================
-- Deletes ALL ROWS and TABLES listed below (Alertify app data in `public`).
-- Auth users in auth.users are NOT deleted — sign-ups stay, but orphaned
-- profile rows are gone; the full setup + new signup flow fixes that.
--
-- WORKFLOW
--   1) Run THIS file once (entire script).
--   2) Then run `sql_editor_full_setup.sql` from "create or replace function …" to the end.
--
-- Do NOT run full_setup twice without reset — you will get "relation already exists".
-- For a single test notification + grants + seed row, use `sql_editor_test_notification.sql` instead.
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;

drop table if exists public.sos_reports cascade;
drop table if exists public.emergency_contacts cascade;
drop table if exists public.user_preferences cascade;
drop table if exists public.profiles cascade;
drop table if exists public.disaster_alerts cascade;

drop type if exists public.sos_status cascade;
drop type if exists public.alert_type cascade;
drop type if exists public.alert_severity cascade;

drop function if exists public.set_updated_at() cascade;
