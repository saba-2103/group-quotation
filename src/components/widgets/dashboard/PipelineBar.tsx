'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PipelineBarProps {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}

export function PipelineBar({ segments, height = 20 }: PipelineBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div className="w-full space-y-2">
      {/* Stacked bar */}
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ height }}
        role="img"
        aria-label="Pipeline breakdown"
      >
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          return (
            <div
              key={i}
              title={`${seg.label}: ${seg.value}`}
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              className="transition-all duration-300"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-muted-foreground">
              {seg.label}
              <span className={cn('ml-1 font-medium text-foreground')}>{seg.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
