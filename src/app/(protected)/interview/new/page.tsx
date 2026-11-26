"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  FileText,
  Gauge,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

interface RoleOption {
  id: string;
  name: string;
}

interface UserResume {
  id: string;
  file_path: string;
  ats_score: number | null;
  created_at: string;
  roles?: { name: string } | null;
}

export default function NewInterviewPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [latestResume, setLatestResume] = useState<UserResume | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form selections
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [targetCount, setTargetCount] = useState<5 | 10>(5);
  const [useResume, setUseResume] = useState<boolean>(true);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        // Load roles
        const rolesRes = await fetch("/api/admin/roles");
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          if (rolesData.roles && rolesData.roles.length > 0) {
            setRoles(rolesData.roles);
            setSelectedRoleId(rolesData.roles[0].id);
          }
        }

        // Load latest resume
        const resumeRes = await fetch("/api/resume/latest");
        if (resumeRes.ok) {
          const resumeData = await resumeRes.json();
          if (resumeData.resume) {
            setLatestResume(resumeData.resume);
          }
        }
      } catch (err) {
        console.error("Failed to load interview config options:", err);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadData();
  }, []);

  const handleStartInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) {
      setErrorMessage("Please select a target engineering role.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRoleId,
          difficulty,
          targetCount,
          resumeId: useResume && latestResume ? latestResume.id : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start interview session.");
      }

      router.push(`/interview/${data.sessionId}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
      setSubmitting(false);
    }
  };

  const selectedRoleName = roles.find((r) => r.id === selectedRoleId)?.name || "Select Role";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors glass-pill px-3 py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full glass-pill px-3.5 py-1 text-xs font-semibold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          RAG-Grounded Mock Technical Interview
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
          Configure Your Interview Session
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Select your target role and technical level. Our system retrieves verified questions from the
          question bank and synthesizes an adaptive AI interview grounded in engineering standards.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive backdrop-blur-md">
          {errorMessage}
        </div>
      )}

      {loadingInitial ? (
        <GlassCard className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs sm:text-sm font-medium">Loading interview tracks...</p>
          </div>
        </GlassCard>
      ) : (
        <form onSubmit={handleStartInterview} className="space-y-8">
          {/* Step 1: Target Role Selection */}
          <GlassCard variant="elevated">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                  1. Choose Target Role
                </h2>
              </div>
              <span className="text-xs font-semibold text-primary glass-pill px-3 py-1">
                {selectedRoleName}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`flex items-start justify-between rounded-xl p-3.5 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? "bg-primary/15 border border-primary text-foreground shadow-inner"
                        : "glass-pill text-muted-foreground hover:text-foreground hover:border-white/25"
                    }`}
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-semibold">{role.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Specialized Track</div>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Step 2: Difficulty Level */}
          <GlassCard variant="elevated">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Gauge className="h-4 w-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                2. Select Difficulty Level
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  {
                    level: "Beginner",
                    desc: "Core definitions, fundamental algorithms, basic system concepts and standard library usage.",
                  },
                  {
                    level: "Intermediate",
                    desc: "Architecture trade-offs, practical debugging, optimization, and real-world ML deployment scenarios.",
                  },
                  {
                    level: "Advanced",
                    desc: "Deep theoretical derivations, distributed scaling, edge-case failure modes, and low-latency system design.",
                  },
                ] as const
              ).map(({ level, desc }) => {
                const isSelected = difficulty === level;
                return (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex flex-col justify-between rounded-xl p-4 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? "bg-primary/15 border border-primary text-foreground shadow-inner"
                        : "glass-pill text-muted-foreground hover:text-foreground hover:border-white/25"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold font-display">{level}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Step 3: Question Count */}
          <GlassCard variant="elevated">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                3. Number of Questions
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTargetCount(5)}
                className={`flex items-start justify-between rounded-xl p-4 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  targetCount === 5
                    ? "bg-primary/15 border border-primary text-foreground shadow-inner"
                    : "glass-pill text-muted-foreground hover:text-foreground hover:border-white/25"
                }`}
              >
                <div>
                  <div className="text-xs sm:text-sm font-bold font-display">5 Questions (Express Drill)</div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    ~10 to 15 minutes. Great for quick warmup or specific topic validation.
                  </p>
                </div>
                {targetCount === 5 && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setTargetCount(10)}
                className={`flex items-start justify-between rounded-xl p-4 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  targetCount === 10
                    ? "bg-primary/15 border border-primary text-foreground shadow-inner"
                    : "glass-pill text-muted-foreground hover:text-foreground hover:border-white/25"
                }`}
              >
                <div>
                  <div className="text-xs sm:text-sm font-bold font-display">10 Questions (Comprehensive Round)</div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    ~25 to 35 minutes. Full mock technical round covering breadth and depth.
                  </p>
                </div>
                {targetCount === 10 && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
              </button>
            </div>
          </GlassCard>

          {/* Step 4: Resume Grounding */}
          <GlassCard variant="elevated">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                  4. Resume Personalization (Optional)
                </h2>
              </div>
              {latestResume && (
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Resume Available
                </span>
              )}
            </div>

            <div className="mt-4">
              {latestResume ? (
                <label className="flex items-start gap-3 rounded-xl glass-panel p-4 cursor-pointer hover:border-primary/50 transition-all">
                  <input
                    type="checkbox"
                    checked={useResume}
                    onChange={(e) => setUseResume(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 text-primary focus:ring-primary bg-transparent"
                  />
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-foreground">
                      Personalize mock interview using my uploaded resume
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      File: {latestResume.file_path.split("/").pop()} • ATS Score:{" "}
                      {latestResume.ats_score !== null ? `${latestResume.ats_score}%` : "Not scored"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Groq will tailor technical questions around your demonstrated skills, past project
                      tech stacks, and areas of engineering responsibility.
                    </p>
                  </div>
                </label>
              ) : (
                <div className="rounded-xl border border-dashed border-white/20 p-4 text-xs text-muted-foreground flex items-center justify-between bg-white/5">
                  <span>No resume uploaded yet. Questions will be generated from standard role benchmarks.</span>
                  <Link href="/resume" className="font-semibold text-primary hover:underline">
                    Upload Resume
                  </Link>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Summary & Start Action */}
          <GlassCard glow="primary" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground font-display">Ready to begin?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Session: <span className="font-semibold text-foreground">{selectedRoleName}</span> •{" "}
                <span className="font-semibold text-foreground">{difficulty}</span> •{" "}
                <span className="font-semibold text-foreground">{targetCount} Questions</span>
              </p>
            </div>

            <GlassButton
              type="submit"
              disabled={submitting}
              loading={submitting}
              variant="primary"
              size="lg"
            >
              Start Mock Interview
              <ChevronRight className="h-4 w-4" />
            </GlassButton>
          </GlassCard>
        </form>
      )}
    </div>
  );
}
