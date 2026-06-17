'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  CirclePlus, FolderOpen, AlertCircle, RefreshCw,
  LayoutList, FilePen, FileText, FileCheck2, FileX2,
  Search, ArrowUpDown, ArrowRight, Ellipsis, ChevronLeft, ChevronRight,
  Columns3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useRole } from '@/hooks/useRole';
import { canCreateRfq } from '@/lib/permissions';
import { getRfqs } from '@/lib/api/quotation-client';
import { RfqStatus, LobType, type RfqBase, CensusQuality } from '@/lib/types';

const STATUS_LABELS: Record<RfqStatus, string> = {
  [RfqStatus.DATA_PENDING]: 'Data Pending',
  [RfqStatus.CENSUS_CLEANED]: 'Census Cleaned',
  [RfqStatus.EXPERIENCE_NORMALIZED]: 'Experience Normalised',
  [RfqStatus.BENEFITS_READY]: 'Benefits Ready',
  [RfqStatus.PRICING]: 'Pricing',
  [RfqStatus.PRICING_IN_PROGRESS]: 'Pricing In Progress',
  [RfqStatus.UW_REVIEW]: 'UW Review',
  [RfqStatus.QUOTE_GENERATED]: 'Quote Generated',
  [RfqStatus.SHARED]: 'Shared',
  [RfqStatus.NEGOTIATION]: 'Negotiation',
  [RfqStatus.FINAL]: 'Final',
  [RfqStatus.ISSUED]: 'Issued',
  [RfqStatus.REJECTED]: 'Rejected',
};

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'teal' | 'amber' | 'grey';

const STATUS_VARIANT: Record<RfqStatus, BadgeVariant> = {
  [RfqStatus.DATA_PENDING]: 'grey',
  [RfqStatus.CENSUS_CLEANED]: 'secondary',
  [RfqStatus.EXPERIENCE_NORMALIZED]: 'secondary',
  [RfqStatus.BENEFITS_READY]: 'info',
  [RfqStatus.PRICING]: 'amber',
  [RfqStatus.PRICING_IN_PROGRESS]: 'amber',
  [RfqStatus.UW_REVIEW]: 'warning',
  [RfqStatus.QUOTE_GENERATED]: 'teal',
  [RfqStatus.SHARED]: 'teal',
  [RfqStatus.NEGOTIATION]: 'info',
  [RfqStatus.FINAL]: 'success',
  [RfqStatus.ISSUED]: 'success',
  [RfqStatus.REJECTED]: 'destructive',
};

const CENSUS_LABELS: Record<CensusQuality, string> = {
  [CensusQuality.G]: 'Good',
  [CensusQuality.A]: 'Average',
  [CensusQuality.R]: 'Poor',
};
const CENSUS_VARIANT: Record<CensusQuality, BadgeVariant> = {
  [CensusQuality.G]: 'success',
  [CensusQuality.A]: 'warning',
  [CensusQuality.R]: 'destructive',
};

type QuoteTabFilter = 'ALL' | 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'WITHDRAWN';

const DRAFT_STATUSES = new Set<RfqStatus>([
  RfqStatus.DATA_PENDING, RfqStatus.CENSUS_CLEANED,
  RfqStatus.EXPERIENCE_NORMALIZED, RfqStatus.BENEFITS_READY,
]);
const ACTIVE_STATUSES = new Set<RfqStatus>([
  RfqStatus.PRICING, RfqStatus.PRICING_IN_PROGRESS, RfqStatus.UW_REVIEW,
  RfqStatus.QUOTE_GENERATED, RfqStatus.SHARED, RfqStatus.NEGOTIATION,
]);
const FINALIZED_STATUSES = new Set<RfqStatus>([RfqStatus.FINAL, RfqStatus.ISSUED]);
const WITHDRAWN_STATUSES = new Set<RfqStatus>([RfqStatus.REJECTED]);

const QUOTE_TABS: { value: QuoteTabFilter; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'ALL',       label: 'All',        Icon: LayoutList  },
  { value: 'DRAFT',     label: 'Draft',      Icon: FilePen     },
  { value: 'ACTIVE',    label: 'Active',     Icon: FileText    },
  { value: 'FINALIZED', label: 'Finalized',  Icon: FileCheck2  },
  { value: 'WITHDRAWN', label: 'Withdrawn',  Icon: FileX2      },
];

const PAGE_SIZE = 10;

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

function RelativeTime({ iso }: { iso: string }) {
  try {
    return <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(iso), { addSuffix: true })}</span>;
  } catch {
    return <span className="text-muted-foreground text-xs">{iso}</span>;
  }
}

// ─── Kanban board columns (lifecycle order) ───────────────────────────────────

const KANBAN_COLUMNS: { status: RfqStatus; label: string; color: string }[] = [
  { status: RfqStatus.DATA_PENDING, label: 'Data Pending', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.CENSUS_CLEANED, label: 'Census Cleaned', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.BENEFITS_READY, label: 'Benefits Ready', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.PRICING, label: 'Pricing', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.UW_REVIEW, label: 'UW Review', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.QUOTE_GENERATED, label: 'Quote Generated', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.SHARED, label: 'Shared', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.NEGOTIATION, label: 'Negotiation', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.FINAL, label: 'Final', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.ISSUED, label: 'Issued', color: 'bg-muted/40 border-border/40' },
  { status: RfqStatus.REJECTED, label: 'Rejected', color: 'bg-muted/40 border-border/40' },
];

function KanbanBoard({ rfqs, onCardClick }: { rfqs: RfqBase[]; onCardClick: (rfqId: string) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<RfqStatus, RfqBase[]>();
    for (const col of KANBAN_COLUMNS) map.set(col.status, []);
    for (const rfq of rfqs) {
      const list = map.get(rfq.statusStage);
      if (list) list.push(rfq);
      else {
        // Statuses not in columns (e.g. EXPERIENCE_NORMALIZED, PRICING_IN_PROGRESS) → map to nearest
        if (rfq.statusStage === RfqStatus.EXPERIENCE_NORMALIZED) map.get(RfqStatus.CENSUS_CLEANED)!.push(rfq);
        else if (rfq.statusStage === RfqStatus.PRICING_IN_PROGRESS) map.get(RfqStatus.PRICING)!.push(rfq);
        else map.get(RfqStatus.DATA_PENDING)!.push(rfq);
      }
    }
    return map;
  }, [rfqs]);

  // Show primary lifecycle stages always + any other columns with cards
  const primaryStatuses = new Set([
    RfqStatus.DATA_PENDING, RfqStatus.PRICING, RfqStatus.UW_REVIEW,
    RfqStatus.QUOTE_GENERATED, RfqStatus.NEGOTIATION, RfqStatus.FINAL,
  ]);
  const columns = KANBAN_COLUMNS.filter(
    (col) => primaryStatuses.has(col.status) || (grouped.get(col.status)?.length ?? 0) > 0,
  );

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <div className="flex gap-3 h-full pb-2" style={{ minWidth: `${columns.length * 260}px` }}>
        {columns.map((col) => {
          const cards = grouped.get(col.status) ?? [];
          return (
            <div
              key={col.status}
              className={cn('flex flex-col w-[250px] shrink-0 rounded-xl border p-2', col.color)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
                <span className="text-[10px] font-medium text-muted-foreground bg-white/70 rounded-full px-1.5 py-0.5 border border-border/30">
                  {cards.length}
                </span>
              </div>
              {/* Cards */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                {cards.map((rfq) => (
                  <button
                    key={rfq.rfqId}
                    onClick={() => onCardClick(rfq.rfqId)}
                    className="w-full text-left bg-white rounded-lg border border-border/40 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-border transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground truncate">{rfq.rfqId}</span>
                      <Badge variant={STATUS_VARIANT[rfq.statusStage]} className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                        {STATUS_LABELS[rfq.statusStage]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate leading-tight">{rfq.employerName}</p>
                    {rfq.industry && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{rfq.industry}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                      <span className="text-[10px] text-muted-foreground">
                        {rfq.censusSummary?.totalLives ? `${rfq.censusSummary.totalLives.toLocaleString()} lives` : '—'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{rfq.salesOwner?.name ?? '—'}</span>
                    </div>
                  </button>
                ))}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground/60 italic">
                    No quotes
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Rfq2ListPage() {
  const router = useRouter();
  const { currentRole, salesLevel, userId } = useRole();

  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<QuoteTabFilter>('ALL');
  const [lobFilter, setLobFilter] = useState<'ALL' | LobType>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | RfqStatus>('ALL');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRfqs();
      setRfqs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load RFQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rfqs.filter((r) => {
      if (q && !r.employerName.toLowerCase().includes(q) &&
          !r.rfqId.toLowerCase().includes(q) &&
          !(r.brokerCode ?? '').toLowerCase().includes(q)) return false;
      if (tabFilter === 'DRAFT'     && !DRAFT_STATUSES.has(r.statusStage))     return false;
      if (tabFilter === 'ACTIVE'    && !ACTIVE_STATUSES.has(r.statusStage))    return false;
      if (tabFilter === 'FINALIZED' && !FINALIZED_STATUSES.has(r.statusStage)) return false;
      if (tabFilter === 'WITHDRAWN' && !WITHDRAWN_STATUSES.has(r.statusStage)) return false;
      if (lobFilter !== 'ALL' && r.lob !== lobFilter) return false;
      if (stageFilter !== 'ALL' && r.statusStage !== stageFilter) return false;
      if (assignedToMe && r.salesOwner?.userId !== userId) return false;
      return true;
    });
  }, [rfqs, search, tabFilter, lobFilter, stageFilter, assignedToMe, userId]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, tabFilter, lobFilter, stageFilter, assignedToMe]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function getPaginationPages(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40">
        {/* Title block */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">Quotes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage group insurance quote lifecycle end-to-end.</p>
          </div>
          {canCreateRfq(currentRole, salesLevel) && (
            <Button size="sm" onClick={() => router.push('/rfq2/new')} className="gap-1.5 shrink-0">
              <CirclePlus className="size-4" /> New Quote
            </Button>
          )}
        </div>

        {/* Tab bar filter */}
        <div className="flex items-center px-4 pb-3">
          <div className="flex items-center bg-muted rounded-xl p-1">
            {QUOTE_TABS.map(({ value, label, Icon }) => (
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

      {/* Search / Sort / Filter row */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAssignedToMe((p) => !p)}
            className={cn(
              'h-8 px-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap',
              assignedToMe
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border bg-background text-foreground hover:bg-accent',
            )}
          >
            My Quotes
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by client name, RFQ ID, or broker code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-80 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lobFilter} onValueChange={(v) => setLobFilter(v as typeof lobFilter)}>
            <SelectTrigger className="h-8 w-28 text-sm">
              <SelectValue placeholder="LoB" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All LoB</SelectItem>
              {Object.values(LobType).map((lob) => (
                <SelectItem key={lob} value={lob}>{lob}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as typeof stageFilter)}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stages</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center border border-border rounded-lg p-0.5 ml-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center justify-center size-7 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
              title="List view"
            >
              <LayoutList className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center justify-center size-7 rounded-md transition-colors',
                viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
              title="Kanban view"
            >
              <Columns3 className="size-4" />
            </button>
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

      {/* Content — List or Kanban */}
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
            No RFQs match the current filters.
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard rfqs={filtered} onCardClick={(rfqId) => router.push(`/rfq2/${rfqId}`)} />
        ) : (
          <div className="h-full flex flex-col rounded-2xl border border-border/20 bg-background overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Fixed header */}
            <div className="shrink-0 flex items-center bg-muted/30 border-b border-border/20 pr-3">
              <div className="w-36 shrink-0"><SortableHead>RFQ ID</SortableHead></div>
              <div className="flex-1 min-w-0"><SortableHead>Client</SortableHead></div>
              <div className="w-28 shrink-0"><SortableHead>Eff. Date</SortableHead></div>
              <div className="w-16 shrink-0"><PlainHead>LoB</PlainHead></div>
              <div className="w-20 shrink-0 text-right"><div className="flex justify-end"><SortableHead>Lives</SortableHead></div></div>
              <div className="w-40 shrink-0"><SortableHead>Stage</SortableHead></div>
              <div className="w-28 shrink-0"><SortableHead>Owner</SortableHead></div>
              <div className="w-20 shrink-0"><PlainHead>Census</PlainHead></div>
              <div className="w-28 shrink-0"><SortableHead>Updated</SortableHead></div>
              <div className="w-20 shrink-0"><PlainHead>Actions</PlainHead></div>
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {paged.map((rfq, idx) => {
                const census = rfq.censusSummary?.quality.trafficLight;
                return (
                  <div
                    key={rfq.rfqId}
                    className={cn(
                      'flex items-center h-[55px] cursor-pointer hover:bg-muted/40 transition-colors pr-3',
                      idx < paged.length - 1 && 'border-b border-border/20',
                    )}
                    onClick={() => router.push(`/rfq2/${rfq.rfqId}`)}
                  >
                    <div className="w-36 shrink-0 px-2 text-sm font-mono font-medium truncate">{rfq.rfqId}</div>
                    <div className="flex-1 min-w-0 px-2">
                      <div className="text-sm font-medium truncate">{rfq.employerName}</div>
                      {rfq.industry && <div className="text-xs text-muted-foreground truncate">{rfq.industry}</div>}
                    </div>
                    <div className="w-28 shrink-0 px-2 text-sm text-muted-foreground">{rfq.effectiveDate ?? '—'}</div>
                    <div className="w-16 shrink-0 px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg border border-border bg-secondary text-secondary-foreground text-xs font-medium">{rfq.lob}</span>
                    </div>
                    <div className="w-20 shrink-0 px-2 text-sm text-muted-foreground text-right">{rfq.censusSummary?.totalLives?.toLocaleString() ?? '—'}</div>
                    <div className="w-40 shrink-0 px-2">
                      <Badge variant={STATUS_VARIANT[rfq.statusStage]} className="text-xs whitespace-nowrap">
                        {STATUS_LABELS[rfq.statusStage]}
                      </Badge>
                    </div>
                    <div className="w-28 shrink-0 px-2 text-sm text-muted-foreground truncate">{rfq.salesOwner?.name ?? '—'}</div>
                    <div className="w-20 shrink-0 px-2">
                      {census ? (
                        <Badge variant={CENSUS_VARIANT[census]} className="text-xs">{CENSUS_LABELS[census]}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                    <div className="w-28 shrink-0 px-2">
                      <RelativeTime iso={rfq.updatedAt} />
                    </div>
                    <div className="w-20 shrink-0 px-1 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => router.push(`/rfq2/${rfq.rfqId}`)}
                      >
                        <ArrowRight className="size-4" />
                      </button>
                      <button className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors">
                        <Ellipsis className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
