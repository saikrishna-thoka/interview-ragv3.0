-- ==============================================================================
-- FIX: GRANT PERMISSIONS TO SUPABASE AUTHENTICATED & SERVICE ROLES
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ebkeivkhotdrrbpvlgze/sql/new
-- ==============================================================================

-- 1. Grant schema usage
grant usage on schema public to postgres, anon, authenticated, service_role;

-- 2. Grant table, routine, and sequence access to all roles
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

-- 3. Set default privileges for future tables
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- 4. Reload PostgREST schema cache
notify pgrst, 'reload schema';
