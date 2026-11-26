"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { VALID_ROLES, VALID_DIFFICULTIES } from "@/lib/prompts/classify";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput, GlassTextarea } from "@/components/ui/glass-input";
import { GlassModal } from "@/components/ui/glass-modal";

interface QuestionItem {
  id: string;
  question: string;
  model_answer: string | null;
  role_id: string | null;
  topic: string | null;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | null;
  status: "pending" | "approved" | "rejected";
  source_file: string | null;
  created_at: string;
  roles: { id: string; name: string } | null;
}

function AdminQuestionsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "pending";

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [roleFilter, setRoleFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Editing Modal State
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load roles list for filter and editor dropdowns
    async function loadRoles() {
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
    loadRoles();
  }, []);

  async function fetchQuestions(targetPage = 1) {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "15",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("roleId", roleFilter);
      if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load questions");

      setQuestions(data.questions || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error loading questions");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchQuestions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, roleFilter, difficultyFilter]);

  async function handleStatusChange(
    questionId: string,
    newStatus: "approved" | "rejected" | "pending"
  ) {
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      toast.success(`Question marked as ${newStatus}`);
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: newStatus } : q))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating question");
    }
  }

  async function handleDelete(questionId: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete question");
      }

      toast.success("Question deleted");
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting question");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingQuestion) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: editingQuestion.question,
          model_answer: editingQuestion.model_answer,
          topic: editingQuestion.topic,
          difficulty: editingQuestion.difficulty,
          role_id: editingQuestion.role_id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save question edits");
      }

      toast.success("Question updated successfully");
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
      );
      setEditingQuestion(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving edits");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <GlassCard variant="elevated" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions by keyword or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchQuestions(1)}
              className="w-full rounded-xl glass-input pl-10 pr-4 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => fetchQuestions(1)}
          >
            Apply Filters
          </GlassButton>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10 text-xs">
          {/* Status Tabs */}
          <div className="flex rounded-xl glass-panel p-1">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3 py-1 font-semibold capitalize transition-all duration-150 ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Role Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl glass-input px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id} className="bg-background text-foreground">
                {r.name}
              </option>
            ))}
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="rounded-xl glass-input px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Difficulties</option>
            {VALID_DIFFICULTIES.map((d) => (
              <option key={d} value={d} className="bg-background text-foreground">
                {d}
              </option>
            ))}
          </select>

          <span className="ml-auto text-[11px] text-muted-foreground font-mono">
            {total} questions indexed
          </span>
        </div>
      </GlassCard>

      {/* Questions Data Table */}
      <GlassCard noPadding className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-xs">Loading question records...</span>
          </div>
        ) : questions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="py-3 px-4 font-semibold uppercase text-[10px]">Question & Answer</th>
                  <th className="py-3 px-4 font-semibold uppercase text-[10px] w-48">Role & Topic</th>
                  <th className="py-3 px-4 font-semibold uppercase text-[10px] w-28">Difficulty</th>
                  <th className="py-3 px-4 font-semibold uppercase text-[10px] w-28">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase text-[10px] text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-white/5 transition-colors">
                    {/* Question + Answer Preview */}
                    <td className="p-4">
                      <p className="font-semibold text-foreground font-display text-xs sm:text-sm">{q.question}</p>
                      {q.model_answer && (
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                          <span className="font-medium text-foreground">Answer:</span> {q.model_answer}
                        </p>
                      )}
                      {q.source_file && (
                        <span className="mt-1.5 inline-block text-[10px] text-muted-foreground font-mono">
                          Source: {q.source_file}
                        </span>
                      )}
                    </td>

                    {/* Role + Topic */}
                    <td className="p-4 space-y-1">
                      <span className="inline-block rounded-lg bg-primary/15 border border-primary/20 text-primary px-2 py-0.5 text-[11px] font-semibold">
                        {q.roles?.name || "General AI/ML"}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{q.topic || "General"}</p>
                    </td>

                    {/* Difficulty */}
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          q.difficulty === "Advanced"
                            ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                            : q.difficulty === "Intermediate"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {q.difficulty || "Beginner"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          q.status === "approved"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : q.status === "rejected"
                            ? "bg-red-500/15 text-red-400 border border-red-500/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {q.status === "approved" && <Check className="h-3 w-3" />}
                        {q.status === "rejected" && <X className="h-3 w-3" />}
                        {q.status === "pending" && <Clock className="h-3 w-3" />}
                        <span className="capitalize">{q.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {q.status !== "approved" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "approved")}
                            title="Approve for RAG"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {q.status !== "rejected" && (
                          <button
                            onClick={() => handleStatusChange(q.id, "rejected")}
                            title="Reject"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => setEditingQuestion(q)}
                          title="Edit details"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg glass-panel text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(q.id)}
                          title="Delete question"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-xs">No questions found matching your filter criteria.</p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 text-xs text-muted-foreground font-mono">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <GlassButton
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => fetchQuestions(page - 1)}
              >
                Previous
              </GlassButton>
              <GlassButton
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => fetchQuestions(page + 1)}
              >
                Next
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Edit Modal Dialog */}
      <GlassModal
        isOpen={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        title="Edit Question Details"
        description="Modify the question text, reference answer, or taxonomy before indexing."
        maxWidth="lg"
      >
        {editingQuestion && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Question Text
              </label>
              <GlassTextarea
                value={editingQuestion.question}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, question: e.target.value })
                }
                required
                rows={3}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Model Sample Answer
              </label>
              <GlassTextarea
                value={editingQuestion.model_answer || ""}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, model_answer: e.target.value })
                }
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Topic
                </label>
                <GlassInput
                  type="text"
                  value={editingQuestion.topic || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, topic: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Difficulty
                </label>
                <select
                  value={editingQuestion.difficulty || "Beginner"}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      difficulty: e.target.value as "Beginner" | "Intermediate" | "Advanced",
                    })
                  }
                  className="w-full rounded-xl glass-input px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {VALID_DIFFICULTIES.map((d) => (
                    <option key={d} value={d} className="bg-background text-foreground">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingQuestion(null)}
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                variant="primary"
                size="sm"
                loading={isSaving}
              >
                Save Changes
              </GlassButton>
            </div>
          </form>
        )}
      </GlassModal>
    </div>
  );
}

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-xs">Loading question bank...</span>
        </div>
      }
    >
      <AdminQuestionsContent />
    </Suspense>
  );
}
