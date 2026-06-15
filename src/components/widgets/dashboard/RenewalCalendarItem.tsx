'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface RenewalCalendarItemProps {
  label: string;
  daysUntil: number;
  policyNumber: string;
}

function urgencyStyle(days: number): string {
  if (days <= 30) return 'text-destructive font-semibold';
  if (days <= 90) return 'text-yellow-700 dark:text-yellow-400 font-medium';
  return 'text-emerald-700 dark:text-emerald-400';
}

function urgencyBadge(days: number): string {
  if (days <= 30) return 'bg-destructive/10 border-destructive/20 text-destructive';
  if (days <= 90) return 'bg-yellow-500/10 border-yellow-500/25 text-yellow-800 dark:text-yellow-300';
  return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300';
}

export function RenewalCalendarItem({ label, daysUntil, policyNumber }: RenewalCalendarItemProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{policyNumber}</p>
      </div>
      <span
        className={cn(
          'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-none',
          urgencyBadge(daysUntil),
        )}
      >
        <span className={cn('mr-0.5', urgencyStyle(daysUntil))}>
          {daysUntil <= 0 ? 'Expired' : `${daysUntil}d`}
        </span>
      </span>
    </div>
  );
}
