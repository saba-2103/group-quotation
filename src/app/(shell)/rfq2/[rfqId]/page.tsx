'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  EllipsisVertical,
  Plus,
  ArrowUpDown,
  Pencil,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  CalendarDays,
  User,
  Tag,
  ArrowDown01,
  ArrowDown10,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardList,
  Users,
  Package,
  Truck,
  BarChart2,
  Info,
  FileText,
  Upload,
  Cpu,
  Check,
  ShieldUser,
  GitPullRequest,
  Briefcase,
  Clock4,
  Clock,
  Trash2,
  Loader2,
  ToggleLeft,
  Wrench,
  FileSpreadsheet,
  Clipboard,
  Download,
  ArrowLeftRight,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { uploadStore } from '@/lib/upload-store';
import { RfqBundleProvider, useRfqBundle } from '@/context/RfqBundleContext';
import { useBreadcrumbStore } from '@/stores/breadcrumbStore';
import {
  computeVersionProfitability,
  computeReadinessGates,
  computeMilestoneSpine,
} from '@/lib/computations';
import {
  BusinessType,
  RfqStatus,
  VersionStatus,
  LivesCovered,
  GateStatus,
  MilestoneState,
  CensusQuality,
  PlanHandoffStatus,
  SchemeType,
  IntermediaryType,
  SumAssuredBasis,
  CoverPattern,
  TermBasis,
  RiskTermClassification,
  ParticipationType,
  SchemeUsage,
} from '@/lib/types';
import type { QuoteVersion, RfqBundle, Document, Subsidiary, MphProfile, MphAppetite, PriorPolicy, GradeRow } from '@/lib/types';
import { DocumentType, DocumentStatus } from '@/lib/types';
import { createSubsidiary, updateSubsidiary, deleteSubsidiary, updateRfq, updateHeadcount, updateCensusSummary, bulkImportMembers } from '@/lib/api/quotation-client';
import type { Milestone } from '@/lib/computations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function relTime(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60)   return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)    return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 30)   return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}

function labelForBusinessType(t: BusinessType) {
  const map: Record<BusinessType, string> = {
    [BusinessType.NEW]: 'New Business',
    [BusinessType.RENEWAL]: 'Renewal',
    [BusinessType.TAKEOVER]: 'Takeover',
  };
  return map[t] ?? t;
}

function stateAgeColor(iso: string, active: boolean): string {
  if (!active) return 'text-muted-foreground/60';
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 7)  return 'text-emerald-600';
  if (days <= 30) return 'text-amber-600';
  return 'text-rose-600';
}

function fmtFclPattern(p?: string): string {
  const map: Record<string, string> = {
    NONE: 'None',
    OVERALL: 'Overall',
    BY_GRADE: 'By Grade',
    BY_AGE_BAND: 'By Age Band',
    BY_GENDER: 'By Gender',
    BY_CATEGORY: 'By Category',
  };
  return p ? (map[p] ?? p) : '—';
}

function labelForSchemeType(t: SchemeType) {
  const map: Record<SchemeType, string> = {
    [SchemeType.EMPLOYER_OBLIGATORY]: 'Employer Obligatory',
    [SchemeType.EMPLOYER_VOLUNTARY]: 'Employer Voluntary',
    [SchemeType.AFFINITY]: 'Affinity',
    [SchemeType.MICRO]: 'Micro',
    [SchemeType.LENDER_BORROWER]: 'Lender–Borrower',
  };
  return map[t] ?? t;
}

function labelForLivesCovered(l: LivesCovered) {
  const map: Record<LivesCovered, string> = {
    [LivesCovered.MEMBER_ONLY]: 'Employee Only',
    [LivesCovered.MEMBER_SPOUSE]: 'Member + Spouse',
    [LivesCovered.FAMILY_VARIANTS]: 'Family',
  };
  return map[l] ?? l;
}

// Stage tracker configuration
const STAGES = [
  { key: RfqStatus.DATA_PENDING, label: 'Draft' },
  { key: RfqStatus.PRICING, label: 'Evaluated' },
  { key: RfqStatus.UW_REVIEW, label: 'Rated' },
  { key: RfqStatus.QUOTE_GENERATED, label: 'Submitted' },
  { key: RfqStatus.SHARED, label: 'Sent' },
] as const;

const STAGE_ORDER = [
  RfqStatus.DATA_PENDING,
  RfqStatus.CENSUS_CLEANED,
  RfqStatus.EXPERIENCE_NORMALIZED,
  RfqStatus.BENEFITS_READY,
  RfqStatus.PRICING,
  RfqStatus.PRICING_IN_PROGRESS,
  RfqStatus.UW_REVIEW,
  RfqStatus.QUOTE_GENERATED,
  RfqStatus.SHARED,
  RfqStatus.NEGOTIATION,
  RfqStatus.FINAL,
  RfqStatus.ISSUED,
  RfqStatus.REJECTED,
];

function getStageIndex(status: RfqStatus) {
  return STAGE_ORDER.indexOf(status);
}
const BUCKET_FIX_ROUTES: Record<number, string> = {
  1: 'key-data',
  2: 'census-workbench',
  3: 'plans',
  4: 'sales-dispatch',
  5: 'commercial-rate-card',
};

// ─── Readiness & Milestone sub-components ────────────────────────────────────

function GateIcon({ status }: { status: GateStatus }) {
  if (status === GateStatus.PASS)
    return <CheckCircle2 className="size-3 text-green-600 shrink-0" />;
  if (status === GateStatus.WARN)
    return <AlertTriangle className="size-3 text-amber-500 shrink-0" />;
  return <XCircle className="size-3 text-destructive shrink-0" />;
}

function MilestoneDot({ state }: { state: MilestoneState }) {
  if (state === MilestoneState.DONE)
    return <span className="size-2.5 rounded-full bg-primary shrink-0" />;
  if (state === MilestoneState.IN_PROGRESS)
    return <span className="size-2.5 rounded-full border-2 border-primary bg-primary/20 shrink-0" />;
  if (state === MilestoneState.WARNING)
    return <span className="size-2.5 rounded-full bg-amber-400 shrink-0" />;
  if (state === MilestoneState.BLOCKED)
    return <span className="size-2.5 rounded-full bg-destructive/60 shrink-0" />;
  return <span className="size-2.5 rounded-full border border-muted-foreground/30 bg-muted shrink-0" />;
}

function ReadinessPanel({
  report,
  rfqId,
}: {
  report: ReturnType<typeof computeReadinessGates>;
  rfqId: string;
}) {
  const base = `/rfqs/${rfqId}`;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">Readiness Checklist</p>
        <div className="flex items-center gap-1.5">
          {report.failingCount > 0 ? (
            <>
              <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-amber-600">
                {report.failingCount} bucket{report.failingCount !== 1 ? 's' : ''} failing
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
              <span className="text-xs font-medium text-green-600">All gates passing</span>
            </>
          )}
        </div>
      </div>

      {/* Bucket cards */}
      <div className="flex flex-col gap-2">
        {report.buckets.map((bucket) => {
          const fixRoute = `${base}/${BUCKET_FIX_ROUTES[bucket.bucketNo] ?? 'key-data'}`;
          const isPass = bucket.overall === GateStatus.PASS;
          const isFail = bucket.overall === GateStatus.FAIL;
          const BucketIcon = isPass ? CheckCircle2 : isFail ? XCircle : AlertTriangle;
          const bucketIconCls = isPass ? 'text-green-600' : isFail ? 'text-destructive' : 'text-amber-500';
          return (
            <div key={bucket.bucketNo} className="rounded-xl border border-border overflow-hidden">
              {/* Bucket header */}
              <div className="flex items-center justify-between pl-3 pr-2 py-2 border-b border-border/50">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <BucketIcon className={cn('size-3.5 shrink-0', bucketIconCls)} />
                  <span className="text-[11px] font-medium text-foreground uppercase tracking-wide truncate">
                    {bucket.label}
                  </span>
                </div>
                <Link href={fixRoute} className="p-1 rounded hover:bg-muted shrink-0">
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
              {/* Gate items */}
              <div className="flex flex-col gap-2 pl-3 pr-2 py-2">
                {bucket.gates.map((g) => {
                  const isGatePass = g.status === GateStatus.PASS;
                  const isGateFail = g.status === GateStatus.FAIL;
                  const GIcon = isGatePass ? CheckCircle2 : isGateFail ? XCircle : AlertTriangle;
                  const gIconCls = isGatePass ? 'text-green-600' : isGateFail ? 'text-destructive' : 'text-amber-500';
                  return (
                    <div key={g.key} className="flex items-start justify-between gap-2 pl-2">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <GIcon className={cn('size-3.5 shrink-0 mt-px', gIconCls)} />
                        <span className={cn(
                          'text-[11px] leading-4',
                          isGatePass ? 'text-muted-foreground' : 'text-foreground',
                        )}>
                          {g.label}
                        </span>
                      </div>
                      {isGateFail && (
                        <Link
                          href={fixRoute}
                          className="text-[11px] font-medium text-foreground hover:underline shrink-0 leading-4"
                        >
                          Fix
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Horizontal milestone strip — shown below the header
function MilestonesStrip({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="flex items-center overflow-x-auto py-1 px-0.5">
      {milestones.map((m, idx) => {
        const isLast = idx === milestones.length - 1;
        const isDone = m.state === MilestoneState.DONE;
        const isNow = m.state === MilestoneState.IN_PROGRESS;
        const isWarning = m.state === MilestoneState.WARNING;
        const isBlocked = m.state === MilestoneState.BLOCKED;

        const circleCls = isDone
          ? 'bg-green-600 ring-green-600 text-white'
          : isNow
          ? 'bg-white ring-yellow-400 text-yellow-600'
          : isWarning
          ? 'bg-white ring-amber-500 text-amber-600'
          : isBlocked
          ? 'bg-white ring-red-400 text-red-500'
          : 'bg-muted ring-border text-muted-foreground';

        const labelCls = isDone
          ? 'text-green-600'
          : isNow
          ? 'text-yellow-600 font-semibold'
          : isWarning
          ? 'text-amber-600'
          : isBlocked
          ? 'text-red-500'
          : 'text-muted-foreground';

        const connectorCls = isDone ? 'bg-green-400' : 'bg-border';

        return (
          <div key={m.milestoneNo} className="flex flex-1 items-center min-w-0">
            {/* Badge + label side-by-side */}
            <div
              className="flex items-center gap-1.5 shrink-0"
              title={`M${m.milestoneNo}: ${m.label}`}
            >
              <div
                className={cn(
                  'flex size-4 items-center justify-center rounded-full text-[9px] font-semibold ring-2 transition-colors shrink-0',
                  circleCls
                )}
              >
                {isDone ? <Check className="size-2" /> : m.milestoneNo}
              </div>
              <span className={cn('whitespace-nowrap text-[10px]', labelCls)}>
                {m.label}
              </span>
            </div>
            {/* Connector */}
            {!isLast && (
              <div className={cn('h-0.5 flex-1 min-w-[6px] mx-1.5', connectorCls)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Documents panel — shown in the right column
const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  [DocumentType.SIGNED_PROPOSAL]: 'Signed Proposal',
  [DocumentType.QUOTE_ACCEPTANCE]: 'Quote Acceptance',
  [DocumentType.BOARD_RESOLUTION]: 'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]: 'Placement Letter',
  [DocumentType.OTHER]: 'Other',
};

const DOC_STATUS_META: Record<DocumentStatus, { label: string; className: string }> = {
  [DocumentStatus.DRAFT]:    { label: 'Draft',    className: 'text-amber-700 bg-amber-50 border-amber-200' },
  [DocumentStatus.SIGNED]:   { label: 'Signed',   className: 'text-green-700 bg-green-50 border-green-200' },
  [DocumentStatus.APPROVED]: { label: 'Approved', className: 'text-blue-700 bg-blue-50 border-blue-200' },
};

function DocumentsPanel({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <FileText className="size-8 text-muted-foreground/40" />
        <p className="text-[11px] text-muted-foreground">No documents yet.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => {
        const meta = DOC_STATUS_META[doc.status];
        const isUploaded = doc.source === 'upload';
        return (
          <div
            key={doc.documentId}
            className="rounded-lg border border-border bg-card px-3 py-2 flex flex-col gap-1"
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                {isUploaded
                  ? <Upload className="size-3 text-muted-foreground" />
                  : <Cpu className="size-3 text-violet-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium leading-tight truncate">{doc.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {DOC_TYPE_LABEL[doc.type]}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[9px] font-medium border rounded-full px-1.5 py-0.5',
                  meta.className
                )}
              >
                {meta.label}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground pl-5">
              {new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MilestonesPanel({ milestones }: { milestones: Milestone[] }) {
  const PIM_BOUNDARY = 10;
  return (
    <div className="flex flex-col">
      {milestones.map((m, idx) => {
        const isBoundary = m.milestoneNo === PIM_BOUNDARY;
        const isLast = idx === milestones.length - 1;
        const connectorDone = m.state === MilestoneState.DONE;
        return (
          <div key={m.milestoneNo}>
            {isBoundary && (
              <div className="flex items-center gap-1.5 my-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                  Quotation / PIM
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex items-start gap-2 py-0.5">
              {/* Dot + connector */}
              <div className="flex flex-col items-center mt-1 shrink-0">
                <MilestoneDot state={m.state} />
                {!isLast && (
                  <div
                    className={cn(
                      'w-px flex-1 min-h-[14px]',
                      connectorDone ? 'bg-primary/40' : 'bg-border'
                    )}
                  />
                )}
              </div>
              {/* Label row */}
              <div className="flex items-center gap-1.5 pb-1 min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground w-5 shrink-0">
                  M{m.milestoneNo}
                </span>
                <span
                  className={cn(
                    'text-[11px] truncate',
                    m.state === MilestoneState.DONE
                      ? 'text-foreground'
                      : m.state === MilestoneState.IN_PROGRESS
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground'
                  )}
                >
                  {m.label}
                </span>
                {m.state === MilestoneState.IN_PROGRESS && (
                  <Badge
                    variant="default"
                    className="text-[8px] h-3.5 px-1 shrink-0"
                  >
                    Now
                  </Badge>
                )}
                {m.milestoneNo >= PIM_BOUNDARY && (
                  <Badge
                    variant="secondary"
                    className="text-[8px] h-3.5 px-1 shrink-0"
                  >
                    PIM
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}// ─── Workbench tile config ───────────────────────────────────────────────────────────

const LAUNCHPAD_TILES = [
  { label: 'Quote Setup',         route: 'key-data',             bucketNo: 1, icon: ClipboardList, countKey: 'versions'  as const },
  { label: 'Census & Members',    route: 'census-workbench',     bucketNo: 2, icon: Users,         countKey: 'members'   as const },
  { label: 'Plans',               route: 'plans',                bucketNo: 3, icon: Package,       countKey: 'plans'     as const },
  { label: 'Underwriting',        route: 'sales-dispatch',       bucketNo: 4, icon: Truck,         countKey: null },
  { label: 'Pricing & Quote Pack',route: 'commercial-rate-card', bucketNo: 5, icon: BarChart2,     countKey: 'documents' as const },
];

function tileTone(pct: number) {
  if (pct === 100) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 50)  return 'text-amber-700 bg-amber-50 border-amber-200';
  if (pct > 0)    return 'text-orange-700 bg-orange-50 border-orange-200';
  return 'text-muted-foreground bg-muted/30 border-border';
}

function tileToneLabel(pct: number) {
  if (pct === 100) return 'On Track';
  if (pct >= 50)  return 'In Progress';
  if (pct > 0)    return 'Started';
  return 'Pending';
}

// ─── Deal profile helpers ───────────────────────────────────────────────────────────

function ProfileSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card px-3 pt-2.5 pb-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 border-b border-border/40 pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
  return (
    <div className="flex justify-between py-1 border-b border-border/20 last:border-0">
      <span className="text-[10px] text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-[10px] font-medium text-right truncate">{value ?? '—'}</span>
    </div>
  );
}

function QualityChip({ q }: { q: CensusQuality }) {
  if (q === CensusQuality.G)
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
        <CheckCircle2 className="size-2.5" /> Good
      </span>
    );
  if (q === CensusQuality.A)
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
        <AlertTriangle className="size-2.5" /> Average
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-destructive bg-destructive/5 border border-destructive/20 rounded-full px-1.5 py-0.5">
      <XCircle className="size-2.5" /> Poor
    </span>
  );
}
// ─── Version card helpers ────────────────────────────────────────────────────

const STATUS_META: Record<VersionStatus, { label: string; className: string }> = {
  [VersionStatus.DRAFT]:             { label: 'Draft',             className: 'bg-neutral-600 text-white' },
  [VersionStatus.UW_REFERRED]:       { label: 'UW Referred',       className: 'bg-amber-500 text-white' },
  [VersionStatus.EVALUATED]:         { label: 'Evaluated',         className: 'bg-blue-500 text-white' },
  [VersionStatus.PRICING_REQUESTED]: { label: 'Pricing Requested', className: 'bg-amber-500 text-white' },
  [VersionStatus.RATED]:             { label: 'Rated',             className: 'bg-blue-600 text-white' },
  [VersionStatus.SUBMITTED]:         { label: 'Submitted',         className: 'bg-blue-600 text-white' },
  [VersionStatus.SHARED]:            { label: 'Sent to Client',    className: 'bg-blue-600 text-white' },
  [VersionStatus.SENT_TO_CLIENT]:    { label: 'Sent to Client',    className: 'bg-blue-600 text-white' },
  [VersionStatus.SELECTED]:          { label: 'Selected',          className: 'bg-amber-500 text-white' },
  [VersionStatus.FROZEN]:            { label: 'Active',            className: 'bg-emerald-600 text-white' },
  [VersionStatus.ARCHIVED]:          { label: 'Archived',          className: 'bg-gray-400 text-white' },
  [VersionStatus.WITHDRAWN]:         { label: 'Withdrawn',         className: 'bg-rose-500 text-white' },
};

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function CompactVersionCard({
  version,
  isActive,
  priceEntry,
  planNames,
  isMostCompetitive,
  isMostProfitable,
  onSwitch,
}: {
  version: QuoteVersion;
  isActive: boolean;
  priceEntry?: { finalPremiumInclGst: number; modelFactor: number };
  planNames: string[];
  isMostCompetitive: boolean;
  isMostProfitable: boolean;
  onSwitch: () => void;
}) {
  const meta = STATUS_META[version.status];
  const isFrozen = version.status === VersionStatus.FROZEN;
  const visiblePlans = planNames.slice(0, 4);
  const overflow = planNames.length - 4;

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden flex flex-col cursor-pointer transition-shadow hover:shadow-sm',
        isActive ? 'bg-accent border-border' : 'bg-card border-border',
      )}
      onClick={onSwitch}
    >
      {/* ── Identity ── */}
      <div className="px-2 pt-2">
        {/* Badge row */}
        <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
          <span className={cn(
            'inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[11px] font-semibold',
            isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
          )}>
            V{version.versionNo}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={cn('inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[11px] font-semibold', meta.className)}>
              {meta.label}
            </span>
            {isFrozen && <Lock className="size-3 text-violet-500 shrink-0" />}
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center size-6 rounded hover:bg-muted"
            >
              <EllipsisVertical className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Name + note */}
        <div className="flex flex-col gap-1 px-1 py-2">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">{version.name}</p>
          {version.note && (
            <p className="text-xs text-muted-foreground line-clamp-1">{version.note}</p>
          )}
          {(isMostCompetitive || isMostProfitable) && (
            <div className="flex gap-1 flex-wrap mt-0.5">
              {isMostCompetitive && (
                <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 rounded-md px-1.5 py-0.5">Competitive</span>
              )}
              {isMostProfitable && (
                <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 rounded-md px-1.5 py-0.5">Profitable</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/50 mx-2" />

      {/* ── Pricing ── */}
      <div className="flex flex-col gap-2 p-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pricing</p>
        {priceEntry ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Premium (GST)</span>
              <span className="text-xs font-semibold text-foreground tabular-nums">{fmtINR(priceEntry.finalPremiumInclGst)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Loss ratio</span>
              <span className="text-xs font-semibold text-foreground tabular-nums">{(priceEntry.modelFactor * 100).toFixed(1)}%</span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">Not priced yet</p>
        )}
      </div>

      <div className="border-t border-border/50 mx-2" />

      {/* ── Plans ── */}
      <div className="flex flex-col gap-2 p-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Plans</p>
        {visiblePlans.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No plans yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visiblePlans.map((name) => (
              <span key={name} className="text-[11px] border border-border rounded-lg px-2 py-0.5 truncate max-w-full">
                {name}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[11px] text-muted-foreground px-1 py-0.5">+{overflow}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GovernancePill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className="text-[11px] font-medium text-foreground whitespace-nowrap">{value}</span>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col min-w-0 gap-0.5">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className="text-sm text-foreground truncate">{value}</span>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

function MetaInline({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatusRow({ label, value, pass }: { label: string; value: string; pass?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn('text-[10px] font-medium', pass === true ? 'text-green-600' : pass === false ? 'text-destructive' : 'text-foreground')}>
        {value}
      </span>
    </div>
  );
}

function MilestonesSidebar({ milestones }: { milestones: Milestone[] }) {
  const PIM_BOUNDARY = 10;
  return (
    <div className="flex flex-col">
      {milestones.map((m, idx) => {
        const isBoundary = m.milestoneNo === PIM_BOUNDARY;
        const isLast = idx === milestones.length - 1;
        const connectorDone = m.state === MilestoneState.DONE;
        const isNow = m.state === MilestoneState.IN_PROGRESS;
        const isDone = m.state === MilestoneState.DONE;
        const isWarning = m.state === MilestoneState.WARNING;
        const isBlocked = m.state === MilestoneState.BLOCKED;
        return (
          <div key={m.milestoneNo}>
            {isBoundary && (
              <div className="flex items-center gap-1.5 my-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">Post-Issuance</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex items-start gap-2 py-1">
              {/* Dot + connector */}
              <div className="flex flex-col items-center mt-1 shrink-0">
                <MilestoneDot state={m.state} />
                {!isLast && (
                  <div className={cn('w-px flex-1 min-h-[14px]', connectorDone ? 'bg-primary/40' : 'bg-border')} />
                )}
              </div>
              {/* Content */}
              <div className="flex flex-col min-w-0 flex-1 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-[11px] truncate',
                    isDone ? 'text-foreground' :
                    isNow ? 'text-foreground font-semibold' :
                    'text-muted-foreground'
                  )}>
                    {m.label}
                  </span>
                  {isNow && (
                    <Badge variant="default" className="text-[8px] h-3.5 px-1 shrink-0">Now</Badge>
                  )}
                  {isWarning && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0 text-amber-600 border-amber-300">Warn</Badge>
                  )}
                  {isBlocked && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0 text-destructive border-destructive/30">Blocked</Badge>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5">M{m.milestoneNo}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RFQ version display helpers ─────────────────────────────────────────────

const RFQ_VER_STATUS_CLS: Record<VersionStatus, string> = {
  [VersionStatus.DRAFT]:             'bg-slate-100 text-slate-600',
  [VersionStatus.UW_REFERRED]:       'bg-amber-100 text-amber-700',
  [VersionStatus.EVALUATED]:         'bg-blue-50 text-blue-700',
  [VersionStatus.PRICING_REQUESTED]: 'bg-amber-100 text-amber-700',
  [VersionStatus.RATED]:             'bg-blue-50 text-blue-700',
  [VersionStatus.SUBMITTED]:         'bg-blue-50 text-blue-700',
  [VersionStatus.SHARED]:            'bg-blue-50 text-blue-700',
  [VersionStatus.SENT_TO_CLIENT]:    'bg-blue-50 text-blue-700',
  [VersionStatus.SELECTED]:          'bg-emerald-50 text-emerald-700',
  [VersionStatus.FROZEN]:            'bg-emerald-600 text-white',
  [VersionStatus.ARCHIVED]:          'bg-slate-100 text-slate-500',
  [VersionStatus.WITHDRAWN]:         'bg-rose-50 text-rose-700',
};

const RFQ_VER_STATUS_LABEL: Record<VersionStatus, string> = {
  [VersionStatus.DRAFT]:             'Draft',
  [VersionStatus.UW_REFERRED]:       'UW Referred',
  [VersionStatus.EVALUATED]:         'Evaluated',
  [VersionStatus.PRICING_REQUESTED]: 'Pricing Requested',
  [VersionStatus.RATED]:             'Rated',
  [VersionStatus.SUBMITTED]:         'Submitted',
  [VersionStatus.SHARED]:            'Sent to Client',
  [VersionStatus.SENT_TO_CLIENT]:    'Sent to Client',
  [VersionStatus.SELECTED]:          'Selected',
  [VersionStatus.FROZEN]:            'Active',
  [VersionStatus.ARCHIVED]:          'Archived',
  [VersionStatus.WITHDRAWN]:         'Withdrawn',
};

const RFQ_PROGRESS_STEPS: { key: string; label: string }[] = [
  { key: 'created',   label: 'Created' },
  { key: 'evaluated', label: 'Evaluated' },
  { key: 'rated',     label: 'Rated' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'sent',      label: 'Sent' },
  { key: 'accepted',  label: 'Accepted' },
  { key: 'finalized', label: 'Finalized' },
];

function rfqStepIndex(s: VersionStatus): number {
  switch (s) {
    case VersionStatus.DRAFT:             return 0; // Created
    case VersionStatus.UW_REFERRED:       return 0; // Created — no evaluation yet
    case VersionStatus.EVALUATED:         return 1; // Evaluated
    case VersionStatus.PRICING_REQUESTED: return 1; // Evaluated — pricing in flight
    case VersionStatus.RATED:             return 2; // Rated
    case VersionStatus.SUBMITTED:         return 3; // Submitted
    case VersionStatus.SHARED:            return 4; // Sent
    case VersionStatus.SENT_TO_CLIENT:    return 4; // Sent
    case VersionStatus.SELECTED:          return 5; // Accepted
    case VersionStatus.FROZEN:            return 6; // Finalized
    default:                              return 0;
  }
}

function getRfqVersionHeadline(v: QuoteVersion): { text: string; color: string } {
  switch (v.status) {
    case VersionStatus.FROZEN:
      return { text: `V${v.versionNo} is active · Ready for policy issuance`, color: 'text-emerald-600' };
    case VersionStatus.SELECTED:
      return { text: `V${v.versionNo} was selected by the client · Prepare for issuance`, color: 'text-emerald-600' };
    case VersionStatus.SHARED:
      return { text: `V${v.versionNo} has been sent to client · Awaiting selection`, color: 'text-blue-600' };
    default:
      return { text: `V${v.versionNo} is in draft · Add plans to progress`, color: 'text-muted-foreground' };
  }
}

function getRfqStatusBanner(v: QuoteVersion): {
  text: string; Icon: React.ElementType; bg: string; border: string; textCls: string; iconCls: string;
} {
  switch (v.status) {
    case VersionStatus.FROZEN:
      return { text: `V${v.versionNo} frozen · Ready for policy issuance`, Icon: Lock, bg: 'bg-emerald-50', border: 'border-emerald-200/80', textCls: 'text-emerald-800', iconCls: 'text-emerald-600' };
    case VersionStatus.SELECTED:
      return { text: `V${v.versionNo} selected by client · Prepare for issuance`, Icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200/80', textCls: 'text-emerald-800', iconCls: 'text-emerald-600' };
    case VersionStatus.SHARED:
    case VersionStatus.SENT_TO_CLIENT:
      return { text: `V${v.versionNo} shared with client · Awaiting selection`, Icon: ArrowRight, bg: 'bg-blue-50', border: 'border-blue-200/80', textCls: 'text-blue-800', iconCls: 'text-blue-600' };
    case VersionStatus.UW_REFERRED:
      return { text: `V${v.versionNo} referred to underwriter · Awaiting review`, Icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200/80', textCls: 'text-amber-800', iconCls: 'text-amber-600' };
    case VersionStatus.PRICING_REQUESTED:
      return { text: `V${v.versionNo} pricing requested · Awaiting rate`, Icon: Cpu, bg: 'bg-amber-50', border: 'border-amber-200/80', textCls: 'text-amber-800', iconCls: 'text-amber-600' };
    case VersionStatus.RATED:
      return { text: `V${v.versionNo} rated · Ready for submission`, Icon: BarChart2, bg: 'bg-blue-50', border: 'border-blue-200/80', textCls: 'text-blue-800', iconCls: 'text-blue-600' };
    case VersionStatus.SUBMITTED:
      return { text: `V${v.versionNo} submitted · Awaiting evaluation`, Icon: FileText, bg: 'bg-blue-50', border: 'border-blue-200/80', textCls: 'text-blue-800', iconCls: 'text-blue-600' };
    case VersionStatus.EVALUATED:
      return { text: `V${v.versionNo} evaluated · Ready for pricing`, Icon: Check, bg: 'bg-blue-50', border: 'border-blue-200/80', textCls: 'text-blue-800', iconCls: 'text-blue-600' };
    case VersionStatus.ARCHIVED:
      return { text: `V${v.versionNo} archived`, Icon: XCircle, bg: 'bg-slate-50', border: 'border-slate-200/80', textCls: 'text-slate-600', iconCls: 'text-slate-400' };
    case VersionStatus.WITHDRAWN:
      return { text: `V${v.versionNo} withdrawn`, Icon: XCircle, bg: 'bg-rose-50', border: 'border-rose-200/80', textCls: 'text-rose-800', iconCls: 'text-rose-600' };
    default:
      return { text: `V${v.versionNo} in draft · Add plans and progress`, Icon: GitPullRequest, bg: 'bg-slate-50', border: 'border-slate-200/80', textCls: 'text-slate-700', iconCls: 'text-slate-500' };
  }
}

function getRfqPrimaryAction(v: QuoteVersion): { label: string; cls: string } {
  switch (v.status) {
    case VersionStatus.FROZEN:
      return { label: 'Issue Policy', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    case VersionStatus.SELECTED:
      return { label: 'Freeze Version', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' };
    case VersionStatus.SHARED:
      return { label: 'Mark Selected', cls: 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50' };
    default:
      return { label: `Open V${v.versionNo}`, cls: 'border border-border text-foreground hover:bg-muted' };
  }
}

function RfqMetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

const RFQ_VER_HEADER_CLS: Record<VersionStatus, string> = {
  [VersionStatus.DRAFT]:             'bg-slate-50',
  [VersionStatus.UW_REFERRED]:       'bg-amber-50',
  [VersionStatus.EVALUATED]:         'bg-blue-50',
  [VersionStatus.PRICING_REQUESTED]: 'bg-amber-50',
  [VersionStatus.RATED]:             'bg-blue-50',
  [VersionStatus.SUBMITTED]:         'bg-blue-50',
  [VersionStatus.SHARED]:            'bg-blue-50',
  [VersionStatus.SENT_TO_CLIENT]:    'bg-blue-50',
  [VersionStatus.SELECTED]:          'bg-emerald-50',
  [VersionStatus.FROZEN]:            'bg-emerald-50',
  [VersionStatus.ARCHIVED]:          'bg-slate-50',
  [VersionStatus.WITHDRAWN]:         'bg-rose-50',
};

function RfqActiveVersionCard({
  version: v,
  priceEntry,
  planNames,
  uwPath,
  pricingPath,
  onOpen,
}: {
  version: QuoteVersion;
  priceEntry?: { finalPremiumInclGst: number; modelFactor: number };
  planNames: string[];
  uwPath?: string;
  pricingPath?: string;
  onOpen: () => void;
}) {
  const currentStep = rfqStepIndex(v.status);
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:bg-muted/10 transition-colors"
      onClick={onOpen}
    >
      {/* ── Header ── */}
      <div className={cn('flex items-start gap-4 px-4 pt-4 pb-3 border-b border-border/50', RFQ_VER_HEADER_CLS[v.status])}>
        <span className="text-2xl font-black text-foreground shrink-0 pt-0.5">V{v.versionNo}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">{v.name}</p>
            <span className={cn('text-[11px] font-semibold rounded-md px-2 py-0.5 shrink-0', RFQ_VER_STATUS_CLS[v.status])}>
              {RFQ_VER_STATUS_LABEL[v.status]}
            </span>
          </div>
          {v.note && (
            <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-1">{v.note}</p>
          )}
        </div>
        <span className={cn('text-xs font-medium shrink-0', stateAgeColor(v.createdAt, true))}>Since {relTime(v.createdAt)}</span>
      </div>

      {/* ── Body ── */}
      <div className="p-4 flex items-start gap-4">
        <div className="flex-1 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-4">
            <RfqMetricPair label="UW Path" value={uwPath ?? '—'} />
            <RfqMetricPair label="Pricing Path" value={pricingPath ?? '—'} />
            <RfqMetricPair
              label="Loss Ratio"
              value={priceEntry ? `${(priceEntry.modelFactor * 100).toFixed(1)}%` : '—'}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Plans</p>
            {planNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {planNames.map((n) => (
                  <span key={n} className="text-[11px] border border-border bg-muted/30 rounded-lg px-2.5 py-0.5">{n}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">No plans added</p>
            )}
          </div>
        </div>
        {priceEntry && (
          <div className="text-right shrink-0 rounded-xl border border-border bg-muted/30 px-4 py-3 min-w-[120px]">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Premium</p>
            <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{fmtINR(priceEntry.finalPremiumInclGst)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">per year · incl. GST</p>
          </div>
        )}
      </div>

      {/* ── Pipeline stepper ── */}
      <div className="border-t border-border/50" />
      <div className="px-4 py-3 flex items-center">
        {RFQ_PROGRESS_STEPS.map((step, idx) => {
          const past    = idx < currentStep;
          const current = idx === currentStep;
          return (
            <React.Fragment key={step.key}>
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0',
                past    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                current ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-500 border border-slate-200',
              )}>
                {past
                  ? <Check className="size-3 shrink-0" />
                  : <span className={cn('size-1.5 rounded-full shrink-0 inline-block', current ? 'bg-blue-500' : 'bg-foreground/20')} />
                }
                {step.label}
              </div>
              {idx < RFQ_PROGRESS_STEPS.length - 1 && (
                <div className={cn('h-0.5 flex-1 mx-1', past ? 'bg-emerald-200' : 'bg-border/50')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function RfqSecondaryVersionCard({
  version: v,
  priceEntry,
  planNames,
  onOpen,
}: {
  version: QuoteVersion;
  priceEntry?: { finalPremiumInclGst: number; modelFactor: number };
  planNames: string[];
  onOpen: () => void;
}) {
  const isGrayed =
    v.status === VersionStatus.DRAFT ||
    v.status === VersionStatus.UW_REFERRED ||
    v.status === VersionStatus.PRICING_REQUESTED ||
    v.status === VersionStatus.ARCHIVED ||
    v.status === VersionStatus.WITHDRAWN;
  return (
    <div
      className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-start gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={onOpen}
    >
      <div className={cn('text-xl font-black shrink-0 pt-0.5', isGrayed ? 'text-muted-foreground/50' : 'text-foreground')}>V{v.versionNo}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-semibold', isGrayed ? 'text-muted-foreground' : 'text-foreground')}>{v.name}</span>
          <span className={cn('text-[11px] font-semibold rounded-md px-2 py-0.5', RFQ_VER_STATUS_CLS[v.status])}>
            {RFQ_VER_STATUS_LABEL[v.status]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">
            <span className={cn('font-medium', isGrayed ? 'text-muted-foreground' : 'text-foreground')}>Plans</span>
            <span className="text-muted-foreground">{planNames.length}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">
            <span className={cn('font-medium', isGrayed ? 'text-muted-foreground' : 'text-foreground')}>Premium</span>
            <span className="text-muted-foreground">
              {priceEntry ? fmtINR(priceEntry.finalPremiumInclGst) : 'yet to be calculated'}
            </span>
          </span>
        </div>
      </div>
      <span className={cn('text-xs font-medium shrink-0', stateAgeColor(v.createdAt, !isGrayed))}>Since {relTime(v.createdAt)}</span>
    </div>
  );
}

function RfqTerminalVersionRow({ version: v, onOpen }: { version: QuoteVersion; onOpen: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={onOpen}>
      <span className="text-sm font-black text-muted-foreground/50 shrink-0 w-7">V{v.versionNo}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-normal text-muted-foreground truncate">{v.name}</span>
        <span className={cn('text-[11px] font-semibold rounded-md px-2 py-0.5 shrink-0', RFQ_VER_STATUS_CLS[v.status])}>
          {RFQ_VER_STATUS_LABEL[v.status]}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground/50 shrink-0">since {relTime(v.createdAt)}</span>
    </div>
  );
}

// ─── Subsidiaries tab ────────────────────────────────────────────────────────

// ─── MPH rule-engine mirror ───────────────────────────────────────────────────

type HazardClass = 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
type MphSegmentBand = 'SME' | 'MID_CORPORATE' | 'CORPORATE';

interface MphPreviewResult {
  category: string;
  maxDiscountPct: number;
  uwAuthorityBand: string;
  preapprovedCardRef: string;
  routing: 'STP' | 'REFER';
  referralReasons: string[];
}

function evaluateMphAppetite(p: {
  lives?: number; whiteCollarPct?: number; zones?: number;
  hazardClass?: HazardClass; hazardousRoles?: boolean; businessType?: string;
}): MphPreviewResult {
  const lives = p.lives ?? 0;
  const wc = p.whiteCollarPct ?? 100;
  const zones = p.zones ?? 1;
  const hc = p.hazardClass ?? 'LOW';
  const hr = p.hazardousRoles ?? false;
  const bt = p.businessType ?? '';
  const reasons: string[] = [];
  if (hc === 'HIGH' || hc === 'SPECIAL') reasons.push('High or special hazard class');
  if (hr) reasons.push('Hazardous roles present');
  if (lives > 500) reasons.push('Lives exceed 500');
  if (zones > 5) reasons.push('More than 5 zones');
  if (bt === 'TAKEOVER') reasons.push('Takeover review required');
  if (wc < 50) reasons.push('Blue-collar majority');
  const band: MphSegmentBand = lives < 100 ? 'SME' : lives <= 500 ? 'MID_CORPORATE' : 'CORPORATE';
  const cat = reasons.length > 0 ? 'Special — refer' : band === 'SME' ? 'SME · straight-through' : band === 'MID_CORPORATE' ? 'Mid-market' : 'Large group';
  const disc = reasons.length > 0 ? 0 : band === 'SME' ? 8 : band === 'MID_CORPORATE' ? 10 : 12;
  let uwBand = 'Underwriting L1';
  if (hc === 'HIGH' || hc === 'SPECIAL') uwBand = 'Underwriting L2 (senior)';
  else if (hr) uwBand = 'Actuary referral';
  else if (reasons.length === 0 && band === 'SME') uwBand = 'Sales (straight-through)';
  const routing: 'STP' | 'REFER' = reasons.length === 0 && uwBand.startsWith('Sales') ? 'STP' : 'REFER';
  return { category: cat, maxDiscountPct: disc, uwAuthorityBand: uwBand, preapprovedCardRef: 'GTL-CARD-2024-LG-001', routing, referralReasons: reasons };
}

// ─── MPH Categorization sub-helpers ──────────────────────────────────────────

function MphAdvisory({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700 mt-1.5">
      <AlertTriangle className="size-2.5 shrink-0" /> {children}
    </span>
  );
}

function MphSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {badge && (
          <span className="rounded-full bg-muted border border-border/40 px-2 py-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── KeyDataTab ───────────────────────────────────────────────────────────────

// Statuses at which Key Data is locked (quote has been shared or deal is past negotiation)
const KEY_DATA_LOCKED_STATUSES = new Set([
  RfqStatus.SHARED,
  RfqStatus.NEGOTIATION,
  RfqStatus.FINAL,
  RfqStatus.ISSUED,
  RfqStatus.REJECTED,
]);

function kdDerivedFromScheme(schemeType: SchemeType): {
  participationType: ParticipationType;
  schemeUsage: SchemeUsage;
} {
  switch (schemeType) {
    case SchemeType.EMPLOYER_OBLIGATORY:
      return { participationType: ParticipationType.COMPULSORY, schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE };
    case SchemeType.EMPLOYER_VOLUNTARY:
      return { participationType: ParticipationType.VOLUNTARY, schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE };
    case SchemeType.AFFINITY:
      return { participationType: ParticipationType.VOLUNTARY, schemeUsage: SchemeUsage.NON_EMPLOYER_EMPLOYEE };
    case SchemeType.MICRO:
      return { participationType: ParticipationType.COMPULSORY, schemeUsage: SchemeUsage.NON_EMPLOYER_EMPLOYEE };
    default:
      return { participationType: ParticipationType.COMPULSORY, schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE };
  }
}

const KD_SELECTABLE_SCHEMES = new Set([
  SchemeType.EMPLOYER_OBLIGATORY,
  SchemeType.EMPLOYER_VOLUNTARY,
  SchemeType.AFFINITY,
  SchemeType.MICRO,
]);

function KeyDataTab() {
  const { bundle, updateBundle } = useRfqBundle();
  if (!bundle) return null;

  const isLocked = KEY_DATA_LOCKED_STATUSES.has(bundle.statusStage);

  // ── Form state (seeds from bundle) ────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdPriorPolicy, setCreatedPriorPolicy] = useState(false);

  const [empName, setEmpName] = useState(bundle.employerName);
  const [effDate, setEffDate] = useState(bundle.effectiveDate ?? '');
  const [bizType, setBizType] = useState<BusinessType>(bundle.businessType);
  const [schType, setSchType] = useState<SchemeType>(bundle.schemeType);
  const [intType, setIntType] = useState<IntermediaryType | ''>(bundle.intermediaryType ?? '');
  const [brkName, setBrkName] = useState(bundle.brokerName ?? '');
  const [intCode, setIntCode] = useState(bundle.intermediaryCode ?? '');
  const [rtc, setRtc] = useState<RiskTermClassification | ''>(bundle.riskTermClassification ?? '');
  const [sasBasis, setSasBasis] = useState<SumAssuredBasis>(bundle.sumAssuredBasis);
  const [cvPattern, setCvPattern] = useState<CoverPattern>(bundle.coverPattern);
  const [trmBasis, setTrmBasis] = useState<TermBasis>(bundle.termBasis);
  const [livCov, setLivCov] = useState<LivesCovered>(bundle.livesCovered);
  const [priorInsurer, setPriorInsurer] = useState(bundle.priorPolicy?.insurer ?? '');
  const [priorMPN, setPriorMPN] = useState(bundle.priorPolicy?.masterPolicyNumber ?? '');
  const [priorPremium, setPriorPremium] = useState<number | ''>(bundle.priorPolicy?.premium ?? '');
  const [priorFcl, setPriorFcl] = useState(bundle.priorPolicy?.fclBasis ?? '');
  const [expAvail, setExpAvail] = useState(bundle.priorPolicy?.experienceAvailable ?? false);
  const [expYears, setExpYears] = useState<number | ''>(bundle.priorPolicy?.experienceYears ?? '');

  type KdSnapshot = typeof snapshot;
  const [snapshot, setSnapshot] = useState({
    empName, effDate, bizType, schType, intType, brkName, intCode, rtc,
    sasBasis, cvPattern, trmBasis, livCov,
    priorInsurer, priorMPN, priorPremium, priorFcl, expAvail, expYears,
  });

  const derived = kdDerivedFromScheme(schType);
  const showPriorPolicy = (bizType === BusinessType.RENEWAL || bizType === BusinessType.TAKEOVER) && !!bundle.priorPolicy;
  const isSelectableScheme = KD_SELECTABLE_SCHEMES.has(schType);

  const handleEdit = () => {
    setSnapshot({ empName, effDate, bizType, schType, intType, brkName, intCode, rtc,
      sasBasis, cvPattern, trmBasis, livCov, priorInsurer, priorMPN, priorPremium, priorFcl, expAvail, expYears });
    setCreatedPriorPolicy(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    const s = snapshot;
    setEmpName(s.empName); setEffDate(s.effDate); setBizType(s.bizType); setSchType(s.schType);
    setIntType(s.intType); setBrkName(s.brkName); setIntCode(s.intCode); setRtc(s.rtc);
    setSasBasis(s.sasBasis); setCvPattern(s.cvPattern); setTrmBasis(s.trmBasis); setLivCov(s.livCov);
    setPriorInsurer(s.priorInsurer); setPriorMPN(s.priorMPN); setPriorPremium(s.priorPremium);
    setPriorFcl(s.priorFcl); setExpAvail(s.expAvail); setExpYears(s.expYears);
    setCreatedPriorPolicy(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const priorPolicyPatch: PriorPolicy | undefined = showPriorPolicy ? {
        insurer: priorInsurer || undefined,
        masterPolicyNumber: priorMPN || undefined,
        premium: priorPremium !== '' ? Number(priorPremium) : undefined,
        fclBasis: priorFcl || undefined,
        experienceAvailable: expAvail,
        experienceYears: expAvail && expYears !== '' ? Number(expYears) : undefined,
      } : bundle.priorPolicy;

      const patch = {
        employerName: empName,
        effectiveDate: effDate || undefined,
        businessType: bizType,
        schemeType: schType,
        ...kdDerivedFromScheme(schType),
        intermediaryType: intType as IntermediaryType || undefined,
        brokerName: brkName || undefined,
        intermediaryCode: intCode || undefined,
        riskTermClassification: rtc as RiskTermClassification || undefined,
        sumAssuredBasis: sasBasis,
        coverPattern: cvPattern,
        termBasis: trmBasis,
        livesCovered: livCov,
        ...(priorPolicyPatch !== undefined ? { priorPolicy: priorPolicyPatch } : {}),
      };
      const updated = await updateRfq(bundle.rfqId, patch);
      updateBundle(updated);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // ── READ-ONLY view ─────────────────────────────────────────────────────
  if (!isEditing) {
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
      <div className="flex flex-col gap-4">

        {/* ── Title row ── */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Key Data</h3>
          {isLocked ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" disabled>
              <Lock className="size-3" /> Locked
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleEdit}>
              <Pencil className="size-3" /> Edit Key Data
            </Button>
          )}
        </div>

        {/* ── 3-column grid ── */}
        <div className="grid grid-cols-3 gap-4 items-start">

          {/* ─── COL 1: CLIENT DETAILS ─── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Header band */}
            <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-slate-50 to-card border-b border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Client Details</p>
              <p className="text-xl font-bold text-foreground leading-tight tracking-tight">{bundle.employerName}</p>
              {bundle.effectiveDate && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CalendarDays className="size-3 text-muted-foreground/60 shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Effective {fmtDate(bundle.effectiveDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Badges row */}
            <div className="px-4 py-3 flex items-center gap-1.5 flex-wrap border-b border-border/30">
              <span className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                bundle.businessType === 'RENEWAL'  ? 'bg-blue-50 text-blue-700 border-blue-200'
                : bundle.businessType === 'TAKEOVER' ? 'bg-violet-50 text-violet-700 border-violet-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200',
              )}>
                {labelForBusinessType(bundle.businessType)}
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold bg-muted/40 text-foreground border-border/50">
                {labelForSchemeType(bundle.schemeType)}
              </span>
            </div>

            {/* Derived fields */}
            <div className="px-4 py-3 bg-muted/5 flex flex-col gap-2.5">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">Auto-derived</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Participation</span>
                  <span className="text-[11px] font-semibold text-foreground">{bundle.participationType?.replace(/_/g, ' ') ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Scheme Usage</span>
                  <span className="text-[11px] font-semibold text-foreground">{bundle.schemeUsage?.replace(/_/g, ' ') ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── COL 2: BROKER DETAILS ─── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Header band */}
            <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-blue-50/40 to-card border-b border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Broker Details</p>
              <p className="text-xl font-bold text-foreground leading-tight tracking-tight">
                {bundle.brokerName || <span className="text-muted-foreground font-normal italic text-base">Not specified</span>}
              </p>
              {bundle.intermediaryType && (
                <div className="mt-1.5">
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 text-[10px] font-semibold">
                    {bundle.intermediaryType.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="px-4 py-3 flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Intermediary Code</p>
                <p className={cn('text-sm font-mono', bundle.intermediaryCode ? 'font-semibold text-foreground' : 'text-muted-foreground italic text-xs')}>
                  {bundle.intermediaryCode || '—'}
                </p>
              </div>

              <div className="h-px bg-border/30" />

              <div className="flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">Risk Classification</p>
                {bundle.riskTermClassification ? (
                  <span className="inline-flex items-center w-fit rounded border bg-muted/30 border-border/60 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                    {bundle.riskTermClassification.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground italic">—</p>
                )}
              </div>
            </div>
          </div>

          {/* ─── COL 3: POLICY TERMS ─── */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Header band */}
            <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-violet-50/30 to-card border-b border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Policy Terms</p>
              <p className="text-[11px] text-muted-foreground leading-snug">Coverage structure &amp; basis</p>
            </div>

            {/* Coverage fields */}
            <div className="px-4 py-3 flex flex-col gap-2.5">
              {[
                { label: 'Sum Assured Basis', value: bundle.sumAssuredBasis.replace(/_/g, ' ') },
                { label: 'Cover Pattern',     value: bundle.coverPattern },
                { label: 'Term Basis',        value: bundle.termBasis.replace(/_/g, ' ') },
                { label: 'Lives Covered',     value: bundle.livesCovered.replace(/_/g, ' ') },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
                  <span className="text-[11px] font-semibold text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Prior policy (conditional) */}
            {showPriorPolicy && bundle.priorPolicy && (
              <div className="border-t border-border/40 px-4 py-3 bg-amber-50/30 flex flex-col gap-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-700/70">Prior Policy</p>
                {[
                  { label: 'Insurer',    value: bundle.priorPolicy.insurer ?? '—' },
                  { label: 'Policy No.', value: bundle.priorPolicy.masterPolicyNumber ?? '—' },
                  { label: 'Premium',    value: bundle.priorPolicy.premium ? `₹${bundle.priorPolicy.premium.toLocaleString()}` : '—' },
                  { label: 'FCL Basis',  value: bundle.priorPolicy.fclBasis ?? '—' },
                  { label: 'Experience', value: bundle.priorPolicy.experienceAvailable
                      ? `Yes · ${bundle.priorPolicy.experienceYears ?? '?'} yr${(bundle.priorPolicy.experienceYears ?? 0) !== 1 ? 's' : ''}`
                      : 'Not available' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-900/60 shrink-0">{label}</span>
                    <span className="text-[11px] font-semibold text-amber-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── EDIT view ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Edit Key Data</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs gap-1.5" disabled={saving} onClick={handleSave}>
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* 2-col body */}
      <div className="grid grid-cols-[1fr_1fr] divide-x divide-border/40 max-h-[70vh] overflow-y-auto">

        {/* ── Left: Inputs ── */}
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* Quote Identity */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quote Identity</p>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Client Name</Label>
            <Input value={empName} onChange={(e) => setEmpName(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Effective Date</Label>
            <Input type="date" value={effDate} onChange={(e) => setEffDate(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Business Type</Label>
            <Select value={bizType} onValueChange={(v) => {
              const newBt = v as BusinessType;
              const needsPrior = (newBt === BusinessType.RENEWAL || newBt === BusinessType.TAKEOVER) && !bundle.priorPolicy;
              setBizType(newBt);
              if (needsPrior) setCreatedPriorPolicy(true);
              else setCreatedPriorPolicy(false);
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={BusinessType.NEW} className="text-xs">New Business</SelectItem>
                <SelectItem value={BusinessType.RENEWAL} className="text-xs">Renewal</SelectItem>
                <SelectItem value={BusinessType.TAKEOVER} className="text-xs">Takeover</SelectItem>
              </SelectContent>
            </Select>
            {createdPriorPolicy && (
              <p className="text-[10px] text-green-700 flex items-center gap-1">
                <Check className="size-3" /> A prior policy record will be created on Save.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Scheme Type</Label>
            {!isSelectableScheme && (
              <div className="flex items-center gap-1.5 text-amber-700 text-[10px] bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <AlertTriangle className="size-2.5 shrink-0" />
                Stored value &ldquo;{schType}&rdquo; is unrecognised — pick one to canonicalise
              </div>
            )}
            <Select value={isSelectableScheme ? schType : ''} onValueChange={(v) => setSchType(v as SchemeType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select scheme…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SchemeType.EMPLOYER_OBLIGATORY} className="text-xs">Employer Obligatory</SelectItem>
                <SelectItem value={SchemeType.EMPLOYER_VOLUNTARY} className="text-xs">Employer Voluntary</SelectItem>
                <SelectItem value={SchemeType.AFFINITY} className="text-xs">Affinity</SelectItem>
                <SelectItem value={SchemeType.MICRO} className="text-xs">Micro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Intermediary Type</Label>
            <Select value={intType} onValueChange={(v) => setIntType(v as IntermediaryType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={IntermediaryType.BROKER} className="text-xs">Broker</SelectItem>
                <SelectItem value={IntermediaryType.CORPORATE_AGENT} className="text-xs">Corporate Agent</SelectItem>
                <SelectItem value={IntermediaryType.DIRECT} className="text-xs">Direct</SelectItem>
                <SelectItem value={IntermediaryType.BANCASSURANCE} className="text-xs">Bancassurance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Broker / Agent Name</Label>
            <Input value={brkName} onChange={(e) => setBrkName(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Intermediary Code</Label>
            <Input value={intCode} onChange={(e) => setIntCode(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Risk Term Classification</Label>
            <Select value={rtc} onValueChange={(v) => setRtc(v as RiskTermClassification)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Optional…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={RiskTermClassification.LEVEL} className="text-xs">Level</SelectItem>
                <SelectItem value={RiskTermClassification.DECREASING} className="text-xs">Decreasing</SelectItem>
                <SelectItem value={RiskTermClassification.STEP_UP} className="text-xs">Step Up</SelectItem>
                <SelectItem value={RiskTermClassification.MULTI_LAYER} className="text-xs">Multi Layer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Global Coverage Basis */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-3 border-t border-border/40 mt-1">Coverage Basis</p>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Sum Assured Basis</Label>
            <Select value={sasBasis} onValueChange={(v) => setSasBasis(v as SumAssuredBasis)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SumAssuredBasis.FLAT} className="text-xs">Flat</SelectItem>
                <SelectItem value={SumAssuredBasis.SALARY_MULTIPLE} className="text-xs">Salary Multiple</SelectItem>
                <SelectItem value={SumAssuredBasis.GRADE_SLAB} className="text-xs">Grade Slab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Cover Pattern</Label>
            <Select value={cvPattern} onValueChange={(v) => setCvPattern(v as CoverPattern)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={CoverPattern.LEVEL} className="text-xs">Level</SelectItem>
                <SelectItem value={CoverPattern.REDUCING} className="text-xs">Reducing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Term Basis</Label>
            <Select value={trmBasis} onValueChange={(v) => setTrmBasis(v as TermBasis)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TermBasis.POLICY_YEAR} className="text-xs">Policy Year</SelectItem>
                <SelectItem value={TermBasis.MEMBER_SPECIFIC} className="text-xs">Member Specific</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Lives Covered</Label>
            <Select value={livCov} onValueChange={(v) => setLivCov(v as LivesCovered)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={LivesCovered.MEMBER_ONLY} className="text-xs">Member Only</SelectItem>
                <SelectItem value={LivesCovered.MEMBER_SPOUSE} className="text-xs">Member + Spouse</SelectItem>
                <SelectItem value={LivesCovered.FAMILY_VARIANTS} className="text-xs">Family Variants</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prior Policy */}
          {(showPriorPolicy || createdPriorPolicy) && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-3 border-t border-border/40 mt-1">Prior Policy</p>

              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">Prior Insurer</Label>
                <Input value={priorInsurer} onChange={(e) => setPriorInsurer(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">Master Policy Number</Label>
                <Input value={priorMPN} onChange={(e) => setPriorMPN(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">Annualised Premium (₹)</Label>
                <Input type="number" value={priorPremium} onChange={(e) => setPriorPremium(e.target.value === '' ? '' : Number(e.target.value))} className="h-8 text-xs tabular-nums" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground">FCL / UW Basis</Label>
                <Input value={priorFcl} onChange={(e) => setPriorFcl(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-[11px] text-muted-foreground">Experience Available</Label>
                <button role="switch" aria-checked={expAvail} onClick={() => setExpAvail(!expAvail)}
                  className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors', expAvail ? 'bg-foreground/80' : 'bg-input')}>
                  <span className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', expAvail ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
              {expAvail && (
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] text-muted-foreground">Experience Years</Label>
                  <Input type="number" min="1" max="5" value={expYears} onChange={(e) => setExpYears(e.target.value === '' ? '' : Number(e.target.value))} className="h-8 text-xs w-24 tabular-nums" />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Live Summary ── */}
        <div className="px-5 py-4 flex flex-col gap-4 bg-muted/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Summary</p>

          {/* Client headline */}
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{empName || '—'}</p>
            {effDate && <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Effective {new Date(effDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
          </div>

          {/* Intent badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-background text-foreground border-border/60">
              {bizType.replace(/_/g, ' ')}
            </span>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold bg-background text-foreground border-border/60">
              {isSelectableScheme ? schType.replace(/_/g, ' ') : 'Unknown scheme'}
            </span>
          </div>

          {/* Derived fields */}
          <div className="rounded-lg border border-border/50 bg-background px-3 py-3 flex flex-col gap-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Auto-Derived</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Participation</span>
              <span className="text-[11px] font-semibold text-foreground">{derived.participationType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Scheme Usage</span>
              <span className="text-[11px] font-semibold text-foreground">{derived.schemeUsage}</span>
            </div>
          </div>

          {/* Intermediary */}
          <div className="rounded-lg border border-border/50 bg-background px-3 py-3 flex flex-col gap-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Intermediary</p>
            {[
              { label: 'Type', value: intType || '—' },
              { label: 'Name', value: brkName || '—' },
              { label: 'Code', value: intCode || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="text-[11px] font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Coverage basis */}
          <div className="rounded-lg border border-border/50 bg-background px-3 py-3 flex flex-col gap-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Coverage Basis</p>
            {[
              { label: 'Sum Assured', value: sasBasis.replace(/_/g, ' ') },
              { label: 'Cover Pattern', value: cvPattern },
              { label: 'Term Basis', value: trmBasis.replace(/_/g, ' ') },
              { label: 'Lives', value: livCov.replace(/_/g, ' ') },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="text-[11px] font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Prior policy preview */}
          {(showPriorPolicy || createdPriorPolicy) && (
            <div className="rounded-lg border border-border/50 bg-background px-3 py-3 flex flex-col gap-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Prior Policy</p>
              {[
                { label: 'Insurer', value: priorInsurer || '—' },
                { label: 'Policy No.', value: priorMPN || '—' },
                { label: 'Premium', value: priorPremium !== '' ? `₹${Number(priorPremium).toLocaleString()}` : '—' },
                { label: 'FCL Basis', value: priorFcl || '—' },
                { label: 'Experience', value: expAvail ? (expYears !== '' ? `${expYears} yr${expYears !== 1 ? 's' : ''}` : 'Yes') : 'No' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span className="text-[11px] font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── MphCategorizationTab ──────────────────────────────────────────────────────────────────────────────

function MphCategorizationTab() {
  const { bundle, updateBundle } = useRfqBundle();
  if (!bundle) return null;

  const seed = bundle.mphProfile;
  const [industry, setIndustry] = useState(seed?.industry ?? bundle.industry ?? '');
  const [lives, setLives] = useState<number>(seed?.lives ?? bundle.censusSummary?.totalLives ?? 0);
  const [whiteCollarPct, setWhiteCollarPct] = useState<number>(seed?.whiteCollarPct ?? 80);
  const [zones, setZones] = useState<number>(seed?.zones ?? 1);
  const [hazardClass, setHazardClass] = useState<HazardClass>(seed?.hazardClass ?? 'LOW');
  const [hazardousRoles, setHazardousRoles] = useState<boolean>(seed?.hazardousRoles ?? false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [governingAppetite, setGoverningAppetite] = useState<MphAppetite | undefined>(bundle.mphAppetite);

  const businessType = bundle.businessType ?? '';
  const blueCollarPct = 100 - whiteCollarPct;
  const dirty = () => setIsDirty(true);

  const preview = evaluateMphAppetite({ lives, whiteCollarPct, zones, hazardClass, hazardousRoles, businessType: String(businessType) });

  const segmentBand: MphSegmentBand = lives < 100 ? 'SME' : lives <= 500 ? 'MID_CORPORATE' : 'CORPORATE';
  const segmentLabel = segmentBand === 'SME' ? 'SME' : segmentBand === 'MID_CORPORATE' ? 'Mid-corporate' : 'Corporate';
  const segmentColor =
    segmentBand === 'SME' ? 'bg-blue-50 text-blue-700 border-blue-200'
    : segmentBand === 'MID_CORPORATE' ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-[#1B2B5E]/10 text-[#1B2B5E] border-[#1B2B5E]/20';

  const [isEditing, setIsEditing] = useState(false);

  // snapshot before edit so Cancel can revert
  const [snapshot, setSnapshot] = useState({ industry, lives, whiteCollarPct, zones, hazardClass, hazardousRoles });

  const handleEdit = () => {
    setSnapshot({ industry, lives, whiteCollarPct, zones, hazardClass, hazardousRoles });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIndustry(snapshot.industry);
    setLives(snapshot.lives);
    setWhiteCollarPct(snapshot.whiteCollarPct);
    setZones(snapshot.zones);
    setHazardClass(snapshot.hazardClass);
    setHazardousRoles(snapshot.hazardousRoles);
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const mphProfile: MphProfile = {
        industry, lives, whiteCollarPct, blueCollarPct, zones,
        hazardClass, hazardousRoles, businessType: String(businessType), segmentBand,
      };
      const updated = await updateRfq(bundle.rfqId, { mphProfile });
      const stamped = (updated as RfqBundle & { mphAppetite?: MphAppetite }).mphAppetite;
      updateBundle({ mphProfile, ...(stamped ? { mphAppetite: stamped } : {}) });
      if (stamped) setGoverningAppetite(stamped);
      setIsDirty(false);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  // ── READ-ONLY view ─────────────────────────────────────────────────────────────────────────────
  if (!isEditing) {
    const hasAppetite = !!governingAppetite;
    const displayCategory = hasAppetite ? governingAppetite!.category : preview.category;
    const displayCardRef   = hasAppetite ? (governingAppetite!.preapprovedCardRef ?? '—') : preview.preapprovedCardRef;
    const displayDiscount  = hasAppetite ? governingAppetite!.maxDiscountPct : preview.maxDiscountPct;
    const displayAuthority = hasAppetite ? governingAppetite!.uwAuthorityBand : preview.uwAuthorityBand;
    const isStp = preview.routing === 'STP';

    return (
      <div className="flex flex-col gap-4">

        {/* ── Title row ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">MPH Profile &amp; Categorization</p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleEdit}>
            <Pencil className="size-3" /> Edit Profile
          </Button>
        </div>

        {/* ── 2-column layout ── */}
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* LEFT — MPH Profile Card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Header block */}
            <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-slate-50 to-card border-b border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">MPH Profile</p>
              <p className="text-base font-bold text-foreground leading-tight truncate">{bundle.employerName}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground truncate">{industry || '—'}</span>
                <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                <span className={cn(
                  'inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 border',
                  String(businessType) === 'RENEWAL'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  String(businessType) === 'TAKEOVER' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                )}>
                  {String(businessType).replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Workforce mix */}
            <div className="px-5 py-4 border-b border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Workforce Mix</p>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-foreground">{whiteCollarPct}% White Collar</span>
                <span className="text-muted-foreground">{blueCollarPct}% Blue Collar</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden flex">
                <div className="bg-slate-500 rounded-l-full transition-all" style={{ width: `${whiteCollarPct}%` }} />
                <div className="bg-slate-200 flex-1 rounded-r-full" />
              </div>
            </div>

            {/* 2×2 metric cards */}
            <div className="grid grid-cols-2 divide-x divide-y divide-border/30">
              {/* Renewal Type */}
              <div className="px-4 py-3.5 flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Renewal Type</p>
                <p className="text-sm font-bold text-foreground mt-1">{String(businessType).replace(/_/g, ' ')}</p>
              </div>
              {/* Sector Hazard */}
              <div className={cn(
                'px-4 py-3.5 flex flex-col gap-0.5',
                hazardClass === 'HIGH' ? 'bg-rose-50/60' : hazardClass === 'MEDIUM' ? 'bg-amber-50/60' : ''
              )}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Sector Hazard</p>
                <p className={cn(
                  'text-sm font-bold mt-1',
                  hazardClass === 'HIGH' ? 'text-rose-700' : hazardClass === 'MEDIUM' ? 'text-amber-700' : 'text-foreground'
                )}>{hazardClass}</p>
                {hazardousRoles && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="size-2.5 shrink-0" /> Hazardous roles
                  </p>
                )}
              </div>
              {/* Covered Lives */}
              <div className="px-4 py-3.5 flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Covered Lives</p>
                <p className="text-2xl font-bold tabular-nums text-foreground leading-none mt-1">{lives.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{segmentLabel}</p>
              </div>
              {/* Zones */}
              <div className="px-4 py-3.5 flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Geographic Zones</p>
                <p className="text-2xl font-bold tabular-nums text-foreground leading-none mt-1">{zones}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{zones === 1 ? 'Single zone' : `${zones} zones covered`}</p>
              </div>
            </div>
          </div>

          {/* RIGHT — Verdict Card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            {/* Routing verdict hero */}
            <div className={cn(
              'px-5 pt-5 pb-5 border-b border-border/40',
              isStp ? 'bg-gradient-to-br from-emerald-50 to-card' : 'bg-gradient-to-br from-amber-50 to-card'
            )}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Routing Verdict</p>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'flex items-center justify-center size-10 rounded-xl shrink-0',
                  isStp ? 'bg-emerald-100' : 'bg-amber-100'
                )}>
                  {isStp
                    ? <Check className="size-5 text-emerald-700" />
                    : <AlertTriangle className="size-5 text-amber-700" />}
                </span>
                <div>
                  <p className={cn(
                    'text-xl font-bold leading-tight',
                    isStp ? 'text-emerald-700' : 'text-amber-700'
                  )}>
                    {isStp ? 'Straight-Through' : 'Referral Required'}
                  </p>
                  {!isStp && preview.referralReasons.length > 0 && (
                    <p className="text-[10px] text-amber-600 mt-0.5 leading-snug">
                      {preview.referralReasons.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Package name + code */}
            <div className="px-5 py-4 border-b border-border/40">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {hasAppetite ? 'Governing Package' : 'Indicative Package — Live Preview'}
              </p>
              <p className="text-lg font-bold text-foreground leading-tight">{displayCategory}</p>
              {displayCardRef && displayCardRef !== '—' && (
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5 tracking-wide">{displayCardRef}</p>
              )}
            </div>

            {/* UW Authority + Discount Buffer */}
            <div className="grid grid-cols-2 divide-x divide-border/30 border-b border-border/40">
              <div className="px-5 py-4 flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UW Authority</p>
                <p className="text-base font-bold text-foreground leading-tight mt-1">{displayAuthority}</p>
                {!isStp && (
                  <p className="text-[10px] text-amber-600 mt-0.5">Sign-off required</p>
                )}
              </div>
              <div className="px-5 py-4 flex flex-col gap-0.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Discount Buffer</p>
                <p className="text-3xl font-bold tabular-nums text-foreground leading-none mt-1">
                  {displayDiscount}<span className="text-base font-semibold text-muted-foreground">%</span>
                </p>
              </div>
            </div>

            {/* Governing package footer */}
            <div className="px-5 py-3.5 flex items-start gap-2.5">
              <Lock className={cn('size-3.5 shrink-0 mt-0.5', hasAppetite ? 'text-emerald-600' : 'text-muted-foreground/40')} />
              {hasAppetite ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-foreground">Governing Envelope Stamped</span>
                    <span className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0 text-[9px] font-semibold',
                      governingAppetite!.source === 'engine-server'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {governingAppetite!.source}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(governingAppetite!.evaluatedAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground leading-snug">
                  No governing package — showing live preview. Edit and save to stamp it.
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── EDIT view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Edit MPH Profile</p>
          <p className="text-xs text-muted-foreground mt-0.5">Changes update the routing verdict in realtime</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs gap-1.5" disabled={saving} onClick={handleSave}>
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-2 gap-6 items-start">

        {/* LEFT: flat input fields */}
        <div className="flex flex-col gap-4">

          {/* Industry */}
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Industry</Label>
            <Input value={industry} onChange={(e) => { setIndustry(e.target.value); dirty(); }} className="h-8 text-xs" />
          </div>

          {/* Lives */}
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Covered Lives</Label>
            <Input type="number" min="1" value={lives}
              onChange={(e) => { setLives(Number(e.target.value) || 0); dirty(); }}
              className="h-8 text-xs tabular-nums" />
            <p className="text-[10px] text-muted-foreground">SME &lt;100 · Mid-corporate 100–500 · Corporate &gt;500</p>
          </div>

          {/* Workforce mix */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] text-muted-foreground">White-collar %</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max="100" value={whiteCollarPct}
                onChange={(e) => { setWhiteCollarPct(Math.min(100, Math.max(0, Number(e.target.value)))); dirty(); }}
                className="h-8 text-xs w-24 tabular-nums" />
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted/40 flex">
                <div className="bg-foreground/40 transition-all duration-200" style={{ width: `${whiteCollarPct}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground w-16 text-right">{blueCollarPct}% blue</span>
            </div>
            {whiteCollarPct < 50 && (
              <span className="text-[10px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="size-2.5" /> Blue-collar majority — referral required
              </span>
            )}
          </div>

          {/* Zones */}
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Locations / Zones</Label>
            <Input type="number" min="1" value={zones}
              onChange={(e) => { setZones(Math.max(1, Number(e.target.value))); dirty(); }}
              className="h-8 text-xs w-28 tabular-nums" />
            {zones > 5 && (
              <span className="text-[10px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="size-2.5" /> &gt;5 zones — referral required
              </span>
            )}
          </div>

          {/* Hazard class */}
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] text-muted-foreground">Sector Hazard Class</Label>
            <Select value={hazardClass} onValueChange={(v) => { setHazardClass(v as HazardClass); dirty(); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW" className="text-xs">LOW — IT / services / finance</SelectItem>
                <SelectItem value="MEDIUM" className="text-xs">MEDIUM — retail / light manufacturing</SelectItem>
                <SelectItem value="HIGH" className="text-xs">HIGH — heavy manufacturing / logistics</SelectItem>
                <SelectItem value="SPECIAL" className="text-xs">SPECIAL — mining / offshore / aviation</SelectItem>
              </SelectContent>
            </Select>
            {(hazardClass === 'HIGH' || hazardClass === 'SPECIAL') && (
              <span className="text-[10px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="size-2.5" /> Elevated hazard — referral band applies
              </span>
            )}
          </div>

          {/* Hazardous roles */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label className="text-[11px] text-muted-foreground">Hazardous Roles Present</Label>
              <p className="text-[10px] text-muted-foreground/60">Heights, machinery, or driving duties</p>
            </div>
            <button role="switch" aria-checked={hazardousRoles}
              onClick={() => { setHazardousRoles(!hazardousRoles); dirty(); }}
              className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                hazardousRoles ? 'bg-foreground/80' : 'bg-input')}
            >
              <span className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                hazardousRoles ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
          </div>

          {/* Business type read-only */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/40">
            <span className="text-[11px] text-muted-foreground">Business Type</span>
            <span className="text-xs font-medium text-foreground bg-muted/40 rounded px-2 py-0.5 border border-border/40">
              {String(businessType).replace(/_/g, ' ')}
            </span>
          </div>

        </div>

        {/* RIGHT: verdict card — live preview */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">

          {/* Routing verdict hero */}
          <div className={cn(
            'px-5 pt-5 pb-5 border-b border-border/40',
            preview.routing === 'STP' ? 'bg-gradient-to-br from-emerald-50 to-card' : 'bg-gradient-to-br from-amber-50 to-card'
          )}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Routing Verdict</p>
            <div className="flex items-center gap-3">
              <span className={cn(
                'flex items-center justify-center size-10 rounded-xl shrink-0',
                preview.routing === 'STP' ? 'bg-emerald-100' : 'bg-amber-100'
              )}>
                {preview.routing === 'STP'
                  ? <Check className="size-5 text-emerald-700" />
                  : <AlertTriangle className="size-5 text-amber-700" />}
              </span>
              <div>
                <p className={cn(
                  'text-xl font-bold leading-tight',
                  preview.routing === 'STP' ? 'text-emerald-700' : 'text-amber-700'
                )}>
                  {preview.routing === 'STP' ? 'Straight-Through' : 'Referral Required'}
                </p>
                {preview.routing !== 'STP' && preview.referralReasons.length > 0 && (
                  <p className="text-[10px] text-amber-600 mt-0.5 leading-snug">
                    {preview.referralReasons.join(' \u00b7 ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Package name + code */}
          <div className="px-5 py-4 border-b border-border/40">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Indicative Package \u2014 Live Preview
            </p>
            <p className="text-lg font-bold text-foreground leading-tight">{preview.category}</p>
            {preview.preapprovedCardRef && (
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5 tracking-wide">{preview.preapprovedCardRef}</p>
            )}
          </div>

          {/* UW Authority + Discount Buffer */}
          <div className="grid grid-cols-2 divide-x divide-border/30 border-b border-border/40">
            <div className="px-5 py-4 flex flex-col gap-0.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">UW Authority</p>
              <p className="text-base font-bold text-foreground leading-tight mt-1">{preview.uwAuthorityBand}</p>
              {preview.routing !== 'STP' && (
                <p className="text-[10px] text-amber-600 mt-0.5">Sign-off required</p>
              )}
            </div>
            <div className="px-5 py-4 flex flex-col gap-0.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Discount Buffer</p>
              <p className="text-3xl font-bold tabular-nums text-foreground leading-none mt-1">
                {preview.maxDiscountPct}<span className="text-base font-semibold text-muted-foreground">%</span>
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="px-5 py-3">
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Indicative \u2014 local mirror. Engine stamps the governing package on Save.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  input,
  note,
  noteColor = 'text-muted-foreground',
}: {
  label: string;
  input: React.ReactNode;
  note?: string;
  noteColor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-muted-foreground mt-1.5 shrink-0">{label}</span>
      <div className="flex flex-col items-end gap-0.5">
        {input}
        {note && <span className={cn('text-[10px] font-medium', noteColor)}>{note}</span>}
      </div>
    </div>
  );
}

// ─── Billing Split badge helpers ─────────────────────────────────────────────

const SPLIT_LABELS: Record<string, string> = {
  HEADCOUNT: 'Headcount',
  SI: 'Sum Insured',
  PREMIUM: 'Premium',
};

const SPLIT_COLORS: Record<string, string> = {
  HEADCOUNT: 'bg-blue-50 text-blue-700 border-blue-200',
  SI: 'bg-purple-50 text-purple-700 border-purple-200',
  PREMIUM: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ─── ClaimsExperienceTab ──────────────────────────────────────────────────────

interface ClaimsFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ClaimsExperienceTab() {
  const [files, setFiles] = useState<ClaimsFile[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    const newEntries: ClaimsFile[] = picked.map((f) => ({
      id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    }));
    setFiles((prev) => [...prev, ...newEntries]);
    e.target.value = '';
  };

  const confirmDelete = (id: string) => setDeleteId(id);
  const handleDelete = () => {
    setFiles((prev) => prev.filter((f) => f.id !== deleteId));
    setDeleteId(null);
  };

  const deleteTarget = files.find((f) => f.id === deleteId);

  return (
    <div className="flex flex-col gap-4">

      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Claims Experience</h3>
          {files.length > 0 && (
            <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium tabular-nums">
              {files.length}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleUploadClick}>
          <Upload className="size-3.5" /> Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-destructive">
            Remove &ldquo;{deleteTarget.name}&rdquo;?
          </p>
          <p className="text-[11px] text-muted-foreground">
            This will remove the file from the record. This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleDelete}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table — always shown */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">File Name</th>
              <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Type</th>
              <th className="text-right px-3 py-2 text-[11px] font-medium text-muted-foreground">Size</th>
              <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Uploaded</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {files.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-xs text-muted-foreground py-12">
                  No claims files uploaded yet
                </td>
              </tr>
            )}
              {files.map((f) => {
                const ext = f.name.split('.').pop()?.toUpperCase() ?? '—';
                return (
                  <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-medium text-foreground max-w-[200px] truncate">
                      {f.name}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-muted/40 text-muted-foreground border-border/60">
                        {ext}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums text-right">
                      {fmtBytes(f.size)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(f.uploadedAt).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDelete(f.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

    </div>
  );
}

// ─── SubsidiariesTab ──────────────────────────────────────────────────────────

function SubsidiariesTab() {
  const { bundle, updateBundle } = useRfqBundle();
  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Form fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSplit, setFormSplit] = useState<'HEADCOUNT' | 'SI' | 'PREMIUM'>('HEADCOUNT');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formError, setFormError] = useState('');

  if (!bundle) return null;

  const subs = bundle.subsidiaries ?? [];
  const policyConfig = bundle.policyConfig;
  const subsidiariesEnabled = policyConfig?.subsidiariesEnabled ?? false;
  const separateBill = policyConfig?.separateBillPerSubsidiary ?? false;

  // Derived: plan count per subsidiary code
  const planCountByCode = (bundle.plans ?? []).reduce<Record<string, number>>((acc, plan) => {
    if (plan.subsidiaryScope && plan.subsidiaryScope !== 'WHOLE_GROUP') {
      acc[plan.subsidiaryScope] = (acc[plan.subsidiaryScope] ?? 0) + 1;
    }
    return acc;
  }, {});

  const resetForm = () => {
    setFormCode('');
    setFormName('');
    setFormLocation('');
    setFormSplit('HEADCOUNT');
    setFormStartDate('');
    setFormEndDate('');
    setFormError('');
  };

  const startAdd = () => {
    resetForm();
    setFormMode('add');
    setEditingId(null);
    setDeleteId(null);
  };

  const startEdit = (sub: Subsidiary) => {
    setFormCode(sub.code);
    setFormName(sub.name);
    setFormLocation(sub.locationMapping ?? '');
    setFormSplit(sub.billingSplitRule);
    setFormStartDate(sub.startDate);
    setFormEndDate(sub.endDate);
    setFormError('');
    setFormMode('edit');
    setEditingId(sub.subsidiaryId);
    setDeleteId(null);
  };

  const cancelForm = () => {
    setFormMode('none');
    setEditingId(null);
    resetForm();
  };

  const validateForm = () => {
    if (!formCode.trim()) { setFormError('Code is required'); return false; }
    if (!formName.trim()) { setFormError('Name is required'); return false; }
    return true;
  };

  const handleEnable = async () => {
    setSaving(true);
    try {
      await updateRfq(bundle.rfqId, {
        policyConfig: { ...policyConfig, subsidiariesEnabled: true },
      });
      updateBundle({ policyConfig: { ...policyConfig, subsidiariesEnabled: true } });
    } finally {
      setSaving(false);
    }
  };

  const handleSeparateBillToggle = async () => {
    const next = !separateBill;
    setSaving(true);
    try {
      await updateRfq(bundle.rfqId, {
        policyConfig: { ...policyConfig, separateBillPerSubsidiary: next },
      });
      updateBundle({ policyConfig: { ...policyConfig, separateBillPerSubsidiary: next } });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
      const sub = await createSubsidiary(bundle.rfqId, {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        locationMapping: formLocation.trim() || undefined,
        billingSplitRule: formSplit,
        startDate: formStartDate || today,
        endDate: formEndDate || nextYear,
        status: 'ACTIVE',
      });
      updateBundle({ subsidiaries: [...subs, sub] });
      cancelForm();
    } catch {
      setFormError('Failed to save — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !validateForm()) return;
    setSaving(true);
    try {
      const sub = await updateSubsidiary(bundle.rfqId, editingId, {
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        locationMapping: formLocation.trim() || undefined,
        billingSplitRule: formSplit,
        startDate: formStartDate,
        endDate: formEndDate,
      });
      updateBundle({ subsidiaries: subs.map((s) => s.subsidiaryId === editingId ? sub : s) });
      cancelForm();
    } catch {
      setFormError('Failed to save — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteSubsidiary(bundle.rfqId, deleteId);
      updateBundle({ subsidiaries: subs.filter((s) => s.subsidiaryId !== deleteId) });
      setDeleteId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleLifecycle = async (sub: Subsidiary, next: 'LAPSED' | 'TERMINATED') => {
    setSaving(true);
    try {
      const updated = await updateSubsidiary(bundle.rfqId, sub.subsidiaryId, { status: next });
      updateBundle({ subsidiaries: subs.map((s) => s.subsidiaryId === sub.subsidiaryId ? updated : s) });
    } finally {
      setSaving(false);
    }
  };

  // ── State A — subsidiaries disabled ────────────────────────────────────────
  if (!subsidiariesEnabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border border-dashed border-border bg-muted/10">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="size-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Subsidiaries not enabled</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[22rem]">
            Enable subsidiaries to track separate legal entities under this group policy, with per-entity billing splits and plan scoping.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleEnable}
          disabled={saving}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <ToggleLeft className="size-3.5" />}
          Enable Subsidiaries
        </Button>
      </div>
    );
  }

  // ── State B — subsidiaries enabled ─────────────────────────────────────────
  const deleteTarget = deleteId ? subs.find((s) => s.subsidiaryId === deleteId) : null;
  const planCountForDelete = deleteTarget ? (planCountByCode[deleteTarget.code] ?? 0) : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Controls strip */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <button
            role="switch"
            aria-checked={separateBill}
            onClick={handleSeparateBillToggle}
            disabled={saving}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              separateBill ? 'bg-primary' : 'bg-input'
            )}
          >
            <span
              className={cn(
                'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
                separateBill ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
          <span className="text-xs font-medium text-foreground">Separate Bill per Subsidiary</span>
          {!separateBill && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <Info className="size-2.5" /> Consolidated bill
            </span>
          )}
        </div>
        <button className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <ArrowLeftRight className="size-3" />
          Manage Member Transfers
        </button>
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {formMode === 'add' ? 'New Subsidiary' : 'Subsidiaries'}
          </h3>
          {formMode !== 'add' && (
            <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium tabular-nums">
              {subs.length}
            </span>
          )}
        </div>
        {formMode === 'none' && !deleteId && (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={startAdd}>
            <Plus className="size-3.5" /> Add Subsidiary
          </Button>
        )}
      </div>

      {/* Inline add/edit form */}
      {(formMode === 'add' || formMode === 'edit') && (
        <div className="rounded-xl border border-border bg-muted/10 p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formCode}
                onChange={(e) => { setFormCode(e.target.value.toUpperCase()); setFormError(''); }}
                placeholder="e.g. TCSBPS"
                className="h-7 text-xs font-mono"
                autoFocus={formMode === 'add'}
                maxLength={12}
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormError(''); }}
                placeholder="Legal entity name"
                className="h-7 text-xs"
                autoFocus={formMode === 'edit'}
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">Location</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Mumbai"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">Billing Split Rule</Label>
              <Select value={formSplit} onValueChange={(v) => setFormSplit(v as typeof formSplit)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEADCOUNT" className="text-xs">By Headcount</SelectItem>
                  <SelectItem value="SI" className="text-xs">By Sum Insured</SelectItem>
                  <SelectItem value="PREMIUM" className="text-xs">By Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] mb-1 block text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
          {formMode === 'add' && (
            <p className="text-[11px] text-muted-foreground">
              Start/end date will default to the policy year if left blank.
              {!separateBill && (
                <span className="ml-1 text-amber-600">
                  Billing is consolidated — no separate invoice will be generated for this subsidiary.
                </span>
              )}
            </p>
          )}
          {formError && (
            <p className="text-[11px] text-destructive font-medium">{formError}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={formMode === 'add' ? handleCreate : handleUpdate}
              disabled={saving}
            >
              {saving && <Loader2 className="size-3 animate-spin" />}
              {formMode === 'add' ? 'Add Subsidiary' : 'Save Changes'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={cancelForm}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation panel */}
      {deleteTarget && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-destructive">
            Remove &ldquo;{deleteTarget.name}&rdquo; ({deleteTarget.code})?
          </p>
          <p className="text-[11px] text-muted-foreground">
            This will permanently remove the subsidiary record and unlink it from this policy.
            {planCountForDelete > 0 && (
              <span className="ml-1 font-medium text-amber-600">
                Warning: {planCountForDelete} plan{planCountForDelete > 1 ? 's are' : ' is'} scoped to this subsidiary.
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1.5 text-xs"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="size-3 animate-spin" />}
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setDeleteId(null)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table — always shown */}
      {formMode === 'none' && !deleteId && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Code</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Location</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Start</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">End</th>
                <th className="text-left px-3 py-2 text-[11px] font-medium text-muted-foreground">Billing Split</th>
                <th className="text-right px-3 py-2 text-[11px] font-medium text-muted-foreground">Plans</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-xs text-muted-foreground py-12">
                    No subsidiaries added yet
                  </td>
                </tr>
              )}
              {subs.map((sub) => {
                const isLapsed = sub.status === 'LAPSED';
                const isTerminated = sub.status === 'TERMINATED';
                const rowBg = isTerminated
                  ? 'bg-red-50/40'
                  : isLapsed
                  ? 'bg-amber-50/40'
                  : '';

                return (
                  <tr
                    key={sub.subsidiaryId}
                    className={cn(
                      'border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors',
                      rowBg
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">{sub.code}</span>
                        {isLapsed && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0 text-[10px] font-medium text-amber-700">
                            Lapsed
                          </span>
                        )}
                        {isTerminated && (
                          <span className="inline-flex items-center rounded-full bg-red-100 border border-red-300 px-1.5 py-0 text-[10px] font-medium text-red-700">
                            Terminated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-foreground max-w-[14rem] truncate">{sub.name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{sub.locationMapping ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDate(sub.startDate)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDate(sub.endDate)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          SPLIT_COLORS[sub.billingSplitRule] ?? 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {SPLIT_LABELS[sub.billingSplitRule] ?? sub.billingSplitRule}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-right tabular-nums text-muted-foreground">
                      {planCountByCode[sub.code] ?? 0}
                    </td>
                    <td className="px-3 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center justify-center size-6 rounded hover:bg-muted transition-colors">
                            <EllipsisVertical className="size-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="text-xs gap-2"
                            onClick={() => startEdit(sub)}
                          >
                            <Pencil className="size-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              className="text-xs gap-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                              onClick={() => handleLifecycle(sub, 'LAPSED')}
                            >
                              <Clock className="size-3" /> Lapse
                            </DropdownMenuItem>
                          )}
                          {sub.status !== 'TERMINATED' && (
                            <DropdownMenuItem
                              className="text-xs gap-2 text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                              onClick={() => handleLifecycle(sub, 'TERMINATED')}
                            >
                              <XCircle className="size-3" /> Terminate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => { setDeleteId(sub.subsidiaryId); setFormMode('none'); }}
                          >
                            <Trash2 className="size-3" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── HeadcountTab ───────────────────────────────────────────────────────────

function fmtLakh(n: number) {
  if (n === 0) return '—';
  const l = n / 100000;
  return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
}

function HeadcountTab() {
  const { bundle, updateBundle } = useRfqBundle();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const init  = bundle.headcountData;

  const [editing,  setEditing]  = useState(false);
  const [totalLives, setTotalLives] = useState<string>(init?.totalLives?.toString() ?? '');
  const [grades,   setGrades]   = useState<GradeRow[]>(init?.grades ?? []);
  const [hcSave,   setHcSave]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [snapshot, setSnapshot] = useState<{ tl: string; gr: GradeRow[] } | null>(null);

  const startEdit  = () => { setSnapshot({ tl: totalLives, gr: grades }); setEditing(true); };
  const cancelEdit = () => {
    if (snapshot) { setTotalLives(snapshot.tl); setGrades(snapshot.gr); }
    setEditing(false);
  };

  const addGrade    = () => setGrades((g) => [...g, { grade: '', lives: 0, avgSalary: 0, avgSumAssured: 0 }]);
  const removeGrade = (i: number) => setGrades((g) => g.filter((_, idx) => idx !== i));
  const setGradeField = <K extends keyof GradeRow>(i: number, key: K, val: GradeRow[K]) =>
    setGrades((g) => g.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const saveHeadcount = React.useCallback(async () => {
    setHcSave('saving');
    try {
      const updated = await updateHeadcount(rfqId, { totalLives: Number(totalLives), grades });
      updateBundle({ headcountData: updated.headcountData });
      setHcSave('saved');
      setEditing(false);
      setTimeout(() => setHcSave('idle'), 1500);
    } catch { setHcSave('error'); }
  }, [rfqId, totalLives, grades, updateBundle]);

  const members   = bundle.members;
  const livesTotal = Number(totalLives) || 0;
  const maxLives   = grades.length > 0 ? Math.max(...grades.map((g) => g.lives), 1) : 1;
  const avgSalary  = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.avgSalary,     0) / grades.length) : 0;
  const avgSA      = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g.avgSumAssured, 0) / grades.length) : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Headcount</h3>
        {!editing ? (
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={startEdit}>
            <Pencil className="size-3" /> Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>Cancel</Button>
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={saveHeadcount} disabled={hcSave === 'saving'}>
              {hcSave === 'saving' && <Loader2 className="size-3 animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Population hero stats */}
      {!editing && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Lives',     value: livesTotal > 0 ? livesTotal.toLocaleString() : '—' },
            { label: 'Grade Tiers',     value: grades.length > 0 ? grades.length.toString() : '—' },
            { label: 'Avg Salary',      value: avgSalary > 0 ? fmtLakh(avgSalary) : '—' },
            { label: 'Avg Sum Assured', value: avgSA > 0 ? fmtLakh(avgSA) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5 text-center">
              <p className={cn('text-3xl font-black tabular-nums leading-none', value === '—' ? 'text-muted-foreground/40' : 'text-foreground')}>{value}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit mode: total lives input */}
      {editing && (
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium w-44 shrink-0 text-muted-foreground">
              Total expected lives <span className="text-destructive">*</span>
            </label>
            <Input type="number" min="0" value={totalLives}
              onChange={(e) => setTotalLives(e.target.value)}
              className="text-sm w-32" placeholder="0" />
          </div>
        </div>
      )}

      {/* Grade breakdown — title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Grade Breakdown</h3>
        {editing && (
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addGrade}>
            <Plus className="size-3" /> Add
          </Button>
        )}
      </div>

      {/* Grade breakdown — table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Column headers in card header area — always visible */}
        <div className="grid grid-cols-[72px_1fr_1fr_1fr_28px] gap-3 px-5 py-2.5 border-b border-border/50 bg-muted/20">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grade</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">% of Total</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Salary (₹)</p>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Sum Assured (₹)</p>
          <div />
        </div>

        <div className="px-5 pt-3 pb-5">
          {grades.length === 0 ? (
            <div className="py-5 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
              {editing ? 'Click “Add” to define grade bands.' : 'No grade bands defined yet.'}
            </div>
          ) : (
            <>

              <div className="flex flex-col gap-1.5">
                {grades.map((row, i) => {
                  const pct        = livesTotal > 0 ? parseFloat(((row.lives / livesTotal) * 100).toFixed(1)) : 0;
                  const barW       = maxLives   > 0 ? Math.round((row.lives / maxLives) * 100) : 0;
                  const otherLives = grades.reduce((s, g, idx) => idx !== i ? s + g.lives : s, 0);
                  const maxPct     = livesTotal > 0 ? parseFloat(((livesTotal - otherLives) / livesTotal * 100).toFixed(1)) : 100;
                  return (
                    <div key={i} className={cn('rounded-lg border transition-colors',
                      editing ? 'border-border/60 bg-muted/10 px-3 py-2' : 'border-border/40 bg-muted/10 px-3 py-2.5')}>
                      {editing ? (
                        <div className="grid grid-cols-[72px_1fr_1fr_1fr_28px] gap-3 items-center">
                          <Input
                            value={row.grade}
                            onChange={(e) => setGradeField(i, 'grade', e.target.value)}
                            className="h-7 text-xs font-mono font-bold w-full placeholder:text-muted-foreground/30 placeholder:font-normal"
                            placeholder="G1"
                          />
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max={maxPct}
                              step="0.5"
                              value={pct || ''}
                              disabled={livesTotal === 0}
                              onChange={(e) => {
                                const v = Math.min(Math.max(0, parseFloat(e.target.value) || 0), maxPct);
                                setGradeField(i, 'lives', Math.round((v / 100) * livesTotal));
                              }}
                              className="h-7 text-xs w-full pr-7"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={row.avgSalary || ''}
                            onChange={(e) => setGradeField(i, 'avgSalary', Number(e.target.value))}
                            className="h-7 text-xs w-full"
                          />
                          <Input
                            type="number"
                            min="0"
                            value={row.avgSumAssured || ''}
                            onChange={(e) => setGradeField(i, 'avgSumAssured', Number(e.target.value))}
                            className="h-7 text-xs w-full"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                            onClick={() => removeGrade(i)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[72px_1fr_1fr_1fr_28px] gap-3 items-center">
                          <span className="font-mono font-bold text-sm">{row.grade || '—'}</span>
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-medium tabular-nums">{row.lives.toLocaleString()}</span>
                              <span className="text-[10px] text-muted-foreground">{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-foreground/25 transition-all" style={{ width: `${barW}%` }} />
                            </div>
                          </div>
                          <p className="text-xs font-medium text-foreground">{fmtLakh(row.avgSalary)}</p>
                          <p className="text-xs font-medium text-foreground">{fmtLakh(row.avgSumAssured)}</p>
                          <div />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer: allocated summary (edit mode) */}
              {editing && livesTotal > 0 && (
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground">
                    Allocated: <span className="font-semibold text-foreground">{grades.reduce((s, g) => s + g.lives, 0).toLocaleString()}</span> of {livesTotal.toLocaleString()} lives
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {parseFloat((grades.reduce((s, g) => s + g.lives, 0) / livesTotal * 100).toFixed(1))}% allocated
                  </p>
                </div>
              )}
              {editing && livesTotal === 0 && (
                <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3 shrink-0" /> Set total lives above to allocate grades by percentage
                </p>
              )}
            </>
          )}
          {hcSave === 'saved' && (
            <p className="text-xs text-green-600 flex items-center gap-1 mt-3"><Check className="size-3.5" /> Saved</p>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── CensusTab ───────────────────────────────────────────────────────────────

const CENSUS_SYSTEM_FIELDS = [
  { value: 'name',        label: 'Name' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
  { value: 'gender',      label: 'Gender' },
  { value: 'grade',       label: 'Grade' },
  { value: 'salary',      label: 'Salary' },
  { value: 'sumAssured',  label: 'Sum Assured' },
  { value: '__ignore__',  label: '\u2014 Ignore \u2014' },
];

function CensusTab() {
  const { bundle, updateBundle } = useRfqBundle();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const init  = bundle.headcountData;

  // ── census upload state ──
  const [uploadOpen,  setUploadOpen]  = useState(false);
  const [fileName,    setFileName]    = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [colMapping,  setColMapping]  = useState<Record<string, string>>({});
  const [uploadStep,  setUploadStep]  = useState<'file' | 'mapping' | 'done'>('file');
  const [importing,   setImporting]   = useState(false);
  const [accepting,   setAccepting]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openUpload = () => {
    setUploadOpen(true);
    setUploadStep('file');
    setFileName(null);
    setFilePreview(null);
    fileRef.current?.click();
  };

  const parseFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text    = (e.target?.result as string) ?? '';
      const lines   = text.split('\n').filter((l) => l.trim());
      const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
      const rows    = lines.slice(1, 5).map((l) => l.split(',').map((c) => c.trim()));
      const dm: Record<string, string> = {};
      headers.forEach((h) => { dm[h] = '__ignore__'; });
      setFilePreview({ headers, rows });
      setColMapping(dm);
      setUploadStep('mapping');
    };
    reader.readAsText(file);
  };

  const applyMapping = async () => {
    setImporting(true);
    try {
      const NAMES   = ['Amit Kumar','Sunita Rao','Rajesh Iyer','Meena Singh','Suresh Das',
                       'Kavitha Nair','Deepak Joshi','Anita Mishra','Vikas Sharma','Pooja Gupta'];
      const gList   = (init?.grades ?? []).map((g) => g.grade).filter(Boolean);
      const gl      = gList.length > 0 ? gList : ['G1','G2','G3'];
      const count   = init?.totalLives ?? 50;
      const gen     = Array.from({ length: count }, (_, i) => ({
        name: NAMES[i % NAMES.length] + ` ${i + 1}`,
        dateOfBirth: `${1975 + (i % 20)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
        gender: i % 3 === 0 ? 'F' : 'M',
        grade: gl[i % gl.length],
        salary: 600000 + (i % 10) * 120000,
        sumAssured: 1800000 + (i % 10) * 360000,
      }));
      await bulkImportMembers(rfqId, gen);
      const newMembers = gen.map((m, i) => ({
        ...m, memberNumber: `MBR-MAP-${String(i + 1).padStart(3, '0')}`, rfqId, coverages: [] as never[],
      }));
      const patch = { totalLives: newMembers.length, quality: { trafficLight: CensusQuality.A } };
      await updateCensusSummary(rfqId, patch);
      updateBundle({ members: newMembers, censusSummary: patch });
      setUploadStep('done');
    } catch { /* silent */ }
    finally { setImporting(false); }
  };

  const acceptCensus = async () => {
    setAccepting(true);
    try {
      const patch = { totalLives: bundle.members.length, quality: { trafficLight: CensusQuality.G } };
      await updateCensusSummary(rfqId, patch);
      updateBundle({ censusSummary: patch });
      setUploadOpen(false);
    } finally { setAccepting(false); }
  };

  const members       = bundle.members;
  const censusSummary = bundle.censusSummary;
  const hasRoster     = members.length > 0;

  const qualityBadgeClass = (q: CensusQuality) =>
    q === CensusQuality.G ? 'bg-green-100 text-green-700 border-green-200'
    : q === CensusQuality.A ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  const qualityLabel = (q: CensusQuality) =>
    q === CensusQuality.G ? 'Good' : q === CensusQuality.A ? 'Average' : 'Poor';

  return (
    <div className="flex flex-col gap-4">

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Census</h3>
          {censusSummary && (
            <span className={cn(
              'text-[10px] font-medium border rounded px-1.5 py-0.5',
              qualityBadgeClass(censusSummary.quality.trafficLight),
            )}>
              {censusSummary.totalLives.toLocaleString()} members \u00b7 {qualityLabel(censusSummary.quality.trafficLight)}
            </span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
        />
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={openUpload}>
          <Upload className="size-3" /> {hasRoster ? 'Replace' : 'Upload census'}
        </Button>
      </div>

      {/* Upload drawer */}
      {uploadOpen && (
        <div className="rounded-xl border border-border bg-muted/10 px-5 py-4">
          {uploadStep === 'file' && (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors flex-1"
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="size-5 text-muted-foreground/50 shrink-0" />
                <div>
                  <p className="text-xs font-medium">{fileName ?? 'Click to select census file'}</p>
                  <p className="text-[10px] text-muted-foreground">.csv or .xlsx \u00b7 first row as headers</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0"
                onClick={() => setUploadOpen(false)}>Cancel</Button>
            </div>
          )}

          {uploadStep === 'mapping' && filePreview && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium">Map columns \u2014 <span className="font-normal text-muted-foreground">{fileName}</span></p>
                <Button variant="ghost" size="sm" className="h-6 text-xs"
                  onClick={() => { setUploadStep('file'); setFilePreview(null); }}>\u2190 Back</Button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">File column</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">System field</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filePreview.headers.map((col, ci) => (
                      <tr key={col} className="border-b border-border/30 last:border-0">
                        <td className="px-3 py-2 font-medium">{col}</td>
                        <td className="px-3 py-2">
                          <Select value={colMapping[col] ?? '__ignore__'}
                            onValueChange={(v) => setColMapping((m) => ({ ...m, [col]: v }))}>
                            <SelectTrigger className="h-6 text-xs w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CENSUS_SYSTEM_FIELDS.map((f) => (
                                <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {filePreview.rows.slice(0, 2).map((r) => r[ci]).filter(Boolean).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={applyMapping} disabled={importing}>
                  {importing && <Loader2 className="size-3 animate-spin" />}
                  Apply &amp; import
                </Button>
              </div>
            </div>
          )}

          {uploadStep === 'done' && censusSummary && (
            <div className="flex items-center justify-between">
              <div className={cn('flex items-center gap-2 text-xs rounded-lg border px-3 py-2',
                qualityBadgeClass(censusSummary.quality.trafficLight))}>
                {censusSummary.quality.trafficLight === CensusQuality.G ? <CheckCircle2 className="size-3.5" />
                 : censusSummary.quality.trafficLight === CensusQuality.A ? <AlertTriangle className="size-3.5" />
                 : <XCircle className="size-3.5" />}
                <span className="font-medium">{censusSummary.totalLives.toLocaleString()} records \u00b7 {qualityLabel(censusSummary.quality.trafficLight)} quality</span>
              </div>
              <div className="flex items-center gap-2">
                {censusSummary.quality.trafficLight === CensusQuality.R && (
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <Wrench className="size-3" /> Bulk repair
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs" onClick={acceptCensus}
                  disabled={accepting || censusSummary.quality.trafficLight === CensusQuality.R}>
                  {accepting && <Loader2 className="size-3 animate-spin" />}
                  Accept
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roster area */}
      {!hasRoster ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center gap-2 py-14 text-center">
          <Clipboard className="size-7 text-muted-foreground/25" />
          <p className="text-sm font-medium text-muted-foreground/60">No census loaded</p>
          <p className="text-[11px] text-muted-foreground/40">Upload a .csv or .xlsx file above to import member records</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                {['Member No', 'Name', 'DoB', 'Gender', 'Grade', 'Salary', 'Sum Assured', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberNumber} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{m.memberNumber}</td>
                  <td className="px-4 py-2.5 font-medium text-sm">{m.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{m.dateOfBirth}</td>
                  <td className="px-4 py-2.5 text-xs">{m.gender}</td>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{m.grade}</span></td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-right">{m.salary > 0 ? `₹${m.salary.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums text-right">{m.sumAssured > 0 ? `₹${m.sumAssured.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <a href={`/rfqs/${rfqId}/members/${m.memberNumber}/master`} className="text-[10px] text-primary hover:underline">View</a>
                      <ChevronRight className="size-3 text-muted-foreground/30" />
                      <a href={`/rfqs/${rfqId}/members/${m.memberNumber}/coverages`} className="text-[10px] text-primary hover:underline">Coverages</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

// ─── DocumentsTab ────────────────────────────────────────────────────────────

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  ext: string;
  source: string;
  docType?: string;
  uploadedAt: string;
}

const DOC_BADGE_CLS = 'bg-muted/40 text-muted-foreground border-border/60';

function DocumentsTab() {
  const { bundle } = useRfqBundle();
  if (!bundle) return null;

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [hiddenBundleIds, setHiddenBundleIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; isBundleDoc: boolean } | null>(null);

  // Drain any docs submitted from the upload page
  useEffect(() => {
    const pending = uploadStore.drain();
    if (pending.length) setUploadedDocs((prev) => [...prev, ...pending]);
  }, []);

  const handleUploadClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadStore.setFile(f);
    e.target.value = '';
    router.push(`/rfq2/${bundle.rfqId}/documents/upload`);
  };

  const confirmDelete = (id: string, name: string, isBundleDoc: boolean) =>
    setDeleteTarget({ id, name, isBundleDoc });

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.isBundleDoc) {
      setHiddenBundleIds((prev) => new Set([...prev, deleteTarget.id]));
    } else {
      setUploadedDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const bundleDocs = (bundle.documents ?? []).filter((d) => !hiddenBundleIds.has(d.documentId));

  const srcLabel = (src: string) =>
    src === 'engine' ? 'Generated' : src;

  // Static quote-level documents (census upload, generated packs, etc.)
  const QUOTE_DOCS = [
    { id: 'qd-census',      name: 'Census_upload_v3.xlsx',    ext: 'XLSX', source: 'Census',       date: '12 Jun 2026', size: '48 KB'  },
    { id: 'qd-quoteletter', name: 'Quote_Letter_v1.pdf',      ext: 'PDF',  source: 'Quote Letter', date: '14 Jun 2026', size: '220 KB' },
    { id: 'qd-claims',      name: 'Claims_Summary_2024.pdf',  ext: 'PDF',  source: 'Claims',       date: '10 Jun 2026', size: '185 KB' },
    { id: 'qd-quotepack',   name: 'Quote_Pack_Draft.pdf',     ext: 'PDF',  source: 'Generated',    date: '15 Jun 2026', size: '340 KB' },
  ];

  const quoteDocs = [
    ...QUOTE_DOCS,
    ...bundleDocs.map((d) => ({
      id: d.documentId,
      name: d.name,
      ext: d.name.split('.').pop()?.toUpperCase() ?? '—',
      source: srcLabel(d.source),
      date: new Date(d.uploadedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      size: '—',
    })),
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-destructive">
            Remove &ldquo;{deleteTarget.name}&rdquo;?
          </p>
          <p className="text-[11px] text-muted-foreground">
            This will remove the file from this record. This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleDelete}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Section 1: Uploaded Documents ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Uploaded Documents</h3>
            {uploadedDocs.length > 0 && (
              <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium tabular-nums">
                {uploadedDocs.length}
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={handleUploadClick}>
            <Upload className="size-3.5" /> Upload
          </Button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>

        {uploadedDocs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border py-8 flex flex-col items-center gap-2">
            <Upload className="size-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="relative rounded-xl border border-border p-3 flex flex-col gap-2 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                {/* Menu dropdown */}
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="size-6 rounded-md">
                        <EllipsisVertical className="size-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem className="flex items-center gap-2 text-xs cursor-pointer">
                        <Download className="size-3.5" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="flex items-center gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => confirmDelete(doc.id, doc.name, false)}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 pr-4">{doc.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit', DOC_BADGE_CLS)}>
                    {doc.ext}
                  </span>
                  <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit', DOC_BADGE_CLS)}>
                    {(doc.docType ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || doc.source}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{fmtBytes(doc.size)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Documents from quote ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Documents from quote</h3>
          <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium tabular-nums">
            {quoteDocs.length}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {quoteDocs.map((doc) => (
            <div
              key={doc.id}
              className="relative rounded-xl border border-border p-3 flex flex-col gap-2 cursor-pointer hover:bg-muted/20 transition-colors"
            >
              {/* Download button */}
              <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="size-6 rounded-md">
                  <Download className="size-3 text-muted-foreground" />
                </Button>
              </div>
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{doc.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', DOC_BADGE_CLS)}>
                  {doc.ext}
                </span>
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', DOC_BADGE_CLS)}>
                  {doc.source}
                </span>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[11px] text-muted-foreground">{doc.date}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{doc.size}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── DealCockpitTab ─────────────────────────────────────────────────────────

function DealCockpitTab({ onSwitchTab }: { onSwitchTab: (tab: 'versions' | 'mph' | 'mph-categorization') => void }) {
  const { bundle } = useRfqBundle();
  const router = useRouter();

  const base = `/rfqs/${bundle.rfqId}`;

  // ── Derived values ────────────────────────────────────────────────────────
  const lives =
    bundle.mphProfile?.lives ??
    bundle.censusSummary?.totalLives ??
    bundle.headcountData?.totalLives ??
    0;

  const anyFrozen = bundle.quoteVersions.some(
    (v) => v.status === VersionStatus.FROZEN || v.status === VersionStatus.SELECTED,
  );
  const frozenVer = bundle.quoteVersions.find((v) => v.status === VersionStatus.FROZEN);
  const hasPricing = Object.keys(bundle.actuaryPricing.byVersion).length > 0;
  const hasPlans = bundle.plans.length > 0;
  const isFinalized = (
    [RfqStatus.SHARED, RfqStatus.NEGOTIATION, RfqStatus.FINAL, RfqStatus.ISSUED] as string[]
  ).includes(bundle.statusStage);

  const step1Done = !!bundle.effectiveDate && !!bundle.schemeType && !!bundle.businessType;
  const step2Done = step1Done && !!bundle.censusSummary;
  const step3Done = step2Done && hasPlans && hasPricing;
  const step4Done = step3Done && anyFrozen;
  const step5Done = step4Done && isFinalized;

  type StepState = 'done' | 'active' | 'todo';
  const steps: Array<{ label: string; note: string; state: StepState }> = [
    {
      label: 'Intake',
      note: step1Done ? formatDate(bundle.effectiveDate) : 'Key data + scheme',
      state: step1Done ? 'done' : 'active',
    },
    {
      label: 'Data Ready',
      note: step2Done
        ? `${bundle.censusSummary!.totalLives.toLocaleString()} lives`
        : 'Census + subsidiaries',
      state: step2Done ? 'done' : step1Done ? 'active' : 'todo',
    },
    {
      label: 'Plans & Pricing',
      note: step3Done
        ? `${bundle.plans.length} plan(s)${
            bundle.actuaryPricing.byVersion[bundle.activeVersionId]
              ? ` · ₹${(bundle.actuaryPricing.byVersion[bundle.activeVersionId].finalPremiumInclGst / 100000).toFixed(1)}L`
              : ''
          }`
        : 'Plans + rate card',
      state: step3Done ? 'done' : step2Done ? 'active' : 'todo',
    },
    {
      label: 'Quote Ready',
      note: frozenVer
        ? `V${frozenVer.versionNo} · ${formatDate(frozenVer.createdAt)}`
        : 'Freeze a version',
      state: step4Done ? 'done' : step3Done ? 'active' : 'todo',
    },
    {
      label: 'Finalized',
      note: step5Done
        ? (bundle.salesOwner?.name ?? 'Dispatched')
        : 'Dispatch to client',
      state: step5Done ? 'done' : step4Done ? 'active' : 'todo',
    },
  ];

  // ── Featured version: matches Versions tab (activeVersionId → fallback [0]) ─
  const featuredVersion =
    bundle.quoteVersions.find((v) => v.id === bundle.activeVersionId) ??
    bundle.quoteVersions[0];
  const featuredPriceRun = featuredVersion
    ? bundle.actuaryPricing.byVersion[featuredVersion.id]
    : undefined;

  const appliedDiscount =
    bundle.negotiationLog.length > 0
      ? ([...bundle.negotiationLog]
          .reverse()
          .find((r) => r.askDiscountPct !== undefined)?.askDiscountPct ?? null)
      : null;
  const bufferRemaining = bundle.mphAppetite
    ? bundle.mphAppetite.maxDiscountPct - (appliedDiscount ?? 0)
    : null;

  // ── Routing ───────────────────────────────────────────────────────────────
  const appetite = bundle.mphAppetite;
  const routing: 'STP' | 'REFER' | null = appetite
    ? appetite.uwAuthorityBand.toUpperCase().includes('SALES') ? 'STP' : 'REFER'
    : null;

  const referralReasons: string[] = [];
  if (bundle.mphProfile) {
    const { hazardClass, hazardousRoles, lives: mphLives, zones } = bundle.mphProfile;
    if (hazardClass === 'HIGH' || hazardClass === 'SPECIAL') referralReasons.push('HIGH hazard');
    if (hazardousRoles) referralReasons.push('Hazardous roles');
    if (mphLives > 500) referralReasons.push('500+ lives');
    if (zones > 5) referralReasons.push('5+ zones');
  }
  if (bundle.businessType === BusinessType.TAKEOVER) referralReasons.push('TAKEOVER review');

  const verStatusLabel: Partial<Record<VersionStatus, string>> = {
    [VersionStatus.DRAFT]: 'Draft',
    [VersionStatus.SHARED]: 'Shared',
    [VersionStatus.SELECTED]: 'Selected',
    [VersionStatus.FROZEN]: 'Frozen',
    [VersionStatus.ARCHIVED]: 'Archived',
  };
  const verAccentClass: Partial<Record<VersionStatus, string>> = {
    [VersionStatus.FROZEN]: 'bg-emerald-50',
    [VersionStatus.SELECTED]: 'bg-indigo-50',
    [VersionStatus.SHARED]: 'bg-sky-50',
    [VersionStatus.DRAFT]: 'bg-slate-50',
    [VersionStatus.ARCHIVED]: 'bg-slate-50',
  };
  const verBorderClass: Partial<Record<VersionStatus, string>> = {
    [VersionStatus.FROZEN]: 'border-emerald-200',
    [VersionStatus.SELECTED]: 'border-indigo-200',
    [VersionStatus.SHARED]: 'border-sky-200',
    [VersionStatus.DRAFT]: 'border-border',
    [VersionStatus.ARCHIVED]: 'border-border',
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Section 2: Featured Version ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Active Version</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => onSwitchTab('versions')}>
            All Versions <ArrowRight className="size-3" />
          </Button>
        </div>
        {!featuredVersion ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 flex flex-col items-center gap-2 text-center">
            <GitPullRequest className="size-7 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No version yet — create the first version</p>
          </div>
        ) : (
          <RfqActiveVersionCard
            version={featuredVersion}
            priceEntry={featuredPriceRun}
            planNames={bundle.plans.filter((p) => p.quoteVersionId === featuredVersion.id).map((p) => p.name)}
            uwPath={bundle.mphAppetite?.uwAuthorityBand}
            pricingPath={fmtFclPattern(bundle.fclPolicy.byVersion[featuredVersion.id] ?? bundle.fclPolicy.quoteDefault)}
            onOpen={() => router.push(`/rfq2/${bundle.rfqId}/${featuredVersion.id}`)}
          />
        )}
      </div>

      {/* ── Section 3: Routing Verdict ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Routing Verdict</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => onSwitchTab('mph-categorization')}>
            MPH Profile <ArrowRight className="size-3" />
          </Button>
        </div>
        {!appetite ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 flex flex-col items-center gap-2 text-center">
            <ShieldUser className="size-7 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Save MPH profile to get routing verdict</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Single horizontal row */}
            <div className="flex items-stretch divide-x divide-border/30">

              {/* Col 1 — routing status */}
              <div className={cn(
                'flex items-center gap-3 px-5 py-4 min-w-[200px]',
                routing === 'STP' ? 'bg-gradient-to-br from-emerald-50 to-card' : 'bg-gradient-to-br from-amber-50 to-card',
              )}>
                <span className={cn(
                  'flex items-center justify-center size-9 rounded-xl shrink-0',
                  routing === 'STP' ? 'bg-emerald-100' : 'bg-amber-100',
                )}>
                  {routing === 'STP'
                    ? <Check className="size-4 text-emerald-700" />
                    : <AlertTriangle className="size-4 text-amber-700" />}
                </span>
                <div>
                  <p className={cn('text-sm font-bold leading-tight', routing === 'STP' ? 'text-emerald-800' : 'text-amber-800')}>
                    {routing === 'STP' ? 'Straight-Through' : 'Referral Required'}
                  </p>
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0 text-[9px] font-bold uppercase tracking-wide mt-1',
                    routing === 'STP' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-amber-100 border-amber-300 text-amber-800',
                  )}>{routing}</span>
                </div>
              </div>

              {/* Col 2 — category */}
              <div className="px-5 py-4 flex flex-col justify-center gap-0.5 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Category</p>
                <p className="text-sm font-bold text-foreground leading-tight">{appetite.category}</p>
                {appetite.preapprovedCardRef && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{appetite.preapprovedCardRef}</p>
                )}
              </div>

              {/* Col 3 — UW Authority */}
              <div className="px-5 py-4 flex flex-col justify-center gap-0.5 min-w-[140px]">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">UW Authority</p>
                <p className="text-sm font-bold text-foreground leading-tight">{appetite.uwAuthorityBand}</p>
                {routing !== 'STP' && (
                  <p className="text-[10px] text-amber-600 mt-0.5">Sign-off required</p>
                )}
              </div>

              {/* Col 4 — max discount */}
              <div className="px-5 py-4 flex flex-col justify-center gap-0.5 min-w-[100px]">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Max Discount</p>
                <p className="text-3xl font-black tabular-nums text-foreground leading-none">
                  {appetite.maxDiscountPct}<span className="text-base font-semibold text-muted-foreground">%</span>
                </p>
              </div>

              {/* Col 5 — referral reasons OR stamp info */}
              <div className="px-5 py-4 flex flex-col justify-center gap-1.5 flex-1">
                {referralReasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {referralReasons.map((r) => (
                      <span key={r} className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{r}</span>
                    ))}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <Check className="size-3" /> No referral triggers
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground">{appetite.source} · {formatDate(appetite.evaluatedAt)}</p>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── AuditLogTab ────────────────────────────────────────────────────────────────────────────

type RfqAuditEventKind = 'RFQ' | 'VERSION' | 'NEGOTIATION' | 'DOCUMENT';

interface RfqAuditEvent {
  id: string;
  kind: RfqAuditEventKind;
  by: string;
  at: string;
  employerName?: string;
  rfqBusinessType?: string;
  rfqSchemeType?: string;
  versionNo?: number;
  versionName?: string;
  versionNote?: string;
  versionStatus?: VersionStatus;
  versionAction?: string;
  roundNo?: number;
  negotiationParty?: string;
  negotiationKind?: string;
  askDiscountPct?: number;
  negotiationNote?: string;
  docName?: string;
  docType?: string;
  docSource?: string;
  docStatus?: string;
}

const VER_PIPELINE_FOR_AUDIT: VersionStatus[] = [
  VersionStatus.DRAFT,
  VersionStatus.UW_REFERRED,
  VersionStatus.EVALUATED,
  VersionStatus.PRICING_REQUESTED,
  VersionStatus.RATED,
  VersionStatus.SUBMITTED,
  VersionStatus.SHARED,
  VersionStatus.SENT_TO_CLIENT,
  VersionStatus.SELECTED,
  VersionStatus.FROZEN,
];

const VER_EVENT_LABEL: Partial<Record<VersionStatus, string>> = {
  [VersionStatus.DRAFT]:             'Draft created',
  [VersionStatus.UW_REFERRED]:       'Referred to underwriter',
  [VersionStatus.EVALUATED]:         'UW response received',
  [VersionStatus.PRICING_REQUESTED]: 'Pricing requested from actuary',
  [VersionStatus.RATED]:             'Actuary rating complete',
  [VersionStatus.SUBMITTED]:         'Quote submitted',
  [VersionStatus.SHARED]:            'Quote shared internally',
  [VersionStatus.SENT_TO_CLIENT]:    'Sent to client',
  [VersionStatus.SELECTED]:          'Client selected version',
  [VersionStatus.FROZEN]:            'Version frozen',
  [VersionStatus.WITHDRAWN]:         'Version withdrawn',
  [VersionStatus.ARCHIVED]:          'Version archived',
};

function deriveRfqAuditEvents(bundle: import('@/lib/types').RfqBundle): RfqAuditEvent[] {
  const events: RfqAuditEvent[] = [];
  const owner = bundle.salesOwner?.name ?? 'System';
  const DAY = 86_400_000;

  events.push({
    id: 'rfq-created',
    kind: 'RFQ',
    by: owner,
    at: bundle.createdAt,
    employerName: bundle.employerName,
    rfqBusinessType: bundle.businessType,
    rfqSchemeType: bundle.schemeType,
  });

  for (const v of (bundle.quoteVersions ?? [])) {
    const isTerminal = v.status === VersionStatus.WITHDRAWN || v.status === VersionStatus.ARCHIVED;
    const pipelineIdx = VER_PIPELINE_FOR_AUDIT.indexOf(v.status);

    if (isTerminal) {
      events.push({ id: `ver-${v.id}-DRAFT`, kind: 'VERSION', by: owner,
        at: new Date(new Date(v.createdAt).getTime() - 2 * DAY).toISOString(),
        versionNo: v.versionNo, versionName: v.name,
        versionStatus: VersionStatus.DRAFT, versionAction: VER_EVENT_LABEL[VersionStatus.DRAFT] });
      events.push({ id: `ver-${v.id}-${v.status}`, kind: 'VERSION', by: owner,
        at: v.createdAt, versionNo: v.versionNo, versionName: v.name,
        versionNote: v.note ?? undefined, versionStatus: v.status, versionAction: VER_EVENT_LABEL[v.status] });
    } else if (pipelineIdx >= 0) {
      for (let i = 0; i <= pipelineIdx; i++) {
        const st = VER_PIPELINE_FOR_AUDIT[i];
        const daysBack = (pipelineIdx - i) * 2;
        const ts = new Date(new Date(v.createdAt).getTime() - daysBack * DAY).toISOString();
        events.push({
          id: `ver-${v.id}-${st}`, kind: 'VERSION', by: owner, at: ts,
          versionNo: v.versionNo, versionName: v.name,
          versionNote: st === v.status ? (v.note ?? undefined) : undefined,
          versionStatus: st, versionAction: VER_EVENT_LABEL[st],
        });
      }
    } else {
      events.push({ id: `ver-${v.id}`, kind: 'VERSION', by: owner, at: v.createdAt,
        versionNo: v.versionNo, versionName: v.name, versionNote: v.note ?? undefined,
        versionStatus: v.status, versionAction: VER_EVENT_LABEL[v.status] });
    }
  }

  for (const r of (bundle.negotiationLog ?? [])) {
    events.push({ id: `neg-${r.roundNo}`, kind: 'NEGOTIATION', by: r.by, at: r.at,
      roundNo: r.roundNo, negotiationParty: r.party, negotiationKind: r.kind,
      askDiscountPct: r.askDiscountPct, negotiationNote: r.note ?? undefined });
  }

  for (const d of (bundle.documents ?? [])) {
    events.push({ id: `doc-${d.documentId}`, kind: 'DOCUMENT', by: owner, at: d.uploadedAt,
      docName: d.name, docType: d.type, docSource: d.source, docStatus: d.status });
  }

  const kindOrder: Record<RfqAuditEventKind, number> = { RFQ: 0, VERSION: 1, NEGOTIATION: 2, DOCUMENT: 3 };
  return events.sort((a, b) => {
    const td = new Date(b.at).getTime() - new Date(a.at).getTime();
    return td !== 0 ? td : kindOrder[b.kind] - kindOrder[a.kind];
  });
}

// ── Version status colour maps ──────────────────────────────────────────────────────────────────
const AUDIT_VER_NUM_BG: Partial<Record<VersionStatus, string>> = {
  [VersionStatus.DRAFT]:             'bg-slate-50 border-r border-slate-100',
  [VersionStatus.UW_REFERRED]:       'bg-amber-50 border-r border-amber-100',
  [VersionStatus.EVALUATED]:         'bg-blue-50 border-r border-blue-100',
  [VersionStatus.PRICING_REQUESTED]: 'bg-amber-50 border-r border-amber-100',
  [VersionStatus.RATED]:             'bg-blue-50 border-r border-blue-100',
  [VersionStatus.SUBMITTED]:         'bg-blue-50 border-r border-blue-100',
  [VersionStatus.SHARED]:            'bg-blue-50 border-r border-blue-100',
  [VersionStatus.SENT_TO_CLIENT]:    'bg-blue-50 border-r border-blue-100',
  [VersionStatus.SELECTED]:          'bg-emerald-50 border-r border-emerald-100',
  [VersionStatus.FROZEN]:            'bg-emerald-50 border-r border-emerald-100',
  [VersionStatus.WITHDRAWN]:         'bg-rose-50 border-r border-rose-100',
  [VersionStatus.ARCHIVED]:          'bg-slate-50 border-r border-slate-100',
};
const AUDIT_VER_NUM_TEXT: Partial<Record<VersionStatus, string>> = {
  [VersionStatus.DRAFT]:             'text-slate-300',
  [VersionStatus.UW_REFERRED]:       'text-amber-300',
  [VersionStatus.EVALUATED]:         'text-blue-300',
  [VersionStatus.PRICING_REQUESTED]: 'text-amber-300',
  [VersionStatus.RATED]:             'text-blue-300',
  [VersionStatus.SUBMITTED]:         'text-blue-300',
  [VersionStatus.SHARED]:            'text-blue-300',
  [VersionStatus.SENT_TO_CLIENT]:    'text-blue-300',
  [VersionStatus.SELECTED]:          'text-emerald-400',
  [VersionStatus.FROZEN]:            'text-emerald-400',
  [VersionStatus.WITHDRAWN]:         'text-rose-300',
  [VersionStatus.ARCHIVED]:          'text-slate-300',
};
const AUDIT_VER_BADGE: Partial<Record<VersionStatus, string>> = {
  [VersionStatus.DRAFT]:             'bg-slate-100 border-slate-200 text-slate-600',
  [VersionStatus.UW_REFERRED]:       'bg-amber-50 border-amber-200 text-amber-700',
  [VersionStatus.EVALUATED]:         'bg-blue-50 border-blue-200 text-blue-700',
  [VersionStatus.PRICING_REQUESTED]: 'bg-amber-50 border-amber-200 text-amber-700',
  [VersionStatus.RATED]:             'bg-blue-50 border-blue-200 text-blue-700',
  [VersionStatus.SUBMITTED]:         'bg-blue-50 border-blue-200 text-blue-700',
  [VersionStatus.SHARED]:            'bg-blue-50 border-blue-200 text-blue-700',
  [VersionStatus.SENT_TO_CLIENT]:    'bg-blue-50 border-blue-200 text-blue-700',
  [VersionStatus.SELECTED]:          'bg-emerald-50 border-emerald-200 text-emerald-700',
  [VersionStatus.FROZEN]:            'bg-emerald-50 border-emerald-200 text-emerald-700',
  [VersionStatus.WITHDRAWN]:         'bg-rose-50 border-rose-200 text-rose-700',
  [VersionStatus.ARCHIVED]:          'bg-slate-100 border-slate-200 text-slate-500',
};

function AuditLogTab() {
  const { bundle } = useRfqBundle();
  if (!bundle) return null;

  const [filter, setFilter] = useState<'ALL' | RfqAuditEventKind>('ALL');

  const allEvents = deriveRfqAuditEvents(bundle);
  const events    = filter === 'ALL' ? allEvents : allEvents.filter((e) => e.kind === filter);

  const relTime = (iso: string) => {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 30)  return `${d}d ago`;
    if (d < 365) return `${Math.round(d / 30)}mo ago`;
    return `${Math.round(d / 365)}y ago`;
  };

  const grouped = events.reduce<{ label: string; month: string; year: string; events: RfqAuditEvent[] }[]>((acc, evt) => {
    const d = new Date(evt.at);
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const month = d.toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
    const year  = String(d.getFullYear());
    const last  = acc[acc.length - 1];
    if (last && last.label === label) last.events.push(evt);
    else acc.push({ label, month, year, events: [evt] });
    return acc;
  }, []);

  const counts = allEvents.reduce<Record<RfqAuditEventKind, number>>(
    (acc, e) => { acc[e.kind] = (acc[e.kind] ?? 0) + 1; return acc; },
    { RFQ: 0, VERSION: 0, NEGOTIATION: 0, DOCUMENT: 0 },
  );

  const FILTER_OPTS: { key: 'ALL' | RfqAuditEventKind; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'ALL',         label: 'All',         icon: <Clock className="size-3.5" /> },
    { key: 'RFQ',         label: 'RFQ',         icon: <Briefcase className="size-3.5" />, count: counts.RFQ },
    { key: 'VERSION',     label: 'Versions',    icon: <Tag className="size-3.5" />,       count: counts.VERSION },
    { key: 'NEGOTIATION', label: 'Negotiation', icon: <ArrowLeftRight className="size-3.5" />, count: counts.NEGOTIATION },
    { key: 'DOCUMENT',    label: 'Documents',   icon: <FileText className="size-3.5" />,  count: counts.DOCUMENT },
  ];

  // ── Shared sub-components ───────────────────────────────────────────────────────────────────

  function ByBadge({ name }: { name: string }) {
    return (
      <span className="inline-flex items-center gap-1 w-fit rounded-full bg-muted border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground shrink-0">
        <User className="size-2.5 shrink-0" /> {name}
      </span>
    );
  }

  // Standard card shell: left fixed col + content area
  function CardShell({ leftCol, children }: { leftCol: React.ReactNode; children: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex">
          {leftCol}
          <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col gap-1">
            {children}
          </div>
        </div>
      </div>
    );
  }

  function CardHeader({ label, time }: { label: React.ReactNode; time: string }) {
    return (
      <div className="flex items-start justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground leading-tight">{label}</span>
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{relTime(time)}</span>
      </div>
    );
  }

  function CardFooter({ by }: { by: string }) {
    return (
      <div className="flex justify-end mt-0.5">
        <ByBadge name={by} />
      </div>
    );
  }

  // ── Event cards ────────────────────────────────────────────────────────────────────────────────

  function RfqCard({ evt }: { evt: RfqAuditEvent }) {
    return (
      <CardShell leftCol={
        <div className="w-14 shrink-0 flex items-center justify-center bg-emerald-50 border-r border-emerald-100">
          <Briefcase className="size-4 text-emerald-600" />
        </div>
      }>
        <CardHeader label={<span className="text-emerald-600">Deal Opened</span>} time={evt.at} />
        <p className="text-[13px] font-bold text-foreground leading-tight">{evt.employerName}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {evt.rfqBusinessType && (
            <span className="inline-flex items-center w-fit rounded-full bg-muted border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              {evt.rfqBusinessType}
            </span>
          )}
          {evt.rfqSchemeType && (
            <span className="inline-flex items-center w-fit rounded-full bg-muted border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              {evt.rfqSchemeType.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <CardFooter by={evt.by} />
      </CardShell>
    );
  }

  function VersionCard({ evt }: { evt: RfqAuditEvent }) {
    const st = evt.versionStatus;
    return (
      <CardShell leftCol={
        <div className={cn('w-14 shrink-0 flex items-center justify-center py-2.5',
          (st && AUDIT_VER_NUM_BG[st]) ?? 'bg-slate-50 border-r border-slate-100'
        )}>
          <span className={cn('text-xl font-black tabular-nums leading-none select-none',
            (st && AUDIT_VER_NUM_TEXT[st]) ?? 'text-slate-200'
          )}>
            V{evt.versionNo}
          </span>
        </div>
      }>
        <CardHeader label={evt.versionAction ?? 'Version event'} time={evt.at} />
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-semibold text-foreground leading-tight">{evt.versionName}</p>
          {st && (
            <span className={cn('inline-flex items-center w-fit rounded border px-1.5 py-0.5 text-[10px] font-semibold',
              AUDIT_VER_BADGE[st] ?? 'bg-slate-100 border-slate-200 text-slate-600'
            )}>
              {st.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        {evt.versionNote && (
          <p className="text-[11px] text-muted-foreground italic line-clamp-1 leading-snug">{evt.versionNote}</p>
        )}
        <CardFooter by={evt.by} />
      </CardShell>
    );
  }

  function NegotiationCard({ evt }: { evt: RfqAuditEvent }) {
    const isAccept = evt.negotiationKind === 'ACCEPT';
    const kindCls  = isAccept
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-amber-50 border-amber-200 text-amber-700';
    const leftBg = isAccept
      ? 'bg-emerald-50 border-r border-emerald-100'
      : 'bg-muted/30 border-r border-border/40';
    const numCls = isAccept ? 'text-emerald-600' : 'text-muted-foreground';

    return (
      <CardShell leftCol={
        <div className={cn('w-14 shrink-0 flex flex-col items-center justify-center py-2.5', leftBg)}>
          {evt.askDiscountPct !== undefined ? (
            <>
              <span className={cn('text-xl font-black tabular-nums leading-none', numCls)}>
                {evt.askDiscountPct}%
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">disc</span>
            </>
          ) : (
            <ArrowLeftRight className="size-4 text-muted-foreground/40" />
          )}
        </div>
      }>
        <CardHeader label={`Negotiation · Round ${evt.roundNo}`} time={evt.at} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('inline-flex items-center w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold', kindCls)}>
            {isAccept ? 'Accepted' : 'Counter Offer'}
          </span>
        </div>
        {evt.negotiationNote && (
          <p className="text-[11px] text-muted-foreground italic leading-snug line-clamp-2">
            &ldquo;{evt.negotiationNote}&rdquo;
          </p>
        )}
        <CardFooter by={evt.by} />
      </CardShell>
    );
  }

  function DocumentCard({ evt }: { evt: RfqAuditEvent }) {
    const isUpload = evt.docSource === 'upload';
    return (
      <CardShell leftCol={
        <div className="w-14 shrink-0 flex items-center justify-center bg-muted/20 border-r border-border/40">
          <FileText className="size-4 text-muted-foreground/50" />
        </div>
      }>
        <CardHeader label="Document" time={evt.at} />
        <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{evt.docName}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {evt.docType && (
            <span className="inline-flex items-center w-fit rounded bg-muted border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {evt.docType.replace(/_/g, ' ')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 w-fit text-[10px] text-muted-foreground">
            {isUpload ? <><Upload className="size-2.5" /> Uploaded</> : <><Cpu className="size-2.5" /> Generated</>}
          </span>
        </div>
        <CardFooter by={evt.by} />
      </CardShell>
    );
  }

  function EventCard({ evt }: { evt: RfqAuditEvent }) {
    if (evt.kind === 'RFQ')         return <RfqCard evt={evt} />;
    if (evt.kind === 'VERSION')     return <VersionCard evt={evt} />;
    if (evt.kind === 'NEGOTIATION') return <NegotiationCard evt={evt} />;
    return <DocumentCard evt={evt} />;
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Title row ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{allEvents.length} events</span>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── Filter sidebar (sticky) ─── */}
        <div className="w-36 shrink-0 flex flex-col gap-0.5 sticky top-0">
          {FILTER_OPTS.map(({ key, label, icon, count }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left gap-2',
                  active
                    ? 'bg-muted/80 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'flex size-5 items-center justify-center rounded-md shrink-0',
                    active ? 'bg-background text-foreground' : 'bg-muted/60 text-muted-foreground',
                  )}>
                    {icon}
                  </span>
                  <span className="truncate">{label}</span>
                </div>
                <span className={cn(
                  'text-[10px] rounded-full px-1.5 py-0.5 shrink-0 tabular-nums',
                  active ? 'bg-background text-foreground font-semibold' : 'bg-muted/60 text-muted-foreground',
                )}>
                  {count ?? allEvents.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Timeline feed ─── */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Clock className="size-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No events match this filter.</p>
            </div>
          ) : (
            grouped.map(({ label, month, year, events: grpEvts }) => (
              <div key={label}>

                {/* Month header */}
                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-base font-bold tracking-tight text-foreground">{month}</span>
                  <span className="text-sm font-normal text-muted-foreground">{year}</span>
                  <div className="flex-1 h-px bg-border/30 self-center ml-1" />
                  <span className="text-[10px] text-muted-foreground/50 tabular-nums">{grpEvts.length}</span>
                </div>

                {/* Events with timeline */}
                <div className="relative">
                  {/* Vertical timeline line — runs between first and last dot */}
                  <div className="absolute left-[84px] top-3 bottom-3 w-px"
                    style={{ background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgb(203 213 225 / 0.6) 3px, rgb(203 213 225 / 0.6) 7px)' }}
                  />

                  <div className="flex flex-col gap-2.5">
                    {grpEvts.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-3">
                        {/* Date label — w-16 right-aligned */}
                        <div className="w-16 shrink-0 text-right pt-[11px]">
                          <span className="text-[10px] text-muted-foreground/70 leading-none tabular-nums">
                            {new Date(evt.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {/* Dot on the line — w-4 centered */}
                        <div className="shrink-0 w-4 flex items-center justify-center pt-[9px] relative z-10">
                          <div className="size-2.5 rounded-full bg-background ring-[1.5px] ring-border/70 shadow-sm" />
                        </div>
                        {/* Card */}
                        <div className="flex-1 min-w-0">
                          <EventCard evt={evt} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Inner page (needs bundle context) ────────────────────────────────────────

function Rfq2DetailInner() {
  const { bundle } = useRfqBundle();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const setLabel = useBreadcrumbStore((s) => s.setLabel);

  type MiddleTab = 'cockpit' | 'versions' | 'key-data' | 'mph' | 'mph-categorization' | 'subsidiaries' | 'claims' | 'headcount' | 'census' | 'documents' | 'audit';
  const VALID_TABS = new Set<string>(['cockpit', 'versions', 'key-data', 'mph-categorization', 'subsidiaries', 'claims', 'headcount', 'census', 'documents']);
  const tabParam = searchParams.get('tab') ?? '';
  const middleTab: MiddleTab = VALID_TABS.has(tabParam) ? (tabParam as MiddleTab) : 'cockpit';
  const setMiddleTab = (tab: MiddleTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  if (!bundle) return null;

  const {
    rfqId,
    employerName,
    statusStage,
    schemeType,
    lob,
    businessType,
    effectiveDate,
    brokerName,
    channel,
    salesOwner,
    quoteVersions,
    activeVersionId,
    plans,
    members,
    documents,
    industry,
    quoteSegment,
    mphAppetite,
    fclPolicy,
    censusSummary,
    claimsExperience,
  } = bundle;

  // Profitability map
  const profitability = computeVersionProfitability(bundle);

  const activeVersion =
    quoteVersions.find((v) => v.id === activeVersionId) ?? quoteVersions[0];

  // Version groups for tiered display
  const isTerminalVer = (s: VersionStatus) =>
    s === VersionStatus.ARCHIVED || s === VersionStatus.WITHDRAWN;
  const ACTIVE_VER_STATUSES = [
    VersionStatus.EVALUATED,
    VersionStatus.RATED,
    VersionStatus.SUBMITTED,
    VersionStatus.SHARED,
    VersionStatus.SENT_TO_CLIENT,
    VersionStatus.SELECTED,
    VersionStatus.FROZEN,
  ];
  const featuredVersion = activeVersion ?? undefined;
  const otherActiveVersions = quoteVersions.filter(
    (v) => v.id !== activeVersionId && ACTIVE_VER_STATUSES.includes(v.status),
  );
  const draftVersions = quoteVersions.filter(
    (v) => v.id !== activeVersionId && v.status === VersionStatus.DRAFT,
  );
  const terminalVersions = quoteVersions.filter((v) => isTerminalVer(v.status));
  const statusBanner = featuredVersion ? getRfqStatusBanner(featuredVersion) : null;
  const SBIcon = statusBanner?.Icon ?? null;

  // Enrich BreadcrumbBar with employer name for the rfqId segment
  useEffect(() => {
    setLabel(rfqId, `${rfqId.toUpperCase()} · ${employerName}`);
  }, [rfqId, employerName, setLabel]);

  // Middle tab button group config
  const MIDDLE_TABS: { key: typeof middleTab; label: string }[] = [
    { key: 'cockpit', label: 'Deal Cockpit' },
    { key: 'versions', label: 'Versions' },
    { key: 'key-data', label: 'Key Data' },
    { key: 'mph-categorization', label: 'MPH' },
    { key: 'subsidiaries', label: 'Subsidiaries' },
    { key: 'headcount', label: 'Headcount' },
    { key: 'census', label: 'Census' },
    { key: 'claims', label: 'Claims Experience' },
    { key: 'documents', label: 'Documents' },
    // { key: 'audit', label: 'Audit Log' }, // hidden — unhide when ready
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header area ── */}
      <div className="bg-background shrink-0">
        {/* Title block — MPH name as title, quote number as description */}
        <div className="flex items-start gap-2 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {employerName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {rfqId.toUpperCase()}
              {lob && <>{' · '}{lob}</>}
              {businessType && <>{' · '}{labelForBusinessType(businessType)}</>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!quoteVersions.some((v) => v.status === VersionStatus.FROZEN)}
              >
                Quote Pack
                <ArrowRight className="size-3.5" />
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!quoteVersions.some((v) => v.status === VersionStatus.FROZEN)}
              >
                Issue Policy
                <CheckCircle2 className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 shrink-0 shadow-sm"
              >
                <EllipsisVertical className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Compact meta row */}
        <div className="flex items-center justify-between px-4 pb-3 gap-4 border-b border-border/60">
          <div className="flex items-center gap-5">
            <MetaInline icon={ShieldUser} label="Owner" value={salesOwner?.name ?? '—'} />
            <MetaInline icon={User} label="Broker" value={brokerName ?? '—'} />
            <MetaInline icon={GitPullRequest} label="Versions" value={String(quoteVersions.length)} />
            <MetaInline icon={Briefcase} label="Plans" value={String(plans.length)} />
          </div>
          <div className="flex items-center gap-5">
            <MetaInline icon={Calendar} label="Inception" value={bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
            <MetaInline icon={Clock4} label="TTL" value={effectiveDate ? (() => { const d = Math.ceil((new Date(effectiveDate).getTime() - Date.now()) / 86400000); return d > 0 ? `${d}d left` : 'Expired'; })() : '—'} />
            <MetaInline icon={Clock} label="Updated" value={bundle.updatedAt ? (() => { const s = Math.floor((Date.now() - new Date(bundle.updatedAt).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; })() : '—'} />
          </div>
        </div>

        {/* ── Status banner ── */}
        {statusBanner && SBIcon && (
          <div className={cn('flex items-center gap-3 px-4 py-2 border-b', statusBanner.bg, statusBanner.border)}>
            <SBIcon className={cn('size-3.5 shrink-0', statusBanner.iconCls)} />
            <p className={cn('flex-1 text-xs font-medium', statusBanner.textCls)}>{statusBanner.text}</p>
            <button
              type="button"
              onClick={() => featuredVersion && router.push(`/rfq2/${rfqId}/${featuredVersion.id}`)}
              className={cn('size-6 flex items-center justify-center rounded hover:bg-black/5 transition-colors shrink-0', statusBanner.textCls)}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Middle — Tabbed content area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Button group row */}
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/40">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto scrollbar-none">
              {MIDDLE_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMiddleTab(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                    middleTab === key
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                  {key === 'versions' && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">{quoteVersions.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {middleTab === 'versions' && (
              <div className="flex flex-col gap-5">

                {/* ── Section title ── */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {showAllVersions ? 'All Versions' : 'Active Version'}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Plus className="size-3" /> New Version
                    </Button>
                    <Button
                      variant={showAllVersions ? 'secondary' : 'outline'}
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => setShowAllVersions((p) => !p)}
                    >
                      <ArrowDown10 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {showAllVersions ? (
                  /* ── Flat all-versions view ── */
                  <div className="flex flex-col gap-2">
                    {[...quoteVersions].sort((a, b) => b.versionNo - a.versionNo).map((v) => {
                      const priceEntry = profitability.pricedVersions.find((p) => p.versionId === v.id);
                      const vPlanNames = plans.filter((p) => p.quoteVersionId === v.id).map((p) => p.name);
                      const nav = () => router.push(`/rfq2/${rfqId}/${v.id}`);
                      return v.id === featuredVersion?.id ? (
                        <RfqActiveVersionCard
                          key={v.id}
                          version={v}
                          priceEntry={priceEntry}
                          planNames={vPlanNames}
                          uwPath={mphAppetite?.uwAuthorityBand}
                          pricingPath={fmtFclPattern(fclPolicy.byVersion[v.id] ?? fclPolicy.quoteDefault)}
                          onOpen={nav}
                        />
                      ) : (
                        <RfqSecondaryVersionCard
                          key={v.id}
                          version={v}
                          priceEntry={priceEntry}
                          planNames={vPlanNames}
                          onOpen={nav}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* ── Grouped view ── */
                  <>
                    {/* Active */}
                    <div>
                      {featuredVersion ? (
                        <RfqActiveVersionCard
                          version={featuredVersion}
                          priceEntry={profitability.pricedVersions.find((p) => p.versionId === featuredVersion.id)}
                          planNames={plans.filter((p) => p.quoteVersionId === featuredVersion.id).map((p) => p.name)}
                          uwPath={mphAppetite?.uwAuthorityBand}
                          pricingPath={fmtFclPattern(fclPolicy.byVersion[featuredVersion.id] ?? fclPolicy.quoteDefault)}
                          onOpen={() => router.push(`/rfq2/${rfqId}/${featuredVersion.id}`)}
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 flex flex-col items-center gap-2 text-center">
                          <GitPullRequest className="size-6 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">No active version — create one to get started</p>
                        </div>
                      )}
                    </div>

                    {/* Other Active Versions */}
                    {otherActiveVersions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground">Other Active Versions</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          {otherActiveVersions.map((v) => (
                            <RfqSecondaryVersionCard
                              key={v.id}
                              version={v}
                              priceEntry={profitability.pricedVersions.find((p) => p.versionId === v.id)}
                              planNames={plans.filter((p) => p.quoteVersionId === v.id).map((p) => p.name)}
                              onOpen={() => router.push(`/rfq2/${rfqId}/${v.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drafts */}
                    {draftVersions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground">Drafts</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          {draftVersions.map((v) => (
                            <RfqSecondaryVersionCard
                              key={v.id}
                              version={v}
                              priceEntry={profitability.pricedVersions.find((p) => p.versionId === v.id)}
                              planNames={plans.filter((p) => p.quoteVersionId === v.id).map((p) => p.name)}
                              onOpen={() => router.push(`/rfq2/${rfqId}/${v.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Closed Versions accordion */}
                    {terminalVersions.length > 0 && (
                      <div className="rounded-xl border border-border/60 overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                          onClick={() => setTerminalOpen((prev) => !prev)}
                        >
                          <h3 className="text-sm font-semibold text-foreground">Closed Versions</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{terminalVersions.length} version{terminalVersions.length !== 1 ? 's' : ''}</span>
                            {terminalOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {terminalOpen && (
                          <div className="divide-y divide-border/40">
                            {[...terminalVersions].sort((a, b) => b.versionNo - a.versionNo).map((v) => (
                              <RfqTerminalVersionRow key={v.id} version={v} onOpen={() => router.push(`/rfq2/${rfqId}/${v.id}`)} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

            {middleTab === 'mph' && (
              <div className="flex flex-col gap-4">

                {/* ── Identity Hero ─────────────────────────────────── */}
                <div className="rounded-xl border border-border bg-card px-5 py-4">
                  {/* Overline chips */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {industry && (
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                        {industry}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                      {lob}
                    </span>
                    <span className={cn(
                      'text-[11px] font-medium rounded-full px-2.5 py-0.5 border',
                      businessType === BusinessType.NEW
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : businessType === BusinessType.RENEWAL
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200',
                    )}>
                      {labelForBusinessType(businessType)}
                    </span>
                  </div>

                  {/* Employer name */}
                  <h2 className="text-2xl font-black text-foreground leading-tight tracking-tight">
                    {employerName}
                  </h2>

                  {/* Owner · Broker */}
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                    {salesOwner && (
                      <span className="flex items-center gap-1.5">
                        <User className="size-3.5 shrink-0" />
                        {salesOwner.name}
                      </span>
                    )}
                    {brokerName && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="size-3.5 shrink-0" />
                          {brokerName}
                          {bundle.intermediaryCode && (
                            <span className="font-mono text-xs text-muted-foreground/50">({bundle.intermediaryCode})</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* ── 3 stat tiles ─────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-center">
                    <p className="text-3xl font-black text-foreground tabular-nums leading-none">
                      {censusSummary?.totalLives?.toLocaleString() ?? '—'}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-widest">Covered Lives</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-center">
                    <p className="text-3xl font-black text-foreground leading-none">
                      {effectiveDate
                        ? new Date(effectiveDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-widest">Effective Date</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-4 py-3.5 text-center">
                    <p className="text-3xl font-black text-foreground leading-none">
                      {quoteSegment ?? '—'}
                    </p>
                    <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-widest">Segment</p>
                  </div>
                </div>

                {/* ── Appetite Envelope ─────────────────────────────── */}
                {mphAppetite ? (
                  <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40 px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mb-4">Appetite Envelope</p>
                    <div className="flex items-stretch gap-5">
                      {/* Big discount number */}
                      <div className="shrink-0 flex flex-col justify-center">
                        <p className="text-6xl font-black text-emerald-700 leading-none tabular-nums">
                          {mphAppetite.maxDiscountPct}<span className="text-3xl">%</span>
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-2">
                          Max Discount
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="w-px bg-emerald-200 shrink-0" />

                      {/* Right: authority + category */}
                      <div className="flex flex-col justify-between flex-1 min-w-0 gap-3">
                        <div>
                          <p className="text-2xl font-black text-emerald-800 leading-none">
                            {mphAppetite.uwAuthorityBand}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-1.5">
                            UW Authority Band
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-emerald-200/70">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                            {mphAppetite.category} Category
                          </span>
                          {mphAppetite.preapprovedCardRef && (
                            <span className="text-[11px] font-mono text-emerald-600/60">
                              {mphAppetite.preapprovedCardRef}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">No Appetite Profiled</p>
                      <p className="text-xs text-amber-700 mt-0.5">Escalation required for every pricing ask on this account.</p>
                    </div>
                  </div>
                )}

                {/* ── Scheme Configuration ──────────────────────────── */}
                <div className="rounded-xl border border-border bg-card px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Scheme Configuration</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {schemeType && (
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1">
                        {labelForSchemeType(schemeType)}
                      </span>
                    )}
                    {bundle.participationType && (
                      <span className="text-[11px] font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1">
                        {bundle.participationType}
                      </span>
                    )}
                    {bundle.livesCovered && (
                      <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                        {labelForLivesCovered(bundle.livesCovered)}
                      </span>
                    )}
                    {bundle.schemeUsage && (
                      <span className="text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1">
                        {bundle.schemeUsage}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 flex-wrap pt-3 border-t border-border/40">
                    {bundle.policyConfig?.billingFrequency && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0" />
                        <span className="font-semibold text-foreground">{bundle.policyConfig.billingFrequency}</span>
                        <span>billing</span>
                      </span>
                    )}
                    {bundle.policyConfig?.gracePeriodDays != null && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3.5 shrink-0" />
                        <span className="font-semibold text-foreground">{bundle.policyConfig.gracePeriodDays}</span>
                        <span>day grace period</span>
                      </span>
                    )}
                    {bundle.policyConfig?.collectionMethod && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="size-3.5 shrink-0" />
                        <span className="font-semibold text-foreground">{bundle.policyConfig.collectionMethod}</span>
                      </span>
                    )}
                  </div>
                </div>

              </div>
            )}

            {middleTab === 'key-data' && (
              <KeyDataTab />
            )}

            {middleTab === 'mph-categorization' && (
              <MphCategorizationTab />
            )}

            {middleTab === 'subsidiaries' && (
              <SubsidiariesTab />
            )}

            {middleTab === 'claims' && (
              <ClaimsExperienceTab />
            )}

            {middleTab === 'headcount' && (
              <HeadcountTab />
            )}

            {middleTab === 'census' && (
              <CensusTab />
            )}

            {middleTab === 'cockpit' && <DealCockpitTab onSwitchTab={(tab) => setMiddleTab(tab)} />}

            {middleTab === 'documents' && <DocumentsTab />}

            {/* middleTab === 'audit' && <AuditLogTab /> */}
          </div>
        </div>

        {/* Right — Readiness */}
        {/* <div className="w-72 shrink-0 border-l border-border/60 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ReadinessPanel report={readiness} rfqId={rfqId} />
          </div>
        </div> */}
      </div>
    </div>
  );
}

// ─── Page entry ───────────────────────────────────────────────────────────────

export default function Rfq2DetailPage() {
  const { rfqId } = useParams<{ rfqId: string }>();

  return (
    <RfqBundleProvider rfqId={rfqId}>
      <Suspense fallback={null}>
        <Rfq2DetailInner />
      </Suspense>
    </RfqBundleProvider>
  );
}
