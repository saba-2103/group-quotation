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
  ChevronDown,
  Copy,
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
  GitPullRequest,
  ArrowRight,
  ShieldUser,
  LayoutDashboard,
  Clock,
  Briefcase,
  Clock4,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  RfqStatus,
  BusinessType,
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

function labelForBusinessType(t: BusinessType) {
  const map: Record<BusinessType, string> = {
    [BusinessType.NEW]: 'New Business',
    [BusinessType.RENEWAL]: 'Renewal',
    [BusinessType.TAKEOVER]: 'Takeover',
  };
  return map[t] ?? t;
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
  [VersionStatus.DRAFT]:             { label: 'Draft',             className: 'bg-slate-100 text-slate-700 border-slate-200' },
  [VersionStatus.UW_REFERRED]:       { label: 'UW Referred',       className: 'bg-amber-50 text-amber-700 border-amber-200' },
  [VersionStatus.EVALUATED]:         { label: 'Evaluated',         className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.PRICING_REQUESTED]: { label: 'Pricing Requested', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  [VersionStatus.RATED]:             { label: 'Rated',             className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.SUBMITTED]:         { label: 'Submitted',         className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.SHARED]:            { label: 'Sent to Client',    className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.SENT_TO_CLIENT]:    { label: 'Sent to Client',    className: 'bg-blue-50 text-blue-700 border-blue-200' },
  [VersionStatus.SELECTED]:          { label: 'Selected',          className: 'bg-amber-50 text-amber-700 border-amber-200' },
  [VersionStatus.FROZEN]:            { label: 'Frozen',            className: 'bg-violet-50 text-violet-700 border-violet-200' },
  [VersionStatus.ARCHIVED]:          { label: 'Archived',          className: 'bg-gray-100 text-gray-500 border-gray-200' },
  [VersionStatus.WITHDRAWN]:         { label: 'Withdrawn',         className: 'bg-rose-50 text-rose-700 border-rose-200' },
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
  const activeSubs = subsidiaries.filter((s) => s.status === 'ACTIVE').length;
  return (
    <div className="flex flex-col">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Subsidiaries</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{subsidiaries.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-xl font-semibold tabular-nums mt-0.5">{activeSubs}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] px-4 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/40 uppercase tracking-wide">
          <span className="mr-3">Code</span>
          <span>Name</span>
          <span className="text-right mr-4">Split</span>
          <span className="text-right">Status</span>
        </div>
        {subsidiaries.map((s, i) => (
          <div key={s.subsidiaryId} className={cn('grid grid-cols-[auto_1fr_auto_auto] items-center px-4 py-2.5 text-xs', i !== subsidiaries.length - 1 && 'border-b border-border/40')}>
            <div className="flex items-center gap-2 min-w-0 mr-3">
              <span className="font-mono font-semibold text-foreground">{s.code}</span>
            </div>
            <span className="font-medium truncate">{s.name}</span>
            <span className="text-muted-foreground text-[10px] font-mono mr-4">{s.billingSplitRule}</span>
            <span className="font-semibold tabular-nums text-right">{s.status}</span>
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

// ── 5a. Plans tab panel (spec-compliant, 4-panel layout) ─────────────────────

type RoutingVerdict =
  | 'PRE_APPROVED_STP'
  | 'NEEDS_PRICING'
  | 'NEEDS_UW'
  | 'PRICING_REQUESTED'
  | 'UW_REFERRED';

function deriveRoutingVerdict(
  plan: Plan,
  appetite?: import('@/lib/types').MphAppetite,
): RoutingVerdict {
  if (plan.handoffStatus === PlanHandoffStatus.PRICING_REQUESTED) return 'PRICING_REQUESTED';
  if (plan.handoffStatus === PlanHandoffStatus.UW_REFERRED) return 'UW_REFERRED';
  if (appetite?.preapprovedCardRef && plan.rateCardRef === appetite.preapprovedCardRef)
    return 'PRE_APPROVED_STP';
  if (!plan.rateCardRef) return 'NEEDS_PRICING';
  return 'NEEDS_UW';
}

const ROUTING_META: Record<RoutingVerdict, { label: string; cls: string }> = {
  PRE_APPROVED_STP:  { label: 'Pre-approved · STP', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NEEDS_PRICING:     { label: 'Needs pricing',       cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  NEEDS_UW:          { label: 'Needs UW',            cls: 'bg-amber-50  text-amber-700  border-amber-200'  },
  PRICING_REQUESTED: { label: 'Pricing requested',   cls: 'bg-sky-50    text-sky-700    border-sky-200'    },
  UW_REFERRED:       { label: 'UW referred',         cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const HANDOFF_META: Record<PlanHandoffStatus, { label: string; className: string }> = {
  [PlanHandoffStatus.DRAFT]:             { label: 'Draft',        className: 'bg-muted text-muted-foreground' },
  [PlanHandoffStatus.PRICING_REQUESTED]: { label: 'Pricing Req.', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  [PlanHandoffStatus.UW_REFERRED]:       { label: 'UW Referred',  className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  [PlanHandoffStatus.PRICED]:            { label: 'Priced',       className: 'bg-green-50 text-green-700 border border-green-200' },
  [PlanHandoffStatus.RETURNED]:          { label: 'Returned',     className: 'bg-red-50 text-red-700 border border-red-200' },
};

const PLAN_TEMPLATES = [
  {
    id: 'GTL_GRADE_SLAB',
    name: 'Grade Slab Cover',
    description: '3-grade structure seeded from census data',
    tags: ['Grade-slab', 'Census-aware'],
    censusAware: true,
    custom: false,
  },
  {
    id: 'GTL_SALARY_MULT',
    name: 'Salary Multiple',
    description: 'Sum assured = N × annual salary for all members',
    tags: ['Salary Multiple'],
    censusAware: false,
    custom: false,
  },
  {
    id: 'GTL_FLAT',
    name: 'Flat Cover',
    description: 'Fixed sum assured — same for all eligible members',
    tags: ['Flat SI'],
    censusAware: false,
    custom: false,
  },
];

function PlansPanel({
  rfqId,
  versionId,
  versionNo,
  plans,
  gradeAllocations,
  priceRun,
  mphAppetite,
  subsidiaries,
  headcountData,
  isFrozen,
}: {
  rfqId: string;
  versionId: string;
  versionNo: number;
  plans: Plan[];
  gradeAllocations: Record<string, string>;
  priceRun: PriceRun | null;
  mphAppetite?: import('@/lib/types').MphAppetite;
  subsidiaries: Subsidiary[];
  headcountData?: import('@/lib/types').HeadcountData;
  isFrozen: boolean;
}) {
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  const [lobFilter, setLobFilter] = useState<'ALL' | 'GTL'>('ALL');
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [templateExpanded, setTemplateExpanded] = useState(plans.length === 0);

  const filteredPlans =
    lobFilter === 'ALL' ? plans : plans.filter((p) => (p.productCode ?? '').startsWith('GTL'));

  // Derive grade rows from headcountData or gradeAllocations keys
  const gradeRows: {
    grade: string;
    lives: number;
    avgSalary: number;
    avgSI: number;
    allocatedTo: string;
  }[] = (() => {
    if (headcountData?.grades?.length) {
      return headcountData.grades.map((g) => ({
        grade: g.grade,
        lives: g.lives,
        avgSalary: g.avgSalary,
        avgSI: g.avgSumAssured,
        allocatedTo: gradeAllocations[g.grade] ?? 'UNALLOCATED',
      }));
    }
    const keys = Object.keys(gradeAllocations);
    if (keys.length) {
      return keys.map((grade) => ({
        grade,
        lives: 0,
        avgSalary: 0,
        avgSI: 0,
        allocatedTo: gradeAllocations[grade] ?? 'UNALLOCATED',
      }));
    }
    return [];
  })();

  const unallocatedCount = gradeRows.filter((r) => r.allocatedTo === 'UNALLOCATED').length;
  const hasCensus = gradeRows.length > 0;
  const totalCensusLives =
    headcountData?.totalLives ?? gradeRows.reduce((s, r) => s + r.lives, 0);

  async function handleGradeAlloc(grade: string, planId: string) {
    if (!bundle || isFrozen) return;
    const newVersionAlloc = { ...gradeAllocations, [grade]: planId };
    const newFullAlloc = { ...bundle.gradeAllocations, [versionId]: newVersionAlloc };
    updateBundle({ gradeAllocations: newFullAlloc });
    try {
      await fetch(`/api/rfqs/${rfqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gradeAllocations: newFullAlloc }),
      });
    } catch {
      /* optimistic — ignore */
    }
  }

  function fmtINR(n: number) {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
    if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      <div className="flex flex-col gap-5 px-5 py-5">

        {/* ── Panel B: Census Exposure ──────────────────────────────────────── */}
        <div style={{ order: 2 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Census Exposure</h3>
            {headcountData && (
              <span className="text-[10px] text-muted-foreground italic">Derived from by-grade headcount</span>
            )}
          </div>

          {!hasCensus ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-5 text-center">
              <Users className="size-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No census loaded yet</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Go to the{' '}
                <span className="text-primary cursor-pointer hover:underline">
                  Census Workbench
                </span>{' '}
                to load data
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Headline KPI strip */}
              <div className="grid grid-cols-4 border-b border-border/40">
                {[
                  { label: 'Total Lives',  value: totalCensusLives ? totalCensusLives.toLocaleString('en-IN') : '—', amber: false },
                  { label: 'Grades',       value: String(gradeRows.length), amber: false },
                  { label: 'Allocated',    value: `${gradeRows.length - unallocatedCount}/${gradeRows.length}`, amber: false },
                  { label: 'Unallocated',  value: String(unallocatedCount), amber: unallocatedCount > 0 },
                ].map((kpi, idx) => (
                  <div
                    key={kpi.label}
                    className={cn('px-3 py-2.5 text-center', idx < 3 && 'border-r border-border/40')}
                  >
                    <p className="text-[10px] text-muted-foreground leading-none mb-1">{kpi.label}</p>
                    <p className={cn('text-sm font-semibold tabular-nums', kpi.amber && 'text-amber-600')}>
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Column headers */}
              <div
                className="grid px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/30 bg-muted/10"
                style={{ gridTemplateColumns: '90px 56px 56px 96px 96px 1fr' }}
              >
                <span>Grade</span>
                <span className="text-right">Lives</span>
                <span className="text-right">Deps.</span>
                <span className="text-right">Avg Salary</span>
                <span className="text-right">Avg SI</span>
                <span className="pl-3">Allocated to</span>
              </div>

              {/* Grade rows */}
              {gradeRows.map((row, i) => {
                const isUnalloc = row.allocatedTo === 'UNALLOCATED';
                return (
                  <div
                    key={row.grade}
                    className={cn(
                      'grid items-center px-4 py-2.5 text-xs',
                      i !== gradeRows.length - 1 && 'border-b border-border/30',
                      isUnalloc && 'bg-amber-50/40',
                    )}
                    style={{ gridTemplateColumns: '90px 56px 56px 96px 96px 1fr' }}
                  >
                    <span className="font-medium">{row.grade}</span>
                    <span className="text-right tabular-nums text-muted-foreground">
                      {row.lives || '—'}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground">—</span>
                    <span className="text-right tabular-nums text-muted-foreground text-[11px]">
                      {row.avgSalary ? fmtINR(row.avgSalary) : '—'}
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground text-[11px]">
                      {row.avgSI ? fmtINR(row.avgSI) : '—'}
                    </span>
                    <div className="pl-3 flex items-center gap-2">
                      {plans.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground/70 italic">
                          Create a plan to allocate
                        </span>
                      ) : isFrozen ? (
                        <span className="text-xs">
                          {isUnalloc ? (
                            <span className="text-amber-600 italic">Unallocated</span>
                          ) : (
                            plans.find((p) => p.planId === row.allocatedTo)?.name ?? row.allocatedTo
                          )}
                        </span>
                      ) : (
                        <select
                          value={row.allocatedTo}
                          onChange={(e) => handleGradeAlloc(row.grade, e.target.value)}
                          className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                          disabled={isFrozen}
                        >
                          <option value="UNALLOCATED">— Unallocated —</option>
                          {plans.map((p) => (
                            <option key={p.planId} value={p.planId}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {isUnalloc && plans.length > 0 && !isFrozen && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          Needs allocation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Panel D: Plan Portfolio ────────────────────────────────────────── */}
        <div style={{ order: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Plans</h3>
            <div className="flex items-center gap-2">
              {filteredPlans.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}</span>
              )}
              {isFrozen && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted rounded-md px-2.5 py-1 border border-border/50">
                  <Lock className="size-3 shrink-0" />
                  <span>Frozen</span>
                </div>
              )}
              {!isFrozen && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1.5"
                    disabled={plans.length === 0}
                    title={plans.length === 0 ? 'Add at least one plan to run pricing' : 'Run actuarial pricing bridge over this version'}
                  >
                    <Calculator className="size-3" />
                    Price with actuary
                  </Button>
                  <div className="flex items-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1.5 rounded-r-none border-r border-border/40 pr-2.5"
                      onClick={() => router.push(`/rfq2/${rfqId}/plans/new?versionId=${versionId}`)}
                    >
                      <Plus className="size-3" />
                      Add plan
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="secondary" className="h-7 w-6 rounded-l-none px-0">
                          <ChevronDown className="size-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Start from a template</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {PLAN_TEMPLATES.map((t) => (
                          <DropdownMenuItem
                            key={t.id}
                            className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                            onClick={() => router.push(`/rfq2/${rfqId}/plans/new?versionId=${versionId}&template=${t.id}`)}
                          >
                            <span className="text-xs font-semibold text-foreground">{t.name}</span>
                            <span className="text-[11px] text-muted-foreground leading-snug">{t.description}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center">
              <Layers className="size-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                No plans on this version yet
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Column headers */}
              <div
                className="grid px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/40 bg-muted/10"
                style={{
                  gridTemplateColumns:
                    '28px minmax(120px,1fr) 100px 130px 70px 80px 80px 48px 88px 76px 52px',
                }}
              >
                <span />
                <span>Plan</span>
                <span>Subsidiary</span>
                <span>Routing Status</span>
                <span>Product</span>
                <span>Cover</span>
                <span>SA Basis</span>
                <span className="text-right">Lives</span>
                <span className="text-right">Est. Premium</span>
                <span>Complete</span>
                <span />
              </div>

              {filteredPlans.map((plan, i) => {
                const verdict = deriveRoutingVerdict(plan, mphAppetite);
                const routeMeta = ROUTING_META[verdict];
                const livesForPlan = gradeRows
                  .filter((g) => g.allocatedTo === plan.planId)
                  .reduce((s, g) => s + g.lives, 0);
                const planPrice = priceRun?.byPlan?.[plan.planId];
                const subName =
                  plan.subsidiaryScope && plan.subsidiaryScope !== 'WHOLE_GROUP'
                    ? (subsidiaries.find((s) => s.subsidiaryId === plan.subsidiaryScope)?.name ??
                      plan.subsidiaryScope)
                    : 'Whole group';
                const isHovered = hoveredPlan === plan.planId;

                return (
                  <div
                    key={plan.planId}
                    className={cn(
                      'grid items-center px-4 py-2.5 text-xs transition-colors',
                      i !== filteredPlans.length - 1 && 'border-b border-border/30',
                      isHovered && 'bg-muted/30',
                    )}
                    style={{
                      gridTemplateColumns:
                        '28px minmax(120px,1fr) 100px 130px 70px 80px 80px 48px 88px 76px 52px',
                    }}
                    onMouseEnter={() => setHoveredPlan(plan.planId)}
                    onMouseLeave={() => setHoveredPlan(null)}
                  >
                    <Layers className="size-3.5 text-muted-foreground/40" />

                    {/* Plan identity */}
                    <div className="min-w-0 pr-2">
                      {plan.planNumber && (
                        <p className="text-[10px] font-mono text-muted-foreground/70 leading-none mb-0.5">
                          {plan.planNumber}
                        </p>
                      )}
                      <p className="font-medium truncate leading-tight">{plan.name}</p>
                    </div>

                    <span className="text-[10px] text-muted-foreground truncate">{subName}</span>

                    {/* Routing status chip */}
                    <span
                      className={cn(
                        'text-[10px] font-medium rounded-full px-2 py-0.5 border w-fit',
                        routeMeta.cls,
                      )}
                    >
                      {routeMeta.label}
                    </span>

                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {plan.productCode ?? '—'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{plan.coverPattern}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {plan.sumAssuredBasis.replace(/_/g, ' ')}
                    </span>

                    <span className="text-right tabular-nums text-[11px]">
                      {livesForPlan || '—'}
                    </span>

                    <span className="text-right tabular-nums text-[11px] text-muted-foreground">
                      {planPrice ? fmtINR(planPrice.premium) : '—'}
                    </span>

                    {/* Completeness bar */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            plan.completeness >= 80
                              ? 'bg-green-500'
                              : plan.completeness >= 40
                              ? 'bg-amber-400'
                              : 'bg-red-400',
                          )}
                          style={{ width: `${plan.completeness}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-[10px] tabular-nums font-medium shrink-0 w-7 text-right',
                          plan.completeness >= 80
                            ? 'text-green-600'
                            : plan.completeness >= 40
                            ? 'text-amber-600'
                            : 'text-red-500',
                        )}
                      >
                        {plan.completeness}%
                      </span>
                    </div>

                    {/* Row actions (hover-revealed) */}
                    <div
                      className={cn(
                        'flex items-center gap-0.5 justify-end transition-opacity',
                        isHovered ? 'opacity-100' : 'opacity-0',
                      )}
                    >
                      <button
                        type="button"
                        title={isFrozen ? 'Version is frozen' : 'Edit in wizard'}
                        disabled={isFrozen}
                        onClick={() =>
                          router.push(
                            `/rfq2/${rfqId}/plans/new?versionId=${versionId}&planId=${plan.planId}`,
                          )
                        }
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        title="Open plan detail"
                        onClick={() => router.push(`/rfq2/${rfqId}/plans/${plan.planId}`)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const [sortAsc, setSortAsc] = useState(false);
  const [versionTab, setVersionTab] = useState<
    'cockpit' | 'plans' | 'uw' | 'pricing' | 'negotiation' | 'documents'
  >('cockpit');
  const versionsScrollRef = useRef<HTMLDivElement>(null);

  if (!bundle) return null;

  const {
    rfqId,
    employerName,
    effectiveDate,
    brokerName,
    channel,
    salesOwner,
    quoteVersions,
    plans,
    documents,
    negotiationLog,
  } = bundle;

  const profitability = computeVersionProfitability(bundle);

  const sortedVersions = [...quoteVersions].sort((a, b) =>
    sortAsc ? a.versionNo - b.versionNo : b.versionNo - a.versionNo,
  );

  const activeVersion = quoteVersions.find((v) => v.id === versionId) ?? null;
  const versionPlans = plans.filter((p) => p.quoteVersionId === versionId);
  const priceRun = bundle.actuaryPricing?.byVersion?.[versionId] ?? null;
  const versionNegRounds = negotiationLog.filter((r) => r.versionId === versionId);
  const versionDocs = documents.filter((d) =>
    (d as unknown as { versionId?: string }).versionId === versionId,
  );

  const verStatusLabel: Partial<Record<VersionStatus, string>> = {
    [VersionStatus.DRAFT]: 'Draft',
    [VersionStatus.SHARED]: 'Shared',
    [VersionStatus.SELECTED]: 'Selected',
    [VersionStatus.FROZEN]: 'Frozen',
    [VersionStatus.ARCHIVED]: 'Archived',
  };
  const verStatusCls: Partial<Record<VersionStatus, string>> = {
    [VersionStatus.DRAFT]: 'bg-slate-100 border-slate-200 text-slate-600',
    [VersionStatus.SHARED]: 'bg-sky-50 border-sky-200 text-sky-700',
    [VersionStatus.SELECTED]: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    [VersionStatus.FROZEN]: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    [VersionStatus.ARCHIVED]: 'bg-red-50 border-red-200 text-red-600',
  };

  // Breadcrumb label
  useEffect(() => {
    setLabel(rfqId, `${rfqId.toUpperCase()} · ${employerName}`);
    if (activeVersion) {
      setLabel(versionId, `V${activeVersion.versionNo} — ${activeVersion.name}`);
    }
  }, [rfqId, employerName, versionId, activeVersion, setLabel]);

  // Restore scroll
  useEffect(() => {
    const saved = sessionStorage.getItem(`rfq2-vs-scroll-${rfqId}`);
    if (saved && versionsScrollRef.current) {
      versionsScrollRef.current.scrollTop = Number(saved);
    }
  }, [rfqId]);

  // const tabCls removed — using pill style below

  // ── Overview tab content ────────────────────────────────────────────────

  function OverviewTab() {
    return (
      <div className="flex gap-5 px-5 py-5 overflow-auto">
        {/* Left: version journey */}
        <div className="w-56 shrink-0">
          <VersionJourney
            version={activeVersion}
            priceRun={priceRun}
            negotiationRounds={versionNegRounds}
            plans={versionPlans}
          />
        </div>

        {/* Right: stats + plan quick-view */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Version info card */}
          <div className="rounded-xl border bg-card p-5">
            {activeVersion ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl font-black text-foreground tabular-nums leading-none">
                        V{activeVersion.versionNo}
                      </span>
                      <span className="text-base font-semibold text-foreground">
                        {activeVersion.name}
                      </span>
                    </div>
                    {activeVersion.note && (
                      <p className="text-sm text-muted-foreground italic mt-1 leading-snug">
                        {activeVersion.note}
                      </p>
                    )}
                  </div>
                  {activeVersion.status && (
                    <span className={cn(
                      'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold shrink-0',
                      verStatusCls[activeVersion.status] ?? 'bg-muted text-muted-foreground',
                    )}>
                      {verStatusLabel[activeVersion.status] ?? activeVersion.status}
                    </span>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/40">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Lives</p>
                    <p className="text-xl font-black text-foreground tabular-nums leading-none">
                      {bundle.censusSummary?.totalLives?.toLocaleString() ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Annual Premium</p>
                    <p className="text-xl font-black text-foreground tabular-nums leading-none">
                      {priceRun ? `₹${(priceRun.finalPremiumInclGst / 100000).toFixed(1)}L` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Per Life</p>
                    <p className="text-xl font-black text-foreground tabular-nums leading-none">
                      {priceRun ? `₹${priceRun.perLifePremium.toLocaleString('en-IN')}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Plans</p>
                    <p className="text-xl font-black text-foreground tabular-nums leading-none">
                      {versionPlans.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Neg. Rounds</p>
                    <p className="text-xl font-black text-foreground tabular-nums leading-none">
                      {versionNegRounds.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Loss Ratio</p>
                    <p className="text-xl font-black text-foreground tabular-nums leading-none">
                      {priceRun ? `${(priceRun.modelFactor * 100).toFixed(0)}%` : '—'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <Info className="size-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Version not found.</p>
              </div>
            )}
          </div>

          {/* Plans quick-view */}
          {versionPlans.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Plans on this version</p>
                <button
                  onClick={() => setVersionTab('plans')}
                  className="text-[10px] text-primary hover:underline underline-offset-2 flex items-center gap-0.5"
                >
                  View all <ChevronRight className="size-2.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {versionPlans.slice(0, 4).map((plan) => {
                  const meta = HANDOFF_META[plan.handoffStatus];
                  return (
                    <div key={plan.planId} className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2.5">
                      <Layers className="size-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{plan.name}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.sumAssuredBasis.replace(/_/g, ' ')}</p>
                      </div>
                      <span className={cn('shrink-0 text-[9px] font-medium border rounded-full px-1.5 py-0.5', meta.className)}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation receipt */}
          {activeVersion?.validationReceipt && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-800">Validated</p>
                <p className="text-[10px] text-emerald-700 font-mono truncate">
                  {activeVersion.validationReceipt.configHash}
                </p>
              </div>
              <p className="text-[10px] text-emerald-600 shrink-0">
                {formatDate(activeVersion.validationReceipt.validatedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── UW Evaluation tab ───────────────────────────────────────────────────

  function UwTab() {
    const uwGroups: Record<string, { label: string; cls: string; plans: typeof versionPlans }> = {
      [PlanHandoffStatus.PRICED]:             { label: 'Priced',              cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', plans: [] },
      [PlanHandoffStatus.UW_REFERRED]:        { label: 'With Underwriter',    cls: 'bg-amber-50 border-amber-200 text-amber-700',    plans: [] },
      [PlanHandoffStatus.PRICING_REQUESTED]:  { label: 'Pricing Requested',   cls: 'bg-indigo-50 border-indigo-200 text-indigo-700',  plans: [] },
      [PlanHandoffStatus.RETURNED]:           { label: 'Returned',            cls: 'bg-slate-100 border-slate-200 text-slate-600',    plans: [] },
      [PlanHandoffStatus.DRAFT]:              { label: 'Not Submitted',       cls: 'bg-muted border-border text-muted-foreground',    plans: [] },
    };
    for (const p of versionPlans) {
      if (uwGroups[p.handoffStatus]) uwGroups[p.handoffStatus].plans.push(p);
    }

    return (
      <div className="px-5 py-5 flex flex-col gap-5 overflow-auto">
        {versionPlans.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No plans in this version yet.</p>
          </div>
        ) : (
          Object.entries(uwGroups)
            .filter(([, g]) => g.plans.length > 0)
            .map(([key, group]) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                    group.cls,
                  )}>
                    {group.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{group.plans.length} plan{group.plans.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {group.plans.map((plan) => (
                    <div key={plan.planId} className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="size-3.5 text-muted-foreground shrink-0" />
                        <p className="text-[13px] font-semibold text-foreground flex-1 truncate">{plan.name}</p>
                        {plan.productCode && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{plan.productCode}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">UW Method: </span>
                          <span className="font-medium">{plan.uwMethod ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Completeness: </span>
                          <span className={cn('font-semibold', plan.completeness >= 80 ? 'text-emerald-600' : plan.completeness >= 40 ? 'text-amber-600' : 'text-red-500')}>
                            {plan.completeness}%
                          </span>
                        </div>
                      </div>
                      {plan.excludedClauses.length > 0 && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          {plan.excludedClauses.length} exclusion{plan.excludedClauses.length !== 1 ? 's' : ''}
                          {plan.excludedClauses.slice(0, 2).map((c) => ` · ${c.label}`).join('')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    );
  }

  // ── Pricing tab ─────────────────────────────────────────────────────────

  function PricingTab() {
    if (!priceRun) {
      return (
        <div className="flex flex-col items-center gap-2 py-16 text-center px-5">
          <BarChart3 className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No pricing run published for this version.</p>
        </div>
      );
    }

    return (
      <div className="px-5 py-5 flex flex-col gap-5 overflow-auto">
        {/* Hero premium */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Final Premium (incl. GST)</p>
          <p className="text-4xl font-black text-foreground tabular-nums leading-none">
            ₹{(priceRun.finalPremiumInclGst / 100000).toFixed(2)}L
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ₹{priceRun.perLifePremium.toLocaleString('en-IN')} per life · {priceRun.lives.toLocaleString()} lives
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Priced {formatDate(priceRun.pricedAt)}
          </p>
        </div>

        {/* Pricing breakdown */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4 pt-3 pb-2">Breakdown</p>
          {([
            { label: 'Technical Premium',   value: `₹${(priceRun.technicalPremium / 100000).toFixed(2)}L` },
            { label: 'Break-even Floor',     value: `₹${(priceRun.breakEvenFloor / 100000).toFixed(2)}L` },
            { label: 'Negotiated Premium',   value: `₹${(priceRun.negotiatedPremium / 100000).toFixed(2)}L` },
            { label: 'Final (incl. GST)',    value: `₹${(priceRun.finalPremiumInclGst / 100000).toFixed(2)}L`, highlight: true },
            { label: 'Loss Ratio (model)',   value: `${(priceRun.modelFactor * 100).toFixed(1)}%` },
            { label: 'Feasible',             value: priceRun.feasible ? 'Yes' : 'No' },
          ] as const).map((row) => (
            <div
              key={row.label}
              className={cn(
                'flex items-center justify-between px-4 py-2 text-[12px] border-t border-border/30',
                'highlight' in row && row.highlight && 'bg-indigo-50/50 font-semibold text-indigo-700',
              )}
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Per-plan breakdown */}
        {Object.keys(priceRun.byPlan).length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-4 pt-3 pb-2">By Plan</p>
            {Object.entries(priceRun.byPlan).map(([planId, entry]) => {
              const planName = versionPlans.find((p) => p.planId === planId)?.name ?? planId;
              return (
                <div key={planId} className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 text-[12px]">
                  <div>
                    <p className="font-medium text-foreground">{planName}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.lives} lives · {entry.effectiveDiscountPct}% discount</p>
                  </div>
                  <p className="font-black text-foreground tabular-nums">₹{(entry.premium / 100000).toFixed(1)}L</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Negotiation tab ─────────────────────────────────────────────────────

  function NegotiationTabContent() {
    if (versionNegRounds.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-16 text-center px-5">
          <Scale className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No negotiation rounds for this version.</p>
        </div>
      );
    }

    return (
      <div className="px-5 py-5 flex flex-col gap-3 overflow-auto">
        {[...versionNegRounds].sort((a, b) => b.roundNo - a.roundNo).map((r) => {
          const isBroker = r.party === NegotiationParty.BROKER;
          const isAccept = r.kind === NegotiationKind.ACCEPT;
          const accentBar = isAccept ? 'bg-emerald-400' : isBroker ? 'bg-sky-400' : 'bg-slate-300';
          const partyColor = isBroker ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-slate-50 border-slate-200 text-slate-700';
          const kindColor = isAccept ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700';

          return (
            <div key={r.roundNo} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex">
                <div className={cn('w-1.5 shrink-0', accentBar)} />
                <div className="flex-1 min-w-0 px-4 py-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', partyColor)}>
                      {r.party}
                    </span>
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', kindColor)}>
                      {isAccept ? 'Accepted' : 'Counter Offer'}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">Round {r.roundNo} · {formatDate(r.at)}</span>
                  </div>
                  {r.note && (
                    <p className="text-[11px] text-muted-foreground italic leading-snug">"{r.note}"</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60">{r.by}</p>
                </div>
                {r.askDiscountPct !== undefined && (
                  <div className={cn(
                    'shrink-0 px-5 flex flex-col items-center justify-center border-l',
                    isAccept ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200',
                  )}>
                    <span className={cn('text-2xl font-black tabular-nums leading-none', isAccept ? 'text-emerald-700' : 'text-amber-700')}>
                      {r.askDiscountPct}%
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">discount</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Documents tab ───────────────────────────────────────────────────────

  function DocumentsTabContent() {
    const allDocs = versionDocs.length > 0 ? versionDocs : documents;
    const label = versionDocs.length > 0 ? 'Version documents' : 'All deal documents';

    if (allDocs.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-16 text-center px-5">
          <FileText className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No documents attached.</p>
        </div>
      );
    }

    const DOC_STATUS_CLS: Record<string, string> = {
      DRAFT:    'bg-slate-100 border-slate-200 text-slate-600',
      PENDING:  'bg-amber-50 border-amber-200 text-amber-700',
      SIGNED:   'bg-emerald-50 border-emerald-200 text-emerald-700',
      FINAL:    'bg-emerald-50 border-emerald-200 text-emerald-700',
      UPLOADED: 'bg-sky-50 border-sky-200 text-sky-700',
    };

    return (
      <div className="px-5 py-5 flex flex-col gap-3 overflow-auto">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        {allDocs.map((doc) => (
          <div key={doc.documentId} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <FileText className="size-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{doc.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {doc.type.replace(/_/g, ' ')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    {doc.source === 'UPLOAD'
                      ? <><Upload className="size-2.5" /> Uploaded</>
                      : <><Cpu className="size-2.5" /> Generated</>}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right flex flex-col gap-1 items-end">
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', DOC_STATUS_CLS[doc.status] ?? 'bg-muted text-muted-foreground')}>
                  {doc.status}
                </span>
                <p className="text-[10px] text-muted-foreground">{formatDate(doc.uploadedAt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Cockpit tab content ──────────────────────────────────────────────────
  // ── Cockpit tab content ──────────────────────────────────────────────────
  function CockpitTab() {
    if (!activeVersion) return null;

    const appetite    = bundle.mphAppetite;
    const routing: 'STP' | 'REFER' | null = appetite
      ? appetite.uwAuthorityBand.toUpperCase().includes('SALES') ? 'STP' : 'REFER'
      : null;

    const allPriced   = versionPlans.length > 0 && versionPlans.every((p) => p.handoffStatus === PlanHandoffStatus.PRICED);
    const anyUwRef    = versionPlans.some((p) => p.handoffStatus === PlanHandoffStatus.UW_REFERRED);
    const lives       = priceRun?.lives ?? bundle.censusSummary?.totalLives ?? 0;
    const discPct     = priceRun?.technicalPremium
      ? Math.round((1 - priceRun.negotiatedPremium / priceRun.technicalPremium) * 100)
      : null;
    const versionNegCount = versionNegRounds.length;

    const handoffCls: Partial<Record<PlanHandoffStatus, string>> = {
      [PlanHandoffStatus.PRICED]:            'bg-emerald-50 text-emerald-700 border-emerald-200',
      [PlanHandoffStatus.PRICING_REQUESTED]: 'bg-amber-50  text-amber-700  border-amber-200',
      [PlanHandoffStatus.UW_REFERRED]:       'bg-sky-50    text-sky-700    border-sky-200',
      [PlanHandoffStatus.RETURNED]:          'bg-purple-50 text-purple-700 border-purple-200',
      [PlanHandoffStatus.DRAFT]:             'bg-muted     text-muted-foreground border-border',
    };
    const handoffLabel: Partial<Record<PlanHandoffStatus, string>> = {
      [PlanHandoffStatus.PRICED]:            'Priced',
      [PlanHandoffStatus.PRICING_REQUESTED]: 'Pricing Req.',
      [PlanHandoffStatus.UW_REFERRED]:       'With UW',
      [PlanHandoffStatus.RETURNED]:          'Returned',
      [PlanHandoffStatus.DRAFT]:             'Draft',
    };

    const readiness = [
      { label: 'Plans',      ok: versionPlans.length > 0,  tab: 'plans'   as const },
      { label: 'All Priced', ok: allPriced,                 tab: 'plans'   as const },
      { label: 'UW Ready',   ok: !!appetite,               tab: 'uw'      as const },
      { label: 'Census',     ok: !!bundle.censusSummary,   tab: 'plans'   as const },
      { label: 'Validated',  ok: !!activeVersion.validationReceipt, tab: 'cockpit' as const },
    ];
    const readinessScore = readiness.filter((r) => r.ok).length;

    return (
      <div className="flex h-full overflow-hidden">

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">

          {/* Premium — subtle card */}
          {priceRun ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-border/50">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Annual Premium (incl. GST)</p>
                <div className="flex items-end gap-2.5">
                  <span className="text-4xl font-black text-foreground tabular-nums leading-none">
                    ₹{(priceRun.finalPremiumInclGst / 100000).toFixed(2)}L
                  </span>
                  <span className="text-sm text-muted-foreground mb-0.5">/ year</span>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border/50 bg-muted/20">
                <div className="px-5 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Per Life</p>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    {lives > 0 ? `₹${(priceRun.finalPremiumInclGst / lives).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                  </p>
                  {lives > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{lives.toLocaleString()} lives</p>}
                </div>
                <div className="px-5 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Loss Ratio</p>
                  <p className={cn('text-xl font-black tabular-nums', priceRun.modelFactor > 0.98 ? 'text-amber-600' : 'text-foreground')}>
                    {(priceRun.modelFactor * 100).toFixed(1)}%
                  </p>
                  <p className={cn('text-[10px] mt-0.5', priceRun.feasible ? 'text-emerald-600' : 'text-red-500')}>
                    {priceRun.feasible ? '✓ Feasible' : '✗ Not feasible'}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Discount</p>
                  <p className="text-xl font-black text-foreground tabular-nums">
                    {discPct !== null ? `${discPct}%` : '—'}
                  </p>
                  {priceRun.pricedAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Priced {new Date(priceRun.pricedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 flex flex-col items-center gap-2 text-center">
              <BarChart3 className="size-7 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No pricing yet</p>
              <p className="text-xs text-muted-foreground/60">Submit plans to actuary to get pricing</p>
            </div>
          )}

          {/* Plans · UW · Pricing — 3-column */}
          <div className="grid grid-cols-3 gap-3">

            {/* Plans */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-3 pb-2.5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="size-3.5 text-muted-foreground" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Plans</p>
                </div>
                <button onClick={() => setVersionTab('plans')} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  All <ArrowRight className="size-2.5" />
                </button>
              </div>
              {/* Overall status badge */}
              <div className="px-4 pt-3 pb-1">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                  allPriced
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : anyUwRef
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200',
                )}>
                  {allPriced
                    ? <><CheckCircle2 className="size-3.5" /> All plans priced</>
                    : anyUwRef
                      ? <><Clock className="size-3.5" /> Plans with UW</>
                      : <><AlertTriangle className="size-3.5" /> Pricing in progress</>}
                </span>
              </div>
              {/* Plan cards */}
              <div className="px-4 pb-3 pt-2 space-y-2">
                {versionPlans.length === 0 ? (
                  <p className="text-xs text-red-500 py-2">No plans configured</p>
                ) : versionPlans.map((p) => (
                  <div key={p.planId} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {p.benefits.length} benefit{p.benefits.length !== 1 ? 's' : ''} · {p.sumAssuredBasis.replace(/_/g, ' ')} · {p.productCode}
                      </p>
                      {p.completeness < 100 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${p.completeness}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums">{p.completeness}%</span>
                        </div>
                      )}
                    </div>
                    <span className={cn('shrink-0 text-[9px] font-semibold rounded-full border px-2 py-0.5 mt-0.5', handoffCls[p.handoffStatus] ?? 'bg-muted text-muted-foreground border-border')}>
                      {handoffLabel[p.handoffStatus] ?? p.handoffStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Underwriting */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-3 pb-2.5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Underwriting</p>
                </div>
                <button onClick={() => setVersionTab('uw')} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  Detail <ArrowRight className="size-2.5" />
                </button>
              </div>
              {/* Overall UW status badge */}
              <div className="px-4 pt-3 pb-1">
                {!appetite ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-muted text-muted-foreground border-border">
                    <Info className="size-3.5" /> Not evaluated
                  </span>
                ) : anyUwRef ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 border-sky-200">
                    <Clock className="size-3.5" /> With Underwriter
                  </span>
                ) : routing === 'STP' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="size-3.5" /> Auto-approved (STP)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                    <AlertTriangle className="size-3.5" /> Referral Required
                  </span>
                )}
              </div>
              {/* UW detail */}
              {appetite && (
                <div className="px-4 pb-3 pt-2 space-y-2">
                  {anyUwRef && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50/50 px-3 py-2">
                      <p className="text-xs text-sky-700 font-medium">
                        {versionPlans.filter(p => p.handoffStatus === PlanHandoffStatus.UW_REFERRED).length} plan(s) with underwriter · Round {versionNegCount}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Authority Band</span>
                      <span className="text-xs font-semibold text-foreground">{appetite.uwAuthorityBand}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Max Discount</span>
                      <span className="text-xs font-semibold text-foreground">{appetite.maxDiscountPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Category</span>
                      <span className="text-xs font-semibold text-foreground">{appetite.category}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-3 pb-2.5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="size-3.5 text-muted-foreground" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pricing</p>
                </div>
                <button onClick={() => setVersionTab('pricing')} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  Detail <ArrowRight className="size-2.5" />
                </button>
              </div>
              {/* Overall pricing status badge */}
              <div className="px-4 pt-3 pb-1">
                {!priceRun ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-muted text-muted-foreground border-border">
                    <Info className="size-3.5" /> Not priced yet
                  </span>
                ) : priceRun.feasible ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="size-3.5" /> Priced &amp; Feasible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-red-50 text-red-600 border-red-200">
                    <XCircle className="size-3.5" /> Priced — Not Feasible
                  </span>
                )}
              </div>
              {/* Pricing detail */}
              {priceRun && (
                <div className="px-4 pb-3 pt-2">
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Technical Premium</span>
                      <span className="text-xs font-semibold text-foreground">₹{(priceRun.technicalPremium / 100000).toFixed(1)}L</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Break-even Floor</span>
                      <span className="text-xs font-semibold text-foreground">₹{(priceRun.breakEvenFloor / 100000).toFixed(1)}L</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Negotiated</span>
                      <span className="text-xs font-semibold text-foreground">₹{(priceRun.negotiatedPremium / 100000).toFixed(1)}L</span>
                    </div>
                    <div className="border-t border-border/40 pt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Model Factor (LR)</span>
                      <span className={cn('text-xs font-semibold', priceRun.modelFactor > 0.98 ? 'text-amber-600' : 'text-foreground')}>
                        {(priceRun.modelFactor * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Readiness + metadata strip */}
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 flex items-center gap-3 flex-wrap">
            {readiness.map((r) => (
              <button
                key={r.label}
                onClick={() => !r.ok && setVersionTab(r.tab)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-colors',
                  r.ok
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
                )}
              >
                {r.ok ? <Check className="size-2.5" /> : <XCircle className="size-2.5" />}
                {r.label}
              </button>
            ))}
            <span className={cn('ml-auto text-[11px] font-bold tabular-nums', readinessScore === readiness.length ? 'text-emerald-600' : 'text-muted-foreground')}>
              {readinessScore}/{readiness.length} ready
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground pb-2">
            <span><span className="font-semibold text-foreground">{formatDate(activeVersion.createdAt)}</span> created</span>
            <span className="text-border">·</span>
            <span><span className="font-semibold text-foreground">{versionPlans.length}</span> plan{versionPlans.length !== 1 ? 's' : ''}</span>
            <span className="text-border">·</span>
            <span><span className="font-semibold text-foreground">{versionNegCount}</span> neg. round{versionNegCount !== 1 ? 's' : ''}</span>
            <span className="text-border">·</span>
            <span><span className="font-semibold text-foreground">{lives.toLocaleString()}</span> lives</span>
            {activeVersion.validationReceipt && (
              <>
                <span className="text-border">·</span>
                <span className="text-emerald-600 font-semibold">Validated {formatDate(activeVersion.validationReceipt.validatedAt)}</span>
              </>
            )}
          </div>

        </div>

        {/* ── Right: Version Journey ──────────────────────────────────────── */}
        <div className="w-56 shrink-0 border-l border-border/60 overflow-y-auto bg-muted/20">
          <VersionJourney
            version={activeVersion}
            priceRun={priceRun}
            negotiationRounds={versionNegRounds}
            plans={versionPlans}
          />
        </div>

      </div>
    );
  }

  const VERSION_TABS = [
    { key: 'cockpit' as const,      label: 'Deal Cockpit', icon: LayoutDashboard },
    { key: 'plans' as const,        label: 'Plans',       icon: Activity },
    { key: 'uw' as const,           label: 'UW Eval',     icon: ShieldCheck },
    { key: 'pricing' as const,      label: 'Pricing',     icon: BarChart3 },
    { key: 'negotiation' as const,  label: 'Negotiation', icon: Scale },
    { key: 'documents' as const,    label: 'Documents',   icon: FileText },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

            {/* ── Header ──────────────────────────────────────────────────────────────────── */}
      <div className="bg-background shrink-0">

        {/* Title block */}
        <div className="flex items-start gap-2 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{employerName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {rfqId.toUpperCase()}
              {bundle.lob && <>{' · '}{bundle.lob}</>}
              {bundle.businessType && <>{' · '}{labelForBusinessType(bundle.businessType)}</>}
            </p>
          </div>
          <div className="flex items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {activeVersion && (() => {
                const sinceMs  = activeVersion.createdAt ? Date.now() - new Date(activeVersion.createdAt).getTime() : 0;
                const sinceDays = sinceMs / 86_400_000;
                const sinceLabel = sinceMs < 3_600_000
                  ? `${Math.floor(sinceMs / 60_000)}m`
                  : sinceMs < 86_400_000
                  ? `${Math.floor(sinceMs / 3_600_000)}h`
                  : `${Math.floor(sinceDays)}d`;
                const sinceCls = sinceDays < 1 ? 'text-emerald-600' : sinceDays < 3 ? 'text-amber-500' : 'text-red-500';
                const SinceTag = () => (
                  <span className={cn('text-[10px] font-semibold tabular-nums whitespace-nowrap', sinceCls)}>
                    since {sinceLabel}
                  </span>
                );
                const st = activeVersion.status;

                if (st === VersionStatus.DRAFT) {
                  if (versionPlans.length === 0) {
                    return (
                      <div className="flex items-center">
                        <Button size="sm" variant="secondary" className="h-9 text-xs gap-1.5 rounded-r-none border-r border-border/40 pr-2.5"
                          onClick={() => router.push(`/rfq2/${rfqId}/plans/new?versionId=${versionId}`)}>
                          <Plus className="size-3" /> Add plan
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="secondary" className="h-9 w-7 rounded-l-none px-0">
                              <ChevronDown className="size-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Start from a template</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {PLAN_TEMPLATES.map((t) => (
                              <DropdownMenuItem key={t.id} className="flex flex-col items-start gap-0.5 py-2.5 cursor-pointer"
                                onClick={() => router.push(`/rfq2/${rfqId}/plans/new?versionId=${versionId}&template=${t.id}`)}>
                                <span className="text-xs font-semibold text-foreground">{t.name}</span>
                                <span className="text-[11px] text-muted-foreground leading-snug">{t.description}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  }
                  return <Button size="sm" className="h-9 text-xs gap-1.5"><Send className="size-3" /> Refer to UW</Button>;
                }

                if (st === VersionStatus.UW_REFERRED) return (
                  <div className="flex items-center gap-2">
                    <SinceTag />
                    <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 opacity-60" disabled><Clock className="size-3" /> Awaiting UW</Button>
                  </div>
                );

                if (st === VersionStatus.EVALUATED)
                  return <Button size="sm" className="h-9 text-xs gap-1.5"><Calculator className="size-3" /> Request Pricing</Button>;

                if (st === VersionStatus.PRICING_REQUESTED) return (
                  <div className="flex items-center gap-2">
                    <SinceTag />
                    <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 opacity-60" disabled><Clock className="size-3" /> Awaiting Pricing</Button>
                  </div>
                );

                if (st === VersionStatus.RATED)
                  return <Button size="sm" className="h-9 text-xs gap-1.5"><Send className="size-3" /> Mark as Sent to Client</Button>;

                if (st === VersionStatus.SUBMITTED) return (
                  <div className="flex items-center gap-2">
                    <SinceTag />
                    <Button size="sm" className="h-9 text-xs gap-1.5"><Send className="size-3" /> Mark as Sent to Client</Button>
                  </div>
                );

                if (st === VersionStatus.SHARED) return (
                  <div className="flex items-center gap-2">
                    <SinceTag />
                    <Button size="sm" className="h-9 text-xs gap-1.5"><Send className="size-3" /> Mark as Sent to Broker</Button>
                  </div>
                );

                if (st === VersionStatus.SENT_TO_CLIENT) return (
                  <div className="flex items-center gap-2">
                    <SinceTag />
                    <Button size="sm" className="h-9 text-xs gap-1.5"><CheckCircle2 className="size-3" /> Mark as Accepted by Client</Button>
                  </div>
                );

                if (st === VersionStatus.SELECTED)
                  return <Button size="sm" className="h-9 text-xs gap-1.5"><Lock className="size-3" /> Freeze Version</Button>;

                if (st === VersionStatus.FROZEN)
                  return <Button size="sm" className="h-9 text-xs gap-1.5">Proceed to Issuance <ArrowRight className="size-3" /></Button>;

                if (st === VersionStatus.ARCHIVED || st === VersionStatus.WITHDRAWN)
                  return <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5"><Copy className="size-3" /> Duplicate</Button>;

                return null;
              })()}
              <Button variant="outline" size="icon" className="size-9 shrink-0 shadow-sm">
                <EllipsisVertical className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Governance meta row */}
        <div className="flex items-center justify-between px-4 pb-3 gap-4 border-b border-border/60">
          <div className="flex items-center gap-5">
            <MetaInline icon={ShieldUser} label="Owner" value={salesOwner?.name ?? '—'} />
            <MetaInline icon={User} label="Broker" value={brokerName ?? '—'} />
            <MetaInline icon={GitPullRequest} label="Versions" value={String(quoteVersions.length)} />
            <MetaInline icon={Briefcase} label="Plans" value={String(versionPlans.length)} />
          </div>
          <div className="flex items-center gap-5">
            <MetaInline icon={Calendar} label="Inception" value={bundle.createdAt ? new Date(bundle.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
            <MetaInline icon={Clock4} label="TTL" value={effectiveDate ? (() => { const d = Math.ceil((new Date(effectiveDate).getTime() - Date.now()) / 86400000); return d > 0 ? `${d}d left` : 'Expired'; })() : '—'} />
            <MetaInline icon={Clock} label="Updated" value={bundle.updatedAt ? (() => { const s = Math.floor((Date.now() - new Date(bundle.updatedAt).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; })() : '—'} />
          </div>
        </div>
      </div>

      {/* ── Body: left version list + right tabs ──────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left: version switcher */}
        <div className="w-52 shrink-0 border-r border-border/60 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 h-[56px] shrink-0 border-b border-border/40">
            <h3 className="text-sm font-semibold text-foreground">Versions</h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={() => setSortAsc((p) => !p)}
              title={sortAsc ? 'Oldest first' : 'Newest first'}
            >
              {sortAsc ? <ArrowDown01 className="size-3" /> : <ArrowDown10 className="size-3" />}
            </Button>
          </div>

          <div ref={versionsScrollRef} className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
            {sortedVersions.map((v) => {
              const priceEntry = profitability.pricedVersions.find((p) => p.versionId === v.id);
              const isActive = v.id === versionId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (versionsScrollRef.current) {
                      sessionStorage.setItem(`rfq2-vs-scroll-${rfqId}`, String(versionsScrollRef.current.scrollTop));
                    }
                    router.push(`/rfq2/${rfqId}/${v.id}`);
                  }}
                  className={cn(
                    'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/60 hover:border-border hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={cn('font-mono text-sm font-black tabular-nums', isActive ? 'text-primary' : 'text-foreground')}>
                      V{v.versionNo}
                    </span>
                    <span className={cn(
                      'text-[9px] font-semibold border rounded-full px-1.5 py-0.5 uppercase tracking-wide',
                      verStatusCls[v.status] ?? 'bg-muted text-muted-foreground',
                    )}>
                      {verStatusLabel[v.status] ?? v.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate leading-snug">{v.name}</p>
                  {priceEntry && (
                    <p className="text-[10px] font-semibold text-emerald-600 mt-0.5 tabular-nums">
                      ₹{(priceEntry.finalPremiumInclGst / 100000).toFixed(1)}L
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: tab bar + content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Tab bar — pill style */}
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-border/40">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 overflow-x-auto scrollbar-none">
              {VERSION_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVersionTab(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                    versionTab === key
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {versionTab === 'cockpit'      && <CockpitTab />}
            {versionTab === 'plans'        && (
              <PlansPanel
                rfqId={rfqId}
                versionId={versionId}
                versionNo={activeVersion?.versionNo ?? 0}
                plans={versionPlans}
                gradeAllocations={bundle.gradeAllocations?.[versionId] ?? {}}
                priceRun={priceRun}
                mphAppetite={bundle.mphAppetite}
                subsidiaries={bundle.subsidiaries}
                headcountData={bundle.headcountData}
                isFrozen={activeVersion?.status === VersionStatus.FROZEN}
              />
            )}
            {versionTab === 'uw'           && <UwTab />}
            {versionTab === 'pricing'      && <PricingTab />}
            {versionTab === 'negotiation'  && <NegotiationTabContent />}
            {versionTab === 'documents'    && <DocumentsTabContent />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VersionDetailPage() {
  const { rfqId, versionId } = useParams<{ rfqId: string; versionId: string }>();

  return (
    <RfqBundleProvider rfqId={rfqId}>
      <VersionDetailInner versionId={versionId} />
    </RfqBundleProvider>
  );
}
