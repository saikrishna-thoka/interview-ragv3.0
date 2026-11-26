"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassTextarea } from "@/components/ui/glass-input";

interface TurnEvaluation {
  verdict: string;
  strengths: string[];
  gaps: string[];
  sample_answer: string;
  feedback: string;
}

interface SessionTurn {
  id: string;
  position: number;
  question: string;
  user_answer: string;
  score: number;
  evaluation: TurnEvaluation;
}

interface SessionSummary {
  overall_score: number;
  grade: string;
  performance_overview: string;
  top_strengths: string[];
  key_areas_for_improvement: string[];
  recommended_next_topics: string[];
}

interface InterviewSession {
  id: string;
  role_id: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  target_count: number;
  status: "in_progress" | "completed";
  summary: SessionSummary | null;
  created_at: string;
  roles?: { id: string; name: string };
}

interface CurrentQuestionState {
  position: number;
  totalCount: number;
  question: string;
  topic: string;
  difficulty: string;
  is_grounded: boolean;
  grounding_source?: string;
}

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [turns, setTurns] = useState<SessionTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Live turn states
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestionState | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [latestEvaluation, setLatestEvaluation] = useState<TurnEvaluation | null>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  // Finishing state
  const [finishing, setFinishing] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});

  // 1. Finish Session & Generate Coaching Report
  const handleFinishSession = useCallback(async () => {
    try {
      setFinishing(true);
      setError(null);

      const res = await fetch("/api/interview/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate final report");
      }

      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              summary: data.summary,
            }
          : null
      );
      setCurrentQuestion(null);
      setLatestEvaluation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize session");
    } finally {
      setFinishing(false);
    }
  }, [sessionId]);

  // 2. Fetch Next Question from API
  const fetchNextQuestion = useCallback(async () => {
    try {
      setFetchingQuestion(true);
      setError(null);
      setLatestEvaluation(null);
      setLatestScore(null);
      setUserAnswer("");

      const res = await fetch("/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch question");
      }

      if (data.isFinished) {
        // All questions finished, trigger finish
        await handleFinishSession();
        return;
      }

      setCurrentQuestion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate next question");
    } finally {
      setFetchingQuestion(false);
    }
  }, [sessionId, handleFinishSession]);

  // 3. Fetch initial session data
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/interview/${sessionId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load session");
      }
      const data = await res.json();
      setSession(data.session);
      setTurns(data.turns || []);

      // If session is already completed, nothing more to fetch
      if (data.session.status === "completed") {
        setLoading(false);
        return;
      }

      // Check if all questions are answered
      if (data.turns && data.turns.length >= data.session.target_count) {
        setLoading(false);
        return;
      }

      // Automatically fetch next question if not completed
      await fetchNextQuestion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading session");
    } finally {
      setLoading(false);
    }
  }, [sessionId, fetchNextQuestion]);

  // 4. Submit Answer
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userAnswer.trim()) return;

    try {
      setEvaluating(true);
      setError(null);

      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          question: currentQuestion.question,
          userAnswer: userAnswer.trim(),
          position: currentQuestion.position,
          topic: currentQuestion.topic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to evaluate answer");
      }

      const evalData: TurnEvaluation = data.evaluation || {
        verdict: data.verdict || "Evaluated",
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        gaps: Array.isArray(data.gaps) ? data.gaps : [],
        sample_answer: data.sample_answer || "",
        feedback: data.feedback || "",
      };

      setLatestEvaluation(evalData);
      setLatestScore(typeof data.score === "number" ? data.score : 7);

      // Add to turns list locally
      const newTurn: SessionTurn = {
        id: data.turnId || `temp-${Date.now()}`,
        position: currentQuestion.position,
        question: currentQuestion.question,
        user_answer: userAnswer.trim(),
        score: typeof data.score === "number" ? data.score : 7,
        evaluation: evalData,
      };
      setTurns((prev) => [...prev, newTurn]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate answer");
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const toggleTurnExpand = (pos: number) => {
    setExpandedTurns((prev) => ({ ...prev, [pos]: !prev[pos] }));
  };

  if (loading) {
    return (
      <div className="container mx-auto flex h-[60vh] max-w-4xl items-center justify-center px-4">
        <GlassCard className="flex flex-col items-center gap-3 text-muted-foreground p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs sm:text-sm font-semibold">Entering mock interview room...</p>
        </GlassCard>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <GlassCard variant="elevated" glow="amber" className="p-8 sm:p-10 space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold text-foreground font-display">Interview Session Unavailable</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{error}</p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const roleName = session?.roles?.name || "AI/ML Engineer";
  const isCompleted = session?.status === "completed";
  const progressPercent = session
    ? Math.min(100, Math.round((turns.length / session.target_count) * 100))
    : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Top Session Bar */}
      <GlassCard className="flex items-center justify-between p-4 sm:px-6 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-foreground font-display">
                {roleName} Mock Interview
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  session?.difficulty === "Advanced"
                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                    : session?.difficulty === "Intermediate"
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {session?.difficulty}
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground">Session ID: {sessionId.slice(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </span>
          ) : (
            <div className="text-right">
              <div className="text-xs font-semibold text-foreground font-display">
                Question {Math.min(turns.length + (currentQuestion ? 1 : 0), session?.target_count || 5)} of{" "}
                {session?.target_count}
              </div>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive backdrop-blur-md">
          {error}
        </div>
      )}

      {/* COMPLETED VIEW: SUMMARY REPORT */}
      {isCompleted && session?.summary && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Score & Grade Banner */}
          <GlassCard variant="elevated" glow="primary" className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 text-xs font-semibold text-primary">
                  <Trophy className="h-3.5 w-3.5" />
                  Interview Completed
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-display">
                  Overall Performance Report
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                  {session.summary.performance_overview}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center rounded-2xl glass-panel p-4 min-w-[120px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Avg Score
                  </span>
                  <div className="text-3xl font-black text-primary font-display mt-1">
                    {session.summary.overall_score > 10
                      ? (session.summary.overall_score / 10).toFixed(1)
                      : session.summary.overall_score}
                    <span className="text-xs font-normal text-muted-foreground">/10</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl glass-panel p-4 min-w-[100px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Grade
                  </span>
                  <div className="text-3xl font-black text-foreground font-display mt-1">
                    {session.summary.grade}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Strengths */}
            <GlassCard variant="elevated" glow="emerald">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-foreground font-display">Demonstrated Strengths</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {session.summary.top_strengths?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Improvement Areas */}
            <GlassCard variant="elevated" glow="amber">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Target className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-foreground font-display">Key Growth Areas</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {session.summary.key_areas_for_improvement?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>

          {/* Recommended Next Topics */}
          {session.summary.recommended_next_topics?.length > 0 && (
            <GlassCard variant="elevated">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground font-display">
                  Recommended Next Focus Topics
                </h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {session.summary.recommended_next_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-xl glass-pill px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Turn-by-Turn Transcript Review */}
          <GlassCard variant="elevated">
            <h3 className="text-sm sm:text-base font-bold text-foreground font-display mb-4">
              Turn-by-Turn Question Breakdown ({turns.length} Questions)
            </h3>
            <div className="space-y-4">
              {turns.map((turn) => {
                const isExpanded = expandedTurns[turn.position] ?? false;
                return (
                  <div
                    key={turn.id}
                    className="rounded-xl glass-panel p-4 transition-all"
                  >
                    <div
                      onClick={() => toggleTurnExpand(turn.position)}
                      className="flex cursor-pointer items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Question {turn.position}
                          </span>
                          <span className="rounded-lg bg-primary/15 border border-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary font-mono">
                            Score: {turn.score}/10
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground font-display">
                          {turn.question}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3 text-xs">
                        <div>
                          <div className="font-semibold text-foreground mb-1">Your Response:</div>
                          <p className="text-muted-foreground whitespace-pre-wrap rounded-xl glass-panel p-3.5">
                            {turn.user_answer}
                          </p>
                        </div>

                        {turn.evaluation && (
                          <div className="space-y-2">
                            <div className="font-semibold text-foreground">Feedback Verdict:</div>
                            <p className="text-muted-foreground leading-relaxed">
                              {turn.evaluation.feedback}
                            </p>

                            {turn.evaluation.sample_answer && (
                              <div className="mt-2 rounded-xl bg-white/5 p-3.5 border border-white/10">
                                <div className="font-semibold text-primary mb-1">
                                  Benchmark Model Answer:
                                </div>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                  {turn.evaluation.sample_answer}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all border border-primary/40 active:scale-[0.98]"
            >
              Start Another Interview
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ACTIVE INTERVIEW IN-PROGRESS VIEW */}
      {!isCompleted && (
        <div className="space-y-6">
          {/* Question Loading State */}
          {fetchingQuestion && (
            <GlassCard className="flex h-56 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <BrainCircuit className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs sm:text-sm font-semibold">
                  Retrieving role-grounded question & formulating turn...
                </p>
              </div>
            </GlassCard>
          )}

          {/* Active Question Box */}
          {!fetchingQuestion && currentQuestion && (
            <GlassCard variant="elevated" glow="primary" className="p-6 sm:p-8 space-y-6">
              {/* Question metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg glass-panel px-2.5 py-1 text-xs font-semibold text-foreground">
                    Question {currentQuestion.position} of {currentQuestion.totalCount}
                  </span>
                  <span className="rounded-lg bg-primary/15 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary">
                    {currentQuestion.topic}
                  </span>
                </div>

                {/* Grounding badge */}
                {currentQuestion.is_grounded ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <Database className="h-3 w-3" />
                    Grounded in Question Bank
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                    <Sparkles className="h-3 w-3" />
                    Adaptive Technical Inquiry
                  </span>
                )}
              </div>

              {/* The Question */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display leading-relaxed">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Candidate Answer Form (if not yet evaluated) */}
              {!latestEvaluation && (
                <form onSubmit={handleSubmitAnswer} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Your Technical Response
                    </label>
                    <GlassTextarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Explain your architectural rationale, mathematical intuition, trade-offs, and edge cases..."
                      rows={7}
                      disabled={evaluating}
                      required
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>Be specific. Groq evaluates depth, accuracy, and trade-offs.</span>
                      <span>{userAnswer.length} characters</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <GlassButton
                      type="submit"
                      disabled={evaluating || !userAnswer.trim()}
                      loading={evaluating}
                      variant="primary"
                      size="md"
                    >
                      Submit Answer
                      <ChevronRight className="h-4 w-4" />
                    </GlassButton>
                  </div>
                </form>
              )}

              {/* Turn Evaluation Feedback Card (Shown after candidate submits) */}
              {latestEvaluation && (
                <div className="rounded-2xl glass-panel p-6 space-y-5 animate-in fade-in duration-300 border border-primary/30">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <h3 className="text-xs sm:text-sm font-bold text-foreground font-display">
                        Turn Evaluation
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {latestEvaluation.verdict}
                      </span>
                      <span className="rounded-xl bg-primary px-3 py-1 text-xs font-black text-primary-foreground font-mono">
                        {latestScore}/10
                      </span>
                    </div>
                  </div>

                  {/* Feedback narrative */}
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {latestEvaluation.feedback}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    {latestEvaluation.strengths?.length > 0 && (
                      <div className="rounded-xl glass-panel p-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2 font-display">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Key Strengths
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {latestEvaluation.strengths.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Gaps */}
                    {latestEvaluation.gaps?.length > 0 && (
                      <div className="rounded-xl glass-panel p-3.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2 font-display">
                          <Target className="h-3.5 w-3.5" />
                          Areas to Clarify
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {latestEvaluation.gaps.map((g, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Model Answer Preview */}
                  {latestEvaluation.sample_answer && (
                    <details className="rounded-xl glass-panel p-3.5 text-xs">
                      <summary className="cursor-pointer font-semibold text-primary hover:underline">
                        View Exemplary Model Answer
                      </summary>
                      <p className="mt-2.5 text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {latestEvaluation.sample_answer}
                      </p>
                    </details>
                  )}

                  {/* Next Step Action Button */}
                  <div className="flex justify-end pt-2">
                    {currentQuestion.position < currentQuestion.totalCount ? (
                      <GlassButton
                        type="button"
                        onClick={fetchNextQuestion}
                        disabled={fetchingQuestion}
                        variant="primary"
                        size="md"
                      >
                        Next Question ({currentQuestion.position + 1}/{currentQuestion.totalCount})
                        <ChevronRight className="h-4 w-4" />
                      </GlassButton>
                    ) : (
                      <GlassButton
                        type="button"
                        onClick={handleFinishSession}
                        disabled={finishing}
                        loading={finishing}
                        variant="primary"
                        size="md"
                        className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40"
                      >
                        <Award className="h-4 w-4" />
                        Complete Interview & View Report
                      </GlassButton>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* Ready to Finish Banner if all questions answered but not finalized */}
          {!currentQuestion && turns.length >= (session?.target_count || 5) && (
            <GlassCard glow="primary" className="p-8 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-xl font-bold text-foreground font-display">
                All {turns.length} Questions Completed!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                You have answered all target questions in this mock interview. Click below to generate your
                comprehensive performance breakdown and rubric scorecard.
              </p>
              <GlassButton
                type="button"
                onClick={handleFinishSession}
                disabled={finishing}
                loading={finishing}
                variant="primary"
                size="lg"
              >
                <Award className="h-4 w-4" />
                Generate Coaching Summary Report
              </GlassButton>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}
