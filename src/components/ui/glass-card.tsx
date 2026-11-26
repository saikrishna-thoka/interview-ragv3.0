"use client";

import React, { forwardRef } from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  glow?: "none" | "primary" | "emerald" | "amber" | "violet";
  noPadding?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      children,
      className = "",
      variant = "default",
      glow = "none",
      noPadding = false,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: "glass-card",
      elevated: "glass-card-elevated",
      interactive: "glass-card-interactive cursor-pointer",
    }[variant];

    const glowStyles = {
      none: "",
      primary: "relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-primary/25 before:to-violet-500/25 before:blur-sm before:-z-10",
      emerald: "relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-emerald-500/20 before:to-teal-500/20 before:blur-sm before:-z-10",
      amber: "relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-amber-500/20 before:to-orange-500/20 before:blur-sm before:-z-10",
      violet: "relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-violet-500/20 before:to-purple-500/20 before:blur-sm before:-z-10",
    }[glow];

    const padding = noPadding ? "" : "p-6 sm:p-7";

    return (
      <div
        ref={ref}
        className={`rounded-2xl relative overflow-hidden transition-all duration-200 ${variantStyles} ${glowStyles} ${padding} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
