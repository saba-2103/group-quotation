'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SALES_PIPELINE_QUOTES,
  type SalesPipelineQuote,
  type SalesPipelineStatus,
} from '@/mocks/sales-dashboard';

// ─── Demo "today" ─────────────────────────────────────────────────────────────
const TODAY = new Date('2026-06-18T12:00:00Z');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysDiff(from: string, to: Date = TODAY): number {
  return Math.round((to.getTime() - new Date(from).getTime()) / 86_400_000);
}
function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86_400_000);
}
function fmtINR(n: number): string {
  // Format with lakh abbreviation for readability: ₹4.2L, ₹32.1L, ₹1.2Cr
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
const TERMINAL: SalesPipelineStatus[] = ['FINALIZED', 'WITHDRAWN', 'EXPIRED'];
const isTerminal = (s: SalesPipelineStatus) => TERMINAL.includes(s);

// ─── Enrichment data (broker, business type, updatedAt) ───────────────────────
type BusinessType = 'NEW' | 'RENEWAL' | 'TAKEOVER';
interface EnrichRow { brokerName?: string; businessType: BusinessType; updatedAt: string }
const ENRICHMENT: Record<string, EnrichRow> = {
  'rfq-s001': { brokerName: 'Aon India',       businessType: 'RENEWAL',  updatedAt: '2026-06-16T10:30:00Z' },
  'rfq-s002': { brokerName: 'WTW India',        businessType: 'NEW',      updatedAt: '2026-06-17T09:00:00Z' },
  'rfq-s003': {                                  businessType: 'NEW',      updatedAt: '2026-06-15T11:00:00Z' },
  'rfq-s004': { brokerName: 'Marsh India',      businessType: 'RENEWAL',  updatedAt: '2026-06-14T09:00:00Z' },
  'rfq-s005': { brokerName: 'Gallagher India',  businessType: 'NEW',      updatedAt: '2026-06-13T11:00:00Z' },
  'rfq-s006': { brokerName: 'Aon India',        businessType: 'RENEWAL',  updatedAt: '2026-06-17T15:00:00Z' },
  'rfq-s007': {                                  businessType: 'NEW',      updatedAt: '2026-06-05T09:00:00Z' }, // stale — lapse risk
  'rfq-s008': { brokerName: 'WTW India',        businessType: 'NEW',      updatedAt: '2026-06-17T09:00:00Z' },
  'rfq-s009': {                                  businessType: 'TAKEOVER', updatedAt: '2026-05-28T09:00:00Z' }, // very stale — lapse risk
  'rfq-s010': { brokerName: 'JLT India',        businessType: 'RENEWAL',  updatedAt: '2026-06-16T12:00:00Z' },
  'rfq-s011': { brokerName: 'Lockton India',    businessType: 'NEW',      updatedAt: '2026-06-17T09:00:00Z' },
  'rfq-s012': { brokerName: 'Aon India',        businessType: 'RENEWAL',  updatedAt: '2026-06-10T09:00:00Z' },
  'rfq-s013': { brokerName: 'WTW India',        businessType: 'TAKEOVER', updatedAt: '2026-06-16T09:00:00Z' },
  'rfq-s020': { brokerName: 'Aon India',        businessType: 'RENEWAL',  updatedAt: '2026-06-13T10:00:00Z' },
  'rfq-s021': {                                  businessType: 'NEW',      updatedAt: '2026-06-08T11:00:00Z' },
  'rfq-s022': { brokerName: 'Marsh India',      businessType: 'RENEWAL',  updatedAt: '2026-05-29T14:00:00Z' },
  'rfq-s030': {                                  businessType: 'NEW',      updatedAt: '2026-06-10T10:00:00Z' },
  'rfq-s031': {                                  businessType: 'TAKEOVER', updatedAt: '2026-06-05T09:00:00Z' },
};
const getEnrich = (id: string): EnrichRow =>
  ENRICHMENT[id] ?? { businessType: 'NEW', updatedAt: TODAY.toISOString() };

// ─── Active version display ───────────────────────────────────────────────────
interface VersionDisplay { label: string; chipClass: string; detail?: string }
function getVersionDisplay(q: SalesPipelineQuote): VersionDisplay {
  const ver = q.activeVersionLabel;
  const premium = q.premiumInclGst;
  switch (q.pipelineStatus) {
    case 'DRAFT':          return { label: `${ver} · Draft`,            chipClass: 'bg-slate-100 text-slate-600' };
    case 'IN_PROGRESS':    return { label: `${ver} · Active`,           chipClass: 'bg-indigo-50 text-indigo-700' };
    case 'REFERRED_UW':    return { label: `${ver} · With Underwriter`, chipClass: 'bg-amber-50 text-amber-700' };
    case 'REFERRED_PRICING': return { label: `${ver} · With Actuary`,  chipClass: 'bg-amber-50 text-amber-700' };
    case 'RATED':          return { label: `${ver} · Priced${premium ? ` ${fmtINR(premium)}` : ''}`, chipClass: 'bg-green-50 text-green-700' };
    case 'SUBMITTED':      return { label: `${ver} · Submitted`,        chipClass: 'bg-blue-50 text-blue-700' };
    case 'SENT_TO_CLIENT': return { label: `${ver} · Sent to Client`,   chipClass: 'bg-blue-50 text-blue-700' };
    case 'ACCEPTED':       return { label: `${ver} · Accepted`,         chipClass: 'bg-emerald-600 text-white' };
    case 'FINALIZED':      return { label: `${ver} · Finalised`,        chipClass: 'bg-emerald-50 text-emerald-700' };
    case 'WITHDRAWN':      return { label: `${ver} · Withdrawn`,        chipClass: 'bg-slate-100 text-slate-500' };
    case 'EXPIRED':        return { label: `${ver} · Expired`,          chipClass: 'bg-slate-100 text-slate-500' };
    default:               return { label: ver,                          chipClass: 'bg-slate-100 text-slate-600' };
  }
}

// ─── Action needed ────────────────────────────────────────────────────────────
interface ActionNeeded { label: string; chipClass: string; buttonClass: string; priority: number }
function getActionNeeded(q: SalesPipelineQuote): ActionNeeded | null {
  if (q.pipelineStatus === 'ACCEPTED') {
    return { label: 'Finalise', chipClass: 'bg-emerald-600 text-white', buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white', priority: 1 };
  }
  if (q.pipelineStatus === 'RATED') {
    return { label: 'Submit', chipClass: 'bg-indigo-600 text-white', buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white', priority: 2 };
  }
  if (q.pipelineStatus === 'SUBMITTED') {
    return { label: 'Send to Client', chipClass: 'bg-blue-600 text-white', buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white', priority: 3 };
  }
  if ((q.pipelineStatus === 'REFERRED_UW' || q.pipelineStatus === 'REFERRED_PRICING') && q.referredAt && daysDiff(q.referredAt) > 3) {
    const d = daysDiff(q.referredAt);
    return { label: `Referral ${d}d`, chipClass: 'bg-amber-100 text-amber-800', buttonClass: '', priority: 4 };
  }
  const days = daysUntil(q.expiresAt);
  if (!isTerminal(q.pipelineStatus) && days >= 0 && days <= 7) {
    return { label: `Expiring ${days}d`, chipClass: 'bg-red-100 text-red-700', buttonClass: '', priority: 5 };
  }
  if (q.pipelineStatus === 'SENT_TO_CLIENT' && q.sentAt && daysDiff(q.sentAt) > 5) {
    return { label: 'Follow Up', chipClass: 'border border-slate-300 text-slate-600 bg-transparent', buttonClass: '', priority: 6 };
  }
  return null;
}

// ─── Lapse risk border ────────────────────────────────────────────────────────
function getLapseRisk(q: SalesPipelineQuote): 'red' | 'amber' | null {
  if (isTerminal(q.pipelineStatus)) return null;
  const days = daysUntil(q.expiresAt);
  if (days >= 0 && days <= 14) return 'amber';
  const enrich = getEnrich(q.rfqId);
  if ((q.pipelineStatus === 'DRAFT' || q.pipelineStatus === 'IN_PROGRESS') && daysDiff(enrich.updatedAt) > 10) return 'red';
  return null;
}

// ─── Needs Attention check ────────────────────────────────────────────────────
function needsAttention(q: SalesPipelineQuote): boolean {
  return getActionNeeded(q) !== null;
}

// ─── Status grouping for filter ───────────────────────────────────────────────
type StatusGroup = 'Draft' | 'Active' | 'Finalized' | 'Withdrawn' | 'Expired';
function getStatusGroup(s: SalesPipelineStatus): StatusGroup {
  if (s === 'DRAFT') return 'Draft';
  if (s === 'FINALIZED') return 'Finalized';
  if (s === 'WITHDRAWN') return 'Withdrawn';
  if (s === 'EXPIRED') return 'Expired';
  return 'Active';
}

// ─── Scheme chip colors ───────────────────────────────────────────────────────
const SCHEME_CLS: Record<string, string> = {
  GTL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  GCL: 'bg-teal-50 text-teal-700 border-teal-200',
  GH:  'bg-purple-50 text-purple-700 border-purple-200',
};
const BIZ_CLS: Record<BusinessType, string> = {
  NEW:      'bg-slate-100 text-slate-600',
  RENEWAL:  'bg-orange-50 text-orange-700',
  TAKEOVER: 'bg-violet-50 text-violet-700',
};
const BIZ_LABEL: Record<BusinessType, string> = { NEW: 'New', RENEWAL: 'Renewal', TAKEOVER: 'Takeover' };

// ─── Sort options ─────────────────────────────────────────────────────────────
type SortKey = 'updated' | 'expiry' | 'client' | 'pipeline_value';
const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Last Updated',
  expiry: 'Expiry Date',
  client: 'Client Name',
  pipeline_value: 'Pipeline Value',
};

// ─── Current user ─────────────────────────────────────────────────────────────
const CURRENT_USER_ID = 'usr-101';

// ─── Status filter groups ─────────────────────────────────────────────────────
const STATUS_GROUPS: StatusGroup[] = ['Draft', 'Active', 'Finalized', 'Withdrawn', 'Expired'];
const SCHEMES = ['GTL', 'GCL', 'GH'] as const;

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SalesQuotesPage() {
  const router = useRouter();

  const [myQuotes, setMyQuotes] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<StatusGroup>>(new Set());
  const [schemeFilter, setSchemeFilter] = useState<Set<string>>(new Set());
  const [needsAttentionFilter, setNeedsAttentionFilter] = useState(false);
  const [sort, setSort] = useState<SortKey>('updated');

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = SALES_PIPELINE_QUOTES;

    if (myQuotes) list = list.filter((q) => q.ownerId === CURRENT_USER_ID);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (q) => q.employerName.toLowerCase().includes(term) || q.quoteNo.toLowerCase().includes(term),
      );
    }
    if (statusFilter.size > 0) {
      list = list.filter((q) => statusFilter.has(getStatusGroup(q.pipelineStatus)));
    }
    if (schemeFilter.size > 0) {
      list = list.filter((q) => schemeFilter.has(q.scheme));
    }
    if (needsAttentionFilter) {
      list = list.filter(needsAttention);
    }

    // Sort
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'updated':
          return new Date(getEnrich(b.rfqId).updatedAt).getTime() - new Date(getEnrich(a.rfqId).updatedAt).getTime();
        case 'expiry':
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        case 'client':
          return a.employerName.localeCompare(b.employerName);
        case 'pipeline_value':
          return (b.premiumInclGst ?? 0) - (a.premiumInclGst ?? 0);
        default:
          return 0;
      }
    });
  }, [myQuotes, search, statusFilter, schemeFilter, needsAttentionFilter, sort]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const activeList = filtered.filter((q) => !isTerminal(q.pipelineStatus));
    return {
      total: filtered.length,
      needAction: filtered.filter(needsAttention).length,
      expiringSoon: activeList.filter((q) => { const d = daysUntil(q.expiresAt); return d >= 0 && d <= 14; }).length,
      pipelineValue: activeList.reduce((s, q) => s + (q.premiumInclGst ?? 0), 0),
    };
  }, [filtered]);

  // ── Attention count (for badge, unfiltered) ──────────────────────────────
  const attentionCount = useMemo(
    () => SALES_PIPELINE_QUOTES.filter((q) => q.ownerId === CURRENT_USER_ID && needsAttention(q)).length,
    [],
  );

  function toggleStatus(g: StatusGroup) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  }
  function toggleScheme(s: string) {
    setSchemeFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/60">
        <h1 className="text-lg font-semibold">Quotes</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-sm">
              <Plus className="size-3.5" />
              New Quote
              <ChevronDown className="size-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Manual entry</DropdownMenuItem>
            <DropdownMenuItem>Upload from Broker</DropdownMenuItem>
            <DropdownMenuItem>Parse from Email</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filter row ──────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-2.5 border-b border-border/40 flex items-center gap-2 flex-wrap">
        {/* My Quotes toggle */}
        <button
          onClick={() => setMyQuotes((v) => !v)}
          className={cn(
            'h-7 px-3 rounded-full text-xs font-medium border transition-colors',
            myQuotes
              ? 'bg-foreground text-background border-foreground'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          My Quotes
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes…"
            className="h-7 pl-8 pr-3 text-xs w-44"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {STATUS_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => toggleStatus(g)}
              className={cn(
                'h-6 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
                statusFilter.has(g)
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Scheme filter pills */}
        <div className="flex items-center gap-1">
          {SCHEMES.map((s) => (
            <button
              key={s}
              onClick={() => toggleScheme(s)}
              className={cn(
                'h-6 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
                schemeFilter.has(s)
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Needs Attention toggle */}
        <button
          onClick={() => setNeedsAttentionFilter((v) => !v)}
          className={cn(
            'h-7 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
            needsAttentionFilter
              ? 'bg-amber-500 text-white border-amber-500'
              : 'border-amber-300 text-amber-700 hover:bg-amber-50',
          )}
        >
          <AlertTriangle className="size-3" />
          Needs Attention
          <span className={cn(
            'rounded-full px-1.5 py-0 text-[10px] font-bold',
            needsAttentionFilter ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700',
          )}>
            {attentionCount}
          </span>
        </button>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5">
              {SORT_LABELS[sort]}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <DropdownMenuItem key={k} onClick={() => setSort(k)} className={cn(sort === k && 'font-medium')}>
                {SORT_LABELS[k]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-1.5 border-b border-border/30 bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{summary.total}</span> quotes</span>
        {summary.needAction > 0 && (
          <span><span className="font-medium text-amber-600">{summary.needAction}</span> need action</span>
        )}
        {summary.expiringSoon > 0 && (
          <span><span className="font-medium text-red-500">{summary.expiringSoon}</span> expiring soon</span>
        )}
        {summary.pipelineValue > 0 && (
          <span>Pipeline: <span className="font-medium text-foreground">{fmtINR(summary.pipelineValue)}</span></span>
        )}
        {search && (
          <button onClick={() => setSearch('')} className="ml-auto text-xs text-primary hover:underline">
            Clear search
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState
            search={search}
            myQuotes={myQuotes}
            needsAttentionFilter={needsAttentionFilter}
            onClearSearch={() => setSearch('')}
          />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-background border-b border-border">
              <tr>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-5 py-2 w-[220px]">
                  Client
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-[130px]">
                  Quote #
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-[120px]">
                  Scheme / Type
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-[190px]">
                  Active Version
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-[110px]">
                  Premium
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-[130px]">
                  Action Needed
                </th>
                <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-5 py-2 w-[120px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((q) => (
                <QuoteRow key={q.rfqId} quote={q} onClick={() => router.push(`/rfq2/${q.rfqId}`)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Quote row ────────────────────────────────────────────────────────────────
function QuoteRow({ quote: q, onClick }: { quote: SalesPipelineQuote; onClick: () => void }) {
  const enrich = getEnrich(q.rfqId);
  const versionDisplay = getVersionDisplay(q);
  const action = getActionNeeded(q);
  const lapse = getLapseRisk(q);

  const rowBorder = lapse === 'red'
    ? 'border-l-2 border-l-red-500'
    : lapse === 'amber'
    ? 'border-l-2 border-l-amber-400'
    : 'border-l-2 border-l-transparent';

  return (
    <tr
      className={cn(
        'group cursor-pointer hover:bg-muted/40 transition-colors',
        rowBorder,
      )}
      onClick={onClick}
    >
      {/* Client */}
      <td className="px-5 py-3">
        <p className="font-medium text-foreground truncate max-w-[200px]">{q.employerName}</p>
        {enrich.brokerName && (
          <p className="text-[11px] text-muted-foreground">{enrich.brokerName}</p>
        )}
      </td>

      {/* Quote # */}
      <td className="px-3 py-3">
        <Link
          href={`/rfq2/${q.rfqId}`}
          className="font-mono text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {q.quoteNo}
        </Link>
      </td>

      {/* Scheme / Type */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <span className={cn('text-[11px] font-semibold border rounded px-1.5 py-0.5 w-fit', SCHEME_CLS[q.scheme])}>
            {q.scheme}
          </span>
          <span className={cn('text-[10px] font-medium rounded px-1.5 py-0.5 w-fit', BIZ_CLS[enrich.businessType])}>
            {BIZ_LABEL[enrich.businessType]}
          </span>
        </div>
      </td>

      {/* Active Version */}
      <td className="px-3 py-3">
        <span className={cn('text-[11px] font-medium rounded-md px-2 py-1', versionDisplay.chipClass)}>
          {versionDisplay.label}
        </span>
      </td>

      {/* Premium */}
      <td className="px-3 py-3">
        {q.premiumInclGst ? (
          <span className={cn(
            'text-sm font-medium tabular-nums',
            isTerminal(q.pipelineStatus) ? 'text-muted-foreground' : 'text-foreground',
          )}>
            {fmtINR(q.premiumInclGst)}<span className="text-[10px] text-muted-foreground">/yr</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Action Needed */}
      <td className="px-3 py-3">
        {action ? (
          <span className={cn('text-[11px] font-semibold rounded-md px-2 py-1', action.chipClass)}>
            {action.label}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Quick action button */}
          {action && action.buttonClass && (
            <button
              className={cn('h-6 px-2.5 rounded text-[11px] font-medium transition-colors', action.buttonClass)}
              onClick={(e) => { e.stopPropagation(); /* TODO: open modal */ }}
            >
              {action.label}
            </button>
          )}
          {/* View */}
          <Link
            href={`/rfq2/${q.rfqId}`}
            className="size-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-3.5" />
          </Link>
          {/* 3-dot */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {q.pipelineStatus === 'DRAFT' && <DropdownMenuItem>Edit</DropdownMenuItem>}
              <DropdownMenuItem>Clone</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Withdraw</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  search,
  myQuotes,
  needsAttentionFilter,
  onClearSearch,
}: {
  search: string;
  myQuotes: boolean;
  needsAttentionFilter: boolean;
  onClearSearch: () => void;
}) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
        <p className="text-sm text-muted-foreground">No quotes match "{search}"</p>
        <button onClick={onClearSearch} className="text-xs text-primary hover:underline">Clear search</button>
      </div>
    );
  }
  if (needsAttentionFilter) {
    return (
      <div className="flex items-center gap-3 mx-5 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <span className="text-emerald-600 text-lg">✓</span>
        <p className="text-sm text-emerald-800 font-medium">All clear — no quotes need your attention right now.</p>
      </div>
    );
  }
  if (myQuotes) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-sm text-muted-foreground">You have no quotes yet. Create your first.</p>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-3.5" /> New Quote
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-48">
      <p className="text-sm text-muted-foreground">No quotes found.</p>
    </div>
  );
}
