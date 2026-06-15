'use client';

import React from 'react';
import type { UserRole } from '@/types/group-pas/roles';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<UserRole, string> = {
  SALES:         'Sales',
  UNDERWRITER:   'Underwriter',
  ACTUARY:       'Actuary',
  ACTUARIAL:     'Actuarial',
  OPS:           'Ops',
  ADMIN:         'Admin',
  BROKER:        'Broker',
  MPH:           'MPH',
  REINSURER:     'Reinsurer',
  PARTNER_AGENT: 'Partner Agent',
};

const ROLE_CHIP_STYLES: Record<UserRole, string> = {
  SALES:         'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
  UNDERWRITER:   'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25',
  ACTUARY:       'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  ACTUARIAL:     'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  OPS:           'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
  PARTNER_AGENT: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  ADMIN:         'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  BROKER:        'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
  MPH:           'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  REINSURER:     'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export interface DashboardGreetingProps {
  name: string;
  role: UserRole;
}

export function DashboardGreeting({ name, role }: DashboardGreetingProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {greeting()}, {name}.
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formatDate(new Date())}</p>
      </div>
      <span
        className={cn(
          'self-start sm:self-auto inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-none tracking-wide uppercase',
          ROLE_CHIP_STYLES[role],
        )}
      >
        {ROLE_LABELS[role]}
      </span>
    </div>
  );
}
