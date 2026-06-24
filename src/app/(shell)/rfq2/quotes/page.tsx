'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import {
  CirclePlus, FolderOpen, AlertCircle, RefreshCw,
  LayoutList, FilePen, FileText, FileCheck2, FileX2, FileWarning,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Ellipsis, ChevronLeft, ChevronRight,
  Columns3, Copy, Ban, AlertTriangle, Layers,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRole } from '@/hooks/useRole';
import { canCreateRfq } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/PageHeader';
import { getRfqs } from '@/lib/api/quotation-client';
import { RfqStatus, LobType, type RfqBase, type QuoteVersion, CensusQuality, VersionStatus, BusinessType, IntermediaryType } from '@/lib/types';

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

type QuoteTabFilter = 'ALL' | 'DRAFT' | 'ACTIVE' | 'FINALIZED' | 'EXPIRING' | 'TERMINATED';

const ACTIVE_VER_STATUSES = new Set<VersionStatus>([
  VersionStatus.UW_REFERRED, VersionStatus.EVALUATED,
  VersionStatus.PRICING_REQUESTED, VersionStatus.RATED,
  VersionStatus.SUBMITTED, VersionStatus.SHARED,
  VersionStatus.SENT_TO_CLIENT, VersionStatus.SELECTED,
]);
const TERMINATED_VER_STATUSES = new Set<VersionStatus>([
  VersionStatus.WITHDRAWN, VersionStatus.ARCHIVED,
]);

const QUOTE_TABS: { value: QuoteTabFilter; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'ALL',        label: 'All',        Icon: LayoutList   },
  { value: 'DRAFT',      label: 'Draft',      Icon: FilePen      },
  { value: 'ACTIVE',     label: 'Active',     Icon: FileText     },
  { value: 'FINALIZED',  label: 'Finalized',  Icon: FileCheck2   },
  { value: 'EXPIRING',   label: 'Expiring',   Icon: FileWarning  },
  { value: 'TERMINATED', label: 'Terminated', Icon: FileX2       },
];

const PAGE_SIZE = 10;

type SortCol = 'client' | 'rfqId' | 'premium';
type SortDir = 'asc' | 'desc';

function ColHead({ col, label, sortCol, sortDir, onSort, align = 'left' }: {
  col: SortCol; label: string; sortCol: SortCol | null; sortDir: SortDir;
  onSort: (col: SortCol) => void; align?: 'left' | 'right';
}) {
  const active = sortCol === col;
  const Icon = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <button
      className={cn(
        'flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-foreground whitespace-nowrap w-full transition-colors',
        align === 'right' ? 'justify-end' : 'justify-start',
      )}
      onClick={() => onSort(col)}
    >
      <span>{label}</span>
      <Icon className={cn('size-3.5 shrink-0', !active && 'opacity-40')} />
    </button>
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

// ─── Version-level helpers ─────────────────────────────────────────────────────

/** Pipeline order: most-advanced first */
const VER_PIPELINE = [
  VersionStatus.FROZEN, VersionStatus.SELECTED,
  VersionStatus.SENT_TO_CLIENT, VersionStatus.SHARED,
  VersionStatus.SUBMITTED, VersionStatus.RATED,
  VersionStatus.PRICING_REQUESTED, VersionStatus.EVALUATED,
  VersionStatus.UW_REFERRED, VersionStatus.DRAFT,
  VersionStatus.WITHDRAWN, VersionStatus.ARCHIVED,
];

const VER_STATUS_LABEL: Partial<Record<VersionStatus, string>> = {
  [VersionStatus.DRAFT]:             'Draft',
  [VersionStatus.UW_REFERRED]:       'UW Referred',
  [VersionStatus.EVALUATED]:         'Evaluated',
  [VersionStatus.PRICING_REQUESTED]: 'Pricing Req.',
  [VersionStatus.RATED]:             'Rated',
  [VersionStatus.SUBMITTED]:         'Submitted',
  [VersionStatus.SHARED]:            'Sent to Client',
  [VersionStatus.SENT_TO_CLIENT]:    'Sent to Client',
  [VersionStatus.SELECTED]:          'Selected',
  [VersionStatus.FROZEN]:            'Active',
  [VersionStatus.ARCHIVED]:          'Archived',
  [VersionStatus.WITHDRAWN]:         'Withdrawn',
};

const VER_STATUS_VARIANT: Partial<Record<VersionStatus, BadgeVariant>> = {
  [VersionStatus.DRAFT]:             'grey',
  [VersionStatus.UW_REFERRED]:       'amber',
  [VersionStatus.EVALUATED]:         'info',
  [VersionStatus.PRICING_REQUESTED]: 'amber',
  [VersionStatus.RATED]:             'info',
  [VersionStatus.SUBMITTED]:         'info',
  [VersionStatus.SHARED]:            'info',
  [VersionStatus.SENT_TO_CLIENT]:    'info',
  [VersionStatus.SELECTED]:          'success',
  [VersionStatus.FROZEN]:            'success',
  [VersionStatus.ARCHIVED]:          'grey',
  [VersionStatus.WITHDRAWN]:         'destructive',
};

type ActionDef =
  | { kind: 'button'; label: string; variant: 'default' | 'secondary' | 'outline'; cls?: string }
  | { kind: 'time' }
  | { kind: 'none' };

const ACTION_DEF: Partial<Record<VersionStatus, ActionDef>> = {
  [VersionStatus.DRAFT]:             { kind: 'none' },
  [VersionStatus.UW_REFERRED]:       { kind: 'time' },
  [VersionStatus.EVALUATED]:         { kind: 'button', label: 'Request Pricing', variant: 'secondary' },
  [VersionStatus.PRICING_REQUESTED]: { kind: 'time' },
  [VersionStatus.RATED]:             { kind: 'button', label: 'Submit Quote',      variant: 'default' },
  [VersionStatus.SUBMITTED]:         { kind: 'button', label: 'Send to Client',    variant: 'default' },
  [VersionStatus.SHARED]:            { kind: 'button', label: 'Follow Up',         variant: 'outline' },
  [VersionStatus.SENT_TO_CLIENT]:    { kind: 'button', label: 'Follow Up',         variant: 'outline' },
  [VersionStatus.SELECTED]:          { kind: 'button', label: 'Finalize Version',  variant: 'default', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  [VersionStatus.FROZEN]:            { kind: 'button', label: 'Issue Policy',      variant: 'default', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  [VersionStatus.ARCHIVED]:          { kind: 'button', label: 'Request Pricing',   variant: 'secondary' },
  [VersionStatus.WITHDRAWN]:         { kind: 'button', label: 'Follow Up',         variant: 'outline' },
};

const BIZ_LABEL: Partial<Record<BusinessType, string>> = {
  [BusinessType.NEW]:      'New',
  [BusinessType.RENEWAL]:  'Renewal',
  [BusinessType.TAKEOVER]: 'Takeover',
};

function getHighestVersion(rfq: RfqBase) {
  if (!rfq.quoteVersions?.length) return null;
  return rfq.quoteVersions.reduce((best, v) => {
    const bi = VER_PIPELINE.indexOf(best.status as VersionStatus);
    const vi = VER_PIPELINE.indexOf(v.status as VersionStatus);
    if (vi === -1) return best;
    if (bi === -1 || vi < bi) return v;
    // Same pipeline position — pick latest version number
    if (vi === bi) return (v.versionNo ?? 0) > (best.versionNo ?? 0) ? v : best;
    return best;
  });
}

function getActivePremium(rfq: RfqBase): number | null {
  if (!rfq.activeVersionId || !rfq.actuaryPricing?.byVersion) return null;
  return rfq.actuaryPricing.byVersion[rfq.activeVersionId]?.finalPremiumInclGst ?? null;
}

function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Returns days until expiry for a version, or null if no expiryDate. Negative = already expired. */
function getExpiryDays(ver: QuoteVersion | null): number | null {
  if (!ver?.expiryDate) return null;
  return differenceInDays(new Date(ver.expiryDate), new Date());
}

/** Compact relative time: "2d ago", "today" */
function fmtRelative(iso: string): string {
  const d = differenceInDays(new Date(), new Date(iso));
  if (d <= 0) return 'today';
  return `${d}d ago`;
}

/** Quote needs attention if its highest version has a button action or is expiring within 7 days */
function hasButtonAction(rfq: RfqBase): boolean {
  const hv = getHighestVersion(rfq);
  if (!hv) return false;
  const def = ACTION_DEF[hv.status as VersionStatus];
  if (def?.kind === 'button') return true;
  const expiryDays = getExpiryDays(hv);
  return expiryDays !== null && expiryDays <= 7;
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
  const [bizTypeFilter, setBizTypeFilter] = useState<'ALL' | BusinessType>('ALL');
  const [needsAttention, setNeedsAttention] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      if (sortDir === 'desc') { setSortDir('asc'); }
      else { setSortCol(null); setSortDir('desc'); }
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  }

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

  const needsAttentionCount = useMemo(
    () => rfqs.filter(hasButtonAction).length,
    [rfqs],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rfqs.filter((r) => {
      if (q && !r.employerName.toLowerCase().includes(q) &&
          !r.rfqId.toLowerCase().includes(q) &&
          !(r.intermediaryCode ?? '').toLowerCase().includes(q)) return false;
      const hv       = getHighestVersion(r);
      const hvStatus = hv?.status as VersionStatus | undefined;
      const expDays  = getExpiryDays(hv);
      if (tabFilter === 'DRAFT'      && hvStatus !== VersionStatus.DRAFT) return false;
      if (tabFilter === 'ACTIVE'     && (!hvStatus || !ACTIVE_VER_STATUSES.has(hvStatus))) return false;
      if (tabFilter === 'FINALIZED'  && hvStatus !== VersionStatus.FROZEN) return false;
      if (tabFilter === 'EXPIRING'   && !(expDays !== null && expDays >= 0 && expDays <= 7)) return false;
      if (tabFilter === 'TERMINATED' && !TERMINATED_VER_STATUSES.has(hvStatus!) && !(expDays !== null && expDays < 0)) return false;
      if (lobFilter !== 'ALL' && r.lob !== lobFilter) return false;
      if (bizTypeFilter !== 'ALL' && r.businessType !== bizTypeFilter) return false;
      if (needsAttention && !hasButtonAction(r)) return false;
      return true;
    });
  }, [rfqs, search, tabFilter, lobFilter, bizTypeFilter, needsAttention]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'desc' ? -1 : 1;
    if (sortCol === null) {
      return arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return arr.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'client':  cmp = a.employerName.localeCompare(b.employerName); break;
        case 'rfqId':   cmp = a.rfqId.localeCompare(b.rfqId); break;
        case 'premium': cmp = (getActivePremium(a) ?? -1) - (getActivePremium(b) ?? -1); break;
      }
      return cmp * dir;
    });
  }, [filtered, sortCol, sortDir]);

  // Reset to page 1 whenever filters or sort column changes
  useEffect(() => { setPage(1); }, [search, tabFilter, lobFilter, bizTypeFilter, needsAttention, sortCol]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <PageHeader
          title="Quotes"
          subtitle="Manage group insurance quote lifecycle end-to-end."
          actions={
            canCreateRfq(currentRole, salesLevel) ? (
              <Button size="sm" onClick={() => router.push('/rfq2/new')} className="gap-1.5">
                <CirclePlus className="size-4" /> New Quote
              </Button>
            ) : undefined
          }
        />

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
        <div className="flex-1 min-w-0 flex items-center gap-3 mr-2">
          <button
            onClick={() => setNeedsAttention((p) => !p)}
            className={cn(
              'h-8 px-3 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
              needsAttention
                ? 'bg-amber-50 border-amber-500 text-amber-700'
                : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50',
            )}
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            Needs Attention
            {needsAttentionCount > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[11px] font-semibold px-1 transition-colors',
                needsAttention
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 text-amber-700',
              )}>
                {needsAttentionCount}
              </span>
            )}
          </button>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by client name, RFQ ID, or broker code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full min-w-[140px] pl-8 text-sm"
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
          <Select value={bizTypeFilter} onValueChange={(v) => setBizTypeFilter(v as typeof bizTypeFilter)}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Business Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value={BusinessType.NEW}>New Business</SelectItem>
              <SelectItem value={BusinessType.RENEWAL}>Renewal</SelectItem>
              <SelectItem value={BusinessType.TAKEOVER}>Takeover</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')} className="ml-1">
            <TabsList variant="default">
              <TabsTrigger value="list" variant="default" className="w-8 px-0" title="List view">
                <LayoutList className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="kanban" variant="default" className="w-8 px-0" title="Kanban view">
                <Columns3 className="size-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
            {/* Horizontal scroll — header + rows scroll together; footer stays pinned */}
            <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="flex flex-col min-w-[930px] h-full">
            {/* Header */}
            <div className="shrink-0 flex items-center bg-muted/30 border-b border-border/20 pr-2">
              <div className="min-w-[160px] flex-[3]"><ColHead col="client" label="Client" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} /></div>
              <div className="min-w-[112px] flex-1"><ColHead col="rfqId" label="Quote #" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} /></div>
              <div className="min-w-[140px] flex-1"><PlainHead>LoB / Type</PlainHead></div>
              <div className="min-w-[200px] flex-[2]"><PlainHead>Active Version</PlainHead></div>
              <div className="min-w-[112px] flex-1"><ColHead col="premium" label="Premium" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" /></div>
              <div className="min-w-[150px] flex-[2]"><PlainHead>Action Needed</PlainHead></div>
              <div className="w-14 shrink-0"><PlainHead>Actions</PlainHead></div>
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {paged.map((rfq, idx) => {
                const highestVer = getHighestVersion(rfq);
                const activeVer  = rfq.quoteVersions?.find(v => v.id === rfq.activeVersionId) ?? highestVer;
                const premium    = getActivePremium(rfq);
                const expiryDays = getExpiryDays(highestVer);
                return (
                  <div
                    key={rfq.rfqId}
                    className={cn(
                      'flex items-center min-h-[60px] cursor-pointer hover:bg-muted/40 transition-colors pr-2',
                      idx < paged.length - 1 && 'border-b border-border/20',
                    )}
                    onClick={() => router.push(`/rfq2/${rfq.rfqId}`)}
                  >
                    {/* Client */}
                    <div className="min-w-[160px] flex-[3] px-2 py-3">
                      <div className="text-sm font-medium truncate leading-tight">{rfq.employerName}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {rfq.intermediaryType && rfq.intermediaryType !== IntermediaryType.BROKER
                          ? rfq.intermediaryType.toUpperCase()
                          : (rfq.brokerName ?? '—')}
                      </div>
                    </div>
                    {/* Quote # */}
                    <div className="min-w-[112px] flex-1 px-2 text-xs font-mono text-muted-foreground truncate">{rfq.rfqId}</div>
                    {/* LoB / Type */}
                    <div className="min-w-[140px] flex-1 px-2 flex items-center gap-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{rfq.lob}</Badge>
                      <Badge variant="outline" className="text-xs">{BIZ_LABEL[rfq.businessType as BusinessType] ?? rfq.businessType}</Badge>
                    </div>
                    {/* Active Version */}
                    <div className="min-w-[200px] flex-[2] px-2 flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs shrink-0 flex items-center gap-1 px-1.5">
                        <Layers className="size-3" />
                        {rfq.quoteVersions?.length ?? 0}
                      </Badge>
                      {activeVer ? (
                        <Badge
                          variant={VER_STATUS_VARIANT[activeVer.status as VersionStatus] ?? 'secondary'}
                          className="text-xs whitespace-nowrap"
                        >
                          V{activeVer.versionNo} — {VER_STATUS_LABEL[activeVer.status as VersionStatus]}
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    {/* Premium */}
                    <div className="min-w-[112px] flex-1 px-2 text-right">
                      {premium
                        ? <span className="text-sm font-medium">{fmtINR(premium)}</span>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                    {/* Action Needed */}
                    <div className="min-w-[150px] flex-[2] px-2 flex flex-col gap-1 items-start" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        if (!highestVer) return <span className="text-muted-foreground text-xs">—</span>;
                        const def = ACTION_DEF[highestVer.status as VersionStatus] ?? { kind: 'none' as const };
                        return (
                          <>
                            {def.kind === 'button' && expiryDays === null && (
                              <Button
                                size="sm"
                                variant={def.variant}
                                className={cn('h-7 text-xs px-2.5', def.cls)}
                              >
                                {def.label}
                              </Button>
                            )}
                            {def.kind === 'time' && (
                              <span className="text-xs font-medium text-amber-600">{fmtRelative(rfq.updatedAt)}</span>
                            )}
                            {expiryDays !== null && expiryDays <= 7 && (
                              <Badge
                                variant="outline"
                                className="text-xs font-medium bg-red-50 border-red-300 text-red-700 w-fit"
                              >
                                {expiryDays <= 0 ? 'Expired' : `Exp. in ${expiryDays}d`}
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {/* Actions */}
                    <div className="w-14 shrink-0 px-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => {}}>
                            <Copy className="size-4 mr-2" /> Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => {}}
                          >
                            <Ban className="size-4 mr-2" /> Withdraw
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            </div>

            {/* Fixed footer — pagination */}
            <div className="shrink-0 flex items-center justify-between border-t border-border/20 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
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
