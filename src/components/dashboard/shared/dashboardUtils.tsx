// Shared helpers used across dashboard components.

import { RfqStatus, HandoffStatus, type RfqBase } from '@/lib/types';

// ─── Stage presentation ───────────────────────────────────────────────────────

export const STATUS_LABELS: Record<RfqStatus, string> = {
  [RfqStatus.DATA_PENDING]:           'Data Pending',
  [RfqStatus.CENSUS_CLEANED]:         'Census Cleaned',
  [RfqStatus.EXPERIENCE_NORMALIZED]:  'Experience Normalised',
  [RfqStatus.BENEFITS_READY]:         'Benefits Ready',
  [RfqStatus.PRICING]:                'Pricing',
  [RfqStatus.PRICING_IN_PROGRESS]:    'Pricing In Progress',
  [RfqStatus.UW_REVIEW]:              'UW Review',
  [RfqStatus.QUOTE_GENERATED]:        'Quote Generated',
  [RfqStatus.SHARED]:                 'Quote Shared',
  [RfqStatus.NEGOTIATION]:            'Negotiation',
  [RfqStatus.FINAL]:                  'Final',
  [RfqStatus.ISSUED]:                 'Issued',
  [RfqStatus.REJECTED]:               'Rejected',
};

export const STATUS_STYLE: Record<RfqStatus, string> = {
  [RfqStatus.DATA_PENDING]:           'bg-slate-100 text-slate-700',
  [RfqStatus.CENSUS_CLEANED]:         'bg-slate-100 text-slate-700',
  [RfqStatus.EXPERIENCE_NORMALIZED]:  'bg-slate-100 text-slate-700',
  [RfqStatus.BENEFITS_READY]:         'bg-blue-50 text-blue-700',
  [RfqStatus.PRICING]:                'bg-violet-50 text-violet-700',
  [RfqStatus.PRICING_IN_PROGRESS]:    'bg-violet-50 text-violet-700',
  [RfqStatus.UW_REVIEW]:              'bg-amber-50 text-amber-700',
  [RfqStatus.QUOTE_GENERATED]:        'bg-green-50 text-green-700',
  [RfqStatus.SHARED]:                 'bg-green-50 text-green-700',
  [RfqStatus.NEGOTIATION]:            'bg-orange-50 text-orange-700',
  [RfqStatus.FINAL]:                  'bg-teal-50 text-teal-700',
  [RfqStatus.ISSUED]:                 'bg-emerald-50 text-emerald-700',
  [RfqStatus.REJECTED]:               'bg-red-50 text-red-700',
};

export function StageBadge({ status }: { status: RfqStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status] ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── SLA helpers ──────────────────────────────────────────────────────────────

export function isOverdue(task: { requestedAt: string; slaHours: number; status: string }): boolean {
  if (
    task.status !== HandoffStatus.REQUESTED &&
    task.status !== HandoffStatus.IN_PROGRESS
  ) return false;
  return Date.now() - new Date(task.requestedAt).getTime() > task.slaHours * 3_600_000;
}

export function slaCountdownLabel(task: { requestedAt: string; slaHours: number; status: string }): string {
  const deadline = new Date(task.requestedAt).getTime() + task.slaHours * 3_600_000;
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) return 'Overdue';
  const hrs = Math.floor(remainingMs / 3_600_000);
  if (hrs < 24) return `${hrs}h remaining`;
  return `${Math.floor(hrs / 24)}d remaining`;
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'warning' | 'danger';
}

export function KpiCard({ label, value, tone = 'default' }: KpiCardProps) {
  const toneClass =
    tone === 'danger' ? 'text-destructive' :
    tone === 'warning' ? 'text-amber-600' :
    'text-foreground';
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

export function Panel({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground py-6 text-center">{message}</p>
  );
}

// ─── Out-of-scope banner ──────────────────────────────────────────────────────

export function OutOfScopeBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      {message}
    </div>
  );
}

// ─── Quick links bar ─────────────────────────────────────────────────────────

import Link from 'next/link';
import { canCreateRfq } from '@/lib/permissions';
import type { UserRole, SalesLevel } from '@/types/group-pas/roles';
import { Button } from '@/components/ui/button';

export function GlobalQuickLinks({ role, salesLevel }: { role: UserRole; salesLevel: SalesLevel }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
      <Button asChild variant="outline" size="sm">
        <Link href="/rfqs">RFQ Inbox</Link>
      </Button>
      {canCreateRfq(role, salesLevel) && (
        <Button asChild variant="outline" size="sm">
          <Link href="/rfqs/new">Create RFQ</Link>
        </Button>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href="/plan-templates">Plan Templates</Link>
      </Button>
    </div>
  );
}

// ─── Census quality badge ─────────────────────────────────────────────────────

export function CensusQualityBadge({ rfq }: { rfq: RfqBase }) {
  const q = rfq.censusSummary?.quality.trafficLight;
  if (!q) return <span className="text-muted-foreground text-xs">—</span>;
  const style =
    q === 'Good' ? 'bg-green-100 text-green-700' :
    q === 'Average' ? 'bg-amber-100 text-amber-700' :
    'bg-red-100 text-red-700';
  const label = q === 'Good' ? 'G' : q === 'Average' ? 'A' : 'R';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${style}`}>{label}</span>
  );
}
