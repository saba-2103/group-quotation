'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  EllipsisVertical,
  Plus,
  Pencil,
  ChevronRight,
  Building2,
  Calendar,
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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
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
} from '@/lib/types';
import type { QuoteVersion, RfqBundle, Document } from '@/lib/types';
import { DocumentType, DocumentStatus } from '@/lib/types';
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

function labelForBusinessType(t: BusinessType) {
  const map: Record<BusinessType, string> = {
    [BusinessType.NEW]: 'New Business',
    [BusinessType.RENEWAL]: 'Renewal',
    [BusinessType.TAKEOVER]: 'Takeover',
  };
  return map[t] ?? t;
}

function labelForSchemeType(t: SchemeType) {
  const map: Record<SchemeType, string> = {
    [SchemeType.EMPLOYER_OBLIGATORY]: 'Employer Obligatory',
    [SchemeType.EMPLOYER_VOLUNTARY]: 'Employer Voluntary',
    [SchemeType.AFFINITY]: 'Affinity',
    [SchemeType.MICRO]: 'Micro',
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
  [VersionStatus.DRAFT]:    { label: 'Draft',    className: 'bg-neutral-600 text-white' },
  [VersionStatus.SHARED]:   { label: 'Shared',   className: 'bg-blue-600 text-white' },
  [VersionStatus.SELECTED]: { label: 'Selected', className: 'bg-amber-500 text-white' },
  [VersionStatus.FROZEN]:   { label: 'Active',   className: 'bg-emerald-600 text-white' },
  [VersionStatus.ARCHIVED]: { label: 'Archived', className: 'bg-gray-400 text-white' },
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

// ─── Inner page (needs bundle context) ────────────────────────────────────────

function Rfq2DetailInner() {
  const { bundle } = useRfqBundle();
  const router = useRouter();
  const [sortAsc, setSortAsc] = useState(false);
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const versionsScrollRef = useRef<HTMLDivElement>(null);
  const [middleTab, setMiddleTab] = useState<'versions' | 'mph' | 'subsidiaries' | 'claims' | 'census' | 'negotiation'>('versions');

  if (!bundle) return null;

  const {
    rfqId,
    employerName,
    statusStage,
    schemeType,
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
    censusSummary,
    claimsExperience,
  } = bundle;

  // Profitability map
  const profitability = computeVersionProfitability(bundle);
  const readiness = computeReadinessGates(bundle);
  const milestones = computeMilestoneSpine(bundle);

  // Sort versions by sortAsc toggle
  const sortedVersions = [...quoteVersions].sort((a, b) =>
    sortAsc ? a.versionNo - b.versionNo : b.versionNo - a.versionNo
  );
  const activeVersion =
    quoteVersions.find((v) => v.id === activeVersionId) ?? quoteVersions[0];

  // Enrich BreadcrumbBar with employer name for the rfqId segment
  useEffect(() => {
    setLabel(rfqId, `${rfqId.toUpperCase()} · ${employerName}`);
  }, [rfqId, employerName, setLabel]);

  // Middle tab button group config
  const MIDDLE_TABS: { key: typeof middleTab; label: string }[] = [
    { key: 'versions', label: 'Versions' },
    { key: 'mph', label: 'MPH Profile' },
    { key: 'subsidiaries', label: 'Subsidiaries' },
    { key: 'claims', label: 'Claims Experience' },
    { key: 'census', label: 'Census / Headcount' },
    { key: 'negotiation', label: 'Negotiation' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header area ── */}
      <div className="border-b border-border/60 bg-background shrink-0">
        {/* Title block — MPH name as title, quote number as description */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {employerName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{rfqId.toUpperCase()}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            Quote Pack
            <ArrowRight className="size-3.5" />
          </Button>
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
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
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Milestones */}
        <div className="w-60 shrink-0 border-r border-border/60 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 shrink-0">
            <span className="flex-1 text-sm font-semibold text-foreground truncate">
              Milestones
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <MilestonesSidebar milestones={milestones} />
          </div>
        </div>

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
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Versions ({quoteVersions.length})</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setSortAsc((prev) => !prev)}
                      title={sortAsc ? 'Oldest first' : 'Newest first'}
                    >
                      {sortAsc ? <ArrowDown01 className="size-3.5" /> : <ArrowDown10 className="size-3.5" />}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                      <Plus className="size-3" /> New Version
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {sortedVersions.map((v) => {
                    const priceEntry = profitability.pricedVersions.find(
                      (p) => p.versionId === v.id
                    );
                    const planNames = plans
                      .filter((p) => p.quoteVersionId === v.id)
                      .map((p) => p.name);
                    return (
                      <CompactVersionCard
                        key={v.id}
                        version={v}
                        isActive={v.id === activeVersionId}
                        priceEntry={priceEntry}
                        planNames={planNames}
                        isMostCompetitive={
                          profitability.mostCompetitiveVersionId === v.id &&
                          profitability.pricedVersions.length >= 2
                        }
                        isMostProfitable={
                          profitability.mostProfitableVersionId === v.id &&
                          profitability.pricedVersions.length >= 2
                        }
                        onSwitch={() => {
                          router.push(`/rfq2/${rfqId}/${v.id}`);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {middleTab === 'mph' && (
              <div className="flex flex-col gap-4">
                <ProfileSection title="MPH Profile">
                  <ProfileRow label="Employer" value={employerName} />
                  <ProfileRow label="Industry" value={industry} />
                  <ProfileRow label="Segment" value={quoteSegment} />
                  <ProfileRow label="MP Category" value={mphAppetite?.category} />
                  <ProfileRow label="Employees" value={censusSummary?.totalLives?.toLocaleString()} />
                  <ProfileRow label="Scheme Type" value={schemeType} />
                </ProfileSection>
                <ProfileSection title="Appetite Envelope">
                  {mphAppetite ? (
                    <>
                      <ProfileRow label="Category" value={mphAppetite.category} />
                      <ProfileRow label="Max discount" value={`${mphAppetite.maxDiscountPct}%`} />
                      <ProfileRow label="UW authority" value={mphAppetite.uwAuthorityBand} />
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2 text-amber-800">
                      <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                      <span className="text-[10px]">No appetite profiled — escalation required for every pricing ask.</span>
                    </div>
                  )}
                </ProfileSection>
              </div>
            )}

            {middleTab === 'subsidiaries' && (
              <div className="flex flex-col gap-3">
                <ProfileSection title="Subsidiaries">
                  {bundle.subsidiaries && bundle.subsidiaries.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {bundle.subsidiaries.map((sub: { name: string; lives?: number }, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-border/20 last:border-0">
                          <span className="text-[11px] font-medium">{sub.name}</span>
                          <span className="text-[10px] text-muted-foreground">{sub.lives ?? '—'} lives</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                      <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">No subsidiaries configured.</span>
                    </div>
                  )}
                </ProfileSection>
              </div>
            )}

            {middleTab === 'claims' && (
              <div className="flex flex-col gap-3">
                <ProfileSection title="Claims Experience">
                  {claimsExperience ? (
                    <>
                      <ProfileRow label="Years of data" value={claimsExperience.years.length} />
                      {claimsExperience.years.map((yr: { year: number; lossRatio: number; premium: number; claims: number }, idx: number) => (
                        <ProfileRow key={idx} label={`FY ${yr.year}`} value={`LR: ${(yr.lossRatio * 100).toFixed(1)}% | Prem: ₹${yr.premium.toLocaleString()} | Claims: ₹${yr.claims.toLocaleString()}`} />
                      ))}
                      <ProfileRow label="Large losses" value={claimsExperience.largeLosses.length} />
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                      <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">No claims experience data loaded.</span>
                    </div>
                  )}
                </ProfileSection>
              </div>
            )}

            {middleTab === 'census' && (
              <div className="flex flex-col gap-3">
                <ProfileSection title="Census / Headcount">
                  {censusSummary ? (
                    <>
                      <div className="flex justify-between py-1 border-b border-border/20">
                        <span className="text-[10px] text-muted-foreground">Quality</span>
                        <QualityChip q={censusSummary.quality.trafficLight} />
                      </div>
                      <ProfileRow label="Total lives" value={censusSummary.totalLives.toLocaleString()} />
                      <ProfileRow label="Roster" value={members.length > 0 ? `${members.length} members` : 'Aggregate only'} />
                      <ProfileRow label="Headcount Mode" value={bundle.headcountData ? 'Detailed headcount uploaded' : 'Census summary only'} />
                      <ProfileRow label="Grade Mapping" value={Object.keys(bundle.gradeAllocations ?? {}).length > 0 ? 'Available' : 'Pending'} />
                    </>
                  ) : (
                    <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                      <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Census not yet loaded.</span>
                    </div>
                  )}
                </ProfileSection>
              </div>
            )}

            {middleTab === 'negotiation' && (
              <div className="flex flex-col gap-3">
                <ProfileSection title="Negotiation">
                  {bundle.negotiationLog && bundle.negotiationLog.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {bundle.negotiationLog.map((entry, idx) => (
                        <div key={idx} className="flex flex-col py-1.5 border-b border-border/20 last:border-0">
                          <div className="flex justify-between">
                            <span className="text-[10px] font-medium">{entry.by}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(entry.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{entry.note}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                      <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">No negotiation rounds recorded yet.</span>
                    </div>
                  )}
                </ProfileSection>
              </div>
            )}
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
      <Rfq2DetailInner />
    </RfqBundleProvider>
  );
}
