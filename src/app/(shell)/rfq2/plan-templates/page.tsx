'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen, AlertCircle, RefreshCw,
  LayoutList, FilePen, CheckCircle2, Clock,
  Search, ArrowUpDown, ArrowRight, Ellipsis, ChevronLeft, ChevronRight,
  Layers, CirclePlus,
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
import {
  PlanHandoffStatus, SumAssuredBasis, CoverPattern,
  type Plan, type RfqBase,
} from '@/lib/types';

// ─── Metadata ────────────────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'teal' | 'amber' | 'grey';

const HANDOFF_LABELS: Record<PlanHandoffStatus, string> = {
  [PlanHandoffStatus.DRAFT]:              'Draft',
  [PlanHandoffStatus.PRICING_REQUESTED]:  'Pricing Requested',
  [PlanHandoffStatus.UW_REFERRED]:        'UW Referred',
  [PlanHandoffStatus.PRICED]:             'Priced',
  [PlanHandoffStatus.RETURNED]:           'Returned',
};

const HANDOFF_VARIANT: Record<PlanHandoffStatus, BadgeVariant> = {
  [PlanHandoffStatus.DRAFT]:              'grey',
  [PlanHandoffStatus.PRICING_REQUESTED]:  'amber',
  [PlanHandoffStatus.UW_REFERRED]:        'warning',
  [PlanHandoffStatus.PRICED]:             'teal',
  [PlanHandoffStatus.RETURNED]:           'success',
};

const SA_BASIS_LABELS: Record<SumAssuredBasis, string> = {
  [SumAssuredBasis.FLAT]:            'Flat',
  [SumAssuredBasis.SALARY_MULTIPLE]: 'Salary Multiple',
  [SumAssuredBasis.GRADE_SLAB]:      'Grade Slab',
};

const COVER_PATTERN_LABELS: Record<CoverPattern, string> = {
  [CoverPattern.LEVEL]:    'Level',
  [CoverPattern.REDUCING]: 'Reducing',
};

// ─── Tab config ───────────────────────────────────────────────────────────────

type PlanTab = 'ALL' | 'DRAFT' | 'ACTIVE' | 'PRICED';

const PLAN_TABS: { value: PlanTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'ALL',    label: 'All',    Icon: LayoutList  },
  { value: 'DRAFT',  label: 'Draft',  Icon: FilePen     },
  { value: 'ACTIVE', label: 'Active', Icon: Clock       },
  { value: 'PRICED', label: 'Priced', Icon: CheckCircle2 },
];

const DRAFT_STATUSES  = new Set([PlanHandoffStatus.DRAFT]);
const ACTIVE_STATUSES = new Set([PlanHandoffStatus.PRICING_REQUESTED, PlanHandoffStatus.UW_REFERRED]);
const PRICED_STATUSES = new Set([PlanHandoffStatus.PRICED, PlanHandoffStatus.RETURNED]);

// ─── Enriched row ─────────────────────────────────────────────────────────────

interface PlanRow extends Plan {
  employerName: string;
  versionName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

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

function CompletenessBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[48px]">
        <div
          className={cn('h-full rounded-full', pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 shrink-0">{pct}%</span>
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

export default function PlanTemplatesPage() {
  const router = useRouter();

  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<PlanTab>('ALL');
  const [coverFilter, setCoverFilter] = useState<'ALL' | CoverPattern>('ALL');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rfqs: RfqBase[] = await getRfqs();
      const bundles = await Promise.all(
        rfqs.map((r) =>
          fetch(`/api/rfqs/${r.rfqId}/bundle`)
            .then((res) => res.json())
            .catch(() => null),
        ),
      );
      const collected: PlanRow[] = [];
      bundles.forEach((bundle, i) => {
        if (!bundle?.plans) return;
        (bundle.plans as Plan[]).forEach((plan) => {
          const version = rfqs[i].quoteVersions?.find((v: { id: string }) => v.id === plan.quoteVersionId);
          collected.push({
            ...plan,
            employerName: rfqs[i].employerName,
            versionName: version?.name ?? plan.quoteVersionId,
          });
        });
      });
      setRows(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plan templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((p) => {
      if (q &&
        !p.name.toLowerCase().includes(q) &&
        !p.rfqId.toLowerCase().includes(q) &&
        !p.employerName.toLowerCase().includes(q) &&
        !(p.productCode ?? '').toLowerCase().includes(q)) return false;
      if (tabFilter === 'DRAFT'  && !DRAFT_STATUSES.has(p.handoffStatus))  return false;
      if (tabFilter === 'ACTIVE' && !ACTIVE_STATUSES.has(p.handoffStatus)) return false;
      if (tabFilter === 'PRICED' && !PRICED_STATUSES.has(p.handoffStatus)) return false;
      if (coverFilter !== 'ALL' && p.coverPattern !== coverFilter) return false;
      return true;
    });
  }, [rows, search, tabFilter, coverFilter]);

  useEffect(() => { setPage(1); }, [search, tabFilter, coverFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40">
        {/* Title block */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">Plan Templates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All benefit plans across quotes and versions.</p>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => router.push('/rfq2/plan-templates/new')}>
            <CirclePlus className="size-4" />
            New Plan Template
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center px-4 pb-3">
          <div className="flex items-center bg-muted rounded-xl p-1">
            {PLAN_TABS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTabFilter(value)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-sm font-medium transition-all whitespace-nowrap',
                  tabFilter === value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search / Filter row */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by plan name, RFQ ID, client, or product code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-80 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={coverFilter} onValueChange={(v) => setCoverFilter(v as typeof coverFilter)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Cover Pattern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Patterns</SelectItem>
              {Object.entries(COVER_PATTERN_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="flex flex-col gap-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[55px] w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <FolderOpen className="size-6" />
            No plans match the current filters.
          </div>
        ) : (
          <div className="h-full flex flex-col rounded-2xl border border-border/20 bg-background overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Fixed header */}
            <div className="shrink-0 flex items-center bg-muted/30 border-b border-border/20 pr-3">
              <div className="flex-1 min-w-0"><SortableHead>Plan Name</SortableHead></div>
              <div className="w-36 shrink-0"><PlainHead>Product Code</PlainHead></div>
              <div className="w-32 shrink-0"><PlainHead>SA Basis</PlainHead></div>
              <div className="w-28 shrink-0"><PlainHead>Cover</PlainHead></div>
              <div className="w-36 shrink-0"><PlainHead>Status</PlainHead></div>
              <div className="w-40 shrink-0"><SortableHead>Client</SortableHead></div>
              <div className="w-32 shrink-0"><PlainHead>Version</PlainHead></div>
              <div className="w-36 shrink-0"><PlainHead>Completeness</PlainHead></div>
              <div className="w-20 shrink-0"><PlainHead>Actions</PlainHead></div>
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {paged.map((plan, idx) => (
                <div
                  key={plan.planId}
                  className={cn(
                    'flex items-center h-[55px] hover:bg-muted/40 transition-colors pr-3',
                    idx < paged.length - 1 && 'border-b border-border/20',
                  )}
                >
                  {/* Plan name */}
                  <div className="flex-1 min-w-0 px-2 flex items-center gap-2">
                    <Layers className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{plan.name}</span>
                  </div>
                  {/* Product code */}
                  <div className="w-36 shrink-0 px-2 text-sm font-mono text-muted-foreground truncate">
                    {plan.productCode ?? '—'}
                  </div>
                  {/* SA basis */}
                  <div className="w-32 shrink-0 px-2 text-sm text-muted-foreground">
                    {SA_BASIS_LABELS[plan.sumAssuredBasis]}
                  </div>
                  {/* Cover pattern */}
                  <div className="w-28 shrink-0 px-2 text-sm text-muted-foreground">
                    {COVER_PATTERN_LABELS[plan.coverPattern]}
                  </div>
                  {/* Status */}
                  <div className="w-36 shrink-0 px-2">
                    <Badge variant={HANDOFF_VARIANT[plan.handoffStatus]} className="text-xs whitespace-nowrap">
                      {HANDOFF_LABELS[plan.handoffStatus]}
                    </Badge>
                  </div>
                  {/* Client */}
                  <div className="w-40 shrink-0 px-2">
                    <button
                      className="text-sm font-medium hover:underline truncate block text-left w-full"
                      onClick={() => router.push(`/rfq2/${plan.rfqId}`)}
                    >
                      {plan.employerName}
                    </button>
                  </div>
                  {/* Version */}
                  <div className="w-32 shrink-0 px-2 text-xs text-muted-foreground truncate">
                    {plan.versionName}
                  </div>
                  {/* Completeness */}
                  <div className="w-36 shrink-0 px-2">
                    <CompletenessBar pct={plan.completeness} />
                  </div>
                  {/* Actions */}
                  <div className="w-20 shrink-0 px-1 flex items-center gap-0.5">
                    <button
                      className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors"
                      title="Open RFQ"
                      onClick={() => router.push(`/rfq2/${plan.rfqId}`)}
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

            {/* Fixed footer — pagination */}
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
                    <span key={`ellipsis-${i}`} className="flex items-center justify-center size-9 text-sm text-muted-foreground">
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

