import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Bot, CheckCircle2, Clock, FileText, PlusCircle, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface SessionWithRole {
  id: string;
  difficulty: string;
  target_count: number;
  status: string;
  created_at: string;
  roles: { name: string } | null;
}

interface ResumeWithRole {
  id: string;
  ats_score: number | null;
  target_role_id: string | null;
  created_at: string;
  roles: { name: string } | null;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Load user's recent interview sessions
  const { data: rawSessions } = await supabase
    .from("interview_sessions")
    .select(`
      id,
      difficulty,
      target_count,
      status,
      created_at,
      roles ( name )
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  const sessions = rawSessions as unknown as SessionWithRole[] | null;

  // Load user's latest resume ATS score
  const { data: rawResume } = await supabase
    .from("resumes")
    .select("id, ats_score, target_role_id, created_at, roles(name)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestResume = rawResume as unknown as ResumeWithRole | null;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-8 border-b border-white/10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
            Candidate Dashboard
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.email}</span>. Track your mock interview progress and resume readiness.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/resume"
            className="inline-flex items-center gap-2 rounded-xl glass-panel px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:border-white/30 hover:bg-white/10 transition-all active:scale-[0.98]"
          >
            <FileText className="h-4 w-4 text-primary" />
            Resume & ATS
          </Link>
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all border border-primary/40"
          >
            <PlusCircle className="h-4 w-4" />
            New Mock Interview
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Quick Stats Card 1 */}
        <GlassCard variant="elevated" glow="primary">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completed Sessions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-foreground font-display">
              {sessions?.filter((s) => s.status === "completed").length || 0}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">sessions completed</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Role-grounded mock technical interviews
          </p>
        </GlassCard>

        {/* Quick Stats Card 2 */}
        <GlassCard variant="elevated" glow="emerald">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Latest Resume ATS</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-foreground font-display">
              {latestResume?.ats_score !== null && latestResume?.ats_score !== undefined
                ? `${latestResume.ats_score}%`
                : "Not Scored"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {latestResume?.roles?.name
              ? `Target: ${latestResume.roles.name}`
              : "Upload a resume to unlock ATS analysis"}
          </p>
        </GlassCard>

        {/* Quick Stats Card 3 */}
        <GlassCard variant="elevated" glow="amber">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Track</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground font-display">AI / ML Engineering</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Questions verified and indexed via pgvector RAG
          </p>
        </GlassCard>
      </div>

      {/* Past Sessions List */}
      <div className="mt-12 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
          Recent Interview Sessions
        </h2>

        {sessions && sessions.length > 0 ? (
          <GlassCard noPadding className="divide-y divide-white/10 overflow-hidden">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 sm:px-6 hover:bg-white/5 transition-colors"
              >
                <div>
                  <h3 className="font-semibold text-foreground text-sm font-display">
                    {session.roles?.name || "General AI/ML Interview"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="capitalize">Level: {session.difficulty}</span>
                    <span>•</span>
                    <span>{session.target_count} questions</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      session.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {session.status}
                  </span>
                  <Link
                    href={`/interview/${session.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    View Turn Summary
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </GlassCard>
        ) : (
          <GlassCard className="p-12 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-3">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground font-display">No interview sessions yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Ready to test your technical depth? Select an engineering role, choose your difficulty, and start your first session.
            </p>
            <div className="mt-6">
              <Link
                href="/interview/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
              >
                Start First Mock Interview
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
