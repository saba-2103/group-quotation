'use client';

/**
 * Reusable AuditTimeline — vertical event timeline with date-group separators.
 *
 * Used by:
 *   - Quote Detail › Audit Log tab  (quote-level events)
 *   - Version Workspace › (future round-level events)
 *
 * Derives grouping from event timestamps.  Events must arrive sorted oldest-first
 * (deriveAuditEvents already does this).
 */

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Paperclip,
  Send,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from './quoteHelpers';
import type { AuditEvent, AuditEventType } from './detail/auditUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Icon + colour maps (match the spec)
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_ICON: Record<AuditEventType, React.ElementType> = {
  QUOTE_CREATED: GitBranch,
  VERSION_CREATED: GitBranch,
  STATUS_CHANGE: ArrowRight,
  DOCUMENT_ATTACHED: Paperclip,
  ROUND_ASSIGNED: AlertCircle,
  ROUND_COMPLETED: CheckCircle2,
  SENT_TO_CLIENT: Send,
  ACCEPTED: CheckCircle2,
  FINALIZED: CheckCircle2,
  REJECTED: XCircle,
  WITHDRAWN: XCircle,
};

const EVENT_COLOR: Record<AuditEventType, string> = {
  QUOTE_CREATED:    'bg-purple-100 text-purple-700 ring-purple-200',
  VERSION_CREATED:  'bg-purple-100 text-purple-700 ring-purple-200',
  STATUS_CHANGE:    'bg-blue-100   text-blue-700   ring-blue-200',
  DOCUMENT_ATTACHED:'bg-slate-100  text-slate-600  ring-slate-200',
  ROUND_ASSIGNED:   'bg-amber-100  text-amber-700  ring-amber-200',
  ROUND_COMPLETED:  'bg-teal-100   text-teal-700   ring-teal-200',
  SENT_TO_CLIENT:   'bg-indigo-100 text-indigo-700 ring-indigo-200',
  ACCEPTED:         'bg-emerald-100 text-emerald-700 ring-emerald-200',
  FINALIZED:        'bg-emerald-100 text-emerald-700 ring-emerald-200',
  REJECTED:         'bg-red-100   text-red-700    ring-red-200',
  WITHDRAWN:        'bg-orange-100 text-orange-700 ring-orange-200',
};

// ─────────────────────────────────────────────────────────────────────────────
// Date-group helpers
// ─────────────────────────────────────────────────────────────────────────────

function dateSeparatorLabel(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface EventGroup {
  label: string;
  events: AuditEvent[];
}

function groupEventsByDate(events: AuditEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  let current: EventGroup | null = null;

  for (const ev of events) {
    const label = dateSeparatorLabel(ev.timestamp);
    if (!current || current.label !== label) {
      current = { label, events: [] };
      groups.push(current);
    }
    current.events.push(ev);
  }

  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single event row
// ─────────────────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: AuditEvent;
  isLast: boolean;
}

function EventRow({ event, isLast }: EventRowProps) {
  const Icon = EVENT_ICON[event.type];
  const colorClass = EVENT_COLOR[event.type];

  return (
    <div className="flex gap-3">
      {/* spine */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
            colorClass,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>

      {/* body */}
      <div className={cn('flex flex-col pb-5', isLast && 'pb-0')}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium leading-snug">{event.title}</span>
          {event.versionNumber !== undefined && (
            <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
              v{event.versionNumber}
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{event.actor}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{formatDateTime(event.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date separator
// ─────────────────────────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-3">
      <div className="flex-1 border-t border-border/60" />
      <span className="mx-3 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex-1 border-t border-border/60" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditTimelineProps {
  events: AuditEvent[];
  /** When true shows an empty-state message instead of an empty container. */
  showEmptyState?: boolean;
  emptyMessage?: string;
}

export function AuditTimeline({
  events,
  showEmptyState = true,
  emptyMessage = 'No events recorded yet.',
}: AuditTimelineProps) {
  if (events.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 py-16 text-muted-foreground">
        <Paperclip className="size-8 opacity-30" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const groups = groupEventsByDate(events);
  const allEvents = groups.flatMap((g) => g.events);

  return (
    <div className="flex flex-col px-1 pt-2">
      {groups.map((group, gi) => (
        <div key={group.label}>
          <DateSeparator label={group.label} />
          {group.events.map((event, ei) => {
            // isLast = last event overall
            const globalIdx = allEvents.indexOf(event);
            const isLast = globalIdx === allEvents.length - 1;
            return (
              <EventRow
                key={event.id}
                event={event}
                isLast={isLast && ei === group.events.length - 1}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
