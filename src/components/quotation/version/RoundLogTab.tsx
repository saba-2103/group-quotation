'use client';

/**
 * Version Round Log tab.
 * Shows all UW and pricing review rounds for a given QuoteVersion.
 *
 * Segment control at top switches between UW / PRICING rounds.
 * Each round card shows:
 *   - round header (number, kind chip, outcome badge)
 *   - requestedBy + requestComment
 *   - resolved section (response, overrides table, attached doc chips) — if completedAt
 *   - pending callout with elapsed time — if no completedAt
 */

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '../quoteHelpers';
import type {
  ParameterOverride,
  QuoteVersion,
  Round,
  RoundKind,
  RoundOutcome,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatElapsed(from: string): string {
  const ms = Date.now() - new Date(from).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome?: RoundOutcome }) {
  if (!outcome) {
    return (
      <Badge variant="warning" className="text-[11px]">
        Pending
      </Badge>
    );
  }
  if (outcome === 'APPROVED') {
    return (
      <Badge variant="success" className="text-[11px]">
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[11px]">
      Rejected
    </Badge>
  );
}

function KindChip({ kind }: { kind: RoundKind }) {
  return (
    <Badge
      variant={kind === 'UW' ? 'amber' : 'info'}
      className="text-[10px] font-semibold uppercase tracking-wide"
    >
      {kind === 'UW' ? 'UW' : 'Pricing'}
    </Badge>
  );
}

function QuoteBlock({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <blockquote
      className={cn(
        'rounded-md border-l-2 pl-3 py-1 text-sm italic',
        muted
          ? 'border-slate-300 bg-slate-50/60 text-slate-500'
          : 'border-blue-300 bg-blue-50/60 text-slate-600',
      )}
    >
      {text}
    </blockquote>
  );
}

function OverridesTable({ overrides }: { overrides: ParameterOverride[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/40 text-muted-foreground">
            <th className="px-3 py-1.5 text-left font-medium">Parameter</th>
            <th className="px-3 py-1.5 text-left font-medium">Original</th>
            <th className="px-3 py-1.5 text-left font-medium">Override</th>
          </tr>
        </thead>
        <tbody>
          {overrides.map((o) => (
            <tr key={o.parameterId} className="border-t border-border">
              <td className="px-3 py-1.5 font-medium">{o.parameterName ?? o.parameterId}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{String(o.originalValue ?? '—')}</td>
              <td className="px-3 py-1.5 text-foreground">{String(o.overrideValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttachedDocChips({
  docRefs,
  version,
}: {
  docRefs: string[];
  version: QuoteVersion;
}) {
  if (docRefs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {docRefs.map((ref) => {
        const doc = version.attached_documents.find((d) => d.attachmentId === ref);
        return (
          <span
            key={ref}
            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            <FileText className="size-3" />
            {doc ? doc.fileName : ref}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single round card
// ─────────────────────────────────────────────────────────────────────────────

function RoundCard({
  round,
  roundNumber,
  version,
}: {
  round: Round;
  roundNumber: number;
  version: QuoteVersion;
}) {
  const [expanded, setExpanded] = useState(true);

  const isPending = !round.completedAt;
  const responderRole = round.roundKind === 'UW' ? 'Underwriter' : 'Actuary';

  return (
    <div
      className={cn(
        'rounded-xl border bg-card shadow-sm',
        isPending && 'border-amber-200 ring-1 ring-amber-100',
        round.outcome === 'APPROVED' && 'border-emerald-200',
        round.outcome === 'REJECTED' && 'border-red-200',
      )}
    >
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Round #{roundNumber}</span>
          <KindChip kind={round.roundKind} />
          <OutcomeBadge outcome={round.outcome} />
        </div>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4">
          {/* Request section */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {round.outcome ? (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="size-3.5 text-amber-500" />
              )}
              <span>
                Requested by{' '}
                <strong className="text-foreground">
                  {round.requestedByName ?? 'Sales'}
                </strong>{' '}
                on <strong className="text-foreground">{formatDate(round.assignedAt)}</strong>
              </span>
            </div>
            {round.requestComment && (
              <QuoteBlock text={round.requestComment} />
            )}
          </div>

          {/* Resolved section */}
          {!isPending && round.completedAt ? (
            <>
              <hr className="my-4 border-border" />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {round.outcome === 'APPROVED' ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-3.5 text-red-500" />
                  )}
                  <span>
                    Responded by{' '}
                    <strong className="text-foreground">{round.assignedToName}</strong>{' '}
                    on{' '}
                    <strong className="text-foreground">{formatDate(round.completedAt)}</strong>
                  </span>
                </div>

                {round.remarks && (
                  <QuoteBlock text={round.remarks} muted />
                )}

                {round.parameterOverrides && round.parameterOverrides.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Parameter Overrides
                    </span>
                    <OverridesTable overrides={round.parameterOverrides} />
                  </div>
                )}

                {round.attached_document_refs && round.attached_document_refs.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Supporting Documents
                    </span>
                    <AttachedDocChips
                      docRefs={round.attached_document_refs}
                      version={version}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Pending callout */
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
              <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-amber-800">
                  Awaiting response from {responderRole}
                </span>
                <span className="text-xs text-amber-600">
                  Opened {formatElapsed(round.assignedAt)} ago · assigned to{' '}
                  <strong>{round.assignedToName}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Segment control
// ─────────────────────────────────────────────────────────────────────────────

function SegmentControl({
  value,
  onChange,
  uwCount,
  pricingCount,
}: {
  value: RoundKind;
  onChange: (v: RoundKind) => void;
  uwCount: number;
  pricingCount: number;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
      {(
        [
          { kind: 'UW' as const, label: 'UW Rounds', count: uwCount },
          { kind: 'PRICING' as const, label: 'Pricing Rounds', count: pricingCount },
        ] as const
      ).map(({ kind, label, count }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onChange(kind)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === kind
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
          <span
            className={cn(
              'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
              value === kind ? 'bg-muted' : 'bg-transparent',
            )}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tab
// ─────────────────────────────────────────────────────────────────────────────

export interface RoundLogTabProps {
  version: QuoteVersion;
}

export function RoundLogTab({ version }: RoundLogTabProps) {
  const [activeKind, setActiveKind] = useState<RoundKind>('UW');

  const uwRounds = useMemo(
    () => version.round_log.filter((r) => r.roundKind === 'UW'),
    [version.round_log],
  );
  const pricingRounds = useMemo(
    () => version.round_log.filter((r) => r.roundKind === 'PRICING'),
    [version.round_log],
  );

  const visibleRounds = activeKind === 'UW' ? uwRounds : pricingRounds;
  const emptyLabel =
    activeKind === 'UW'
      ? 'No UW rounds on this version.'
      : 'No pricing rounds on this version.';

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Segment control */}
      <div className="flex items-center justify-between">
        <SegmentControl
          value={activeKind}
          onChange={setActiveKind}
          uwCount={uwRounds.length}
          pricingCount={pricingRounds.length}
        />
        {version.round_log.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {version.round_log.length} round{version.round_log.length !== 1 ? 's' : ''} total
          </span>
        )}
      </div>

      {/* Round cards */}
      {visibleRounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 py-16 text-muted-foreground">
          <FileText className="size-8 opacity-30" />
          <p className="text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleRounds.map((round) => (
            <RoundCard
              key={round.roundId}
              round={round}
              roundNumber={round.roundNumber}
              version={version}
            />
          ))}
        </div>
      )}
    </div>
  );
}
