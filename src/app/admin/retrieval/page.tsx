"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Database,
  Filter,
  Loader2,
  Play,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { VALID_DIFFICULTIES } from "@/lib/prompts/classify";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassTextarea } from "@/components/ui/glass-input";

interface RoleOption {
  id: string;
  name: string;
  counts: { total: number; approved: number; pending: number };
}

interface RetrievalResult {
  id: string;
  question: string;
  model_answer: string | null;
  role_id: string | null;
  role_name: string;
  topic: string | null;
  difficulty: string | null;
  similarity: number;
  cosine_percentage: number;
}

interface TestMetrics {
  totalMatches: number;
  embedDurationMs: number;
  vectorDurationMs: number;
  totalDurationMs: number;
  highestSimilarity: number;
  groundingQuality: string;
}

export default function RetrievalTestPage() {
  const [query, setQuery] = useState(
    "How does gradient descent optimize weights and how does momentum prevent local minima oscillations?"
  );
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [matchCount, setMatchCount] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(0.0);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [metrics, setMetrics] = useState<TestMetrics | null>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch("/api/admin/roles");
        const data = await res.json();
        if (data?.roles) {
          setRoles(data.roles);
        }
      } catch (err) {
        console.error("Failed to load roles", err);
      }
    }
    fetchRoles();
  }, []);

  async function handleRunTest(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsLoading(true);
    setHasRun(true);

    try {
      const res = await fetch("/api/admin/retrieval/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          roleId: selectedRole === "all" ? null : selectedRole,
          difficulty: selectedDifficulty === "all" ? null : selectedDifficulty,
          matchCount: Number(matchCount),
          similarityThreshold: Number(threshold),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Retrieval test failed");
      }

      setResults(data.results || []);
      setMetrics(data.metrics || null);
      toast.success(`Retrieved ${data.results?.length || 0} matching questions via pgvector`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error executing vector search");
    } finally {
      setIsLoading(false);
    }
  }

  const sampleQueries = [
    "Difference between L1 and L2 regularization",
    "Transformer multi-head self-attention mechanism",
    "How does XGBoost compute split points and handle missing values?",
    "Precision, Recall, and ROC-AUC in imbalanced fraud detection",
    "How does RAG avoid hallucinations using dense vector retrieval?",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <Cpu className="h-4 w-4" />
            <span>RAG Vector Search Laboratory</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground mt-1 font-display">
            Test Vector Grounding (`match_questions`)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulate runtime RAG context retrieval using Supabase pgvector cosine distance against approved questions.
          </p>
        </div>
      </div>

      {/* Query & Controls Form */}
      <form onSubmit={handleRunTest}>
        <GlassCard variant="elevated" className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Interview Question or Candidate Prompt to Match
            </label>
            <GlassTextarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              placeholder="Type a natural language technical query or concept..."
              required
            />

            {/* Quick sample chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Quick prompts:</span>
              {sampleQueries.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuery(sample)}
                  className="rounded-xl glass-pill px-3 py-1 text-[11px] text-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Filter controls row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Filter by Target Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl glass-input px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-background text-foreground">
                    {r.name} ({r.counts?.approved || 0} approved)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Filter by Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full rounded-xl glass-input px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">All Difficulties</option>
                {VALID_DIFFICULTIES.map((d) => (
                  <option key={d} value={d} className="bg-background text-foreground">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Top-K Limit
                </label>
                <span className="text-xs font-mono font-bold text-primary">{matchCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={matchCount}
                onChange={(e) => setMatchCount(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Min. Similarity
                </label>
                <span className="text-xs font-mono font-bold text-primary">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <GlassButton
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              size="md"
            >
              <Play className="h-4 w-4 fill-current" />
              Run Vector Match Simulation
            </GlassButton>
          </div>
        </GlassCard>
      </form>

      {/* Latency & Quality Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard variant="elevated" glow="primary" className="p-4 sm:p-5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Highest Similarity
            </span>
            <div className="mt-2 text-2xl font-extrabold text-foreground font-mono">
              {metrics.highestSimilarity.toFixed(4)}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Grounding: <strong className="text-primary">{metrics.groundingQuality}</strong>
            </span>
          </GlassCard>

          <GlassCard variant="elevated" glow="emerald" className="p-4 sm:p-5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Matched Questions
            </span>
            <div className="mt-2 text-2xl font-extrabold text-foreground font-mono">
              {metrics.totalMatches}
            </div>
            <span className="text-[11px] text-muted-foreground">From approved store</span>
          </GlassCard>

          <GlassCard variant="elevated" glow="amber" className="p-4 sm:p-5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Embed Latency
            </span>
            <div className="mt-2 text-2xl font-extrabold text-foreground font-mono">
              {metrics.embedDurationMs} ms
            </div>
            <span className="text-[11px] text-muted-foreground">384d vector generation</span>
          </GlassCard>

          <GlassCard variant="elevated" className="p-4 sm:p-5">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              pgvector Latency
            </span>
            <div className="mt-2 text-2xl font-extrabold text-foreground font-mono">
              {metrics.vectorDurationMs} ms
            </div>
            <span className="text-[11px] text-muted-foreground">HNSW cosine distance</span>
          </GlassCard>
        </div>
      )}

      {/* Results List */}
      {hasRun && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground font-display">
              Retrieved Grounding Context ({results.length} questions)
            </h3>
            {results.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                Ordered by descending cosine similarity
              </span>
            )}
          </div>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((item, idx) => (
                <GlassCard
                  key={item.id}
                  variant="elevated"
                  className="space-y-3 p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-muted-foreground font-mono">
                        #{idx + 1}
                      </span>
                      <span className="rounded-lg bg-primary/15 border border-primary/20 text-primary px-2.5 py-0.5 text-xs font-semibold">
                        {item.role_name}
                      </span>
                      {item.topic && (
                        <span className="rounded-lg glass-panel px-2 py-0.5 text-xs text-muted-foreground">
                          {item.topic}
                        </span>
                      )}
                      {item.difficulty && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.difficulty === "Advanced"
                              ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                              : item.difficulty === "Intermediate"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      )}
                    </div>

                    {/* Similarity Badge */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="h-2 w-20 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.similarity >= 0.8
                              ? "bg-emerald-400"
                              : item.similarity >= 0.65
                              ? "bg-primary"
                              : "bg-amber-400"
                          }`}
                          style={{ width: `${Math.max(item.cosine_percentage, 5)}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${
                          item.similarity >= 0.8
                            ? "text-emerald-400"
                            : item.similarity >= 0.65
                            ? "text-primary"
                            : "text-amber-400"
                        }`}
                      >
                        {(item.similarity * 100).toFixed(1)}% match
                      </span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground font-display">
                      {item.question}
                    </h4>
                    {item.model_answer && (
                      <div className="mt-2.5 rounded-xl glass-panel p-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground block mb-0.5">
                          Model Answer Reference:
                        </span>
                        {item.model_answer}
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard className="p-12 text-center">
              <Compass className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <h4 className="text-sm font-bold text-foreground font-display">No approved questions matched</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Ensure you have uploaded questions via CSV and approved them in the Review Screen.
                Questions with status &apos;pending&apos; are excluded from RAG retrieval.
              </p>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
