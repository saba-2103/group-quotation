'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Copy,
  FileX,
  Layers,
  MoreHorizontal,
  TriangleAlert,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuoteStatusBadge, VersionStatusBadge } from './QuoteStatusBadge';
import { BUSINESS_TYPE_LABEL, formatDate, formatDateTime } from './quoteHelpers';
import type { QuoteSummary } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────

interface QuotesTableProps {
  summaries: QuoteSummary[];
  isLoading: boolean;
  onWithdraw: (id: string) => void;
  onClone: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: 9 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={9}>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileX className="size-8 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No quotes yet</p>
            <p className="text-xs mt-1">Create your first quote to get started.</p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheme chip
// ─────────────────────────────────────────────────────────────────────────────

const SCHEME_COLOR: Record<string, string> = {
  GTL: 'bg-violet-50 text-violet-700 ring-violet-200',
  GCL: 'bg-blue-50 text-blue-700 ring-blue-200',
  GH: 'bg-teal-50 text-teal-700 ring-teal-200',
};

function SchemeChip({ scheme }: { scheme: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SCHEME_COLOR[scheme] ?? 'bg-muted text-muted-foreground ring-border'}`}
    >
      {scheme}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Versions cell
// ─────────────────────────────────────────────────────────────────────────────

function VersionsCell({
  count,
  activeStatus,
}: {
  count: number;
  activeStatus: QuoteSummary['active_version_status'];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Layers className="size-3" />
        {count}
      </span>
      <VersionStatusBadge status={activeStatus} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Row actions
// ─────────────────────────────────────────────────────────────────────────────

function RowActions({
  summary,
  onWithdraw,
  onClone,
}: {
  summary: QuoteSummary;
  onWithdraw: (id: string) => void;
  onClone: (id: string) => void;
}) {
  const isDraft = summary.status === 'DRAFT';
  const canWithdraw = summary.status === 'DRAFT' || summary.status === 'ACTIVE';

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/quotation/quotes/${summary.id}`} title="View quote">
          <ArrowRight className="size-4" />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" title="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {isDraft && (
            <DropdownMenuItem asChild>
              <Link href={`/quotation/quotes/${summary.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onClone(summary.id)}>
            <Copy className="size-4" />
            Clone
          </DropdownMenuItem>
          {canWithdraw && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onWithdraw(summary.id)}
              >
                <TriangleAlert className="size-4" />
                Withdraw
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main table
// ─────────────────────────────────────────────────────────────────────────────

export function QuotesTable({ summaries, isLoading, onWithdraw, onClone }: QuotesTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <Table>
        <TableHeader>
          <TableRow className="text-xs text-muted-foreground">
            <TableHead className="w-[130px]">Quote #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="w-[70px]">Scheme</TableHead>
            <TableHead className="w-[160px]">Business Type</TableHead>
            <TableHead className="w-[220px]">Versions</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[110px]">Intent Date</TableHead>
            <TableHead className="w-[110px]">Last Updated</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton />
          ) : summaries.length === 0 ? (
            <EmptyState />
          ) : (
            summaries.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => router.push(`/quotation/quotes/${s.id}`)}
              >
                <TableCell>
                  <span className="font-mono text-xs text-foreground">{s.quote_number}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{s.client_name}</span>
                </TableCell>
                <TableCell>
                  <SchemeChip scheme={s.scheme_type} />
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {BUSINESS_TYPE_LABEL[s.business_type]}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <VersionsCell count={s.version_count} activeStatus={s.active_version_status} />
                </TableCell>
                <TableCell>
                  <QuoteStatusBadge status={s.status} />
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.intended_inception_date)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(s.last_updated_at)}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <RowActions summary={s} onWithdraw={onWithdraw} onClone={onClone} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
