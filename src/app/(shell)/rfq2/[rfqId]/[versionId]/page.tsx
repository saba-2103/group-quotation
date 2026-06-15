'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  EllipsisVertical,
  Plus,
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
  Info,
  FileText,
  Upload,
  Cpu,
  Check,
  ChevronRight,
  PlusCircle,
  Send,
  Calculator,
  MessageSquare,
  Handshake,
  Archive,
  ShieldCheck,
  Layers,
  TrendingUp,
  GitMerge,
  BarChart3,
  Building,
  Users,
  Activity,
  FlaskConical,
  Scale,
  Pencil,
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
  VersionStatus,
  GateStatus,
  MilestoneState,
  DocumentType,
  DocumentStatus,
  NegotiationParty,
  NegotiationKind,
  PlanHandoffStatus,
} from '@/lib/types';
import type { QuoteVersion, Document, NegotiationRound, PriceRun, Plan, Subsidiary, ClaimsExperience, Member, HeadcountData } from '@/lib/types';
import type { Milestone } from '@/lib/computations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
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
            {!isLast && (
              <div className={cn('h-0.5 flex-1 min-w-[6px] mx-1.5', connectorCls)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GateIcon({ status }: { status: GateStatus }) {
  if (status === GateStatus.PASS)
    return <CheckCircle2 className="size-3 text-green-600 shrink-0" />;
  if (status === GateStatus.WARN)
    return <AlertTriangle className="size-3 text-amber-500 shrink-0" />;
  return <XCircle className="size-3 text-destructive shrink-0" />;
}

const BUCKET_FIX_ROUTES: Record<number, string> = {
  1: 'key-data',
  2: 'census-workbench',
  3: 'plans',
  4: 'sales-dispatch',
  5: 'commercial-rate-card',
};

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
      {report.buckets.map((bucket) => {
        const fixRoute = `${base}/${BUCKET_FIX_ROUTES[bucket.bucketNo] ?? 'key-data'}`;
        return (
          <div key={bucket.bucketNo} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <GateIcon status={bucket.overall} />
              <span className="text-[11px] font-semibold text-foreground flex-1">
                {bucket.label}
              </span>
              <Link href={fixRoute} className="text-[10px] text-primary hover:underline shrink-0">
                Open →
              </Link>
            </div>
            <div className="flex flex-col gap-0.5 pl-4">
              {bucket.gates.map((g) => (
                <div key={g.key} className="flex items-start gap-1.5">
                  <GateIcon status={g.status} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-start gap-1">
                      <span
                        className={cn(
                          'text-[10px] leading-4 flex-1',
                          g.status === GateStatus.PASS ? 'text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {g.label}
                      </span>
                      {g.status === GateStatus.FAIL && (
                        <Link href={fixRoute} className="text-[10px] text-primary hover:underline shrink-0 leading-4">
                          Fix
                        </Link>
                      )}
                    </div>
                    {g.status !== GateStatus.PASS && g.detail && (
                      <span className="text-[9px] text-muted-foreground">{g.detail}</span>
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
          <div key={doc.documentId} className="rounded-lg border border-border bg-card px-3 py-2 flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                {isUploaded
                  ? <Upload className="size-3 text-muted-foreground" />
                  : <Cpu className="size-3 text-violet-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium leading-tight truncate">{doc.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{DOC_TYPE_LABEL[doc.type]}</p>
              </div>
              <span className={cn('shrink-0 text-[9px] font-medium border rounded-full px-1.5 py-0.5', meta.className)}>
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

const STATUS_META: Record<VersionStatus, { label: string; className: string }> = {
  [VersionStatus.DRAFT]:    { label: 'Draft',    className: 'bg-slate-100 text-slate-700 border-slate-200' },
  [VersionStatus.SHARED]:   { label: 'Shared',   className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.SELECTED]: { label: 'Selected', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  [VersionStatus.FROZEN]:   { label: 'Frozen',   className: 'bg-violet-50 text-violet-700 border-violet-200' },
  [VersionStatus.ARCHIVED]: { label: 'Archived', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

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
      {/* Identity */}
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
          {isFrozen && <Lock className="size-3 text-violet-500 shrink-0" />}
        </div>
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
          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1">{version.note}</p>
        )}
      </div>

      {/* Pricing */}
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

      {/* Plans */}
      <div className="px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Plans
        </p>
        {visiblePlans.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No plans yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visiblePlans.map((name) => (
              <span key={name} className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 max-w-full truncate">
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

// ─── Journey panels ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

function KVRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[55%] truncate">{value ?? '—'}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
      <Icon className="size-8 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ── 1. Policy Details ────────────────────────────────────────────────────────

function PolicyDetailsPanel({ bundle }: { bundle: { policyConfig: import('@/lib/types').PolicyConfig; defaultPlanStructure: import('@/lib/types').DefaultPlanStructure; policyDetails?: import('@/lib/types').PolicyDetails; finalPlacement?: import('@/lib/types').FinalPlacement; livesCovered: string; lob: string; sumAssuredBasis: string; coverPattern: string; termBasis: string; masterPolicyNumber?: string; issuedAt?: string; effectiveDate?: string } }) {
  const { policyConfig, defaultPlanStructure, policyDetails, finalPlacement, livesCovered, lob, sumAssuredBasis, coverPattern, termBasis, masterPolicyNumber, issuedAt, effectiveDate } = bundle;
  return (
    <div className="flex flex-col">
      <SectionLabel>Policy Configuration</SectionLabel>
      <div className="rounded-xl border border-border bg-card px-3 overflow-hidden">
        <KVRow label="LOB" value={lob} />
        <KVRow label="Effective Date" value={effectiveDate ?? '—'} />
        <KVRow label="Lives Covered" value={livesCovered} />
        <KVRow label="Sum Assured Basis" value={sumAssuredBasis} />
        <KVRow label="Cover Pattern" value={coverPattern} />
        <KVRow label="Term Basis" value={termBasis} />
        <KVRow label="Billing Frequency" value={policyConfig.billingFrequency} />
        <KVRow label="Collection Method" value={policyConfig.collectionMethod} />
        <KVRow label="Grace Period" value={`${policyConfig.gracePeriodDays} days`} />
        <KVRow label="Subsidiaries Enabled" value={policyConfig.subsidiariesEnabled ? 'Yes' : 'No'} />
        {policyConfig.policyYearStart && <KVRow label="Policy Year Start" value={policyConfig.policyYearStart} />}
        {policyConfig.policyYearEnd && <KVRow label="Policy Year End" value={policyConfig.policyYearEnd} />}
      </div>

      <SectionLabel>Plan Structure</SectionLabel>
      <div className="rounded-xl border border-border bg-card px-3 overflow-hidden">
        <KVRow label="Plan Structure" value={defaultPlanStructure.planStructure} />
        <KVRow label="Grade Mapping" value={defaultPlanStructure.gradeMapping ? 'Yes' : 'No'} />
        {defaultPlanStructure.defaultPlanCount != null && (
          <KVRow label="Default Plan Count" value={defaultPlanStructure.defaultPlanCount} />
        )}
        <KVRow label="Pricing Basis" value={defaultPlanStructure.pricingBasis} />
      </div>

      {(masterPolicyNumber || issuedAt) && (
        <>
          <SectionLabel>Issuance</SectionLabel>
          <div className="rounded-xl border border-border bg-card px-3 overflow-hidden">
            {masterPolicyNumber && <KVRow label="Master Policy No." value={masterPolicyNumber} />}
            {issuedAt && <KVRow label="Issued At" value={new Date(issuedAt).toLocaleDateString('en-GB')} />}
          </div>
        </>
      )}

      {policyDetails && Object.values(policyDetails).some(Boolean) && (
        <>
          <SectionLabel>Policy Details</SectionLabel>
          <div className="rounded-xl border border-border bg-card px-3 overflow-hidden">
            {policyDetails.reinsuranceMethod && <KVRow label="Reinsurance Method" value={policyDetails.reinsuranceMethod} />}
            {policyDetails.signingDate && <KVRow label="Signing Date" value={policyDetails.signingDate} />}
            {policyDetails.specialTerms && <KVRow label="Special Terms" value={policyDetails.specialTerms} />}
            {policyDetails.renewalTerms && <KVRow label="Renewal Terms" value={policyDetails.renewalTerms} />}
            {policyDetails.endorsementSchedule && <KVRow label="Endorsement Schedule" value={policyDetails.endorsementSchedule} />}
          </div>
        </>
      )}

      {finalPlacement && Object.values(finalPlacement).some(Boolean) && (
        <>
          <SectionLabel>Final Placement</SectionLabel>
          <div className="rounded-xl border border-border bg-card px-3 overflow-hidden">
            {finalPlacement.placementDate && <KVRow label="Placement Date" value={finalPlacement.placementDate} />}
            {finalPlacement.broker && <KVRow label="Broker" value={finalPlacement.broker} />}
            {finalPlacement.commissionPct != null && <KVRow label="Commission" value={`${finalPlacement.commissionPct}%`} />}
            {finalPlacement.finalPremiumConfirmed != null && <KVRow label="Confirmed Premium" value={fmtINRPanel(finalPlacement.finalPremiumConfirmed)} />}
            {finalPlacement.policyDeliveredDate && <KVRow label="Policy Delivered" value={finalPlacement.policyDeliveredDate} />}
            {finalPlacement.placementNotes && <KVRow label="Notes" value={finalPlacement.placementNotes} />}
          </div>
        </>
      )}
    </div>
  );
}

// ── 2. Subsidiaries ──────────────────────────────────────────────────────────

function SubsidiariesPanel({ subsidiaries }: { subsidiaries: Subsidiary[] }) {
  if (subsidiaries.length === 0) {
    return <EmptyState icon={Building} message="No subsidiaries linked to this RFQ." />;
  }
  const totalLives = subsidiaries.reduce((s, x) => s + x.lives, 0);
  return (
    <div className="flex flex-col">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Subsidiaries</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{subsidiaries.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Lives</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{totalLives.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] px-4 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/40 uppercase tracking-wide">
          <span>Name</span>
          <span className="text-right mr-6">Reg No.</span>
          <span className="text-right">Lives</span>
        </div>
        {subsidiaries.map((s, i) => (
          <div key={s.subsidiaryId} className={cn('grid grid-cols-[1fr_auto_auto] items-center px-4 py-2.5 text-xs', i !== subsidiaries.length - 1 && 'border-b border-border/40')}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Building className="size-3 text-muted-foreground" />
              </div>
              <span className="font-medium truncate">{s.name}</span>
            </div>
            <span className="text-muted-foreground text-[10px] font-mono mr-6">{s.registrationNumber ?? '—'}</span>
            <span className="font-semibold tabular-nums text-right">{s.lives.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Member Mapping ────────────────────────────────────────────────────────

function MemberMappingPanel({
  members,
  censusSummary,
  headcountData,
  gradeAllocations,
  versionId,
  plans,
}: {
  members: Member[];
  censusSummary?: import('@/lib/types').CensusSummary;
  headcountData?: HeadcountData;
  gradeAllocations: Record<string, Record<string, string>>;
  versionId: string;
  plans: Plan[];
}) {
  const gradeMap = gradeAllocations[versionId] ?? {};
  const totalLives = censusSummary?.totalLives ?? headcountData?.totalLives ?? members.length;
  const quality = censusSummary?.quality?.trafficLight;
  const qualityMeta = quality === 'Good'
    ? { label: 'Good', className: 'bg-green-50 text-green-700 border-green-200' }
    : quality === 'Average'
    ? { label: 'Average', className: 'bg-amber-50 text-amber-700 border-amber-200' }
    : quality
    ? { label: 'Poor', className: 'bg-red-50 text-red-700 border-red-200' }
    : null;

  return (
    <div className="flex flex-col">
      {/* Summary bar */}
      <div className="rounded-xl border border-border bg-card px-3 mb-4 overflow-hidden">
        <KVRow label="Total Lives" value={totalLives.toLocaleString('en-IN')} />
        {qualityMeta && (
          <KVRow label="Census Quality" value={
            <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5', qualityMeta.className)}>{qualityMeta.label}</span>
          } />
        )}
      </div>

      {/* Grade ↔ Plan mapping */}
      {Object.keys(gradeMap).length > 0 && (
        <>
          <SectionLabel>Grade → Plan Mapping</SectionLabel>
          <div className="rounded-xl border border-border bg-card px-3 mb-4 overflow-hidden">
            {Object.entries(gradeMap).map(([grade, planId]) => {
              const planName = plans.find((p) => p.planId === planId)?.name ?? planId;
              return <KVRow key={grade} label={grade} value={planName} />;
            })}
          </div>
        </>
      )}

      {/* Headcount by grade */}
      {headcountData && headcountData.grades.length > 0 && (
        <>
          <SectionLabel>Headcount by Grade</SectionLabel>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-4 gap-0 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
              <span>Grade</span>
              <span className="text-right">Lives</span>
              <span className="text-right">Avg Salary</span>
              <span className="text-right">Avg SA</span>
            </div>
            {headcountData.grades.map((row) => (
              <div key={row.grade} className="grid grid-cols-4 gap-0 px-3 py-1.5 text-xs border-b border-border/40 last:border-0">
                <span className="font-medium">{row.grade}</span>
                <span className="text-right tabular-nums">{row.lives}</span>
                <span className="text-right tabular-nums text-muted-foreground">{fmtINRPanel(row.avgSalary)}</span>
                <span className="text-right tabular-nums text-muted-foreground">{fmtINRPanel(row.avgSumAssured)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Member list */}
      {members.length > 0 && (
        <>
          <SectionLabel>Members ({members.length})</SectionLabel>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {members.slice(0, 50).map((m, i) => (
              <div key={m.memberNumber} className={cn('flex items-center gap-3 px-3 py-2 text-xs', i !== 0 && 'border-t border-border/40')}>
                <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-[9px] font-semibold text-muted-foreground">
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-[10px] text-muted-foreground">{m.grade} · {m.gender} · {new Date(m.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className="text-right tabular-nums text-muted-foreground shrink-0">{fmtINRPanel(m.sumAssured)}</span>
              </div>
            ))}
            {members.length > 50 && (
              <p className="text-center text-[10px] text-muted-foreground py-2">+{members.length - 50} more</p>
            )}
          </div>
        </>
      )}

      {members.length === 0 && !headcountData && (
        <EmptyState icon={Users} message="No member data uploaded yet." />
      )}
    </div>
  );
}

// ── 4. Claims Experience ─────────────────────────────────────────────────────

function ClaimsPanel({ claimsExperience }: { claimsExperience?: ClaimsExperience }) {
  if (!claimsExperience || claimsExperience.years.length === 0) {
    return <EmptyState icon={Activity} message="No claims experience data available." />;
  }
  const { years, largeLosses } = claimsExperience;
  const avgLR = years.reduce((s, y) => s + y.lossRatio, 0) / years.length;
  return (
    <div className="flex flex-col">
      <SectionLabel>Year-on-Year Experience</SectionLabel>
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="grid grid-cols-5 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
          <span>Year</span>
          <span className="text-right">Lives</span>
          <span className="text-right">Premium</span>
          <span className="text-right">Claims</span>
          <span className="text-right">LR</span>
        </div>
        {years.map((y) => (
          <div key={y.year} className="grid grid-cols-5 px-3 py-2 text-xs border-b border-border/40 last:border-0">
            <span className="font-medium">{y.year}</span>
            <span className="text-right tabular-nums">{y.lives.toLocaleString('en-IN')}</span>
            <span className="text-right tabular-nums text-muted-foreground">{fmtINRPanel(y.premium)}</span>
            <span className="text-right tabular-nums text-muted-foreground">{fmtINRPanel(y.claims)}</span>
            <span className={cn('text-right tabular-nums font-semibold', y.lossRatio >= 0.85 ? 'text-red-600' : y.lossRatio >= 0.7 ? 'text-amber-600' : 'text-green-600')}>
              {(y.lossRatio * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        <div className="grid grid-cols-5 px-3 py-1.5 text-[10px] font-semibold bg-muted/40 border-t border-border/40">
          <span className="col-span-4 text-muted-foreground">Avg Loss Ratio</span>
          <span className={cn('text-right tabular-nums', avgLR >= 0.85 ? 'text-red-600' : avgLR >= 0.7 ? 'text-amber-600' : 'text-green-600')}>
            {(avgLR * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {largeLosses.length > 0 && (
        <>
          <SectionLabel>Large Losses ({largeLosses.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {largeLosses.map((ll) => (
              <div key={ll.id} className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800">{ll.cause}</span>
                  <span className="text-xs font-bold tabular-nums text-amber-700">{fmtINRPanel(ll.amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-amber-600">
                  <span>{ll.year}</span>
                  {ll.note && <span>· {ll.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── 5a. Plans tab panel ───────────────────────────────────────────────────────

const HANDOFF_META: Record<PlanHandoffStatus, { label: string; className: string }> = {
  [PlanHandoffStatus.DRAFT]: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  [PlanHandoffStatus.PRICING_REQUESTED]: { label: 'Pricing Req.', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  [PlanHandoffStatus.UW_REFERRED]: { label: 'UW Referred', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  [PlanHandoffStatus.PRICED]: { label: 'Priced', className: 'bg-green-50 text-green-700 border border-green-200' },
  [PlanHandoffStatus.RETURNED]: { label: 'Returned', className: 'bg-red-50 text-red-700 border border-red-200' },
};

function PlansPanel({ plans }: { plans: Plan[] }) {
  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-xs text-muted-foreground italic text-center">
        No plans in this version.
      </div>
    );
  }

  const avgCompleteness = Math.round(plans.reduce((s, p) => s + p.completeness, 0) / plans.length);
  const pricedCount = plans.filter((p) => p.handoffStatus === PlanHandoffStatus.PRICED).length;

  return (
    <div className="flex flex-col">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Plans</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{plans.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Priced</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5 text-green-600">{pricedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg. Complete</p>
          <p className={cn('text-xl font-semibold tabular-nums mt-0.5', avgCompleteness >= 80 ? 'text-green-600' : avgCompleteness >= 40 ? 'text-amber-600' : 'text-red-500')}>{avgCompleteness}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid px-4 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/40 uppercase tracking-wide" style={{ gridTemplateColumns: '1fr 80px 90px 80px 90px 60px' }}>
          <span>Plan</span>
          <span>Product</span>
          <span>SA Basis</span>
          <span>Cover</span>
          <span>Status</span>
          <span className="text-right">Complete</span>
        </div>
        {plans.map((plan, i) => {
          const meta = HANDOFF_META[plan.handoffStatus];
          return (
            <div key={plan.planId} className={cn('flex flex-col gap-2 px-4 py-3', i !== plans.length - 1 && 'border-b border-border/40')}>
              {/* Main row */}
              <div className="grid items-center" style={{ gridTemplateColumns: '1fr 80px 90px 80px 90px 60px' }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Layers className="size-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate">{plan.name}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground truncate">{plan.productCode ?? '—'}</span>
                <span className="text-[10px] text-muted-foreground truncate">{plan.sumAssuredBasis.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-muted-foreground truncate">{plan.coverPattern}</span>
                <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border w-fit', meta.className)}>{meta.label}</span>
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', plan.completeness >= 80 ? 'bg-green-500' : plan.completeness >= 40 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${plan.completeness}%` }} />
                  </div>
                  <span className={cn('text-[10px] tabular-nums font-medium w-7 text-right shrink-0', plan.completeness >= 80 ? 'text-green-600' : plan.completeness >= 40 ? 'text-amber-600' : 'text-red-500')}>{plan.completeness}%</span>
                </div>
              </div>
              {/* Benefits + exclusions + extras inline */}
              <div className="flex flex-wrap items-center gap-1.5">
                {plan.benefits.map((b) => (
                  <span key={b} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{b}</span>
                ))}
                {plan.eligibilityCriteria && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">Elig: {plan.eligibilityCriteria}</span>
                )}
                {plan.uwMethod && (
                  <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded px-1.5 py-0.5">UW: {plan.uwMethod}</span>
                )}
                {plan.rateCardRef && (
                  <span className="text-[10px] bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">{plan.rateCardRef}</span>
                )}
                {plan.excludedClauses.length > 0 && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    {plan.excludedClauses.length} exclusion{plan.excludedClauses.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5b. Pricing (Rate Card) ───────────────────────────────────────────────────

function fmtINRPanel(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function PricingPanel({
  plans,
  priceRun,
  finalRateCard,
  mphAppetite,
  fclPolicy,
  versionId,
}: {
  plans: Plan[];
  priceRun: PriceRun | null;
  finalRateCard?: import('@/lib/types').FinalRateCard;
  mphAppetite?: import('@/lib/types').MphAppetite;
  fclPolicy: import('@/lib/types').FclPolicy;
  versionId: string;
}) {
  return (
    <div className="flex flex-col">
      {/* Plans */}
      <SectionLabel>Plans ({plans.length})</SectionLabel>
      {plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground italic">No plans in this version.</div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {plans.map((plan) => {
            const meta = HANDOFF_META[plan.handoffStatus];
            return (
              <div key={plan.planId} className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="flex-1 text-sm font-medium leading-tight">{plan.name}</span>
                  <span className={cn('shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5', meta.className)}>{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', plan.completeness >= 100 ? 'bg-green-500' : plan.completeness >= 60 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${plan.completeness}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{plan.completeness}%</span>
                </div>
                {plan.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {plan.benefits.map((b) => <span key={b} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{b}</span>)}
                  </div>
                )}
                {plan.excludedClauses.length > 0 && (
                  <p className="text-[10px] text-amber-600">{plan.excludedClauses.length} exclusion{plan.excludedClauses.length > 1 ? 's' : ''}: {plan.excludedClauses.map((e) => e.label).join(', ')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actuary pricing run */}
      <SectionLabel>Actuary Pricing Run</SectionLabel>
      {!priceRun ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground italic mb-4">No pricing run published for this version.</div>
      ) : (
        <div className="flex flex-col gap-4 mb-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {([
              { label: 'Technical Premium', value: fmtINRPanel(priceRun.technicalPremium) },
              { label: 'Break-even Floor', value: fmtINRPanel(priceRun.breakEvenFloor) },
              { label: 'Negotiated Premium', value: fmtINRPanel(priceRun.negotiatedPremium) },
              { label: 'Final (incl. GST)', value: fmtINRPanel(priceRun.finalPremiumInclGst), hi: true },
              { label: 'Per Life Premium', value: fmtINRPanel(priceRun.perLifePremium) },
              { label: 'Model Factor (LR)', value: `${(priceRun.modelFactor * 100).toFixed(1)}%` },
              { label: 'Total Lives', value: priceRun.lives.toLocaleString('en-IN') },
              { label: 'Feasible', value: priceRun.feasible ? 'Yes' : 'No' },
              { label: 'Priced At', value: new Date(priceRun.pricedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ] as const).map((row, i, arr) => (
              <div key={row.label} className={cn('flex items-center justify-between px-4 py-2 text-xs', i !== arr.length - 1 && 'border-b border-border/50', 'hi' in row && row.hi && 'bg-indigo-50/60 font-semibold text-indigo-700')}>
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
          {Object.keys(priceRun.byPlan).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">By Plan</p>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {Object.entries(priceRun.byPlan).map(([planId, entry], i, arr) => {
                  const planName = plans.find((p) => p.planId === planId)?.name ?? planId;
                  return (
                    <div key={planId} className={cn('flex items-center gap-3 px-4 py-2 text-xs', i !== arr.length - 1 && 'border-b border-border/50')}>
                      <span className="flex-1 text-foreground truncate">{planName}</span>
                      <span className="text-muted-foreground tabular-nums">{entry.lives} lives</span>
                      <span className="text-green-700 font-medium tabular-nums">−{entry.effectiveDiscountPct}%</span>
                      <span className="font-semibold tabular-nums">{fmtINRPanel(entry.premium)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FCL policy */}
      {(() => {
        const vFcl = fclPolicy.byVersion[versionId] ?? fclPolicy.quoteDefault;
        return (
          <>
            <SectionLabel>FCL Policy</SectionLabel>
            <div className="rounded-xl border border-border bg-card px-3 mb-4 overflow-hidden">
              <KVRow label="Default Pattern" value={fclPolicy.quoteDefault} />
              <KVRow label="This Version" value={vFcl} />
            </div>
          </>
        );
      })()}

      {/* MPH appetite */}
      {mphAppetite && (
        <>
          <SectionLabel>MPH Appetite</SectionLabel>
          <div className="rounded-xl border border-border bg-card px-3 mb-4 overflow-hidden">
            <KVRow label="Category" value={mphAppetite.category} />
            <KVRow label="Max Discount" value={`${mphAppetite.maxDiscountPct}%`} />
            <KVRow label="UW Authority Band" value={mphAppetite.uwAuthorityBand} />
            {mphAppetite.preapprovedCardRef && <KVRow label="Pre-approved Card" value={mphAppetite.preapprovedCardRef} />}
          </div>
        </>
      )}

      {/* Final rate card */}
      {finalRateCard && (
        <>
          <SectionLabel>Final Rate Card</SectionLabel>
          <div className="rounded-xl border border-border bg-card px-3 overflow-hidden">
            <KVRow label="Ref" value={finalRateCard.ref} />
            <KVRow label="Insurer" value={finalRateCard.insurer} />
            <KVRow label="Blended Rate (‰)" value={finalRateCard.blendedRatePermille.toFixed(2)} />
            <KVRow label="Gross-up Factor" value={finalRateCard.grossUpFactor.toFixed(3)} />
            <KVRow label="GST" value={`${finalRateCard.gstPct}%`} />
            <KVRow label="Schedule Cells" value={finalRateCard.scheduleCellCount} />
            <KVRow label="Allocated At" value={new Date(finalRateCard.allocatedAt).toLocaleDateString('en-GB')} />
          </div>
        </>
      )}
    </div>
  );
}

// ── 6. Scenarios ─────────────────────────────────────────────────────────────

function ScenariosPanel({
  versions,
  actuaryPricing,
  activeVersionId,
}: {
  versions: QuoteVersion[];
  actuaryPricing: import('@/lib/types').ActuaryPricing;
  activeVersionId: string;
}) {
  const pricedVersions = versions.filter((v) => actuaryPricing.byVersion[v.id]);
  if (pricedVersions.length === 0) {
    return <EmptyState icon={FlaskConical} message="No priced versions to compare yet." />;
  }
  // Use first priced version as reference
  const refPriceRun = actuaryPricing.byVersion[pricedVersions[0].id];
  const refFinal = refPriceRun.finalPremiumInclGst;

  return (
    <div className="flex flex-col">
      <SectionLabel>Version Comparison</SectionLabel>
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div className="grid grid-cols-4 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
          <span className="col-span-2">Version</span>
          <span className="text-right">Final Premium</span>
          <span className="text-right">vs Ref</span>
        </div>
        {pricedVersions.map((v) => {
          const run = actuaryPricing.byVersion[v.id];
          const delta = run.finalPremiumInclGst - refFinal;
          const isActive = v.id === activeVersionId;
          return (
            <div key={v.id} className={cn('grid grid-cols-4 px-3 py-2 text-xs border-b border-border/40 last:border-0', isActive && 'bg-primary/5')}>
              <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                {isActive && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                <span className={cn('truncate', isActive ? 'font-semibold text-primary' : 'text-foreground')}>V{v.versionNo} — {v.name}</span>
              </div>
              <span className="text-right tabular-nums font-medium">{fmtINRPanel(run.finalPremiumInclGst)}</span>
              <span className={cn('text-right tabular-nums font-semibold', delta === 0 ? 'text-muted-foreground' : delta > 0 ? 'text-red-600' : 'text-green-600')}>
                {delta === 0 ? 'Ref' : `${delta > 0 ? '+' : ''}${fmtINRPanel(delta)}`}
              </span>
            </div>
          );
        })}
      </div>

      <SectionLabel>Per-Life Premium Comparison</SectionLabel>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {pricedVersions.map((v, i, arr) => {
          const run = actuaryPricing.byVersion[v.id];
          const maxPLP = Math.max(...arr.map((vv) => actuaryPricing.byVersion[vv.id].perLifePremium));
          const barPct = maxPLP > 0 ? (run.perLifePremium / maxPLP) * 100 : 0;
          const isActive = v.id === activeVersionId;
          return (
            <div key={v.id} className={cn('px-3 py-2 border-b border-border/40 last:border-0', isActive && 'bg-primary/5')}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-xs truncate', isActive ? 'font-semibold text-primary' : 'text-foreground')}>V{v.versionNo} — {v.name}</span>
                <span className="text-xs tabular-nums font-medium shrink-0 ml-2">{fmtINRPanel(run.perLifePremium)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full', isActive ? 'bg-primary' : 'bg-border')} style={{ width: `${barPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 7. Negotiation ───────────────────────────────────────────────────────────

function NegotiationPanel({ rounds }: { rounds: NegotiationRound[] }) {
  if (rounds.length === 0) {
    return <EmptyState icon={Scale} message="No negotiation rounds recorded for this version." />;
  }

  const allRounds = [...rounds].sort((a, b) => a.roundNo - b.roundNo);

  return (
    <div className="flex flex-col gap-3">
      {allRounds.map((round) => {
        const isBroker = round.party === NegotiationParty.BROKER;
        const kindMeta = {
          [NegotiationKind.COUNTER]: { label: 'Counter Offer', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: MessageSquare },
          [NegotiationKind.ACCEPT]: { label: 'Accepted', className: 'bg-green-50 text-green-700 border-green-200', icon: Handshake },
          [NegotiationKind.DECLINE]: { label: 'Declined', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
        }[round.kind];
        const Icon = kindMeta.icon;
        return (
          <div key={round.roundNo} className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold text-muted-foreground">Round {round.roundNo}</span>
              <span className={cn('text-[10px] font-medium border rounded-full px-2 py-0.5 flex items-center gap-1', kindMeta.className)}>
                <Icon className="size-2.5" />{kindMeta.label}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground/60">{new Date(round.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={cn('font-medium', isBroker ? 'text-sky-600' : 'text-violet-600')}>{isBroker ? 'Broker' : 'Insurer'}</span>
              <span className="text-muted-foreground truncate">{round.by}</span>
              {round.askDiscountPct != null && (
                <span className="ml-auto shrink-0 font-semibold tabular-nums">{round.askDiscountPct}% discount</span>
              )}
              {round.askPremium != null && (
                <span className="ml-auto shrink-0 font-semibold tabular-nums">{fmtINRPanel(round.askPremium)}</span>
              )}
            </div>
            {round.note && <p className="text-[11px] text-muted-foreground leading-snug">{round.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Version Journey ─────────────────────────────────────────────────────────

type JourneyStageState = 'done' | 'current' | 'pending' | 'skipped';

interface JourneyStage {
  key: string;
  label: string;
  sublabel?: string;
  state: JourneyStageState;
  icon: React.ElementType;
  detail?: string;
}

function buildVersionJourney(
  version: QuoteVersion | null,
  priceRun: PriceRun | null,
  negotiationRounds: NegotiationRound[],
  plans: Plan[],
): JourneyStage[] {
  if (!version) return [];

  const status = version.status;
  const hasPricing = priceRun != null;
  const hasUwReferral = plans.some((p) => p.handoffStatus === PlanHandoffStatus.UW_REFERRED);
  const hasNegotiation = negotiationRounds.length > 0;
  const isArchived = status === VersionStatus.ARCHIVED;

  // Derive which stage we're currently in
  const currentStageKey = (() => {
    if (isArchived) return 'archived';
    if (status === VersionStatus.FROZEN || status === VersionStatus.SELECTED) return 'resolved';
    if (hasNegotiation || status === VersionStatus.SHARED) return 'negotiation';
    if (hasUwReferral) return 'uw';
    if (hasPricing) return 'pricing';
    return 'draft';
  })();

  const stageOrder = ['draft', 'pricing', 'uw', 'shared', 'negotiation', 'resolved'];
  const currentIdx = stageOrder.indexOf(currentStageKey);

  function stageState(key: string): JourneyStageState {
    if (isArchived) return 'skipped';
    const idx = stageOrder.indexOf(key);
    if (idx < currentIdx) return 'done';
    if (idx === currentIdx) return 'current';
    return 'pending';
  }

  const planSummary = plans.length > 0
    ? `${plans.length} plan${plans.length > 1 ? 's' : ''} · ${plans.filter(p => p.handoffStatus === PlanHandoffStatus.PRICED).length} priced`
    : undefined;

  const negSummary = hasNegotiation
    ? `${negotiationRounds.length} round${negotiationRounds.length > 1 ? 's' : ''}`
    : undefined;

  const priceSummary = priceRun
    ? `${fmtINRPanel(priceRun.finalPremiumInclGst)} · LR ${(priceRun.modelFactor * 100).toFixed(0)}%`
    : undefined;

  const resolvedMeta = (() => {
    if (status === VersionStatus.SELECTED) return { label: 'Selected', sub: 'Client accepted this version' };
    if (status === VersionStatus.FROZEN) return { label: 'Frozen', sub: 'Version locked for issuance' };
    return { label: 'Resolved', sub: undefined };
  })();

  return [
    {
      key: 'draft',
      label: 'Draft Created',
      sublabel: version.note ?? new Date(version.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      state: stageState('draft'),
      icon: PlusCircle,
      detail: `V${version.versionNo} — ${version.name}`,
    },
    {
      key: 'pricing',
      label: 'Actuary Pricing',
      sublabel: hasPricing ? priceSummary : 'Not yet priced',
      state: stageState('pricing'),
      icon: Calculator,
      detail: planSummary,
    },
    {
      key: 'uw',
      label: 'UW Review',
      sublabel: hasUwReferral ? 'Referred to underwriter' : 'Not referred',
      state: hasUwReferral ? stageState('uw') : (stageState('uw') === 'pending' ? 'pending' : 'skipped'),
      icon: ShieldCheck,
    },
    {
      key: 'shared',
      label: 'Shared with Broker',
      sublabel: status === VersionStatus.SHARED || hasNegotiation || status === VersionStatus.SELECTED || status === VersionStatus.FROZEN
        ? 'Sent to broker for review'
        : 'Not yet shared',
      state: (status === VersionStatus.SHARED || hasNegotiation || status === VersionStatus.SELECTED || status === VersionStatus.FROZEN)
        ? (currentIdx > stageOrder.indexOf('shared') ? 'done' : 'current')
        : stageState('shared'),
      icon: Send,
    },
    {
      key: 'negotiation',
      label: 'Negotiation',
      sublabel: hasNegotiation ? negSummary : 'No rounds yet',
      state: hasNegotiation ? stageState('negotiation') : (stageState('negotiation') === 'pending' ? 'pending' : 'skipped'),
      icon: Scale,
    },
    {
      key: 'resolved',
      label: resolvedMeta.label,
      sublabel: resolvedMeta.sub ?? (isArchived ? 'Version archived' : 'Pending resolution'),
      state: isArchived ? 'skipped' : stageState('resolved'),
      icon: status === VersionStatus.SELECTED ? Handshake : status === VersionStatus.FROZEN ? Lock : CheckCircle2,
    },
  ];
}

function VersionJourney({
  version,
  priceRun,
  negotiationRounds,
  plans,
}: {
  version: QuoteVersion | null;
  priceRun: PriceRun | null;
  negotiationRounds: NegotiationRound[];
  plans: Plan[];
}) {
  const stages = buildVersionJourney(version, priceRun, negotiationRounds, plans);

  const stageStyle: Record<JourneyStageState, { dot: string; label: string; connector: string }> = {
    done:    { dot: 'bg-primary border-primary text-primary-foreground', label: 'text-muted-foreground', connector: 'bg-primary' },
    current: { dot: 'bg-background border-primary text-primary ring-4 ring-primary/15', label: 'text-foreground font-semibold', connector: 'bg-border' },
    pending: { dot: 'bg-background border-border text-muted-foreground', label: 'text-muted-foreground', connector: 'bg-border' },
    skipped: { dot: 'bg-muted border-border text-muted-foreground opacity-40', label: 'text-muted-foreground opacity-40', connector: 'bg-border opacity-30' },
  };

  if (!version) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2 px-4">
        <Info className="size-8 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No version selected.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Version Journey</p>
      <div className="flex flex-col">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const style = stageStyle[stage.state];
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex gap-3">
              {/* Spine */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  style.dot,
                )}>
                  {stage.state === 'done'
                    ? <Check className="size-3" />
                    : <Icon className="size-3" />
                  }
                </div>
                {!isLast && <div className={cn('w-0.5 flex-1 my-1 min-h-[20px]', style.connector)} />}
              </div>
              {/* Content */}
              <div className={cn('flex-1 min-w-0 pb-4', isLast && 'pb-0')}>
                <p className={cn('text-xs leading-tight', style.label)}>{stage.label}</p>
                {stage.sublabel && (
                  <p className={cn('text-[10px] mt-0.5 leading-snug', stage.state === 'current' ? 'text-primary' : 'text-muted-foreground')}>
                    {stage.sublabel}
                  </p>
                )}
                {stage.detail && stage.state !== 'pending' && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-snug">{stage.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status badge */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <div className={cn(
          'rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2',
          version.status === VersionStatus.SELECTED ? 'bg-green-50 text-green-700 border border-green-200' :
          version.status === VersionStatus.FROZEN ? 'bg-violet-50 text-violet-700 border border-violet-200' :
          version.status === VersionStatus.SHARED ? 'bg-blue-50 text-blue-700 border border-blue-200' :
          version.status === VersionStatus.ARCHIVED ? 'bg-muted text-muted-foreground border border-border' :
          'bg-muted/60 text-muted-foreground border border-border',
        )}>
          {version.status === VersionStatus.SELECTED ? <Handshake className="size-3.5" /> :
           version.status === VersionStatus.FROZEN ? <Lock className="size-3.5" /> :
           version.status === VersionStatus.SHARED ? <Send className="size-3.5" /> :
           version.status === VersionStatus.ARCHIVED ? <Archive className="size-3.5" /> :
           <Info className="size-3.5" />}
          Current status: {version.status.charAt(0) + version.status.slice(1).toLowerCase()}
        </div>
      </div>
    </div>
  );
}

// ─── Version lifecycle ────────────────────────────────────────────────────────

type LifecycleEvent = {
  key: string;
  icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle?: string;
  timestamp: string;
  badge?: { label: string; className: string };
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtINRLifecycle(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

function buildLifecycleEvents(
  version: QuoteVersion | null,
  priceRun: PriceRun | null,
  negotiationRounds: NegotiationRound[],
  plans: Plan[],
): LifecycleEvent[] {
  if (!version) return [];
  const events: LifecycleEvent[] = [];

  // 1. Version created
  events.push({
    key: 'created',
    icon: PlusCircle,
    iconClass: 'text-muted-foreground',
    title: 'Version created',
    subtitle: version.note ?? undefined,
    timestamp: version.createdAt,
  });

  // 2. Pricing published (if priceRun exists)
  if (priceRun) {
    events.push({
      key: 'priced',
      icon: Calculator,
      iconClass: 'text-indigo-500',
      title: 'Pricing published',
      subtitle: `${fmtINRLifecycle(priceRun.finalPremiumInclGst)} incl. GST · LR ${(priceRun.modelFactor * 100).toFixed(1)}%`,
      timestamp: priceRun.pricedAt,
      badge: { label: 'Actuary', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    });
  }

  // 3. Plan handoffs
  for (const plan of plans) {
    if (plan.handoffStatus === 'UW_REFERRED' || plan.handoffStatus === 'PRICED') {
      events.push({
        key: `plan-${plan.planId}`,
        icon: plan.handoffStatus === 'PRICED' ? CheckCircle2 : AlertTriangle,
        iconClass: plan.handoffStatus === 'PRICED' ? 'text-green-600' : 'text-amber-500',
        title: plan.handoffStatus === 'PRICED' ? `${plan.name} — Priced` : `${plan.name} — UW referred`,
        subtitle: plan.handoffStatus === 'PRICED'
          ? `${Math.round(plan.completeness)}% complete`
          : 'Awaiting underwriter decision',
        timestamp: version.createdAt, // best approximation without a separate timestamp
        badge: plan.handoffStatus === 'UW_REFERRED'
          ? { label: 'UW', className: 'bg-amber-50 text-amber-700 border-amber-200' }
          : undefined,
      });
    }
  }

  // 4. Negotiation rounds
  for (const round of negotiationRounds) {
    const isBroker = round.party === NegotiationParty.BROKER;
    const kindLabel = round.kind === NegotiationKind.COUNTER
      ? 'Counter offer'
      : round.kind === NegotiationKind.ACCEPT
      ? 'Accepted'
      : 'Declined';
    const discountStr = round.askDiscountPct != null ? ` · ${round.askDiscountPct}% discount asked` : '';
    events.push({
      key: `neg-${round.roundNo}`,
      icon: round.kind === NegotiationKind.ACCEPT
        ? Handshake
        : round.kind === NegotiationKind.DECLINE
        ? XCircle
        : MessageSquare,
      iconClass: round.kind === NegotiationKind.ACCEPT
        ? 'text-green-600'
        : round.kind === NegotiationKind.DECLINE
        ? 'text-destructive'
        : 'text-blue-500',
      title: `${isBroker ? 'Broker' : 'Insurer'} — ${kindLabel}`,
      subtitle: (round.note ?? '') + discountStr || undefined,
      timestamp: round.at,
      badge: { label: `Round ${round.roundNo}`, className: 'bg-slate-100 text-slate-700 border-slate-200' },
    });
  }

  // 5. Shared / Selected / Frozen / Archived terminal state
  if (version.status === VersionStatus.SHARED) {
    events.push({
      key: 'shared',
      icon: Send,
      iconClass: 'text-blue-500',
      title: 'Shared with broker',
      timestamp: version.createdAt,
      badge: { label: 'Shared', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    });
  } else if (version.status === VersionStatus.SELECTED) {
    events.push({
      key: 'selected',
      icon: CheckCircle2,
      iconClass: 'text-green-600',
      title: 'Selected by client',
      timestamp: version.createdAt,
      badge: { label: 'Selected', className: 'bg-green-50 text-green-700 border-green-200' },
    });
  } else if (version.status === VersionStatus.FROZEN) {
    events.push({
      key: 'frozen',
      icon: ShieldCheck,
      iconClass: 'text-violet-500',
      title: 'Version frozen',
      timestamp: version.createdAt,
      badge: { label: 'Frozen', className: 'bg-violet-50 text-violet-700 border-violet-200' },
    });
  } else if (version.status === VersionStatus.ARCHIVED) {
    events.push({
      key: 'archived',
      icon: Archive,
      iconClass: 'text-muted-foreground',
      title: 'Archived',
      timestamp: version.createdAt,
    });
  }

  // Sort by timestamp ascending
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events;
}

function VersionLifecycle({
  version,
  priceRun,
  negotiationRounds,
  plans,
}: {
  version: QuoteVersion | null;
  priceRun: PriceRun | null;
  negotiationRounds: NegotiationRound[];
  plans: Plan[];
}) {
  const events = buildLifecycleEvents(version, priceRun, negotiationRounds, plans);

  return (
    <div className="px-6 py-5 flex flex-col gap-1">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Version Lifecycle
      </h2>

      {events.length === 0 && (
        <p className="text-xs text-muted-foreground">No events recorded yet.</p>
      )}

      <div className="flex flex-col">
        {events.map((ev, idx) => {
          const Icon = ev.icon;
          const isLast = idx === events.length - 1;
          return (
            <div key={ev.key} className="flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-full bg-background border border-border', ev.iconClass)}>
                  <Icon className="size-3.5" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
              </div>

              {/* Content */}
              <div className={cn('flex-1 min-w-0 pb-5', isLast && 'pb-0')}>
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground leading-tight flex-1">
                    {ev.title}
                  </span>
                  {ev.badge && (
                    <span className={cn('shrink-0 text-[9px] font-medium border rounded-full px-1.5 py-0.5', ev.badge.className)}>
                      {ev.badge.label}
                    </span>
                  )}
                </div>
                {ev.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{ev.subtitle}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">{fmtDateTime(ev.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────

function VersionDetailInner({ versionId }: { versionId: string }) {
  const { bundle } = useRfqBundle();
  const router = useRouter();
  const [sortAsc, setSortAsc] = useState(false);
  const [journeyTab, setJourneyTab] = useState<'subsidiaries' | 'members' | 'claims' | 'plans' | 'pricing' | 'scenarios' | 'negotiation'>('subsidiaries');
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const versionsScrollRef = useRef<HTMLDivElement>(null);

  if (!bundle) return null;

  const {
    rfqId,
    employerName,
    statusStage,
    effectiveDate,
    brokerName,
    channel,
    salesOwner,
    quoteVersions,
    plans,
    documents,
  } = bundle;

  const profitability = computeVersionProfitability(bundle);
  const readiness = computeReadinessGates(bundle);
  const milestones = computeMilestoneSpine(bundle);

  const sortedVersions = [...quoteVersions].sort((a, b) =>
    sortAsc ? a.versionNo - b.versionNo : b.versionNo - a.versionNo
  );

  const activeVersion = quoteVersions.find((v) => v.id === versionId);

  // Enrich BreadcrumbBar: rfqId with employer name, versionId with version name
  useEffect(() => {
    setLabel(rfqId, `${rfqId.toUpperCase()} · ${employerName}`);
    if (activeVersion) {
      setLabel(versionId, `V${activeVersion.versionNo} — ${activeVersion.name}`);
    }
  }, [rfqId, employerName, versionId, activeVersion, setLabel]);

  // Restore scroll position saved when navigating from rfq detail or switching versions
  useEffect(() => {
    const saved = sessionStorage.getItem(`rfq2-vs-scroll-${rfqId}`);
    if (saved && versionsScrollRef.current) {
      versionsScrollRef.current.scrollTop = Number(saved);
    }
  }, [rfqId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b border-border/60 bg-background shrink-0">
        {/* Title block */}
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground whitespace-nowrap">
              {activeVersion
                ? `V${activeVersion.versionNo} — ${activeVersion.name}`
                : versionId}
            </h1>
          </div>
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
          <GovernancePill icon={Building2} label="Client" value={employerName} />
          {effectiveDate && (
            <GovernancePill icon={Calendar} label="Effective Date" value={formatDate(effectiveDate)} />
          )}
          {salesOwner && (
            <GovernancePill icon={User} label="Owner" value={salesOwner.name} />
          )}
          <GovernancePill icon={Tag} label="Status" value={statusStage.replace(/_/g, ' ')} />
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
          <div className="flex items-center gap-2 px-3 py-2.5 shrink-0">
            <span className="flex-1 text-sm font-semibold text-foreground truncate">Versions</span>
            <Button variant="secondary" size="sm" className="h-7 px-2 text-xs gap-1 shrink-0">
              <Plus className="size-3" />
              New
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => setSortAsc((prev) => !prev)}
              title={sortAsc ? 'Sorted oldest first' : 'Sorted newest first'}
            >
              {sortAsc ? <ArrowDown01 className="size-3.5" /> : <ArrowDown10 className="size-3.5" />}
            </Button>
          </div>

          <div ref={versionsScrollRef} className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-2">
            {sortedVersions.map((v) => {
              const priceEntry = profitability.pricedVersions.find((p) => p.versionId === v.id);
              const planNames = plans.filter((p) => p.quoteVersionId === v.id).map((p) => p.name);
              return (
                <CompactVersionCard
                  key={v.id}
                  version={v}
                  isActive={v.id === versionId}
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

        {/* Middle — Journey panels */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Quote Intent card */}
          <div className="shrink-0 border-b border-border/60 px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Quote Intent</span>
              <button className="flex items-center justify-center size-7 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-x-3 gap-y-2">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">LOB</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.lob}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Business Type</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.businessType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Lives Covered</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.livesCovered.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Scheme Type</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.schemeType.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Effective Date</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.effectiveDate ? new Date(bundle.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Policy Year End</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.policyConfig?.policyYearEnd ? new Date(bundle.policyConfig.policyYearEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Pricing Basis</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.defaultPlanStructure?.pricingBasis?.replace(/_/g, ' ') ?? '—'}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-muted-foreground truncate">Segment</span>
                <span className="text-xs font-medium text-foreground truncate">{bundle.quoteSegment ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Tab row */}
          <div className="shrink-0 border-b border-border/60 px-4 py-2 flex items-center gap-1 overflow-x-auto">
            {(
              [
                { key: 'subsidiaries', label: 'Subsidiaries', icon: Building, count: bundle.subsidiaries.length || null },
                { key: 'members', label: 'Member Mapping', icon: Users, count: bundle.members.length || null },
                { key: 'claims', label: 'Claims', icon: Activity, count: null },
                { key: 'plans', label: 'Plans', icon: Layers, count: plans.filter((p) => p.quoteVersionId === versionId).length || null },
                { key: 'pricing', label: 'Pricing', icon: BarChart3, count: plans.filter((p) => p.quoteVersionId === versionId).length || null },
                { key: 'scenarios', label: 'Scenarios', icon: FlaskConical, count: null },
                { key: 'negotiation', label: 'Negotiation', icon: Scale, count: bundle.negotiationLog.filter((r) => r.versionId === versionId).length || null },
              ] as Array<{ key: string; label: string; icon: React.ElementType; count: number | null }>
            ).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setJourneyTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                  journeyTab === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-3" />
                {label}
                {count != null && count > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[9px] font-bold px-1',
                    journeyTab === key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {journeyTab === 'subsidiaries' && (
              <SubsidiariesPanel subsidiaries={bundle.subsidiaries} />
            )}
            {journeyTab === 'members' && (
              <MemberMappingPanel
                members={bundle.members}
                censusSummary={bundle.censusSummary}
                headcountData={bundle.headcountData}
                gradeAllocations={bundle.gradeAllocations}
                versionId={versionId}
                plans={plans.filter((p) => p.quoteVersionId === versionId)}
              />
            )}
            {journeyTab === 'claims' && (
              <ClaimsPanel claimsExperience={bundle.claimsExperience} />
            )}
            {journeyTab === 'plans' && (
              <PlansPanel plans={plans.filter((p) => p.quoteVersionId === versionId)} />
            )}
            {journeyTab === 'pricing' && (
              <PricingPanel
                plans={plans.filter((p) => p.quoteVersionId === versionId)}
                priceRun={bundle.actuaryPricing?.byVersion?.[versionId] ?? null}
                finalRateCard={bundle.finalRateCard}
                mphAppetite={bundle.mphAppetite}
                fclPolicy={bundle.fclPolicy}
                versionId={versionId}
              />
            )}
            {journeyTab === 'scenarios' && (
              <ScenariosPanel
                versions={quoteVersions}
                actuaryPricing={bundle.actuaryPricing}
                activeVersionId={versionId}
              />
            )}
            {journeyTab === 'negotiation' && (
              <NegotiationPanel rounds={bundle.negotiationLog.filter((r) => r.versionId === versionId)} />
            )}
          </div>
        </div>

        {/* Right — Version Journey / Lifecycle */}
        <div className="w-60 shrink-0 border-l border-border/60 flex flex-col overflow-hidden">
          <Tabs defaultValue="journey" className="flex flex-col h-full">
            <div className="px-3 pt-3 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="journey" className="flex-1 text-xs">
                  Journey
                </TabsTrigger>
                <TabsTrigger value="lifecycle" className="flex-1 text-xs">
                  Audit Trail
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="journey" className="flex-1 overflow-y-auto mt-0">
              <VersionJourney
                version={activeVersion ?? null}
                priceRun={bundle.actuaryPricing?.byVersion?.[versionId] ?? null}
                negotiationRounds={bundle.negotiationLog.filter((r) => r.versionId === versionId)}
                plans={plans.filter((p) => p.quoteVersionId === versionId)}
              />
            </TabsContent>
            <TabsContent value="lifecycle" className="flex-1 overflow-y-auto mt-0">
              <VersionLifecycle
                version={activeVersion ?? null}
                priceRun={bundle.actuaryPricing?.byVersion?.[versionId] ?? null}
                negotiationRounds={bundle.negotiationLog.filter((r) => r.versionId === versionId)}
                plans={plans.filter((p) => p.quoteVersionId === versionId)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─── Page entry ───────────────────────────────────────────────────────────────

export default function VersionDetailPage() {
  const { rfqId, versionId } = useParams<{ rfqId: string; versionId: string }>();

  return (
    <RfqBundleProvider rfqId={rfqId}>
      <VersionDetailInner versionId={versionId} />
    </RfqBundleProvider>
  );
}
