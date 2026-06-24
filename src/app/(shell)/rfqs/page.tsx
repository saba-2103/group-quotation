'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, RefreshCw, Trash2, FolderOpen, Users, AlertCircle, RotateCcw,
} from 'lucide-react';
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
import { canCreateRfq, canDeleteRfq } from '@/lib/permissions';
import { getRfqs, deleteRfq } from '@/lib/api/quotation-client';
import { RfqStatus, type RfqBase, CensusQuality } from '@/lib/types';

// ─── Status label + tone ──────────────────────────────────────────────────────

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-md" />
      ))}
    </div>
  );
}

// ─── Relative time ────────────────────────────────────────────────────────────

function RelativeTime({ iso }: { iso: string }) {
  try {
    return <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(iso), { addSuffix: true })}</span>;
  } catch {
    return <span className="text-muted-foreground text-xs">{iso}</span>;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RfqsPage() {
  const router = useRouter();
  const { currentRole, salesLevel, userId } = useRole();

  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [lobFilter, setLobFilter] = useState<'ALL' | 'GTL'>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | RfqStatus>('ALL');
  const [assignedToMe, setAssignedToMe] = useState(false);

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

  const handleDelete = useCallback(async (rfqId: string) => {
    setDeletingId(rfqId);
    try {
      await deleteRfq(rfqId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  }, [load]);

  const handleReset = useCallback(async () => {
    await fetch('/api/rfqs/_reset', { method: 'POST' });
    await load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rfqs.filter((r) => {
      if (q && !r.employerName.toLowerCase().includes(q) &&
          !r.rfqId.toLowerCase().includes(q) &&
          !(r.intermediaryCode ?? '').toLowerCase().includes(q)) return false;
      if (lobFilter !== 'ALL' && r.lob !== lobFilter) return false;
      if (stageFilter !== 'ALL' && r.statusStage !== stageFilter) return false;
      if (assignedToMe && r.salesOwner?.userId !== userId) return false;
      return true;
    });
  }, [rfqs, search, lobFilter, stageFilter, assignedToMe, userId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header band ── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/40">
        <div>
          <h1 className="text-base font-semibold">RFQ Inbox</h1>
          {!loading && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} of {rfqs.length} record{rfqs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === 'development' && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs text-muted-foreground">
              <RotateCcw className="size-3.5" /> Reset demo
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {canCreateRfq(currentRole, salesLevel) && (
            <Button size="sm" onClick={() => router.push('/rfqs/new')} className="gap-1.5">
              <Plus className="size-3.5" /> Create RFQ
            </Button>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={load} className="text-destructive hover:text-destructive gap-1">
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border/40 bg-muted/30">
        <Input
          placeholder="Search client, RFQ ID or broker code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 text-xs"
        />
        <Select value={lobFilter} onValueChange={(v) => setLobFilter(v as typeof lobFilter)}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue placeholder="LoB" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All LoB</SelectItem>
            <SelectItem value="GTL">GTL</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as typeof stageFilter)}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setAssignedToMe((p) => !p)}
          className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
            assignedToMe
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-input bg-background text-foreground hover:bg-accent'
          }`}
        >
          Assigned to me
        </button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <FolderOpen className="size-6" />
            No RFQs match the current filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-36">RFQ / Broker</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs w-28">Eff. Date</TableHead>
                <TableHead className="text-xs w-16">LoB</TableHead>
                <TableHead className="text-xs w-32">Scheme</TableHead>
                <TableHead className="text-xs w-16 text-right">Lives</TableHead>
                <TableHead className="text-xs w-40">Stage</TableHead>
                <TableHead className="text-xs w-28">Owner</TableHead>
                <TableHead className="text-xs w-20">Census</TableHead>
                <TableHead className="text-xs w-28">Updated</TableHead>
                <TableHead className="text-xs w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rfq) => {
                const census = rfq.censusSummary?.quality.trafficLight;
                return (
                  <TableRow
                    key={rfq.rfqId}
                    className="cursor-pointer hover:bg-muted/40 group"
                    onClick={() => router.push(`/rfqs/${rfq.rfqId}`)}
                  >
                    <TableCell className="text-xs">
                      <span className="font-mono font-medium">{rfq.rfqId}</span>
                      {rfq.intermediaryCode && (
                        <div className="text-muted-foreground text-[10px]">{rfq.intermediaryCode}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{rfq.employerName}</span>
                      {rfq.industry && (
                        <div className="text-muted-foreground text-[10px]">{rfq.industry}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rfq.effectiveDate ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{rfq.lob}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {rfq.schemeType.replace(/_/g, ' ').toLowerCase()}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {rfq.censusSummary?.totalLives?.toLocaleString() ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[rfq.statusStage]} className="text-[10px] whitespace-nowrap">
                        {STATUS_LABELS[rfq.statusStage]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rfq.salesOwner?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      {census ? (
                        <Badge variant={CENSUS_VARIANT[census]} className="text-[10px]">
                          {CENSUS_LABELS[census]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RelativeTime iso={rfq.updatedAt} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon-xs"
                          title="View plans"
                          onClick={() => router.push(`/rfqs/${rfq.rfqId}/plans`)}
                        >
                          <FolderOpen className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-xs"
                          title="View members"
                          onClick={() => router.push(`/rfqs/${rfq.rfqId}/members`)}
                        >
                          <Users className="size-3.5" />
                        </Button>
                        {canDeleteRfq(currentRole) && (
                          <Button
                            variant="ghost" size="icon-xs"
                            title="Delete RFQ"
                            disabled={deletingId === rfq.rfqId}
                            onClick={() => handleDelete(rfq.rfqId)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
