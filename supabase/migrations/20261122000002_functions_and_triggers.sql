-- Migration: 20261122000002_functions_and_triggers.sql
-- Description: Security Definer functions, Auth trigger, and Vector retrieval procedures

-- 1. Helper: Check if current auth user is an Admin
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

-- 2. Trigger: Automatically insert profile when new user signs up in auth.users
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
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Vector Match Procedure: Retrieve top-k approved questions for target role & difficulty
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

-- 4. Deduplication Check Procedure (> 0.92 cosine similarity against existing questions)
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
  where (1 - (q.embedding <=> query_embedding)) > similarity_threshold
  order by q.embedding <=> query_embedding asc
  limit 1;
end;
$$;
