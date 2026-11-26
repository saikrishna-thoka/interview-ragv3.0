"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  FileCheck,
  FileText,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  Target,
  UploadCloud,
} from "lucide-react";
import { AtsReport } from "@/lib/validations/resume";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

interface RoleOption {
  id: string;
  name: string;
}

interface ExistingResume {
  id: string;
  file_path: string;
  target_role_id: string | null;
  ats_score: number | null;
  ats_report: AtsReport | null;
  created_at: string;
  roles?: { id: string; name: string } | null;
}

export default function ResumePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Scoring state
  const [scoring, setScoring] = useState(false);
  const [atsReport, setAtsReport] = useState<AtsReport | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [evaluatedRoleName, setEvaluatedRoleName] = useState<string>("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Load initial roles and latest resume (if any)
  useEffect(() => {
    async function loadInitial() {
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
          const data = await resumeRes.json();
          if (data.resume) {
            const r: ExistingResume = data.resume;
            setCurrentResumeId(r.id);
            setUploadedFileName(r.file_path.split("/").pop() || "Uploaded Resume");
            if (r.target_role_id) {
              setSelectedRoleId(r.target_role_id);
            }
            if (r.ats_score !== null && r.ats_report) {
              setOverallScore(Number(r.ats_score));
              setAtsReport(r.ats_report);
              setEvaluatedRoleName(r.roles?.name || "Target Role");
            }
          }
        }
      } catch (err) {
        console.error("Error loading resume setup:", err);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadInitial();
  }, []);

  // 2. File drop and selection handlers
  const handleFileSelect = (file: File) => {
    const validExtensions = [".pdf", ".docx", ".txt"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setErrorMessage("Please upload a PDF or DOCX file (max 5 MB).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File exceeds 5 MB size limit.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // 3. Upload File to Server
  const handleUpload = async (fileToUpload: File) => {
    try {
      setUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload resume.");
      }

      setCurrentResumeId(data.resumeId);
      setUploadedFileName(data.fileName);
      setSuccessMessage("Resume uploaded and parsed successfully! Now select your target role and compute your ATS score.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload resume");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  // 4. Trigger ATS Evaluation
  const handleRunAts = async () => {
    if (!currentResumeId) {
      setErrorMessage("Please upload a resume first.");
      return;
    }
    if (!selectedRoleId) {
      setErrorMessage("Please select a target role.");
      return;
    }

    try {
      setScoring(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch("/api/resume/ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: currentResumeId,
          roleId: selectedRoleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to compute ATS score.");
      }

      setOverallScore(data.overallScore);
      setAtsReport(data.atsReport);
      setEvaluatedRoleName(data.roleName);
      setSuccessMessage(`ATS analysis completed for ${data.roleName}!`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error evaluating resume");
    } finally {
      setScoring(false);
    }
  };

  const selectedRoleObj = roles.find((r) => r.id === selectedRoleId);

  // SVG Gauge calculations
  const gaugeScore = overallScore ?? 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gaugeScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 stroke-emerald-400";
    if (score >= 65) return "text-primary stroke-primary";
    if (score >= 50) return "text-amber-400 stroke-amber-400";
    return "text-rose-400 stroke-rose-400";
  };

  const getScoreVerdict = (score: number) => {
    if (score >= 85) return "High Match — Interview Ready";
    if (score >= 70) return "Solid Match — Minor Refinements";
    if (score >= 55) return "Moderate — Alignment Needed";
    return "Requires Targeted Optimization";
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full glass-pill px-3.5 py-1 text-xs font-semibold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Resume Scoring & Match Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-display">
          Resume ATS Screening & Role Alignment
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Upload your resume in PDF or DOCX format. Groq evaluates your qualifications against your chosen
          engineering role, checking skills, experience metrics, formatting, and essential domain keywords.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive flex items-center gap-2.5 backdrop-blur-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-400 flex items-center gap-2.5 backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {loadingInitial ? (
        <GlassCard className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs sm:text-sm font-medium">Loading resume environment...</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {/* Top Config: Target Role + Uploader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Role Selector */}
            <GlassCard variant="elevated" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Target className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                    1. Select Target Role
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-2.5">
                  ATS keywords and benchmark criteria change dynamically according to the chosen role.
                </p>

                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {roles.map((role) => {
                    const isSelected = selectedRoleId === role.id;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isSelected
                            ? "bg-primary/15 border border-primary text-foreground font-semibold shadow-inner"
                            : "glass-pill text-muted-foreground hover:text-foreground hover:border-white/25"
                        }`}
                      >
                        <span>{role.name}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 text-xs text-muted-foreground">
                Target Selected:{" "}
                <span className="font-semibold text-foreground">
                  {selectedRoleObj?.name || "None"}
                </span>
              </div>
            </GlassCard>

            {/* Drag & Drop Resume Uploader */}
            <GlassCard variant="elevated" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground font-display">
                    2. Upload Resume File
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-2.5">
                  Accepts PDF or DOCX (max 5 MB). Stored securely in a private Supabase bucket.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-primary bg-primary/15 scale-[1.01]"
                      : "border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs font-semibold">Extracting text & storing...</span>
                    </div>
                  ) : uploadedFileName ? (
                    <div className="flex flex-col items-center gap-2 text-foreground">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <FileCheck className="h-7 w-7" />
                      </div>
                      <span className="text-xs font-bold truncate max-w-xs">{uploadedFileName}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Click or drag to replace with another file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <div className="text-xs font-bold text-foreground">
                        Click to upload or drag & drop
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        PDF or DOCX (up to 5 MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action trigger button */}
              <div className="mt-5 pt-3 border-t border-white/10">
                <GlassButton
                  type="button"
                  onClick={handleRunAts}
                  disabled={scoring || uploading || !currentResumeId || !selectedRoleId}
                  loading={scoring}
                  size="md"
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4" />
                  {scoring
                    ? `Evaluating against ${selectedRoleObj?.name}...`
                    : "Calculate ATS Readiness Score"}
                </GlassButton>
              </div>
            </GlassCard>
          </div>

          {/* ATS RESULTS SECTION */}
          {atsReport && overallScore !== null && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Overall Score Card with Circular SVG Gauge */}
              <GlassCard variant="elevated" glow="primary" className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Gauge */}
                  <div className="flex items-center gap-6">
                    <div className="relative flex h-36 w-36 items-center justify-center shrink-0">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 128 128">
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          className="stroke-white/10 dark:stroke-white/10"
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          className={`${getScoreColor(overallScore)} transition-all duration-1000 ease-out motion-reduce:transition-none`}
                          strokeWidth="10"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-black text-foreground font-display">{overallScore}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          ATS Score
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3 py-1 text-xs font-semibold text-primary">
                        <Award className="h-3.5 w-3.5" />
                        Target Role: {evaluatedRoleName}
                      </div>
                      <h3 className="text-xl font-bold text-foreground font-display">
                        {getScoreVerdict(overallScore)}
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Based on algorithmic screening against standard hiring profiles for{" "}
                        <span className="font-semibold text-foreground">{evaluatedRoleName}</span>.
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Button to Mock Interview */}
                  <div className="text-center sm:text-right">
                    <Link
                      href="/interview/new"
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all border border-primary/40 active:scale-[0.98]"
                    >
                      Practice Questions for this Role
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Section Breakdown Bars */}
                <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {(
                    [
                      { label: "Technical Skills", val: atsReport.section_scores?.skills || 0 },
                      { label: "Experience & Metrics", val: atsReport.section_scores?.experience || 0 },
                      { label: "Education & Base", val: atsReport.section_scores?.education || 0 },
                      { label: "Formatting & Layout", val: atsReport.section_scores?.formatting || 0 },
                      { label: "Keyword Alignment", val: atsReport.section_scores?.keywords || 0 },
                    ] as const
                  ).map(({ label, val }) => (
                    <div key={label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="font-bold text-foreground font-mono">{val}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700 motion-reduce:transition-none"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Keywords Match & Gap Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matched Keywords */}
                <GlassCard variant="elevated" glow="emerald">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground font-display">
                      Matched Technical Keywords ({atsReport.matched_keywords?.length || 0})
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 mb-3">
                    Detected skills and keywords strongly aligned with {evaluatedRoleName}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {atsReport.matched_keywords?.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 backdrop-blur-sm"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </GlassCard>

                {/* Missing / Recommended Keywords */}
                <GlassCard variant="elevated" glow="amber">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                    <Plus className="h-5 w-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-foreground font-display">
                      Missing Keywords to Consider ({atsReport.missing_keywords?.length || 0})
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 mb-3">
                    High-frequency domain keywords often looked for by screening ATS filters.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {atsReport.missing_keywords?.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 backdrop-blur-sm"
                      >
                        <Plus className="h-3 w-3" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* 5 Concrete Actionable Suggestions */}
              <GlassCard variant="elevated">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground font-display">
                    5 Concrete Suggestions to Maximize ATS & Interview Conversion
                  </h3>
                </div>
                <div className="mt-4 space-y-3">
                  {atsReport.suggestions?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl glass-panel p-3.5 text-xs text-muted-foreground"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-bold text-primary text-[11px] border border-primary/20">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed text-foreground/90">{item}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
