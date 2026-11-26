"use client";

import { ColumnMapping } from "@/lib/validations/csv";
import { Table, Eye, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";

interface ColumnMapperProps {
  headers: string[];
  mapping: ColumnMapping;
  preview: Record<string, string>[];
  totalRows: number;
  onMappingChange: (newMapping: ColumnMapping) => void;
  onProceed: () => void;
  onBack: () => void;
}

export function ColumnMapper({
  headers,
  mapping,
  preview,
  totalRows,
  onMappingChange,
  onProceed,
  onBack,
}: ColumnMapperProps) {
  return (
    <div className="space-y-8">
      {/* Configuration Header */}
      <GlassCard variant="elevated">
        <h3 className="text-sm sm:text-base font-bold text-foreground font-display mb-1">
          Map CSV Columns to Question Attributes
        </h3>
        <p className="text-xs text-muted-foreground mb-6">
          The <span className="font-semibold text-primary">Question</span> field is mandatory.
          Topic, Answer, and Difficulty can either be mapped from the CSV or will be automatically inferred by Groq.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Question Column <span className="text-destructive">*</span>
            </label>
            <select
              value={mapping.questionColumn}
              onChange={(e) =>
                onMappingChange({ ...mapping, questionColumn: e.target.value })
              }
              className="w-full rounded-xl glass-input px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Select column...</option>
              {headers.map((h) => (
                <option key={h} value={h} className="bg-background text-foreground">
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Answer Column (Optional)
            </label>
            <select
              value={mapping.answerColumn || ""}
              onChange={(e) =>
                onMappingChange({
                  ...mapping,
                  answerColumn: e.target.value || undefined,
                })
              }
              className="w-full rounded-xl glass-input px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">None (Auto-generate)</option>
              {headers.map((h) => (
                <option key={h} value={h} className="bg-background text-foreground">
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Topic Column (Optional)
            </label>
            <select
              value={mapping.topicColumn || ""}
              onChange={(e) =>
                onMappingChange({
                  ...mapping,
                  topicColumn: e.target.value || undefined,
                })
              }
              className="w-full rounded-xl glass-input px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">None (Auto-classify)</option>
              {headers.map((h) => (
                <option key={h} value={h} className="bg-background text-foreground">
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Difficulty Column (Optional)
            </label>
            <select
              value={mapping.difficultyColumn || ""}
              onChange={(e) =>
                onMappingChange({
                  ...mapping,
                  difficultyColumn: e.target.value || undefined,
                })
              }
              className="w-full rounded-xl glass-input px-3 py-2 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">None (Auto-classify)</option>
              {headers.map((h) => (
                <option key={h} value={h} className="bg-background text-foreground">
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Preview Table */}
      <GlassCard variant="elevated">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h4 className="text-xs sm:text-sm font-bold text-foreground font-display">
              Previewing First {preview.length} of {totalRows} Rows
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {headers.length} Columns Detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground">
                <th className="py-2.5 px-3 font-semibold uppercase text-[10px]">#</th>
                {headers.map((h) => {
                  const isMapped =
                    mapping.questionColumn === h ||
                    mapping.answerColumn === h ||
                    mapping.topicColumn === h ||
                    mapping.difficultyColumn === h;
                  return (
                    <th key={h} className="py-2.5 px-3 font-semibold uppercase text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span>{h}</span>
                        {isMapped && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {preview.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-muted-foreground font-mono">{idx + 1}</td>
                  {headers.map((h) => (
                    <td key={h} className="py-3 px-3 text-foreground/90 max-w-xs truncate">
                      {row[h] || <span className="text-muted-foreground italic">empty</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <GlassButton variant="secondary" onClick={onBack}>
          Back to Upload
        </GlassButton>
        <GlassButton
          variant="primary"
          onClick={onProceed}
          disabled={!mapping.questionColumn}
        >
          <Check className="h-4 w-4" />
          Proceed to Ingestion ({totalRows} Rows)
        </GlassButton>
      </div>
    </div>
  );
}
