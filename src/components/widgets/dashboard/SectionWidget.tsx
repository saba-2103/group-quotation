'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionWidgetProps {
  title: string;
  count?: number;
  countVariant?: 'default' | 'warn' | 'danger';
  children: React.ReactNode;
  onViewAll?: () => void;
  emptyState?: string;
}

const countStyles: Record<NonNullable<SectionWidgetProps['countVariant']>, string> = {
  default: 'bg-muted text-muted-foreground',
  warn:    'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300',
  danger:  'bg-destructive/10 text-destructive',
};

export function SectionWidget({
  title,
  count,
  countVariant = 'default',
  children,
  onViewAll,
  emptyState = 'Nothing here yet.',
}: SectionWidgetProps) {
  const isEmpty = React.Children.count(children) === 0;

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {count !== undefined && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none',
                countStyles[countVariant],
              )}
            >
              {count}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs text-primary hover:underline transition-colors"
          >
            View all →
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-1">
        {isEmpty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyState}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
