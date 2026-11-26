import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  FileUp,
  Layers,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Load summary metrics
  const { count: totalQuestions } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true });

  const { count: approvedQuestions } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  const { count: pendingQuestions } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Load roles with question statistics
  const { data: roles } = await supabase
    .from("roles")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: questions } = await supabase
    .from("questions")
    .select("role_id, status");

  const roleStats: Record<string, { name: string; approved: number; total: number }> = {};
  (roles || []).forEach((r) => {
    roleStats[r.id] = { name: r.name, approved: 0, total: 0 };
  });

  questions?.forEach((q) => {
    if (q.role_id && roleStats[q.role_id]) {
      roleStats[q.role_id].total++;
      if (q.status === "approved") {
        roleStats[q.role_id].approved++;
      }
    }
  });

  // Load recent ingestion jobs
  const { data: recentJobs } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard variant="elevated" glow="primary">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Questions</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 text-4xl font-extrabold text-foreground font-display">
            {totalQuestions || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Across all engineering tracks</p>
        </GlassCard>

        <GlassCard variant="elevated" glow="emerald">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approved for RAG</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 text-4xl font-extrabold text-emerald-400 font-display">
            {approvedQuestions || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Embedded with 384d vectors</p>
        </GlassCard>

        <GlassCard variant="elevated" glow="amber">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 text-4xl font-extrabold text-amber-400 font-display">
            {pendingQuestions || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting admin review</p>
        </GlassCard>
      </div>

      {/* Two Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard variant="elevated" glow="primary" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-wider">
              <FileUp className="h-4 w-4" />
              <span>Ingestion Pipeline</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mt-2 font-display">
              Upload New CSV Question Bank
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Map custom columns, preview rows, and classify with Groq JSON mode. Near-duplicates (&gt;0.92 cosine similarity) are skipped automatically.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/admin/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all border border-primary/40 active:scale-[0.98]"
            >
              Start CSV Ingestion
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </GlassCard>

        <GlassCard variant="elevated" className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary text-[11px] font-bold uppercase tracking-wider">
              <Cpu className="h-4 w-4" />
              <span>Vector Laboratory</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mt-2 font-display">
              Test Vector Grounding (`match_questions`)
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Simulate candidate queries against your pgvector store. Benchmark cosine similarity distributions, latency, and grounding quality.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/admin/retrieval"
              className="inline-flex items-center gap-2 rounded-xl glass-panel px-4 py-2.5 text-xs font-semibold text-foreground hover:border-white/30 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              Open Vector Test Bench
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Question Bank Role Breakdown */}
      <GlassCard variant="elevated">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground font-display">
              Question Bank Coverage by Role
            </h3>
          </div>
          <Link
            href="/admin/questions"
            className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            Review all questions
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 mt-4">
          {Object.entries(roleStats).map(([roleId, stats]) => (
            <Link
              key={roleId}
              href={`/admin/questions?roleId=${roleId}`}
              className="rounded-xl glass-panel p-3.5 hover:border-primary/50 transition-all"
            >
              <span className="text-xs font-semibold text-foreground block truncate font-display">
                {stats.name}
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[11px] text-muted-foreground">Approved:</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {stats.approved}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-[11px] text-muted-foreground">Total:</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {stats.total}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </GlassCard>

      {/* Recent Ingestion Batches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
            Recent Ingestion Batches
          </h2>
          <Link
            href="/admin/questions?status=pending"
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            View Pending Reviews
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentJobs && recentJobs.length > 0 ? (
          <GlassCard noPadding className="divide-y divide-white/10 overflow-hidden">
            {recentJobs.map((job) => (
              <div key={job.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">{job.file_name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                    {job.processed_rows} processed of {job.total_rows} total rows
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      job.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </GlassCard>
        ) : (
          <GlassCard className="p-8 text-center">
            <p className="text-xs text-muted-foreground">No CSV ingestion batches recorded yet.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
