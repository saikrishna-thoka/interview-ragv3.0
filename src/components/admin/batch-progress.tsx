"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnMapping } from "@/lib/validations/csv";
import { CheckCircle2, Copy, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

interface BatchProgressProps {
  fileName: string;
  allRows: Record<string, string>[];
  mapping: ColumnMapping;
  onComplete: (summary: { inserted: number; duplicates: number; failed: number }) => void;
}

const BATCH_SIZE = 20;

export function BatchProgress({
  fileName,
  allRows,
  mapping,
  onComplete,
}: BatchProgressProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [processedRows, setProcessedRows] = useState(0);
  const [insertedRows, setInsertedRows] = useState(0);
  const [duplicateRows, setDuplicateRows] = useState(0);
  const [failedRows, setFailedRows] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isAborted, setIsAborted] = useState(false);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const abortRef = useRef(false);
  const totalRows = allRows.length;
  const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

  useEffect(() => {
    let active = true;

    async function runBatches() {
      let currentJobId = jobId;
      let totalInserted = 0;
      let totalDuplicates = 0;
      let totalFailed = 0;

      for (let b = 0; b < totalBatches; b++) {
        if (abortRef.current) {
          toast.warning("Batch processing stopped by user.");
          break;
        }

        setCurrentBatch(b + 1);
        const batchSlice = allRows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

        const mappedPayloadRows = batchSlice.map((row) => ({
          question: row[mapping.questionColumn]?.trim() || "",
          answer: mapping.answerColumn ? row[mapping.answerColumn]?.trim() : undefined,
          topic: mapping.topicColumn ? row[mapping.topicColumn]?.trim() : undefined,
          difficulty: mapping.difficultyColumn
            ? row[mapping.difficultyColumn]?.trim()
            : undefined,
        })).filter((r) => r.question.length > 0);

        try {
          const res = await fetch("/api/admin/ingest/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: currentJobId || undefined,
              fileName,
              totalRows,
              batchIndex: b,
              rows: mappedPayloadRows,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Batch failed");
          }

          if (data.jobId && !currentJobId) {
            currentJobId = data.jobId;
            setJobId(data.jobId);
          }

          totalInserted += data.inserted || 0;
          totalDuplicates += data.duplicates || 0;
          totalFailed += data.failed || 0;

          if (data.errors && data.errors.length > 0) {
            setErrorLogs((prev) => [...prev, ...data.errors]);
          }

          setInsertedRows(totalInserted);
          setDuplicateRows(totalDuplicates);
          setFailedRows(totalFailed);
          setProcessedRows(Math.min((b + 1) * BATCH_SIZE, totalRows));
        } catch (err) {
          console.error("Batch error", err);
          totalFailed += batchSlice.length;
          setFailedRows(totalFailed);
          setErrorLogs((prev) => [
            ...prev,
            `Batch ${b + 1} fatal error: ${err instanceof Error ? err.message : "Unknown"}`,
          ]);
        }
      }

      if (active) {
        setIsProcessing(false);
        onComplete({
          inserted: totalInserted,
          duplicates: totalDuplicates,
          failed: totalFailed,
        });
      }
    }

    runBatches();

    return () => {
      active = false;
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run on mount

  const progressPercent = Math.min(
    100,
    Math.round((processedRows / (totalRows || 1)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <GlassCard variant="elevated" glow={isProcessing ? "primary" : "emerald"}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <div className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
                {isProcessing
                  ? `Ingesting Batch ${currentBatch} of ${totalBatches}...`
                  : "Ingestion Pipeline Completed"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              File: <span className="font-semibold text-foreground font-mono">{fileName}</span> ({totalRows} total rows)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isProcessing ? (
              <GlassButton
                variant="danger"
                size="sm"
                onClick={() => {
                  abortRef.current = true;
                  setIsAborted(true);
                }}
              >
                Cancel Ingestion
              </GlassButton>
            ) : (
              <Link
                href="/admin/questions"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all"
              >
                Review Ingested Questions
              </Link>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs font-semibold font-mono">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="text-primary">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Counter Stats Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/10">
          <div className="rounded-xl glass-panel p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Processed
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-1">
              {processedRows}
            </div>
          </div>

          <div className="rounded-xl glass-panel p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Inserted (RAG)
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              {insertedRows}
            </div>
          </div>

          <div className="rounded-xl glass-panel p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Deduplicated (&gt;0.92)
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1">
              {duplicateRows}
            </div>
          </div>

          <div className="rounded-xl glass-panel p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Failed Rows
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-destructive mt-1">
              {failedRows}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Error Logs Console */}
      {errorLogs.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3 text-destructive">
            <XCircle className="h-4 w-4" />
            <h4 className="text-xs font-bold font-display uppercase tracking-wider">
              Batch Error Details ({errorLogs.length})
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px] text-destructive/80">
            {errorLogs.map((err, i) => (
              <div key={i} className="rounded-lg bg-destructive/10 p-2 border border-destructive/20">
                {err}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
