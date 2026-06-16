'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  FolderOpen, AlertCircle, RefreshCw,
  LayoutList, ArrowUpDown, ArrowRight, Ellipsis,
  ChevronLeft, ChevronRight, Search, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getRfqs } from '@/lib/api/quotation-client';
import { useHandoffStore } from '@/stores/handoffStore';
import {
  HandoffKind, HandoffStatus,
  type HandoffTask, type RfqBase,
} from '@/lib/types';

// ─── Metadata ────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'teal' | 'amber' | 'grey';

const DESK_VARIANT: Record<HandoffKind, BadgeVariant> = {
  [HandoffKind.ACTUARY]: 'info',
  [HandoffKind.UW]:      'amber',
  [HandoffKind.OPS]:     'teal',
};

const STATUS_VARIANT: Record<HandoffStatus, BadgeVariant> = {
  [HandoffStatus.REQUESTED]:   'secondary',
  [HandoffStatus.IN_PROGRESS]: 'warning',
  [HandoffStatus.PUBLISHED]:   'success',
  [HandoffStatus.RETURNED]:    'destructive',
};

// ─── Tab config ───────────────────────────────────────────────────────────────

type DeskTab = 'ALL' | HandoffKind;

const DESK_TABS: { value: DeskTab; label: string }[] = [
  { value: 'ALL',               label: 'All'     },
  { value: HandoffKind.ACTUARY, label: 'Actuary' },
  { value: HandoffKind.UW,      label: 'UW'      },
  { value: HandoffKind.OPS,     label: 'Ops'     },
];

// ─── Enriched row ─────────────────────────────────────────────────────────────

interface TaskRow extends HandoffTask {
  employerName: string;
  planName: string;
  versionName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

function SlaChip({ task }: { task: HandoffTask }) {
  const deadline = new Date(task.requestedAt).getTime() + task.slaHours * 3600 * 1000;
  const remainingH = (deadline - Date.now()) / 3600 / 1000;
  const overdue = remainingH < 0;
  return (
    <span className={cn('text-xs font-medium', overdue ? 'text-destructive' : 'text-muted-foreground')}>
      {overdue ? 'Overdue' : `${Math.round(remainingH)}h left`}
    </span>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  try {
    return <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(iso), { addSuffix: true })}</span>;
  } catch {
    return <span className="text-xs text-muted-foreground">{iso}</span>;
  }
}

function SortableHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-foreground whitespace-nowrap">
      {children}
      <ArrowUpDown className="size-3.5 opacity-40 shrink-0" />
    </div>
  );
}

function PlainHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-2 py-2 text-sm font-medium text-foreground whitespace-nowrap">
      {children}
    </div>
  );
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReferralsPage() {
  const router = useRouter();
  const { tasks } = useHandoffStore();

  // RFQ metadata for enrichment (employer names, plan names, version names)
  const [rfqMeta, setRfqMeta] = useState<Map<string, { employerName: string; plans: Record<string, string>; versions: Record<string, string> }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [deskTab, setDeskTab] = useState<DeskTab>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HandoffStatus>('ALL');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rfqs: RfqBase[] = await getRfqs();
      const bundles = await Promise.all(
        rfqs.map((r) =>
          fetch(`/api/rfqs/${r.rfqId}/bundle`).then((res) => res.json() as Promise<Record<string, unknown>>).catch(() => null),
        ),
      );
      const meta = new Map<string, { employerName: string; plans: Record<string, string>; versions: Record<string, string> }>();
      rfqs.forEach((rfq, i) => {
        const bundle = bundles[i];
        const plans: Record<string, string> = {};
        const versions: Record<string, string> = {};
        ((bundle?.['plans'] ?? []) as Array<{ planId: string; name: string }>).forEach((p) => { plans[p.planId] = p.name; });
        (rfq.quoteVersions ?? []).forEach((v: { id: string; name: string }) => { versions[v.id] = v.name; });
        meta.set(rfq.rfqId, { employerName: rfq.employerName, plans, versions });
      });
      setRfqMeta(meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load referral data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rows: TaskRow[] = useMemo(() => tasks.map((t) => {
    const meta = rfqMeta.get(t.rfqId);
    return {
      ...t,
      employerName: meta?.employerName ?? t.rfqId,
      planName: meta?.plans[t.planId] ?? t.planId,
      versionName: meta?.versions[t.versionId] ?? t.versionId,
    };
  }), [tasks, rfqMeta]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q &&
        !r.planName.toLowerCase().includes(q) &&
        !r.employerName.toLowerCase().includes(q) &&
        !r.rfqId.toLowerCase().includes(q)) return false;
      if (deskTab !== 'ALL' && r.kind !== deskTab) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, search, deskTab, statusFilter]);

  useEffect(() => { setPage(1); }, [search, deskTab, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI counts across all tasks
  const kpis = useMemo(() => ({
    total:      tasks.length,
    requested:  tasks.filter((t) => t.status === HandoffStatus.REQUESTED).length,
    inProgress: tasks.filter((t) => t.status === HandoffStatus.IN_PROGRESS).length,
    published:  tasks.filter((t) => t.status === HandoffStatus.PUBLISHED).length,
  }), [tasks]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">Referrals &amp; Dispatch</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All actuary, UW and ops handoff tasks across every quote.</p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="shrink-0 grid grid-cols-4 gap-3 px-4 py-3">
        {[
          { label: 'Total tasks',   value: kpis.total      },
          { label: 'Requested',     value: kpis.requested  },
          { label: 'In progress',   value: kpis.inProgress },
          { label: 'Published',     value: kpis.published  },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border/20 bg-card px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar + Search / Filter row */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex items-center bg-muted rounded-xl p-1 mb-3 self-start w-fit">
          {DESK_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDeskTab(value)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-sm font-medium transition-all whitespace-nowrap',
                deskTab === value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <LayoutList className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by plan, client, or RFQ ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-72 pl-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.values(HandoffStatus).map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={load} className="text-destructive hover:text-destructive gap-1">
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[55px] w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
            <FolderOpen className="size-6" />
            {tasks.length === 0
              ? 'No dispatch tasks yet. Open a quote and use Sales Dispatch to create a referral.'
              : 'No tasks match the current filters.'}
          </div>
        ) : (
          <div className="h-full flex flex-col rounded-2xl border border-border/20 bg-background overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Fixed header */}
            <div className="shrink-0 flex items-center bg-muted/30 border-b border-border/20 pr-3">
              <div className="flex-1 min-w-0"><SortableHead>Plan</SortableHead></div>
              <div className="w-44 shrink-0"><SortableHead>Client</SortableHead></div>
              <div className="w-32 shrink-0"><PlainHead>Version</PlainHead></div>
              <div className="w-24 shrink-0"><PlainHead>Desk</PlainHead></div>
              <div className="w-32 shrink-0"><PlainHead>Status</PlainHead></div>
              <div className="w-24 shrink-0"><PlainHead>SLA</PlainHead></div>
              <div className="w-32 shrink-0"><SortableHead>Requested</SortableHead></div>
              <div className="w-20 shrink-0"><PlainHead>Actions</PlainHead></div>
            </div>

            {/* Rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {paged.map((task, idx) => (
                <div
                  key={task.taskId}
                  className={cn(
                    'flex items-center h-[55px] hover:bg-muted/40 transition-colors pr-3',
                    idx < paged.length - 1 && 'border-b border-border/20',
                  )}
                >
                  {/* Plan */}
                  <div className="flex-1 min-w-0 px-2 flex items-center gap-2">
                    <Send className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{task.planName}</div>
                      {task.reason && (
                        <div className="text-xs text-muted-foreground truncate">{task.reason}</div>
                      )}
                    </div>
                  </div>
                  {/* Client */}
                  <div className="w-44 shrink-0 px-2">
                    <button
                      className="text-sm font-medium hover:underline truncate block text-left w-full"
                      onClick={() => router.push(`/rfq2/${task.rfqId}`)}
                    >
                      {task.employerName}
                    </button>
                    <div className="text-xs text-muted-foreground font-mono">{task.rfqId}</div>
                  </div>
                  {/* Version */}
                  <div className="w-32 shrink-0 px-2 text-xs text-muted-foreground truncate">
                    {task.versionName}
                  </div>
                  {/* Desk */}
                  <div className="w-24 shrink-0 px-2">
                    <Badge variant={DESK_VARIANT[task.kind]} className="text-xs">
                      {task.kind}
                    </Badge>
                  </div>
                  {/* Status */}
                  <div className="w-32 shrink-0 px-2">
                    <Badge variant={STATUS_VARIANT[task.status]} className="text-xs whitespace-nowrap">
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {task.publishedPremium != null && (
                      <div className="text-[10px] text-green-700 mt-0.5">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(task.publishedPremium)}
                      </div>
                    )}
                  </div>
                  {/* SLA */}
                  <div className="w-24 shrink-0 px-2">
                    <SlaChip task={task} />
                  </div>
                  {/* Requested */}
                  <div className="w-32 shrink-0 px-2">
                    <RelativeTime iso={task.requestedAt} />
                  </div>
                  {/* Actions */}
                  <div className="w-20 shrink-0 px-1 flex items-center gap-0.5">
                    <button
                      className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors"
                      title="Open quote"
                      onClick={() => router.push(`/rfq2/${task.rfqId}`)}
                    >
                      <ArrowRight className="size-4" />
                    </button>
                    <button className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors" title="More">
                      <Ellipsis className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Fixed footer */}
            <div className="shrink-0 flex items-center justify-between border-t border-border/20 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center size-9 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {getPaginationPages(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`e-${i}`} className="flex items-center justify-center size-9 text-sm text-muted-foreground">
                      <Ellipsis className="size-4" />
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'flex items-center justify-center size-9 rounded-lg text-sm font-medium transition-colors',
                        p === page
                          ? 'border border-border bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center justify-center size-9 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
