'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Upload,
  Plus,
  Copy,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  SALES_QUOTE_DETAIL,
  type QDVersion,
  type QDVersionStatus,
  type AuditEventType,
} from '@/mocks/sales-quote-detail';

// ─── Demo "today" ─────────────────────────────────────────────────────────────
const TODAY = new Date('2026-06-18T12:00:00Z');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysDiff(from: string): number {
  return Math.round((TODAY.getTime() - new Date(from).getTime()) / 86_400_000);
}
function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86_400_000);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
function relTime(iso: string): string {
  const d = daysDiff(iso);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

const TERMINAL_VER: QDVersionStatus[] = ['FINALIZED', 'WITHDRAWN'];
const isVerTerminal = (s: QDVersionStatus) => TERMINAL_VER.includes(s);

// ─── Derived state helpers ────────────────────────────────────────────────────
function getActiveVersionHeadline(v: QDVersion | undefined): { text: string; color: string } {
  if (!v) return { text: 'No versions yet · Add a version to begin', color: 'text-muted-foreground' };
  const p = v.premiumInclGst ? fmtINR(v.premiumInclGst) : null;
  switch (v.status) {
    case 'ACCEPTED':
      return { text: `v${v.versionNo} was accepted · Ready to finalise`, color: 'text-emerald-600' };
    case 'SENT_TO_CLIENT':
      return {
        text: `v${v.versionNo} was sent to client ${v.sentAt ? daysDiff(v.sentAt) + ' days ago' : ''} · Awaiting response`,
        color: 'text-blue-600',
      };
    case 'SUBMITTED':
      return { text: `v${v.versionNo} submitted to insurer · Send to client`, color: 'text-blue-600' };
    case 'RATED':
      return {
        text: `v${v.versionNo} is priced${p ? ` at ${p}` : ''} · Ready to submit`,
        color: 'text-emerald-600',
      };
    case 'REFERRED_UW':
      return {
        text: `v${v.versionNo} has been with the underwriter for ${v.referredAt ? daysDiff(v.referredAt) : v.daysInCurrentState} days`,
        color: 'text-amber-600',
      };
    case 'REFERRED_PRICING':
      return {
        text: `v${v.versionNo} has been with the actuary for ${v.referredAt ? daysDiff(v.referredAt) : v.daysInCurrentState} days`,
        color: 'text-amber-600',
      };
    case 'DRAFT':
    case 'IN_PROGRESS':
      return { text: `v${v.versionNo} is in draft · Configure plans to progress`, color: 'text-muted-foreground' };
    default:
      return { text: `v${v.versionNo} · ${v.status}`, color: 'text-muted-foreground' };
  }
}

function getPrimaryAction(v: QDVersion | undefined): {
  label: string;
  cls: string;
  show: boolean;
  isChip?: boolean;
} {
  if (!v) return { label: '+ Add Version', cls: 'border border-border text-foreground hover:bg-muted', show: true };
  switch (v.status) {
    case 'ACCEPTED':
      return { label: 'Finalise Quote', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white', show: true };
    case 'RATED':
      return { label: `Submit v${v.versionNo}`, cls: 'bg-indigo-600 hover:bg-indigo-700 text-white', show: true };
    case 'SUBMITTED':
      return { label: 'Send to Client', cls: 'bg-blue-600 hover:bg-blue-700 text-white', show: true };
    case 'SENT_TO_CLIENT':
      return { label: 'Mark Accepted', cls: 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50', show: true };
    case 'REFERRED_UW':
    case 'REFERRED_PRICING': {
      const who = v.status === 'REFERRED_UW' ? 'UW' : 'Actuary';
      const d = v.referredAt ? daysDiff(v.referredAt) : v.daysInCurrentState;
      return { label: `v${v.versionNo} with ${who} · ${d}d`, cls: 'bg-amber-100 text-amber-800 border border-amber-300', show: true, isChip: true };
    }
    case 'DRAFT':
    case 'IN_PROGRESS':
      return { label: `Open v${v.versionNo}`, cls: 'border border-border text-foreground hover:bg-muted', show: true };
    default:
      return { label: '', cls: '', show: false };
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const VER_STATUS_CLS: Record<QDVersionStatus, string> = {
  DRAFT:             'bg-slate-100 text-slate-600',
  IN_PROGRESS:       'bg-indigo-50 text-indigo-700',
  REFERRED_UW:       'bg-amber-100 text-amber-800',
  REFERRED_PRICING:  'bg-amber-100 text-amber-800',
  RATED:             'bg-green-100 text-green-700',
  SUBMITTED:         'bg-blue-50 text-blue-700',
  SENT_TO_CLIENT:    'bg-blue-100 text-blue-800',
  ACCEPTED:          'bg-emerald-600 text-white',
  FINALIZED:         'bg-emerald-50 text-emerald-700',
  WITHDRAWN:         'bg-slate-100 text-slate-500',
};
const VER_STATUS_LABEL: Record<QDVersionStatus, string> = {
  DRAFT: 'Draft', IN_PROGRESS: 'Active', REFERRED_UW: 'With Underwriter',
  REFERRED_PRICING: 'With Actuary', RATED: 'Priced', SUBMITTED: 'Submitted',
  SENT_TO_CLIENT: 'Sent to Client', ACCEPTED: 'Accepted', FINALIZED: 'Finalised',
  WITHDRAWN: 'Withdrawn',
};

// ─── Mini progression bar steps ──────────────────────────────────────────────
const PROGRESS_STEPS: { key: QDVersionStatus; label: string }[] = [
  { key: 'DRAFT',          label: 'Draft' },
  { key: 'REFERRED_UW',   label: 'UW' },
  { key: 'RATED',          label: 'Rated' },
  { key: 'SUBMITTED',      label: 'Submitted' },
  { key: 'SENT_TO_CLIENT', label: 'Sent' },
  { key: 'ACCEPTED',       label: 'Accepted' },
  { key: 'FINALIZED',      label: 'Finalised' },
];
const STEP_ORDER = PROGRESS_STEPS.map((s) => s.key);
function stepIndex(s: QDVersionStatus): number {
  const i = STEP_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

// ─── Doc type chip ────────────────────────────────────────────────────────────
const DOC_TYPE_CLS: Record<string, string> = {
  QUOTE_SLIP: 'bg-indigo-50 text-indigo-700',
  MEMBER_CENSUS: 'bg-teal-50 text-teal-700',
  BROKER_CORRESPONDENCE: 'bg-purple-50 text-purple-700',
  RATE_CARD: 'bg-orange-50 text-orange-700',
  OTHER: 'bg-slate-100 text-slate-600',
};
const DOC_TYPE_LABEL: Record<string, string> = {
  QUOTE_SLIP: 'Quote Slip',
  MEMBER_CENSUS: 'Member Census',
  BROKER_CORRESPONDENCE: 'Broker Correspondence',
  RATE_CARD: 'Rate Card',
  OTHER: 'Other',
};

// ─── Audit event color ────────────────────────────────────────────────────────
const AUDIT_CLS: Record<AuditEventType, string> = {
  STATUS_CHANGE: 'bg-blue-500',
  DOCUMENT: 'bg-slate-400',
  VERSION: 'bg-indigo-500',
  UW_PRICING: 'bg-emerald-500',
  NOTE: 'bg-amber-400',
};

// ─── Quote Info field pairs ───────────────────────────────────────────────────
const q = SALES_QUOTE_DETAIL;

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SalesQuoteDetailPage() {
  const [expiryDismissed, setExpiryDismissed] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'ALL' | AuditEventType>('ALL');

  const activeVersion = q.versions.find((v) => v.id === q.activeVersionId);
  const nonTerminalVersions = q.versions.filter((v) => !isVerTerminal(v.status));
  const otherNonTerminal = nonTerminalVersions.filter((v) => v.id !== q.activeVersionId);
  const terminalVersions = q.versions.filter((v) => isVerTerminal(v.status));

  const headline = getActiveVersionHeadline(activeVersion);
  const primaryAction = getPrimaryAction(activeVersion);
  const daysLeft = daysUntil(q.expiresAt);
  const showExpiryBar = !expiryDismissed && daysLeft <= 14 && daysLeft >= 0 && q.status !== 'FINALIZED';

  const filteredAudit = q.auditLog.filter(
    (e) => auditFilter === 'ALL' || e.eventType === auditFilter,
  );

  const SCHEME_CLS: Record<string, string> = {
    GTL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    GCL: 'bg-teal-50 text-teal-700 border-teal-200',
    GH:  'bg-purple-50 text-purple-700 border-purple-200',
  };
  const BIZ_CLS: Record<string, string> = {
    NEW: 'bg-slate-100 text-slate-600',
    RENEWAL: 'bg-orange-50 text-orange-700',
    TAKEOVER: 'bg-violet-50 text-violet-700',
  };
  const STATUS_CLS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    ACTIVE: 'bg-blue-50 text-blue-700',
    FINALIZED: 'bg-emerald-50 text-emerald-700',
    WITHDRAWN: 'bg-slate-100 text-slate-500',
    EXPIRED: 'bg-red-50 text-red-600',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border/60 shrink-0">

        {/* Row 1 — identity */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-base font-bold text-foreground shrink-0">{q.quoteNo}</span>
            <span className={cn('text-xs font-semibold rounded-full px-2.5 py-0.5', STATUS_CLS[q.status])}>
              {q.status}
            </span>
            <span className={cn('text-[11px] font-semibold border rounded px-2 py-0.5', SCHEME_CLS[q.scheme])}>
              {q.scheme}
            </span>
            <span className={cn('text-[11px] font-medium rounded px-2 py-0.5', BIZ_CLS[q.businessType])}>
              {q.businessType === 'NEW' ? 'New Business' : q.businessType === 'RENEWAL' ? 'Renewal' : 'Takeover'}
            </span>
          </div>
          {/* Primary action */}
          {primaryAction.show && (
            <button
              className={cn(
                'h-8 px-4 rounded-lg text-sm font-medium transition-colors shrink-0',
                primaryAction.isChip ? 'cursor-default' : 'cursor-pointer',
                primaryAction.cls,
              )}
            >
              {primaryAction.label}
            </button>
          )}
        </div>

        {/* Row 2 — deal headline */}
        <div className="flex items-center gap-4 px-5 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">{q.employerName}</span>
              {q.brokerName && (
                <span className="text-sm text-muted-foreground">via {q.brokerName}</span>
              )}
            </div>
            <p className={cn('text-sm font-medium mt-0.5', headline.color)}>{headline.text}</p>
          </div>
          {/* Premium chip */}
          {activeVersion?.premiumInclGst && !isVerTerminal(activeVersion.status) && (
            <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
              <p className="text-base font-bold text-emerald-700 tabular-nums">
                {fmtINR(activeVersion.premiumInclGst)}
              </p>
              <p className="text-[10px] text-emerald-600">/ yr incl. GST</p>
            </div>
          )}
        </div>

        {/* Expiry warning bar */}
        {showExpiryBar && (
          <div className="flex items-center justify-between px-5 py-2 bg-amber-50 border-t border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <span>
                This quote expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Finalise a version to preserve it.
              </span>
            </div>
            <button onClick={() => setExpiryDismissed(true)} className="text-amber-600 hover:text-amber-800">
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Metadata row ──────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2 border-b border-border/40 bg-muted/20 flex-wrap text-xs text-muted-foreground">
        <MetaPill label="Effective" value={fmtDate(q.effectiveDate)} />
        <MetaPill label="Currency" value={q.currency} />
        <MetaPill label="Channel" value={q.channel} />
        <MetaPill label="Segment" value={q.quoteSegment} />
        <MetaPill label="Created by" value={q.createdBy} />
        <MetaPill label="Created" value={fmtDate(q.createdAt)} />
        <span>·</span>
        <span>Expires <span className={cn('font-medium', daysLeft <= 14 ? 'text-amber-600' : 'text-foreground')}>{fmtDate(q.expiresAt)}</span></span>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="versions" className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 pt-2 pb-0 border-b border-border/40">
          <TabsList className="h-8 bg-transparent p-0 gap-1">
            {(['versions', 'documents', 'audit', 'info'] as const).map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="h-8 px-4 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none capitalize"
              >
                {t === 'audit' ? 'Audit Log' : t === 'info' ? 'Quote Info' : t === 'versions' ? 'Versions' : 'Documents'}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── Tab: Versions ─────────────────────────────────────────────── */}
        <TabsContent value="versions" className="flex-1 min-h-0 overflow-y-auto mt-0 px-5 py-4 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {nonTerminalVersions.length} active version{nonTerminalVersions.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              {nonTerminalVersions.length >= 2 && !compareMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setCompareMode(true)}
                >
                  <ArrowLeftRight className="size-3" />
                  Compare Versions
                </Button>
              )}
              {compareMode && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCompareMode(false)}>
                  Exit comparison
                </Button>
              )}
              <Button size="sm" className="h-7 gap-1.5 text-xs">
                <Plus className="size-3" />
                Add Version
              </Button>
            </div>
          </div>

          {/* Compare mode */}
          {compareMode && nonTerminalVersions.length >= 2 ? (
            <CompareView versions={nonTerminalVersions.slice(0, 2)} />
          ) : (
            <>
              {/* Active version card */}
              {activeVersion && !isVerTerminal(activeVersion.status) && (
                <ActiveVersionCard version={activeVersion} />
              )}

              {/* Other non-terminal */}
              {otherNonTerminal.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Other Active Versions
                  </p>
                  {otherNonTerminal.map((v) => (
                    <SecondaryVersionCard key={v.id} version={v} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Terminal versions */}
          {terminalVersions.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setTerminalOpen((v) => !v)}
              >
                {terminalOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                Show {terminalVersions.length} closed version{terminalVersions.length !== 1 ? 's' : ''} (superseded, withdrawn)
              </button>
              {terminalOpen && (
                <div className="mt-2 space-y-1.5 pl-4 border-l border-border/40">
                  {terminalVersions.map((v) => (
                    <TerminalVersionRow key={v.id} version={v} />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Documents ────────────────────────────────────────────── */}
        <TabsContent value="documents" className="flex-1 min-h-0 overflow-y-auto mt-0 px-5 py-4 space-y-4">
          {/* Readiness checklist */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Document Readiness
            </p>
            <DocCheck
              label="Quote Slip"
              present={q.documents.some((d) => d.type === 'QUOTE_SLIP')}
              required
            />
            <DocCheck
              label="Member Census"
              present={q.documents.some((d) => d.type === 'MEMBER_CENSUS')}
              required
            />
            <DocCheck
              label="Broker Correspondence"
              present={q.documents.some((d) => d.type === 'BROKER_CORRESPONDENCE')}
              required={false}
            />
          </div>

          {/* Document table */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {q.documents.length} documents
            </p>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Upload className="size-3" />
              Attach Document
            </Button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase px-4 py-2">File</th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase px-3 py-2">Type</th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase px-3 py-2">Uploaded by</th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase px-3 py-2">Date</th>
                  <th className="text-right text-[11px] font-medium text-muted-foreground uppercase px-4 py-2">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {q.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate max-w-[260px]">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('text-[11px] font-medium rounded px-2 py-0.5', DOC_TYPE_CLS[doc.type])}>
                        {DOC_TYPE_LABEL[doc.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{doc.uploadedBy}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(doc.uploadedAt)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {doc.sizeKb >= 1000 ? `${(doc.sizeKb / 1000).toFixed(1)} MB` : `${doc.sizeKb} KB`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Tab: Audit Log ────────────────────────────────────────────── */}
        <TabsContent value="audit" className="flex-1 min-h-0 overflow-y-auto mt-0 px-5 py-4 space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                ['ALL', 'All'],
                ['STATUS_CHANGE', 'Status Changes'],
                ['DOCUMENT', 'Documents'],
                ['VERSION', 'Versions'],
                ['UW_PRICING', 'UW + Pricing'],
              ] as [typeof auditFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAuditFilter(key)}
                className={cn(
                  'h-6 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
                  auditFilter === key
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="space-y-0">
            {filteredAudit.map((evt, idx) => (
              <div
                key={evt.id}
                className={cn(
                  'flex gap-3 pb-4',
                  evt.isNew && 'border-l-2 border-l-blue-400 pl-3 -ml-3',
                )}
              >
                {/* Dot + line */}
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <span className={cn('size-2.5 rounded-full shrink-0', AUDIT_CLS[evt.eventType])} />
                  {idx < filteredAudit.length - 1 && (
                    <div className="w-px flex-1 bg-border/50 mt-1.5" />
                  )}
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground">{evt.description}</p>
                    {evt.isNew && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {evt.by} · {relTime(evt.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab: Quote Info ───────────────────────────────────────────── */}
        <TabsContent value="info" className="flex-1 min-h-0 overflow-y-auto mt-0 px-5 py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 max-w-2xl">
            <InfoSection title="Client Details">
              <InfoField label="Employer" value={q.employerName} />
              <InfoField label="Industry" value={q.industry} />
              <InfoField label="Group Size" value={`${q.groupSize.toLocaleString('en-IN')} lives`} />
              <InfoField label="Broker" value={q.brokerName ?? '—'} />
              <InfoField label="Channel" value={q.channel} />
            </InfoSection>
            <InfoSection title="Scheme Configuration">
              <InfoField label="Scheme Type" value={q.scheme} />
              <InfoField label="Business Type" value={q.businessType === 'NEW' ? 'New Business' : q.businessType} />
              <InfoField label="Effective Date" value={fmtDate(q.effectiveDate)} />
              <InfoField label="Sum Assured Basis" value={q.sumAssuredBasis} />
              <InfoField label="Cover Pattern" value={q.coverPattern} />
              <InfoField label="Lives Covered" value={q.livesCovered} />
            </InfoSection>
            <InfoSection title="Underwriting">
              <InfoField label="UW Method" value={q.uwMethod} />
              <InfoField label="Participation" value={q.participationType} />
              <InfoField label="Segment" value={q.quoteSegment} />
            </InfoSection>
          </div>
          {q.status === 'DRAFT' && (
            <p className="text-xs text-muted-foreground mt-4">This quote is in DRAFT — fields are editable.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Active version card ──────────────────────────────────────────────────────
function ActiveVersionCard({ version: v }: { version: QDVersion }) {
  const action = getPrimaryAction(v);
  const currentStep = stepIndex(v.status);
  const isReferred = v.status === 'REFERRED_UW' || v.status === 'REFERRED_PRICING';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Referral banner */}
      {isReferred && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <span>
            With {v.status === 'REFERRED_UW' ? 'Underwriter' : 'Actuary'} · {v.daysInCurrentState} days elapsed
            {v.referredBy && ` · Referred by ${v.referredBy}`}
            {v.referredAt && ` on ${fmtDate(v.referredAt)}`}
          </span>
        </div>
      )}

      <div className="p-4 flex gap-4">
        {/* Left: identity */}
        <div className="shrink-0">
          <div className="text-3xl font-black text-foreground leading-none">v{v.versionNo}</div>
          <div className="text-xs text-muted-foreground mt-1 max-w-[120px] line-clamp-2">{v.label}</div>
          <span className={cn('text-[11px] font-semibold rounded-md px-2 py-0.5 mt-2 inline-block', VER_STATUS_CLS[v.status])}>
            {VER_STATUS_LABEL[v.status]}
          </span>
        </div>

        {/* Center: metrics */}
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-6 gap-y-2">
          <MetricPair label="UW Path" value={v.uwPath === 'NOT_EVALUATED' ? 'Not evaluated' : v.uwPath} />
          <MetricPair label="Pricing Path" value={v.pricingPath === 'NOT_EVALUATED' ? 'Not evaluated' : v.pricingPath} />
          {v.premiumInclGst && (
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Premium</p>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtINR(v.premiumInclGst)}<span className="text-sm text-muted-foreground font-normal"> / yr</span></p>
            </div>
          )}
          <MetricPair label="In current state" value={`${v.daysInCurrentState} day${v.daysInCurrentState !== 1 ? 's' : ''}`} />
          {v.planNames.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Plans</p>
              <div className="flex flex-wrap gap-1">
                {v.planNames.map((n) => (
                  <span key={n} className="text-[10px] border border-border rounded px-1.5 py-0.5 truncate max-w-[140px]">{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: action */}
        <div className="shrink-0 flex flex-col items-end justify-start gap-2">
          {action.show && !action.isChip && (
            <button className={cn('h-8 px-4 rounded-lg text-sm font-medium transition-colors', action.cls)}>
              {action.label}
            </button>
          )}
        </div>
      </div>

      {/* Mini progression bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-0">
          {PROGRESS_STEPS.map((step, idx) => {
            const past = idx < currentStep;
            const current = idx === currentStep;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'size-2.5 rounded-full border-2',
                      past ? 'bg-primary border-primary' :
                      current ? 'bg-primary border-primary ring-2 ring-primary/30' :
                      'bg-transparent border-border',
                    )}
                  />
                  <span className={cn('text-[9px] whitespace-nowrap', current ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                    {step.label}
                  </span>
                </div>
                {idx < PROGRESS_STEPS.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-0.5 mb-3', past ? 'bg-primary' : 'bg-border')} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Secondary version card ───────────────────────────────────────────────────
function SecondaryVersionCard({ version: v }: { version: QDVersion }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-4">
      <div className="text-xl font-black text-muted-foreground shrink-0">v{v.versionNo}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{v.label}</span>
          <span className={cn('text-[11px] font-semibold rounded px-2 py-0.5', VER_STATUS_CLS[v.status])}>
            {VER_STATUS_LABEL[v.status]}
          </span>
        </div>
        {v.premiumInclGst && (
          <p className="text-xs text-muted-foreground mt-0.5">{fmtINR(v.premiumInclGst)} / yr</p>
        )}
      </div>
      <div className="text-xs text-muted-foreground shrink-0">{v.daysInCurrentState}d in state</div>
    </div>
  );
}

// ─── Terminal version row ─────────────────────────────────────────────────────
function TerminalVersionRow({ version: v }: { version: QDVersion }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-mono text-muted-foreground w-6">v{v.versionNo}</span>
      <span className={cn('text-[11px] font-medium rounded px-1.5 py-0.5', VER_STATUS_CLS[v.status])}>
        {VER_STATUS_LABEL[v.status]}
      </span>
      <span className="text-xs text-muted-foreground truncate flex-1">{v.label}</span>
      <span className="text-xs text-muted-foreground">{fmtDate(v.createdAt)}</span>
      <button className="flex items-center gap-1 text-xs text-primary hover:underline">
        <Copy className="size-3" />Clone
      </button>
    </div>
  );
}

// ─── Compare view ─────────────────────────────────────────────────────────────
function CompareView({ versions }: { versions: QDVersion[] }) {
  const [a, b] = versions;
  const differ = (va?: string | number, vb?: string | number) => va !== vb;

  const rows: { label: string; a: string; b: string }[] = [
    { label: 'Status', a: VER_STATUS_LABEL[a.status], b: VER_STATUS_LABEL[b.status] },
    { label: 'UW Path', a: a.uwPath, b: b.uwPath },
    { label: 'Pricing Path', a: a.pricingPath, b: b.pricingPath },
    { label: 'Premium', a: a.premiumInclGst ? fmtINR(a.premiumInclGst) : '—', b: b.premiumInclGst ? fmtINR(b.premiumInclGst) : '—' },
    { label: 'Plans', a: a.planNames.join(', ') || '—', b: b.planNames.join(', ') || '—' },
    { label: 'Days in state', a: `${a.daysInCurrentState}d`, b: `${b.daysInCurrentState}d` },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-3 border-b border-border bg-muted/40">
        <div className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase">Field</div>
        <div className="px-4 py-2 text-sm font-bold border-l border-border">v{a.versionNo} · {a.label}</div>
        <div className="px-4 py-2 text-sm font-bold border-l border-border">v{b.versionNo} · {b.label}</div>
      </div>
      {rows.map((row) => {
        const isDiff = differ(row.a, row.b);
        return (
          <div key={row.label} className={cn('grid grid-cols-3 border-b border-border/40', isDiff && 'bg-amber-50/40')}>
            <div className="px-4 py-2.5 text-xs text-muted-foreground">{row.label}</div>
            <div className={cn('px-4 py-2.5 text-sm border-l border-border/40', isDiff && 'font-medium text-amber-800')}>{row.a}</div>
            <div className={cn('px-4 py-2.5 text-sm border-l border-border/40', isDiff && 'font-medium text-amber-800')}>{row.b}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DocCheck({ label, present, required }: { label: string; present: boolean; required: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {present ? (
        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
      ) : required ? (
        <XCircle className="size-4 text-red-400 shrink-0" />
      ) : (
        <Clock className="size-4 text-muted-foreground shrink-0" />
      )}
      <span className={cn('text-sm', present ? 'text-foreground' : required ? 'text-red-600' : 'text-muted-foreground')}>
        {label}
        {!required && <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
      </span>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="col-span-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2 mb-6">{children}</div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
