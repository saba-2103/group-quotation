'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  value: string | number;
  label: string;
  sub?: string;
  variant?: 'default' | 'accent' | 'warn' | 'danger' | 'success';
  trend?: { value: number; direction: 'up' | 'down'; label: string };
  onClick?: () => void;
}

const variantStyles: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'bg-card border-border',
  accent: 'bg-primary/5 border-primary/20',
  warn:   'bg-yellow-500/5 border-yellow-500/25',
  danger: 'bg-destructive/5 border-destructive/20',
  success:'bg-emerald-500/5 border-emerald-500/20',
};

const trendStyles: Record<'up' | 'down', string> = {
  up:   'text-emerald-700 dark:text-emerald-300',
  down: 'text-destructive',
};

export function StatCard({ value, label, sub, variant = 'default', trend, onClick }: StatCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      onClick={onClick}
      className={cn(
        'rounded-lg border p-5 flex flex-col gap-1 transition-all duration-150',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.99]',
      )}
    >
      <span className="text-3xl font-bold tracking-tight text-foreground leading-none">
        {value}
      </span>
      <span className="text-sm font-medium text-muted-foreground mt-1">{label}</span>
      {sub && <span className="text-xs text-muted-foreground/70">{sub}</span>}
      {trend && (
        <span className={cn('text-xs font-medium flex items-center gap-0.5 mt-1', trendStyles[trend.direction])}>
          {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </span>
      )}
    </div>
  );
}
