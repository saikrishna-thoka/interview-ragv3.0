-- ==============================================================================
-- AI/ML INTERVIEW PREP PORTAL - COMPLETE DATABASE SCHEMA MIGRATION & SEED
-- Paste and run this entire file in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ebkeivkhotdrrbpvlgze/sql
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- 2. TABLES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  total_rows int not null default 0,
  processed_rows int not null default 0,
  failed_rows int not null default 0,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  model_answer text,
  role_id uuid references public.roles(id) on delete set null,
  topic text,
  difficulty text check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  embedding vector(384),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source_file text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists questions_embedding_hnsw_idx 
  on public.questions 
  using hnsw (embedding vector_cosine_ops);

create index if not exists questions_role_status_idx
  on public.questions (role_id, status, difficulty);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  extracted_text text,
  target_role_id uuid references public.roles(id) on delete set null,
  ats_score numeric,
  ats_report jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  resume_id uuid references public.resumes(id) on delete set null,
  target_count int not null check (target_count in (5, 10)),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.session_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  question text not null,
  user_answer text,
  evaluation jsonb,
  score numeric,
  position int not null,
  created_at timestamptz not null default now()
);

create index if not exists session_turns_session_pos_idx
  on public.session_turns (session_id, position);

-- 3. FUNCTIONS & PROCEDURES
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.match_questions(
  query_embedding vector(384),
  match_role_id uuid default null,
  match_difficulty text default null,
  match_count int default 5,
  similarity_threshold float default 0.0
)
returns table (
  id uuid,
  question text,
  model_answer text,
  role_id uuid,
  topic text,
  difficulty text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    q.id,
    q.question,
    q.model_answer,
    q.role_id,
    q.topic,
    q.difficulty,
    (1 - (q.embedding <=> query_embedding))::float as similarity
  from public.questions q
  where q.status = 'approved'
    and (match_role_id is null or q.role_id = match_role_id)
    and (match_difficulty is null or q.difficulty = match_difficulty)
    and (1 - (q.embedding <=> query_embedding)) >= similarity_threshold
  order by q.embedding <=> query_embedding asc
  limit match_count;
end;
$$;

create or replace function public.find_duplicate_question(
  query_embedding vector(384),
  similarity_threshold float default 0.92
)
returns table (
  id uuid,
  question text,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    q.id,
    q.question,
    (1 - (q.embedding <=> query_embedding))::float as similarity
  from public.questions q
  where (1 - (q.embedding <=> query_embedding)) >= similarity_threshold
  order by similarity desc
  limit 1;
end;
$$;

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.questions enable row level security;
alter table public.resumes enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.session_turns enable row level security;

-- Profiles policies
drop policy if exists "Profiles read policy" on public.profiles;
create policy "Profiles read policy" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles update policy" on public.profiles;
create policy "Profiles update policy" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Roles policies
drop policy if exists "Roles read policy" on public.roles;
create policy "Roles read policy" on public.roles
  for select to authenticated using (true);

drop policy if exists "Roles admin policy" on public.roles;
create policy "Roles admin policy" on public.roles
  for all using (public.is_admin());

-- Questions policies
drop policy if exists "Questions read approved policy" on public.questions;
create policy "Questions read approved policy" on public.questions
  for select to authenticated using (status = 'approved' or public.is_admin());

drop policy if exists "Questions admin policy" on public.questions;
create policy "Questions admin policy" on public.questions
  for all using (public.is_admin());

-- Ingestion jobs policies
drop policy if exists "Ingestion jobs admin policy" on public.ingestion_jobs;
create policy "Ingestion jobs admin policy" on public.ingestion_jobs
  for all using (public.is_admin());

-- Resumes policies
drop policy if exists "Resumes user policy" on public.resumes;
create policy "Resumes user policy" on public.resumes
  for all using (auth.uid() = user_id or public.is_admin());

-- Interview sessions policies
drop policy if exists "Interview sessions user policy" on public.interview_sessions;
create policy "Interview sessions user policy" on public.interview_sessions
  for all using (auth.uid() = user_id or public.is_admin());

-- Session turns policies
drop policy if exists "Session turns user policy" on public.session_turns;
create policy "Session turns user policy" on public.session_turns
  for all using (
    exists (
      select 1 from public.interview_sessions s
      where s.id = session_turns.session_id and (s.user_id = auth.uid() or public.is_admin())
    )
  );

-- 5. STORAGE BUCKET FOR RESUMES
insert into storage.buckets (id, name, public) 
values ('resumes', 'resumes', false) 
on conflict (id) do nothing;

drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files" on storage.objects 
  for insert to authenticated 
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read own resume files" on storage.objects;
create policy "Users can read own resume files" on storage.objects 
  for select to authenticated 
  using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 6. SEED ENGINEERING ROLES
insert into public.roles (name) values
  ('Data Scientist'),
  ('ML Engineer'),
  ('Data Analyst'),
  ('AI Engineer'),
  ('NLP Engineer'),
  ('Computer Vision Engineer'),
  ('MLOps Engineer'),
  ('Data Engineer'),
  ('GenAI/LLM Engineer')
on conflict (name) do nothing;

-- 7. SYNC EXISTING AUTH USERS INTO PROFILES & SET ADMIN
insert into public.profiles (id, email, full_name, role)
select 
  u.id, 
  coalesce(u.email, 'unknown@rag'), 
  coalesce(u.raw_user_meta_data->>'full_name', 'Admin User'), 
  case when u.email in ('admin@rag', 'admin@rag.com') then 'admin' else 'user' end
from auth.users u
on conflict (id) do update
set role = case when excluded.email in ('admin@rag', 'admin@rag.com') then 'admin' else public.profiles.role end;

-- Guarantee admin permissions for admin@rag accounts
update public.profiles
set role = 'admin'
where email in ('admin@rag', 'admin@rag.com');

-- 8. GRANT PERMISSIONS TO POSTGREST ROLES (anon, authenticated, service_role)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

notify pgrst, 'reload schema';
