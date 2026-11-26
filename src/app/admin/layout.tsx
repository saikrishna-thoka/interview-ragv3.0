import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Cpu, Database, FileUp, Shield } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?error=unauthorized");
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Admin Banner */}
      <GlassCard className="flex flex-col gap-4 p-5 sm:p-6 mb-8">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <div className="p-1 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-4 w-4" />
          </div>
          <span>Platform Administrator Console</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-display">
              Interview Question Bank & Ingestion
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Curate role-grounded question banks, run Groq batch classifications, and inspect pgvector cosine similarity.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/upload"
              className="inline-flex items-center gap-1.5 rounded-xl glass-panel px-3.5 py-2 text-xs font-semibold text-foreground hover:border-white/30 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <FileUp className="h-3.5 w-3.5 text-primary" />
              Upload CSV
            </Link>
            <Link
              href="/admin/questions"
              className="inline-flex items-center gap-1.5 rounded-xl glass-panel px-3.5 py-2 text-xs font-semibold text-foreground hover:border-white/30 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <Database className="h-3.5 w-3.5 text-primary" />
              Manage Questions
            </Link>
            <Link
              href="/admin/retrieval"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/15 border border-primary/30 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/25 transition-all active:scale-[0.98]"
            >
              <Cpu className="h-3.5 w-3.5" />
              Test RAG Retrieval
            </Link>
          </nav>
        </div>
      </GlassCard>

      <div>{children}</div>
    </div>
  );
}
