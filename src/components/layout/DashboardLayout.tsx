'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { DashboardGreeting } from '@/components/widgets/dashboard/DashboardGreeting';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Section divider — uppercase label, same visual style as sidebar section headers
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardSectionProps {
  label: string;
  children: React.ReactNode;
}

export function DashboardSection({ label, children }: DashboardSectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Tailwind grid classes applied to the content area, e.g. "grid grid-cols-2 gap-4" */
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[960px] px-4 py-6 space-y-6">
        {/* Greeting */}
        <DashboardGreeting name={user.name} role={user.role} />

        {/* Content */}
        <div className={cn('space-y-6', className)}>{children}</div>
      </div>
    </div>
  );
}
