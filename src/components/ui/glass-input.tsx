"use client";

import React, { forwardRef } from "react";

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className = "", error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full glass-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground py-2.5 transition-all ${
              icon ? "pl-10 pr-4" : "px-4"
            } ${
              error
                ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
                : ""
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";

export interface GlassTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const GlassTextarea = forwardRef<
  HTMLTextAreaElement,
  GlassTextareaProps
>(({ className = "", error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1">
      <textarea
        ref={ref}
        className={`w-full glass-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground p-4 transition-all resize-y ${
          error
            ? "border-destructive/60 focus:border-destructive focus:ring-destructive/20"
            : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
});

GlassTextarea.displayName = "GlassTextarea";
