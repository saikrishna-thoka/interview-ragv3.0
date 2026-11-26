import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default function HomePage() {
  const roles = [
    "GenAI / LLM Engineer",
    "Machine Learning Engineer",
    "Data Scientist",
    "NLP Specialist",
    "Computer Vision Engineer",
    "MLOps & Deployment Lead",
    "Data Infrastructure Engineer",
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full pt-16 pb-20 md:pt-28 md:pb-32 flex flex-col items-center text-center px-4 max-w-5xl mx-auto relative">
        <div className="inline-flex items-center gap-2 rounded-full glass-pill px-4 py-1.5 text-xs font-semibold text-primary mb-8 animate-fade-in shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Vector-Grounded AI/ML Technical Interview Suite</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl font-display leading-[1.1]">
          Master your <span className="bg-gradient-to-r from-primary via-indigo-400 to-violet-400 bg-clip-text text-transparent">AI/ML Interviews</span> with grounded RAG drills.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Simulate rigorous engineering interviews grounded in verified pgvector question banks and tailored to your resume. Receive sub-second rubric evaluation powered by Groq LPU.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] border border-primary/40"
          >
            Start Free Mock Interview
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl glass-panel px-7 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-white/30 hover:bg-white/10 active:scale-[0.98]"
          >
            Sign in to Candidate Portal
          </Link>
        </div>

        {/* Roles Pill Cloud */}
        <div className="mt-16 w-full max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-3.5">
            Supported Engineering Specializations
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className="rounded-xl glass-pill px-3.5 py-1.5 text-xs font-medium text-foreground/90 hover:border-primary/50 transition-colors"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Glass Feature Showcase */}
      <section className="w-full py-20 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
              Built for rigorous technical readiness
            </h2>
            <p className="text-sm text-muted-foreground">
              Unlike generic chatbot prompts, every question is retrieved through high-dimensional cosine similarity from validated machine learning engineering banks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <GlassCard variant="elevated" glow="primary" className="flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5 border border-primary/20 shadow-inner">
                  <Database className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-display">
                  pgvector RAG Retrieval
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Questions are retrieved using 384-dimensional dense vector embeddings matched against target job roles, eliminating hallucinations and generic queries.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="rounded-lg bg-black/20 p-3 text-[11px] font-mono text-muted-foreground border border-white/5 space-y-1">
                  <div className="flex justify-between text-primary">
                    <span>Cosine Similarity</span>
                    <span className="font-bold">0.938</span>
                  </div>
                  <div className="truncate text-foreground/80">
                    &quot;Explain FlashAttention GPU memory access patterns...&quot;
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Feature Card 2 */}
            <GlassCard variant="elevated" glow="emerald" className="flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-5 border border-emerald-500/20 shadow-inner">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-display">
                  Resume ATS Match Engine
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Upload PDF or DOCX resumes to inspect your role alignment percentage, extract missing keywords, and automatically generate interview questions tailored to your past projects.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-semibold px-2">
                  <span className="text-muted-foreground">ATS Readiness Score</span>
                  <span className="text-emerald-400 font-mono font-bold">88% Match</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "88%" }} />
                </div>
              </div>
            </GlassCard>

            {/* Feature Card 3 */}
            <GlassCard variant="elevated" glow="amber" className="flex flex-col justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-5 border border-amber-500/20 shadow-inner">
                  <Gauge className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground font-display">
                  Groq 0–10 Rubric Feedback
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Each candidate answer is evaluated turn-by-turn against strict rubric criteria with identified technical gaps, key strengths, and an exemplary benchmark model answer.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs px-2">
                  <span className="text-muted-foreground">Turn Score</span>
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    9.0 / 10
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground italic truncate px-2">
                  &quot;Solid architectural understanding of KV-cache compression...&quot;
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}
