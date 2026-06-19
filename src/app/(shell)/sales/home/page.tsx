'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trophy,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SALES_PIPELINE_QUOTES,
  LAST_MONTH_METRICS,
  type SalesPipelineQuote,
  type SalesPipelineStatus,
} from '@/mocks/sales-dashboard';

// ─── Demo "today" ────────────────────────────────────────────────────────────
const TODAY = new Date('2026-06-18T12:00:00Z');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysDiff(from: string, to: Date = TODAY): number {
  return Math.round((to.getTime() - new Date(from).getTime()) / 86_400_000);
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86_400_000);
}

function relativeTime(iso: string): string {
  const d = daysDiff(iso);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  if (d < 60) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

const TERMINAL: SalesPipelineStatus[] = ['FINALIZED', 'WITHDRAWN', 'EXPIRED'];
const isTerminal = (s: SalesPipelineStatus) => TERMINAL.includes(s);

// ─── Scheme chip ─────────────────────────────────────────────────────────────
const SCHEME_COLOR: Record<string, string> = {
  GTL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GCL: 'bg-teal-50 text-teal-700 border-teal-200',
  GH:  'bg-purple-50 text-purple-700 border-purple-200',
};

function SchemeChip({ scheme }: { scheme: string }) {
  return (
    <span className={cn('text-[10px] font-semibold border rounded px-1.5 py-0.5', SCHEME_COLOR[scheme])}>
      {scheme}
    </span>
  );
}

// ─── Pipeline segment filter types ───────────────────────────────────────────
type PipelineFilter =
  | 'all'
  | 'in_progress'
  | 'awaiting_uw'
  | 'awaiting_pricing'
  | 'sent_to_client'
  | 'ready_to_finalise'
  | 'expiring_soon';

// ─── Compute pipeline counts ─────────────────────────────────────────────────
function usePipelineStats(quotes: SalesPipelineQuote[]) {
  return useMemo(() => {
    const active = quotes.filter((q) => !isTerminal(q.pipelineStatus));
    return {
      total: active.length,
      inProgress: quotes.filter(
        (q) => (q.pipelineStatus === 'DRAFT' || q.pipelineStatus === 'IN_PROGRESS') && !isTerminal(q.pipelineStatus),
      ).length,
      awaitingUw: quotes.filter((q) => q.pipelineStatus === 'REFERRED_UW').length,
      awaitingPricing: quotes.filter((q) => q.pipelineStatus === 'REFERRED_PRICING').length,
      sentToClient: quotes.filter(
        (q) => q.pipelineStatus === 'SENT_TO_CLIENT' || q.pipelineStatus === 'SUBMITTED',
      ).length,
      readyToFinalise: quotes.filter((q) => q.pipelineStatus === 'ACCEPTED').length,
      expiringSoon: active.filter((q) => daysUntil(q.expiresAt) <= 14).length,
    };
  }, [quotes]);
}

// ─── Needs Action computation ─────────────────────────────────────────────────
interface ActionItem {
  quote: SalesPipelineQuote;
  urgency: 'red' | 'green' | 'blue' | 'amber';
  actionLabel: string;
  actionVariant: 'default' | 'outline';
  actionColor: string; // Tailwind classes for the button
  statusText: string;
  elapsedText: string;
  priority: number; // lower = higher priority
}

function computeNeedsAction(quotes: SalesPipelineQuote[]): ActionItem[] {
  const items: ActionItem[] = [];

  for (const q of quotes) {
    const daysUntilExpiry = daysUntil(q.expiresAt);

    // 1. ACCEPTED — "Ready to Finalise"
    if (q.pipelineStatus === 'ACCEPTED') {
      items.push({
        quote: q,
        urgency: 'green',
        actionLabel: 'Finalise',
        actionVariant: 'default',
        actionColor: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        statusText: 'Client accepted — ready to finalise',
        elapsedText: q.acceptedAt ? relativeTime(q.acceptedAt) : 'Recently',
        priority: 1,
      });
      continue;
    }

    // 2. SENT_TO_CLIENT >5 days — "Follow up"
    if (q.pipelineStatus === 'SENT_TO_CLIENT' && q.sentAt && daysDiff(q.sentAt) > 5) {
      const d = daysDiff(q.sentAt);
      items.push({
        quote: q,
        urgency: 'amber',
        actionLabel: 'Follow Up',
        actionVariant: 'outline',
        actionColor: '',
        statusText: `Sent ${d} day${d !== 1 ? 's' : ''} ago — follow up`,
        elapsedText: relativeTime(q.sentAt),
        priority: 2,
      });
      continue;
    }

    // 3. RATED — "Ready to Submit"
    if (q.pipelineStatus === 'RATED') {
      items.push({
        quote: q,
        urgency: 'blue',
        actionLabel: 'Submit',
        actionVariant: 'default',
        actionColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        statusText: q.premiumInclGst
          ? `Priced at ${fmtINR(q.premiumInclGst)} — ready to submit`
          : 'Priced — ready to submit',
        elapsedText: relativeTime(q.createdAt),
        priority: 3,
      });
      continue;
    }

    // 4. REFERRED_UW >3 days
    if (q.pipelineStatus === 'REFERRED_UW' && q.referredAt && daysDiff(q.referredAt) > 3) {
      const d = daysDiff(q.referredAt);
      items.push({
        quote: q,
        urgency: 'amber',
        actionLabel: 'View',
        actionVariant: 'outline',
        actionColor: '',
        statusText: `With underwriter for ${d} day${d !== 1 ? 's' : ''}`,
        elapsedText: relativeTime(q.referredAt),
        priority: 4,
      });
      continue;
    }

    // 5. REFERRED_PRICING >3 days
    if (q.pipelineStatus === 'REFERRED_PRICING' && q.referredAt && daysDiff(q.referredAt) > 3) {
      const d = daysDiff(q.referredAt);
      items.push({
        quote: q,
        urgency: 'amber',
        actionLabel: 'View',
        actionVariant: 'outline',
        actionColor: '',
        statusText: `With actuary for ${d} day${d !== 1 ? 's' : ''}`,
        elapsedText: relativeTime(q.referredAt),
        priority: 5,
      });
      continue;
    }

    // 6. SUBMITTED — "Send to Client"
    if (q.pipelineStatus === 'SUBMITTED') {
      items.push({
        quote: q,
        urgency: 'blue',
        actionLabel: 'Send to Client',
        actionVariant: 'default',
        actionColor: 'bg-blue-600 hover:bg-blue-700 text-white',
        statusText: 'Submitted — send to client',
        elapsedText: q.submittedAt ? relativeTime(q.submittedAt) : 'Recently',
        priority: 6,
      });
      continue;
    }

    // 7. Expiring in ≤7 days (non-terminal, no finalized version)
    if (!isTerminal(q.pipelineStatus) && daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
      items.push({
        quote: q,
        urgency: 'red',
        actionLabel: 'View',
        actionVariant: 'outline',
        actionColor: '',
        statusText: `Quote expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
        elapsedText: relativeTime(q.createdAt),
        priority: 7,
      });
      continue;
    }
  }

  // Sort by priority then by most recent activity
  return items.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

// ─── Urgency dot ─────────────────────────────────────────────────────────────
const URGENCY_DOT: Record<ActionItem['urgency'], string> = {
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
};

// ─── My Numbers calculations ──────────────────────────────────────────────────
function useMyNumbers(quotes: SalesPipelineQuote[]) {
  return useMemo(() => {
    const thisMonthStart = new Date('2026-06-01T00:00:00Z');
    const thisMonthQuotes = quotes.filter((q) => new Date(q.createdAt) >= thisMonthStart);
    const quotesCreated = thisMonthQuotes.length;

    const finalized = quotes.filter((q) => q.pipelineStatus === 'FINALIZED');
    const withdrawn = quotes.filter((q) => q.pipelineStatus === 'WITHDRAWN');
    const expired = quotes.filter((q) => q.pipelineStatus === 'EXPIRED');
    const denominator = finalized.length + withdrawn.length + expired.length;
    const bindRate = denominator > 0 ? Math.round((finalized.length / denominator) * 100) : 0;

    const thisMonthWins = finalized.filter(
      (q) => q.finalizedAt && new Date(q.finalizedAt) >= thisMonthStart,
    );
    const avgCycleTime =
      thisMonthWins.length > 0
        ? Math.round(
            thisMonthWins.reduce((sum, q) => sum + daysDiff(q.createdAt, new Date(q.finalizedAt!)), 0) /
              thisMonthWins.length,
          )
        : 0;

    const active = quotes.filter((q) => !isTerminal(q.pipelineStatus));
    const pipelineValue = active.reduce((sum, q) => sum + (q.premiumInclGst ?? 0), 0);

    const byStage = {
      draft: quotes.filter((q) => q.pipelineStatus === 'DRAFT').length,
      inProgress: quotes.filter((q) => q.pipelineStatus === 'IN_PROGRESS').length,
      sentToClient: quotes.filter(
        (q) => q.pipelineStatus === 'SENT_TO_CLIENT' || q.pipelineStatus === 'SUBMITTED',
      ).length,
      accepted: quotes.filter((q) => q.pipelineStatus === 'ACCEPTED').length,
    };

    return { quotesCreated, bindRate, avgCycleTime, pipelineValue, byStage };
  }, [quotes]);
}

// ─── Trend indicator ─────────────────────────────────────────────────────────
function Trend({ current, previous, unit = '' }: { current: number; previous: number; unit?: string }) {
  const delta = current - previous;
  if (delta === 0) return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="size-3" /> No change</span>;
  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('flex items-center gap-0.5 text-xs', up ? 'text-emerald-600' : 'text-red-500')}>
      <Icon className="size-3" />
      {up ? '+' : ''}{delta}{unit} vs last mo.
    </span>
  );
}

// ─── Pipeline status bar ──────────────────────────────────────────────────────
interface PipelineSegment {
  key: PipelineFilter;
  label: string;
  count: number;
  borderClass: string;
  textClass: string;
  bgActive: string;
}

// ─── Main dashboard ──────────────────────────────────────────────────────────
export default function SalesDashboardPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<PipelineFilter>('all');

  const stats = usePipelineStats(SALES_PIPELINE_QUOTES);
  const numbers = useMyNumbers(SALES_PIPELINE_QUOTES);
  const allActionItems = computeNeedsAction(SALES_PIPELINE_QUOTES);

  // Filter action items by pipeline segment
  const actionItems = useMemo(() => {
    if (activeFilter === 'all') return allActionItems;
    return allActionItems.filter((item) => {
      const q = item.quote;
      const daysUntilExpiry = daysUntil(q.expiresAt);
      switch (activeFilter) {
        case 'in_progress':
          return q.pipelineStatus === 'DRAFT' || q.pipelineStatus === 'IN_PROGRESS';
        case 'awaiting_uw':
          return q.pipelineStatus === 'REFERRED_UW';
        case 'awaiting_pricing':
          return q.pipelineStatus === 'REFERRED_PRICING';
        case 'sent_to_client':
          return q.pipelineStatus === 'SENT_TO_CLIENT' || q.pipelineStatus === 'SUBMITTED';
        case 'ready_to_finalise':
          return q.pipelineStatus === 'ACCEPTED';
        case 'expiring_soon':
          return !isTerminal(q.pipelineStatus) && daysUntilExpiry <= 14;
        default:
          return true;
      }
    });
  }, [activeFilter, allActionItems]);

  // Recent wins (last 3 finalized)
  const recentWins = useMemo(() => {
    return SALES_PIPELINE_QUOTES.filter(
      (q) => q.pipelineStatus === 'FINALIZED' && q.finalizedAt && daysDiff(q.finalizedAt) <= 30,
    )
      .sort((a, b) => new Date(b.finalizedAt!).getTime() - new Date(a.finalizedAt!).getTime())
      .slice(0, 3);
  }, []);

  // Expiry watch (up to 3 soonest non-terminal quotes expiring ≤14 days)
  const expiryWatch = useMemo(() => {
    return SALES_PIPELINE_QUOTES.filter(
      (q) => !isTerminal(q.pipelineStatus) && daysUntil(q.expiresAt) <= 14 && daysUntil(q.expiresAt) >= 0,
    )
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
      .slice(0, 3);
  }, []);

  const pipelineSegments: PipelineSegment[] = [
    {
      key: 'in_progress',
      label: 'In Progress',
      count: stats.inProgress,
      borderClass: 'border-l-indigo-500',
      textClass: 'text-indigo-600',
      bgActive: 'bg-indigo-50',
    },
    {
      key: 'awaiting_uw',
      label: 'Awaiting UW',
      count: stats.awaitingUw,
      borderClass: 'border-l-amber-500',
      textClass: 'text-amber-600',
      bgActive: 'bg-amber-50',
    },
    {
      key: 'awaiting_pricing',
      label: 'Awaiting Pricing',
      count: stats.awaitingPricing,
      borderClass: 'border-l-amber-500',
      textClass: 'text-amber-600',
      bgActive: 'bg-amber-50',
    },
    {
      key: 'sent_to_client',
      label: 'Sent to Client',
      count: stats.sentToClient,
      borderClass: 'border-l-blue-500',
      textClass: 'text-blue-600',
      bgActive: 'bg-blue-50',
    },
    {
      key: 'ready_to_finalise',
      label: 'Ready to Finalise',
      count: stats.readyToFinalise,
      borderClass: 'border-l-emerald-500',
      textClass: 'text-emerald-600',
      bgActive: 'bg-emerald-50',
    },
    {
      key: 'expiring_soon',
      label: 'Expiring Soon',
      count: stats.expiringSoon,
      borderClass: 'border-l-red-500',
      textClass: 'text-red-600',
      bgActive: 'bg-red-50',
    },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Main column (2/3) ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5 space-y-6">

        {/* Section 1 — Pipeline Status Bar */}
        <div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {pipelineSegments.map((seg) => (
              <button
                key={seg.key}
                onClick={() => setActiveFilter(activeFilter === seg.key ? 'all' : seg.key)}
                className={cn(
                  'text-left border-l-4 rounded-lg border border-border px-3 py-2.5 transition-colors',
                  seg.borderClass,
                  activeFilter === seg.key ? seg.bgActive : 'bg-card hover:bg-muted/60',
                )}
              >
                <div className={cn('text-2xl font-bold tabular-nums leading-none', seg.textClass)}>
                  {seg.count}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{seg.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing your quotes ·{' '}
              <span className="font-medium text-foreground">{stats.total}</span> total active
            </span>
            <Link href="/rfqs" className="text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Section 2 — Needs Action */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Needs Action
            </p>
            {actionItems.length > 0 && (
              <Link href="/rfqs" className="text-xs text-primary hover:underline">
                See all {allActionItems.length} items
              </Link>
            )}
          </div>

          {actionItems.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">All clear. No actions needed right now.</p>
                <p className="text-xs text-emerald-600 mt-0.5">Check back later or browse your full pipeline.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {actionItems.map((item) => (
                <ActionCard
                  key={item.quote.rfqId}
                  item={item}
                  onClick={() => router.push(`/rfq2/${item.quote.rfqId}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 3 — Recent Wins */}
        {recentWins.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="size-3.5 text-amber-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Wins
              </p>
            </div>
            <div className="space-y-2">
              {recentWins.map((q) => (
                <div
                  key={q.rfqId}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => router.push(`/rfq2/${q.rfqId}`)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{q.employerName}</span>
                        <SchemeChip scheme={q.scheme} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Finalized {q.finalizedAt ? relativeTime(q.finalizedAt) : ''}
                        {q.finalPremium ? ` · ${fmtINR(q.finalPremium)}` : ''}
                      </p>
                    </div>
                  </div>
                  {q.finalPremium && (
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums shrink-0">
                      {fmtINR(q.finalPremium)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right sidebar (1/3) ───────────────────────────────────────────── */}
      <div className="w-72 xl:w-80 shrink-0 border-l border-border/60 overflow-y-auto px-4 py-5 space-y-5">
        {/* My Numbers header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            This Month
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Quotes Created"
              value={numbers.quotesCreated}
              trend={<Trend current={numbers.quotesCreated} previous={LAST_MONTH_METRICS.quotesCreated} />}
            />
            <MetricCard
              label="Bind Rate"
              value={`${numbers.bindRate}%`}
              trend={<Trend current={numbers.bindRate} previous={LAST_MONTH_METRICS.bindRate} unit="%" />}
            />
            <MetricCard
              label="Avg. Cycle Time"
              value={`${numbers.avgCycleTime}d`}
              trend={
                <Trend
                  current={numbers.avgCycleTime}
                  previous={LAST_MONTH_METRICS.avgCycleTimeDays}
                  unit="d"
                />
              }
              // lower is better for cycle time — invert rendering handled by Trend label
            />
            <MetricCard
              label="Pipeline Value"
              value={fmtINR(numbers.pipelineValue)}
              valueSize="sm"
              trend={<Trend current={numbers.pipelineValue} previous={LAST_MONTH_METRICS.pipelineValue} />}
            />
          </div>
        </div>

        {/* Pipeline by Stage */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Pipeline by Stage
          </p>
          <div className="space-y-1.5">
            <StageRow dot="bg-slate-400" label="Draft" count={numbers.byStage.draft} />
            <StageRow dot="bg-indigo-500" label="Active (in progress)" count={numbers.byStage.inProgress} />
            <StageRow dot="bg-blue-500" label="Sent to Client" count={numbers.byStage.sentToClient} />
            <StageRow dot="bg-emerald-500" label="Accepted (pending finalise)" count={numbers.byStage.accepted} />
          </div>
        </div>

        {/* Expiry Watch */}
        {expiryWatch.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Expiry Watch
              </p>
            </div>
            <div className="space-y-1.5">
              {expiryWatch.map((q) => {
                const days = daysUntil(q.expiresAt);
                const urgencyColor =
                  days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-yellow-600';
                return (
                  <div
                    key={q.rfqId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/rfq2/${q.rfqId}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{q.employerName}</p>
                      <p className="text-[10px] text-muted-foreground">{q.quoteNo}</p>
                    </div>
                    <span className={cn('text-xs font-semibold tabular-nums shrink-0', urgencyColor)}>
                      {days}d
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────
function ActionCard({ item, onClick }: { item: ActionItem; onClick: () => void }) {
  const { quote: q, urgency, actionLabel, actionVariant, actionColor, statusText, elapsedText } = item;

  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Priority dot */}
      <span className={cn('size-2.5 rounded-full shrink-0 mt-0.5', URGENCY_DOT[urgency])} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-foreground truncate">{q.employerName}</span>
          <SchemeChip scheme={q.scheme} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">{q.quoteNo}</span>
          <span>·</span>
          <span>{q.activeVersionLabel}</span>
          <span>·</span>
          <span>{statusText}</span>
        </div>
      </div>

      {/* Elapsed + action */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{elapsedText}</span>
        <Button
          size="sm"
          variant={actionVariant}
          className={cn('h-7 px-3 text-xs', actionColor)}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  trend,
  valueSize = 'lg',
}: {
  label: string;
  value: string | number;
  trend: React.ReactNode;
  valueSize?: 'lg' | 'sm';
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('font-bold tabular-nums leading-tight', valueSize === 'lg' ? 'text-xl' : 'text-base')}>
        {value}
      </p>
      <div className="mt-1">{trend}</div>
    </div>
  );
}

// ─── Stage Row ────────────────────────────────────────────────────────────────
function StageRow({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={cn('size-2 rounded-full shrink-0', dot)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-xs font-medium tabular-nums">{count}</span>
    </div>
  );
}
