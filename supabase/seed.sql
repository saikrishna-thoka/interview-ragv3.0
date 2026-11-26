-- Seed Roles
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
