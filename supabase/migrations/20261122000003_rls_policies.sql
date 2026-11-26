-- Migration: 20261122000003_rls_policies.sql
-- Description: Row Level Security (RLS) policies for multi-tenant protection

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.questions enable row level security;
alter table public.resumes enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.session_turns enable row level security;

-- PROFILES:
-- Users read their own; Admins read all; Users can update full_name but cannot change their role
drop policy if exists "Profiles read policy" on public.profiles;
create policy "Profiles read policy" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles update policy" on public.profiles;
create policy "Profiles update policy" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- ROLES:
-- Authenticated users read roles; Admins have full access
drop policy if exists "Roles read policy" on public.roles;
create policy "Roles read policy" on public.roles
  for select to authenticated using (true);

drop policy if exists "Roles admin policy" on public.roles;
create policy "Roles admin policy" on public.roles
  for all using (public.is_admin());

-- QUESTIONS:
-- Everyone authenticated reads approved questions; Admins manage all questions
drop policy if exists "Questions read approved policy" on public.questions;
create policy "Questions read approved policy" on public.questions
  for select to authenticated using (status = 'approved' or public.is_admin());

drop policy if exists "Questions admin policy" on public.questions;
create policy "Questions admin policy" on public.questions
  for all using (public.is_admin());

-- INGESTION JOBS:
-- Admins only
drop policy if exists "Ingestion jobs admin policy" on public.ingestion_jobs;
create policy "Ingestion jobs admin policy" on public.ingestion_jobs
  for all using (public.is_admin());

-- RESUMES:
-- Users manage their own resumes; Admins can view
drop policy if exists "Resumes user policy" on public.resumes;
create policy "Resumes user policy" on public.resumes
  for all using (auth.uid() = user_id or public.is_admin());

-- INTERVIEW SESSIONS:
-- Users manage their own interview sessions; Admins can view
drop policy if exists "Interview sessions user policy" on public.interview_sessions;
create policy "Interview sessions user policy" on public.interview_sessions
  for all using (auth.uid() = user_id or public.is_admin());

-- SESSION TURNS:
-- Users manage turns belonging to their own sessions
drop policy if exists "Session turns user policy" on public.session_turns;
create policy "Session turns user policy" on public.session_turns
  for all using (
    exists (
      select 1 from public.interview_sessions s
      where s.id = session_turns.session_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );
