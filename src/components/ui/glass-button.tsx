"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
      md: "px-4 py-2 text-xs sm:text-sm rounded-xl gap-2",
      lg: "px-6 py-3 text-sm sm:text-base rounded-xl gap-2.5",
    }[size];

    const variantStyles = {
      primary:
        "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 border border-primary/40 active:scale-[0.98]",
      secondary:
        "glass-panel text-foreground font-semibold hover:border-white/30 dark:hover:border-white/20 hover:bg-white/10 dark:hover:bg-white/5 active:scale-[0.98]",
      outline:
        "border border-white/20 dark:border-white/10 bg-transparent text-foreground hover:bg-white/5 active:scale-[0.98]",
      ghost:
        "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent active:scale-[0.98]",
      danger:
        "bg-destructive/90 text-destructive-foreground font-semibold shadow-sm hover:bg-destructive active:scale-[0.98]",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
