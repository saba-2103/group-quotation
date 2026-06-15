'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  FolderOpen, AlertCircle, RefreshCw,
  LayoutList, FileText, FileCheck, FileClock, FileX,
  Search, ArrowUpDown, ArrowRight, Ellipsis, ChevronLeft, ChevronRight,
  Download,
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
  DocumentType, DocumentStatus,
  type Document as RfqDocument, type RfqBase,
} from '@/lib/types';

// ─── Metadata ────────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SIGNED_PROPOSAL]:       'Signed Proposal',
  [DocumentType.QUOTE_ACCEPTANCE]:      'Quote Acceptance',
  [DocumentType.BOARD_RESOLUTION]:      'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]:'Placement Letter',
  [DocumentType.OTHER]:                 'Other',
};

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'info' | 'teal' | 'amber' | 'grey';

const DOC_STATUS_VARIANT: Record<DocumentStatus, BadgeVariant> = {
  [DocumentStatus.DRAFT]:    'warning',
  [DocumentStatus.SIGNED]:   'teal',
  [DocumentStatus.APPROVED]: 'success',
};

// ─── Tab config ───────────────────────────────────────────────────────────────

type DocTab = 'ALL' | 'DRAFT' | 'SIGNED' | 'APPROVED';

const DOC_TABS: { value: DocTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: 'ALL',      label: 'All',      Icon: LayoutList },
  { value: 'DRAFT',    label: 'Draft',    Icon: FileClock  },
  { value: 'SIGNED',   label: 'Signed',   Icon: FileCheck  },
  { value: 'APPROVED', label: 'Approved', Icon: FileText   },
];

// ─── Enriched row type ────────────────────────────────────────────────────────

interface DocRow extends RfqDocument {
  employerName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

function RelativeTime({ iso }: { iso: string }) {
  try {
    return <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(iso), { addSuffix: true })}</span>;
  } catch {
    return <span className="text-muted-foreground text-xs">{iso}</span>;
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

export default function DocumentsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<DocTab>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rfqs: RfqBase[] = await getRfqs();
      // Documents live inside each RFQ bundle; for the list we use the bundle
      // endpoint per rfq. However the lightweight getRfqs() returns documents
      // embedded in RfqBase via the bundle handler. Gather from quoteVersions
      // since documents are in the bundle. We fetch bundles for all rfqs.
      const bundles = await Promise.all(
        rfqs.map((r) =>
          fetch(`/api/rfqs/${r.rfqId}/bundle`)
            .then((res) => res.json())
            .catch(() => null),
        ),
      );
      const collected: DocRow[] = [];
      bundles.forEach((bundle, i) => {
        if (!bundle?.documents) return;
        (bundle.documents as RfqDocument[]).forEach((doc) => {
          collected.push({ ...doc, employerName: rfqs[i].employerName });
        });
      });
      setRows(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((d) => {
      if (q &&
        !d.name.toLowerCase().includes(q) &&
        !d.rfqId.toLowerCase().includes(q) &&
        !d.employerName.toLowerCase().includes(q)) return false;
      if (tabFilter === 'DRAFT'    && d.status !== DocumentStatus.DRAFT)    return false;
      if (tabFilter === 'SIGNED'   && d.status !== DocumentStatus.SIGNED)   return false;
      if (tabFilter === 'APPROVED' && d.status !== DocumentStatus.APPROVED) return false;
      if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
      return true;
    });
  }, [rows, search, tabFilter, typeFilter]);

  useEffect(() => { setPage(1); }, [search, tabFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40">
        {/* Title block */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight">Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Policy letters, issuance docs, signed proposals and all generated documents.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center px-4 pb-3">
          <div className="flex items-center bg-muted rounded-xl p-1">
            {DOC_TABS.map(({ value, label, Icon }) => (
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
              placeholder="Search by document name, RFQ ID, or client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-80 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {Object.entries(DOC_TYPE_LABELS).map(([k, label]) => (
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
            No documents match the current filters.
          </div>
        ) : (
          <div className="h-full flex flex-col rounded-2xl border border-border/20 bg-background overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {/* Fixed header */}
            <div className="shrink-0 flex items-center bg-muted/30 border-b border-border/20 pr-3">
              <div className="flex-1 min-w-0"><SortableHead>Document Name</SortableHead></div>
              <div className="w-40 shrink-0"><PlainHead>Type</PlainHead></div>
              <div className="w-32 shrink-0"><PlainHead>Status</PlainHead></div>
              <div className="w-44 shrink-0"><SortableHead>Client (RFQ)</SortableHead></div>
              <div className="w-28 shrink-0"><PlainHead>Source</PlainHead></div>
              <div className="w-32 shrink-0"><SortableHead>Uploaded</SortableHead></div>
              <div className="w-24 shrink-0"><PlainHead>Actions</PlainHead></div>
            </div>

            {/* Scrollable rows */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {paged.map((doc, idx) => (
                <div
                  key={doc.documentId}
                  className={cn(
                    'flex items-center h-[55px] hover:bg-muted/40 transition-colors pr-3',
                    idx < paged.length - 1 && 'border-b border-border/20',
                  )}
                >
                  {/* Name */}
                  <div className="flex-1 min-w-0 px-2 flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{doc.name}</span>
                  </div>
                  {/* Type */}
                  <div className="w-40 shrink-0 px-2 text-sm text-muted-foreground truncate">
                    {DOC_TYPE_LABELS[doc.type]}
                  </div>
                  {/* Status */}
                  <div className="w-32 shrink-0 px-2">
                    <Badge variant={DOC_STATUS_VARIANT[doc.status]} className="text-xs capitalize">
                      {doc.status.toLowerCase()}
                    </Badge>
                  </div>
                  {/* Client */}
                  <div className="w-44 shrink-0 px-2">
                    <button
                      className="text-sm font-medium hover:underline truncate block text-left w-full"
                      onClick={() => router.push(`/rfq2/${doc.rfqId}`)}
                    >
                      {doc.employerName}
                    </button>
                    <div className="text-xs text-muted-foreground font-mono">{doc.rfqId}</div>
                  </div>
                  {/* Source */}
                  <div className="w-28 shrink-0 px-2">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-medium',
                      doc.source === 'generated'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-secondary border-border text-secondary-foreground',
                    )}>
                      {doc.source === 'generated' ? 'Generated' : 'Uploaded'}
                    </span>
                  </div>
                  {/* Uploaded */}
                  <div className="w-32 shrink-0 px-2">
                    <RelativeTime iso={doc.uploadedAt} />
                  </div>
                  {/* Actions */}
                  <div className="w-24 shrink-0 px-1 flex items-center gap-0.5">
                    <button className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors" title="Download">
                      <Download className="size-4" />
                    </button>
                    <button
                      className="flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors"
                      title="Open RFQ"
                      onClick={() => router.push(`/rfq2/${doc.rfqId}`)}
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

