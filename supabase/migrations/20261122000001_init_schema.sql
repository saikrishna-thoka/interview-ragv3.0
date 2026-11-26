-- Migration: 20261122000001_init_schema.sql
-- Description: Core tables and extensions for AI/ML Interview Prep Portal

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- 1. PROFILES (Synced with Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. ROLES (Target interview roles)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

-- 3. INGESTION JOBS (Track CSV batch processing for Admins)
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

-- 4. QUESTIONS (RAG Knowledge Store with pgvector)
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

-- Vector Index: HNSW for Cosine Similarity (vector_cosine_ops)
create index if not exists questions_embedding_hnsw_idx 
  on public.questions 
  using hnsw (embedding vector_cosine_ops);

create index if not exists questions_role_status_idx
  on public.questions (role_id, status, difficulty);

-- 5. RESUMES
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

-- 6. INTERVIEW SESSIONS
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

-- 7. SESSION TURNS (Individual Q&A + Rubric evaluations)
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
