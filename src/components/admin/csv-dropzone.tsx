"use client";

import { useState, useRef } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";

interface CSVDropzoneProps {
  onParsed: (data: {
    fileName: string;
    headers: string[];
    preview: Record<string, string>[];
    totalRows: number;
    defaultMapping: {
      questionColumn: string;
      answerColumn?: string;
      topicColumn?: string;
      difficultyColumn?: string;
    };
    allRows: Record<string, string>[];
  }) => void;
}

export function CSVDropzone({ onParsed }: CSVDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please select a valid CSV file (.csv)");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/ingest/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse CSV file");
      }

      toast.success(`Parsed ${data.totalRows} rows from ${data.fileName}`);
      onParsed(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error parsing CSV");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${
        isDragging
          ? "border-primary bg-primary/15 scale-[1.01]"
          : "border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-4 border border-primary/20 shadow-inner">
        {isLoading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <UploadCloud className="h-7 w-7" />
        )}
      </div>

      <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
        {isLoading ? "Parsing CSV Question Dataset..." : "Upload CSV Question Bank"}
      </h3>
      <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
        Drag and drop your engineering question bank CSV here, or click to browse. Max 5 MB.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground font-mono">
        <span className="rounded-lg glass-panel px-2.5 py-1">Required: question</span>
        <span className="rounded-lg glass-panel px-2.5 py-1">Optional: answer, topic, difficulty</span>
      </div>
    </div>
  );
}
