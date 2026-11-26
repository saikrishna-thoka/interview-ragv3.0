"use client";

import { useState } from "react";
import { CSVDropzone } from "@/components/admin/csv-dropzone";
import { ColumnMapper } from "@/components/admin/column-mapper";
import { BatchProgress } from "@/components/admin/batch-progress";
import { ColumnMapping } from "@/lib/validations/csv";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

type IngestionStep = "upload" | "mapping" | "processing" | "finished";

interface ParsedCSVState {
  fileName: string;
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  allRows: Record<string, string>[];
}

export default function AdminUploadPage() {
  const [step, setStep] = useState<IngestionStep>("upload");
  const [csvState, setCsvState] = useState<ParsedCSVState | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    questionColumn: "",
  });

  function handleParsed(data: {
    fileName: string;
    headers: string[];
    preview: Record<string, string>[];
    totalRows: number;
    defaultMapping: ColumnMapping;
    allRows: Record<string, string>[];
  }) {
    setCsvState({
      fileName: data.fileName,
      headers: data.headers,
      preview: data.preview,
      totalRows: data.totalRows,
      allRows: data.allRows,
    });
    setMapping(data.defaultMapping);
    setStep("mapping");
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 glass-pill px-2.5 py-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Overview
            </Link>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-2 font-display">
            CSV Question Bank Ingestion
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classify questions with Groq JSON mode, generate 384d embeddings, and filter near-duplicates.
          </p>
        </div>

        {/* Steps Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`rounded-xl px-3 py-1.5 transition-all ${
              step === "upload"
                ? "bg-primary text-primary-foreground shadow"
                : "glass-pill text-muted-foreground"
            }`}
          >
            1. Upload
          </span>
          <span className="text-muted-foreground font-mono">→</span>
          <span
            className={`rounded-xl px-3 py-1.5 transition-all ${
              step === "mapping"
                ? "bg-primary text-primary-foreground shadow"
                : "glass-pill text-muted-foreground"
            }`}
          >
            2. Map & Preview
          </span>
          <span className="text-muted-foreground font-mono">→</span>
          <span
            className={`rounded-xl px-3 py-1.5 transition-all ${
              step === "processing" || step === "finished"
                ? "bg-primary text-primary-foreground shadow"
                : "glass-pill text-muted-foreground"
            }`}
          >
            3. Ingest Batches
          </span>
        </div>
      </div>

      {/* Step 1: Upload Dropzone */}
      {step === "upload" && (
        <div className="max-w-2xl mx-auto py-6">
          <CSVDropzone onParsed={handleParsed} />
        </div>
      )}

      {/* Step 2: Column Mapping & Preview */}
      {step === "mapping" && csvState && (
        <ColumnMapper
          headers={csvState.headers}
          mapping={mapping}
          preview={csvState.preview}
          totalRows={csvState.totalRows}
          onMappingChange={setMapping}
          onProceed={() => setStep("processing")}
          onBack={() => setStep("upload")}
        />
      )}

      {/* Step 3: Batch Execution */}
      {(step === "processing" || step === "finished") && csvState && (
        <BatchProgress
          fileName={csvState.fileName}
          allRows={csvState.allRows}
          mapping={mapping}
          onComplete={() => setStep("finished")}
        />
      )}
    </div>
  );
}
