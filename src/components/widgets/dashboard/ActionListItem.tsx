'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'draft'
  | 'evaluated'
  | 'rated'
  | 'submitted'
  | 'sent'
  | 'accepted'
  | 'finalized'
  | 'referred'
  | 'terminal';

export interface ActionListItemProps {
  label: string;
  sublabel?: string;
  badge?: { text: string; variant: BadgeVariant };
  action?: string;
  onClick?: () => void;
}

const badgeStyles: Record<BadgeVariant, string> = {
  draft:     'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  evaluated: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
  rated:     'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25',
  submitted: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
  sent:      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  accepted:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  finalized: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  referred:  'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/25',
  terminal:  'bg-destructive/10 text-destructive border-destructive/20',
};

export function ActionListItem({ label, sublabel, badge, action, onClick }: ActionListItemProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 py-2.5 px-1 rounded transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
      </div>
      {badge && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
            badgeStyles[badge.variant],
          )}
        >
          {badge.text}
        </span>
      )}
      {action && (
        <span className="shrink-0 text-xs text-primary font-medium whitespace-nowrap">{action}</span>
      )}
    </div>
  );
}
