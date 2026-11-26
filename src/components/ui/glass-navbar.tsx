"use client";

import React from "react";

export interface GlassNavbarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function GlassNavbar({ children, className = "", ...props }: GlassNavbarProps) {
  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-white/10 dark:border-white/10 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-200 shadow-sm ${className}`}
      {...props}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </header>
  );
}
