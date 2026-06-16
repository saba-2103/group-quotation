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
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        {report.failingCount > 0 ? (
          <span className="text-[11px] font-medium text-destructive">
            {report.failingCount} bucket{report.failingCount !== 1 ? 's' : ''} failing
          </span>
        ) : (
          <span className="text-[11px] font-medium text-green-600 flex items-center gap-1">
            <CheckCircle2 className="size-3" /> All gates passing
          </span>
        )}
        {report.issuanceReady && (
          <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5">
            Ready to issue
          </span>
        )}
      </div>

      {/* Buckets */}
      {report.buckets.map((bucket) => {
        const fixRoute = `${base}/${BUCKET_FIX_ROUTES[bucket.bucketNo] ?? 'key-data'}`;
        return (
          <div key={bucket.bucketNo} className="flex flex-col gap-1">
            {/* Bucket header */}
            <div className="flex items-center gap-1.5">
              <GateIcon status={bucket.overall} />
              <span className="text-[11px] font-semibold text-foreground flex-1">
                {bucket.label}
              </span>
              <Link
                href={fixRoute}
                className="text-[10px] text-primary hover:underline shrink-0"
              >
                Open →
              </Link>
            </div>
            {/* Gates */}
            <div className="flex flex-col gap-0.5 pl-4">
              {bucket.gates.map((g) => (
                <div key={g.key} className="flex items-start gap-1.5">
                  <GateIcon status={g.status} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-start gap-1">
                      <span
                        className={cn(
                          'text-[10px] leading-4 flex-1',
                          g.status === GateStatus.PASS
                            ? 'text-muted-foreground'
                            : 'text-foreground'
                        )}
                      >
                        {g.label}
                      </span>
                      {g.status === GateStatus.FAIL && (
                        <Link
                          href={fixRoute}
                          className="text-[10px] text-primary hover:underline shrink-0 leading-4"
                        >
                          Fix
                        </Link>
                      )}
                    </div>
                    {g.status !== GateStatus.PASS && g.detail && (
                      <span className="text-[9px] text-muted-foreground">
                        {g.detail}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
  [VersionStatus.DRAFT]:    { label: 'Draft',    className: 'bg-slate-100 text-slate-700 border-slate-200' },
  [VersionStatus.SHARED]:   { label: 'Shared',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.SELECTED]: { label: 'Selected', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  [VersionStatus.FROZEN]:   { label: 'Frozen',   className: 'bg-violet-50 text-violet-700 border-violet-200' },
  [VersionStatus.ARCHIVED]: { label: 'Archived', className: 'bg-gray-100 text-gray-500 border-gray-200' },
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
  const visiblePlans = planNames.slice(0, 3);
  const overflow = planNames.length - 3;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card flex flex-col transition-shadow hover:shadow-sm cursor-pointer',
        isActive && 'bg-muted/60 border-primary'
      )}
      onClick={onSwitch}
    >
      {/* ── Identity ── */}
      <div className="px-3 pt-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-1.5 min-w-0 mb-1">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground shrink-0">
            V{version.versionNo}
          </span>
          <span className="text-xs font-semibold text-foreground truncate flex-1">
            {version.name}
          </span>
          {isActive && (
            <Badge className="shrink-0 text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              Active
            </Badge>
          )}
          {isFrozen && (
            <Lock className="size-3 text-violet-500 shrink-0" />
          )}
        </div>

        {/* Status + quality badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5', meta.className)}>
            {meta.label}
          </span>
          {isMostCompetitive && (
            <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 rounded-full px-1.5 py-0.5">
              Competitive
            </span>
          )}
          {isMostProfitable && (
            <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-1.5 py-0.5">
              Profitable
            </span>
          )}
        </div>

        {version.note && (
          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">
            {version.note}
          </p>
        )}
      </div>

      {/* ── Pricing ── */}
      <div className="px-3 py-2 border-b border-border/50">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Pricing
        </p>
        {priceEntry ? (
          <div className="space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Premium (GST)</span>
              <span className="font-medium tabular-nums">{fmtINR(priceEntry.finalPremiumInclGst)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Loss ratio</span>
              <span className="font-medium tabular-nums">{(priceEntry.modelFactor * 100).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Not priced yet</p>
        )}
      </div>

      {/* ── Plans ── */}
      <div className="px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Plans
        </p>
        {visiblePlans.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No plans yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visiblePlans.map((name) => (
              <span
                key={name}
                className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 max-w-full truncate"
              >
                {name}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[10px] text-muted-foreground">+{overflow} more</span>
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


// ─── Inner page (needs bundle context) ────────────────────────────────────────

function Rfq2DetailInner() {
  const { bundle } = useRfqBundle();
  const router = useRouter();
  const [sortAsc, setSortAsc] = useState(false);
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const versionsScrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header area ── */}
      <div className="border-b border-border/60 bg-background shrink-0">
        {/* Title block */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground whitespace-nowrap">
              {rfqId.toUpperCase()}
            </h1>
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

        {/* Governance meta row */}
        <div className="flex items-start gap-5 flex-wrap px-4 pb-2 pt-1 border-b border-border/40">
          <GovernancePill
            icon={Building2}
            label="Client"
            value={employerName}
          />
          {effectiveDate && (
            <GovernancePill
              icon={Calendar}
              label="Effective Date"
              value={formatDate(effectiveDate)}
            />
          )}
          {salesOwner && (
            <GovernancePill
              icon={User}
              label="Owner"
              value={salesOwner.name}
            />
          )}
          <GovernancePill
            icon={Tag}
            label="Status"
            value={statusStage.replace(/_/g, ' ')}
          />
          {(brokerName ?? channel) && (
            <GovernancePill
              icon={Building2}
              label={brokerName ? 'Broker' : 'Channel'}
              value={(brokerName ?? channel) as string}
            />
          )}
        </div>

        {/* Milestones strip — temporarily hidden
        <div className="px-4 pt-3 pb-3">
          <MilestonesStrip milestones={milestones} />
        </div>
        */}
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Versions */}
        <div className="w-60 shrink-0 border-r border-border/60 flex flex-col overflow-hidden">
          {/* Versions header */}
          <div className="flex items-center gap-2 px-3 py-2.5 shrink-0">
            <span className="flex-1 text-sm font-semibold text-foreground truncate">
              Versions
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs gap-1 shrink-0"
            >
              <Plus className="size-3" />
              New
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => setSortAsc((prev) => !prev)}
              title={sortAsc ? 'Sorted oldest first — click for newest first' : 'Sorted newest first — click for oldest first'}
            >
              {sortAsc ? (
                <ArrowDown01 className="size-3.5" />
              ) : (
                <ArrowDown10 className="size-3.5" />
              )}
            </Button>
          </div>

          {/* Version cards */}
          <div ref={versionsScrollRef} className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-2">
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
                  isActive={false}
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
                    if (versionsScrollRef.current) {
                      sessionStorage.setItem(`rfq2-vs-scroll-${rfqId}`, String(versionsScrollRef.current.scrollTop));
                    }
                    router.push(`/rfq2/${rfqId}/${v.id}`);
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Middle — Main content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

          {/* ── Quote Intake ── */}
          <div className="px-5 pt-4 pb-3 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quote Intake
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-2.5">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Business Type</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.businessType?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Scheme Type</span>
                <span className="text-xs font-medium text-foreground truncate">{schemeType?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Lives Covered</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.livesCovered?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">LOB</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.lob ?? '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Effective Date</span>
                <span className="text-xs font-medium text-foreground truncate">{effectiveDate ? new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Policy Year End</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.policyConfig?.policyYearEnd ? new Date(bundle.policyConfig.policyYearEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Pricing Basis</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.defaultPlanStructure?.pricingBasis?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground">Segment</span>
                <span className="text-xs font-medium text-foreground truncate">{quoteSegment ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Workbench ── */}
          <div className="px-5 py-4 border-b border-border/60 shrink-0">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Workbench
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {LAUNCHPAD_TILES.map(({ label, route, bucketNo, icon: Icon, countKey }) => {
                const bucket = readiness.buckets.find((b) => b.bucketNo === bucketNo);
                const passing = bucket
                  ? bucket.gates.filter((g) => g.status === GateStatus.PASS).length
                  : 0;
                const total = bucket?.gates.length ?? 1;
                const pct = Math.round((passing / total) * 100);
                const tone = tileTone(pct);
                const toneLabel = tileToneLabel(pct);
                const count =
                  countKey === 'versions'  ? quoteVersions.length :
                  countKey === 'members'   ? members.length :
                  countKey === 'plans'     ? plans.length :
                  countKey === 'documents' ? documents.length : null;
                return (
                  <Link
                    key={route}
                    href={`/rfqs/${rfqId}/${route}`}
                    className={cn(
                      'flex flex-col gap-1.5 rounded-xl border p-3 hover:shadow-sm transition-shadow',
                      tone
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="size-3.5 opacity-70" />
                      <span className="text-[9px] font-medium opacity-70">{toneLabel}</span>
                    </div>
                    <p className="text-[11px] font-semibold leading-tight">{label}</p>
                    <div className="flex items-center gap-1 mt-auto">
                      <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-current opacity-60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono opacity-70">{pct}%</span>
                    </div>
                    {count !== null && (
                      <span className="text-[9px] opacity-60">
                        {count} {countKey}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Deal Profile ── */}
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Deal Profile
              </h2>
              <Link
                href={`/rfqs/${rfqId}/profile`}
                className="text-[10px] text-primary hover:underline"
              >
                Full profile →
              </Link>
            </div>

            {/* ── Row 1 ── Key Data (left) | MPH Profile + Appetite Envelope stacked (right) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Key Data */}
              <ProfileSection title="Key Data" className="h-full">
                <ProfileRow label="Business Type" value={bundle.businessType} />
                <ProfileRow label="Scheme Type" value={bundle.schemeType} />
                <ProfileRow label="Participation" value={bundle.participationType} />
                <ProfileRow label="Effective Date" value={formatDate(effectiveDate)} />
                <ProfileRow label="Intermediary" value={bundle.intermediaryType} />
                <ProfileRow label="Broker" value={brokerName} />
                <ProfileRow label="Broker Code" value={bundle.brokerCode} />
                {bundle.priorPolicy && (
                  <>
                    <ProfileRow label="Prior Insurer" value={bundle.priorPolicy.insurer} />
                    <ProfileRow label="Prior MPN" value={bundle.priorPolicy.masterPolicyNumber} />
                    <ProfileRow
                      label="Prior Premium"
                      value={bundle.priorPolicy.premium != null ? `₹${bundle.priorPolicy.premium.toLocaleString()}` : undefined}
                    />
                  </>
                )}
              </ProfileSection>

              {/* MPH Profile + Appetite Envelope — stacked vertically */}
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
            </div>

            {/* ── Row 2 ── Census Summary / Claims Summary / Plan Summary — 3-column */}
            <div className="grid grid-cols-3 gap-4">
              <ProfileSection title="Census Summary">
                {censusSummary ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-[10px] text-muted-foreground shrink-0">Quality</span>
                      <QualityChip q={censusSummary.quality.trafficLight} />
                    </div>
                    <ProfileRow label="Total lives" value={censusSummary.totalLives.toLocaleString()} />
                    <ProfileRow
                      label="Roster"
                      value={members.length > 0 ? `${members.length} members` : 'Aggregate only'}
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                    <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Census not yet loaded.</span>
                  </div>
                )}
              </ProfileSection>

              <ProfileSection title="Claims Summary">
                {claimsExperience ? (
                  <>
                    <ProfileRow label="Years of data" value={claimsExperience.years.length} />
                    {claimsExperience.years.length > 0 && (
                      <ProfileRow
                        label="Latest loss ratio"
                        value={`${(claimsExperience.years[claimsExperience.years.length - 1].lossRatio * 100).toFixed(1)}%`}
                      />
                    )}
                    <ProfileRow label="Large losses" value={claimsExperience.largeLosses.length} />
                  </>
                ) : (
                  <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                    <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">No claims experience data.</span>
                  </div>
                )}
              </ProfileSection>

              <ProfileSection title="Plan Summary">
                {plans.length > 0 ? (
                  <>
                    <ProfileRow label="Plans" value={plans.length} />
                    <ProfileRow
                      label="Products"
                      value={[...new Set(plans.map((p) => p.productCode ?? '—'))].join(', ')}
                    />
                    <ProfileRow
                      label="UW status"
                      value={
                        plans.some((p) => p.handoffStatus === PlanHandoffStatus.UW_REFERRED)
                          ? 'In UW review'
                          : plans.every((p) => p.handoffStatus === PlanHandoffStatus.PRICED)
                          ? 'All priced'
                          : 'In progress'
                      }
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-2">
                    <Info className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">No plans defined yet.</span>
                  </div>
                )}
              </ProfileSection>
            </div>
          </div>

        </div>

        {/* Right — Readiness / Documents */}
        <div className="w-60 shrink-0 border-l border-border/60 flex flex-col overflow-hidden">
          <Tabs defaultValue="readiness" className="flex flex-col h-full">
            <div className="px-3 pt-3 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="readiness" className="flex-1 text-xs">
                  Readiness
                  {readiness.failingCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      {readiness.failingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-1 text-xs">
                  Documents
                  {documents.length > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center size-4 rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                      {documents.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="readiness"
              className="flex-1 overflow-y-auto p-3 mt-0"
            >
              <ReadinessPanel report={readiness} rfqId={rfqId} />
            </TabsContent>

            <TabsContent
              value="documents"
              className="flex-1 overflow-y-auto p-3 mt-0"
            >
              <DocumentsPanel documents={documents} />
            </TabsContent>
          </Tabs>
        </div>
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
