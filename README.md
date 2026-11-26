# AI/ML Interview Prep Portal (RAG + Groq + Supabase + Vercel)

A full-stack web portal for AI/ML engineering technical interview preparation. Administrators ingest and curate domain question banks into a vector store (`pgvector`, 384 dimensions). Groq classifies incoming questions and evaluates candidate answers in real time. Candidates upload resumes for automated ATS alignment scoring and practice grounded mock technical interviews.

---

## 1. Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Components, Route Handlers, Strict TypeScript)
- **Styling & UI:** Tailwind CSS, Lucide React, class-variance-authority, next-themes
- **Database & Storage:** Supabase Postgres, `pgvector` extension (384 dimensions), Supabase Auth, Row Level Security (RLS), Supabase Storage
- **LLM Engine:** Groq API (server-side only with exponential backoff and JSON mode)
  - Generation, Evaluation & ATS: `openai/gpt-oss-120b`
  - Ingestion Classification: `llama-3.1-8b-instant`
- **Embeddings:** 384-dimensional unit vectors (`gte-small`), abstracted behind `embed(texts: string[])` with Supabase Edge Function support and high-fidelity deterministic fallback
- **Validation & Parsing:** Zod schemas, PapaParse (CSV), pdf-parse & mammoth (PDF/DOCX text extraction)
- **Deployment:** Vercel serverless functions (zero local disk dependencies)

---

## 2. Architecture & Data Flow

```
[Candidate] ---> [Resume Upload (PDF/DOCX)] ---> [Text Extraction (pdf-parse / mammoth)]
                        |                                       |
                        v                                       v
          [Supabase Storage (resumes)]               [Groq ATS Scoring Engine]
                                                                |
                                                                v
                                                     [ATS Report (0-100 Gauge)]

[Admin] ------> [CSV Upload] ---> [Groq Ingestion Batch] ---> [384d Vector Embeddings]
                                                                |
                                                                v
                                                     [pgvector Deduplication (>0.92)]
                                                                |
                                                                v
                                                     [Admin Review & Approval]
                                                                |
                                                                v
[Candidate Mock Interview] <---> [pgvector match_questions()] <---+
         |
         +---> [Groq Grounded Next Question]
         +---> [Candidate Response]
         +---> [Groq 0-10 Rubric Evaluation (Score, Strengths, Gaps, Model Answer)]
         +---> [Comprehensive Final Coaching Summary]
```

---

## 3. Database Setup (Supabase)

Run the SQL migration files located in `supabase/migrations/` in order within the Supabase SQL Editor:

1. **`supabase/migrations/20261122000001_init_schema.sql`**
   - Enables `vector` extension
   - Creates tables: `profiles`, `roles`, `ingestion_jobs`, `questions`, `resumes`, `interview_sessions`, `session_turns`
   - Configures cosine index on `questions.embedding`
2. **`supabase/migrations/20261122000002_functions_and_triggers.sql`**
   - Creates `is_admin()` security definer function
   - Sets up `handle_new_user()` trigger for automated profile creation upon signup
   - Adds `match_questions()` RPC function for vector similarity retrieval
   - Adds `find_duplicate_question()` RPC function for duplicate detection
3. **`supabase/migrations/20261122000003_rls_policies.sql`**
   - Implements multi-tenant Row Level Security (RLS) on all tables
   - Creates private Supabase Storage bucket `resumes` with folder-prefix user isolation
4. **`supabase/seed.sql`**
   - Seeds the 9 engineering roles:
     - Data Scientist
     - ML Engineer
     - Data Analyst
     - AI Engineer
     - NLP Engineer
     - Computer Vision Engineer
     - MLOps Engineer
     - Data Engineer
     - GenAI/LLM Engineer

---

## 4. Creating the First Administrator

Self-promotion from the client is blocked by Row Level Security and DB triggers. To grant admin access to an account:

1. Register an account through the app at `/register`.
2. Open your Supabase SQL Editor and run:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your-admin-email@example.com';
   ```
3. Refresh the page or log back in; the `/admin` navigation link and management features will be unlocked.

---

## 5. Environment Variables

Create `.env.local` based on `.env.example`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Supabase Edge Function URL for gte-small embeddings
SUPABASE_EMBEDDING_FUNCTION_URL=https://your-project.supabase.co/functions/v1/embed

# Groq API (Server-side only)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL_GENERATION=openai/gpt-oss-120b
GROQ_MODEL_CLASSIFY=llama-3.1-8b-instant

# App URL for redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Run type check and linter
npm run lint

# 4. Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## 7. Sample Question Bank Ingestion

A sample CSV question bank is included at:
`public/samples/sample_questions.csv`

To ingest questions:
1. Log in as an admin and navigate to `/admin/upload`.
2. Drag and drop `public/samples/sample_questions.csv` (or any custom CSV).
3. Map your columns to `question`, `answer`, `topic`, `difficulty`.
4. Run batch classification with Groq (processed in batches of 20 with client-driven progress).
5. Near-duplicate questions (>0.92 cosine similarity) are skipped automatically.
6. Navigate to `/admin/questions` to review, edit, and approve questions for the RAG bank.

---

## 8. Running Unit Tests

Unit tests validate Zod schemas, vector embeddings, similarity math, and ingestion payloads:

```bash
npm test
```

Test coverage includes:
- `tests/validations/csv.test.ts`
- `tests/validations/interview.test.ts`
- `tests/validations/resume.test.ts`
- `tests/lib/embeddings.test.ts`

---

## 9. Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Configure the environment variables in your Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `GROQ_MODEL_GENERATION`
   - `GROQ_MODEL_CLASSIFY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy. The repository includes `vercel.json` with `maxDuration: 60` for serverless API handlers.
