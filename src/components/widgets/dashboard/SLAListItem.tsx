'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SLAListItemProps {
  label: string;
  sublabel?: string;
  elapsed: string;
  status: 'ok' | 'warn' | 'overdue';
  onClick?: () => void;
}

const dotStyles: Record<SLAListItemProps['status'], string> = {
  ok:      'bg-emerald-500',
  warn:    'bg-yellow-500',
  overdue: 'bg-destructive',
};

const elapsedStyles: Record<SLAListItemProps['status'], string> = {
  ok:      'text-muted-foreground',
  warn:    'text-yellow-700 dark:text-yellow-400 font-medium',
  overdue: 'text-destructive font-semibold',
};

export function SLAListItem({ label, sublabel, elapsed, status, onClick }: SLAListItemProps) {
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
      <span className={cn('mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full', dotStyles[status])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
      </div>
      <span className={cn('text-xs shrink-0', elapsedStyles[status])}>{elapsed}</span>
    </div>
  );
}
