// FE-derived computation utilities for the Group PAS – Group Quotation module.
// All functions are pure (no side effects, no React hooks).

import {
  type RfqBundle,
  type Plan,
  type MphAppetite,
  type HandoffTask,
  type QuoteVersion,
  type Escalation,
  GateStatus,
  MilestoneState,
  VersionStatus,
  PlanHandoffStatus,
  EscalationStatus,
  EscalationKind,
  CensusQuality,
  HandoffKind,
} from '@/lib/types';

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface Gate {
  key: string;
  label: string;
  status: GateStatus;
  detail?: string;
}

export interface GateBucket {
  bucketNo: number;
  label: string;
  gates: Gate[];
  overall: GateStatus;
}

export interface ReadinessReport {
  buckets: GateBucket[];
  issuanceReady: boolean;
  failingCount: number;
}

export type PlanRoutingStatus =
  | 'STP'
  | 'NEEDS_PRICING'
  | 'NEEDS_UW'
  | 'PRICING_REQUESTED'
  | 'UW_REFERRED'
  | 'PRICED';

export type JourneyStepStatus = 'done' | 'current' | 'blocked' | 'todo';

export interface JourneyStep {
  stepNo: number;
  label: string;
  route: string;
  status: JourneyStepStatus;
}

export interface Milestone {
  milestoneNo: number;
  label: string;
  state: MilestoneState;
}

export interface VersionProfitabilityEntry {
  versionId: string;
  finalPremiumInclGst: number;
  modelFactor: number;
}

export interface VersionProfitabilityMap {
  pricedVersions: VersionProfitabilityEntry[];
  mostCompetitiveVersionId: string | null;
  mostProfitableVersionId: string | null;
}

export interface FreezeState {
  frozenVersion: QuoteVersion | null;
  isFrozen: boolean;
  policyScreensUnlocked: boolean;
}

export interface HeadroomReport {
  latestAsk: number | null;
  effectiveAuthority: number;
  isWithinAuthority: boolean;
  overByPct: number;
  activeOverride: Escalation | null;
}

export interface GradeAllocationSummary {
  versionId: string;
  allocatedGradeCount: number;
  totalLives: number;
  unallocatedGrades: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bucketOverall(gates: Gate[]): GateStatus {
  if (gates.some((g) => g.status === GateStatus.FAIL)) return GateStatus.FAIL;
  if (gates.some((g) => g.status === GateStatus.WARN)) return GateStatus.WARN;
  return GateStatus.PASS;
}

function gate(key: string, label: string, pass: boolean, warn?: boolean, detail?: string): Gate {
  const status = !pass ? GateStatus.FAIL : warn ? GateStatus.WARN : GateStatus.PASS;
  return { key, label, status, detail };
}

// ─── 1. Readiness gates ───────────────────────────────────────────────────────

export function computeReadinessGates(bundle: RfqBundle): ReadinessReport {
  const activeVersion = bundle.quoteVersions.find((v) => v.id === bundle.activeVersionId);
  const activePlans = bundle.plans.filter((p) => p.quoteVersionId === bundle.activeVersionId);

  // Bucket 1: Quote Setup
  const bucket1Gates: Gate[] = [
    gate('biz-type', 'Business type set', !!bundle.businessType),
    gate('eff-date', 'Effective date set', !!bundle.effectiveDate),
    gate('billing-freq', 'Billing frequency set', !!bundle.policyConfig.billingFrequency),
    gate('collection', 'Collection method set', !!bundle.policyConfig.collectionMethod),
  ];

  // Bucket 2: Census & Members
  const hasMembers = bundle.members.length > 0;
  const censusQuality = bundle.censusSummary?.quality.trafficLight;
  const bucket2Gates: Gate[] = [
    gate('members', 'Members / headcount present', hasMembers, false,
      hasMembers ? undefined : 'No members loaded yet'),
    gate('census-quality', 'Census quality acceptable',
      censusQuality !== CensusQuality.R,
      censusQuality === CensusQuality.A,
      censusQuality === CensusQuality.R ? 'Census quality is Poor — clean up required' : undefined),
  ];

  // Bucket 3: Plans & Coverage
  const plansExist = activePlans.length > 0;
  const allHaveProduct = plansExist && activePlans.every((p) => !!p.productCode);
  const allHaveRateCard = plansExist && activePlans.every((p) => !!p.rateCardRef);
  const allHaveUwMethod = plansExist && activePlans.every((p) => !!p.uwMethod);
  const bucket3Gates: Gate[] = [
    gate('plans-exist', 'At least one plan defined', plansExist),
    gate('product-code', 'All plans have product code', allHaveProduct),
    gate('rate-card', 'All plans have rate card ref', allHaveRateCard),
    gate('uw-method', 'All plans have UW method', allHaveUwMethod),
  ];

  // Bucket 4: Underwriting
  const pendingUw = activePlans.filter(
    (p) => p.handoffStatus === PlanHandoffStatus.UW_REFERRED
  );
  const bucket4Gates: Gate[] = [
    gate('uw-clear', 'No plans stuck in UW referral', pendingUw.length === 0,
      false,
      pendingUw.length > 0 ? `${pendingUw.length} plan(s) awaiting UW decision` : undefined),
  ];

  // Bucket 5: Pricing & Quote Pack
  const hasPricing =
    Object.keys(bundle.actuaryPricing.byVersion).length > 0;
  const bucket5Gates: Gate[] = [
    gate('pricing', 'Pricing available for at least one version', hasPricing,
      false,
      hasPricing ? undefined : 'No pricing run published yet'),
    gate('active-version', 'Active version exists', !!activeVersion),
  ];

  const buckets: GateBucket[] = [
    { bucketNo: 1, label: 'Quote Setup', gates: bucket1Gates, overall: bucketOverall(bucket1Gates) },
    { bucketNo: 2, label: 'Census & Members', gates: bucket2Gates, overall: bucketOverall(bucket2Gates) },
    { bucketNo: 3, label: 'Plans & Coverage', gates: bucket3Gates, overall: bucketOverall(bucket3Gates) },
    { bucketNo: 4, label: 'Underwriting', gates: bucket4Gates, overall: bucketOverall(bucket4Gates) },
    { bucketNo: 5, label: 'Pricing & Quote Pack', gates: bucket5Gates, overall: bucketOverall(bucket5Gates) },
  ];

  const failingCount = buckets.filter((b) => b.overall === GateStatus.FAIL).length;
  const issuanceReady = failingCount === 0;

  return { buckets, issuanceReady, failingCount };
}

// ─── 2. Plan routing status ───────────────────────────────────────────────────

export function computePlanRoutingStatus(
  plan: Plan,
  appetite: MphAppetite | undefined,
  tasks: HandoffTask[]
): PlanRoutingStatus {
  if (plan.handoffStatus === PlanHandoffStatus.PRICED) return 'PRICED';
  if (plan.handoffStatus === PlanHandoffStatus.UW_REFERRED) return 'UW_REFERRED';
  if (plan.handoffStatus === PlanHandoffStatus.PRICING_REQUESTED) return 'PRICING_REQUESTED';
  if (plan.handoffStatus === PlanHandoffStatus.RETURNED) return 'NEEDS_PRICING';

  // DRAFT plan — check if it needs UW or can go STP
  const openTask = tasks.find(
    (t) => t.planId === plan.planId && t.kind === HandoffKind.ACTUARY
  );
  if (openTask) return 'PRICING_REQUESTED';

  // If no appetite or completeness below 80, it needs pricing setup
  if (!plan.productCode || !plan.rateCardRef || !plan.uwMethod) return 'NEEDS_PRICING';

  // STP requires BOTH: pre-approved card AND sales-level UW authority
  if (appetite && plan.completeness >= 80) {
    const cardMatch = plan.rateCardRef === appetite.preapprovedCardRef;
    const hasSalesAuthority = appetite.uwAuthorityBand === 'sales' || appetite.uwAuthorityBand === 'auto';

    if (cardMatch && hasSalesAuthority) return 'STP';

    // One condition met but not both → still needs UW/pricing
    if (!cardMatch) return 'NEEDS_UW';  // rate card mismatch
    if (!hasSalesAuthority) return 'NEEDS_UW';  // UW authority requires referral
  }

  return 'NEEDS_PRICING';
}

// ─── 3. Journey steps ────────────────────────────────────────────────────────

const JOURNEY_STEP_DEFS: Array<{ label: string; routeKey: string }> = [
  { label: 'Quote Key Data', routeKey: 'key-data' },
  { label: 'MPH Categorisation', routeKey: 'additional-info' },
  { label: 'Subsidiaries', routeKey: 'subsidiaries' },
  { label: 'Census Workbench', routeKey: 'census-workbench' },
  { label: 'Members', routeKey: 'members' },
  { label: 'Headcount', routeKey: 'headcount' },
  { label: 'Claims Experience', routeKey: 'claims-experience' },
  { label: 'Deal Profile', routeKey: 'profile' },
  { label: 'Quote Versions', routeKey: 'versions' },
  { label: 'Plans', routeKey: 'plans' },
  { label: 'New Plan', routeKey: 'plans/new' },
  { label: 'Commercial Rate Card', routeKey: 'commercial-rate-card' },
  { label: 'Scenarios', routeKey: 'scenarios' },
  { label: 'Sales Dispatch', routeKey: 'sales-dispatch' },
  { label: 'Negotiation', routeKey: 'negotiation' },
  { label: 'Policy Config', routeKey: 'policy-config' },
  { label: 'Policy Details', routeKey: 'policy-details' },
  { label: 'Policy Flags', routeKey: 'policy-flags' },
  { label: 'Documents', routeKey: 'documents' },
  { label: 'Quote Pack', routeKey: 'quote-pack' },
  { label: 'Quote Letter', routeKey: 'quote-letter' },
  { label: 'Sign & Issue', routeKey: 'issuance' },
  { label: 'Final Placement', routeKey: 'final-placement' },
];

export function computeJourneySteps(
  bundle: RfqBundle,
  currentPath: string
): JourneyStep[] {
  const base = `/rfqs/${bundle.rfqId}`;
  const hasPricing = Object.keys(bundle.actuaryPricing.byVersion).length > 0;
  const frozenVersion = bundle.quoteVersions.find(
    (v) => v.status === VersionStatus.FROZEN || v.status === VersionStatus.SELECTED
  );
  const policyUnlocked = !!frozenVersion && hasPricing;

  // Determine which steps are "done" by RFQ status progression
  const statusOrder = [
    'DATA_PENDING', 'CENSUS_CLEANED', 'EXPERIENCE_NORMALIZED', 'BENEFITS_READY',
    'PRICING', 'PRICING_IN_PROGRESS', 'UW_REVIEW', 'QUOTE_GENERATED',
    'SHARED', 'NEGOTIATION', 'FINAL', 'ISSUED', 'REJECTED',
  ];
  const currentStatusIdx = statusOrder.indexOf(bundle.statusStage);

  return JOURNEY_STEP_DEFS.map((def, idx) => {
    const stepNo = idx + 1;
    const route = `${base}/${def.routeKey}`;
    const isCurrent = currentPath.includes(`/${def.routeKey}`);

    // Policy screens are blocked until freeze
    const isPolicyScreen = stepNo >= 16 && stepNo <= 23;
    if (isPolicyScreen && !policyUnlocked) {
      return { stepNo, label: def.label, route, status: 'blocked' as JourneyStepStatus };
    }

    if (isCurrent) return { stepNo, label: def.label, route, status: 'current' };

    // Rough heuristic: steps completed by status progression
    const completedByStatus = currentStatusIdx >= Math.floor(stepNo * 0.6);
    if (completedByStatus) return { stepNo, label: def.label, route, status: 'done' };

    return { stepNo, label: def.label, route, status: 'todo' };
  });
}

// ─── 4. Milestone spine ───────────────────────────────────────────────────────

const MILESTONE_DEFS = [
  { n: 0, label: 'Data In' },
  { n: 1, label: 'Census' },
  { n: 2, label: 'Experience' },
  { n: 3, label: 'Benefits' },
  { n: 4, label: 'Pricing Req.' },
  { n: 5, label: 'Pricing' },
  { n: 6, label: 'UW Review' },
  { n: 7, label: 'Quote Out' },
  { n: 8, label: 'Shared' },
  { n: 9, label: 'Negotiation' },
  { n: 10, label: 'Issuance' },
  { n: 11, label: 'Placement' },
];

const STATUS_TO_MILESTONE: Record<string, number> = {
  DATA_PENDING: 0,
  CENSUS_CLEANED: 1,
  EXPERIENCE_NORMALIZED: 2,
  BENEFITS_READY: 3,
  PRICING: 4,
  PRICING_IN_PROGRESS: 5,
  UW_REVIEW: 6,
  QUOTE_GENERATED: 7,
  SHARED: 8,
  NEGOTIATION: 9,
  FINAL: 10,
  ISSUED: 11,
  REJECTED: 9,
};

export function computeMilestoneSpine(bundle: RfqBundle): Milestone[] {
  const currentMilestone = STATUS_TO_MILESTONE[bundle.statusStage] ?? 0;
  return MILESTONE_DEFS.map(({ n, label }) => {
    let state: MilestoneState;
    if (n < currentMilestone) state = MilestoneState.DONE;
    else if (n === currentMilestone) state = MilestoneState.IN_PROGRESS;
    else if (n > 9) state = MilestoneState.TODO; // M10-M11 always TODO in quotation module
    else state = MilestoneState.TODO;
    return { milestoneNo: n, label, state };
  });
}

// ─── 5. Version profitability ─────────────────────────────────────────────────

export function computeVersionProfitability(bundle: RfqBundle): VersionProfitabilityMap {
  const pricedVersions: VersionProfitabilityEntry[] = Object.entries(
    bundle.actuaryPricing.byVersion
  ).map(([versionId, run]) => ({
    versionId,
    finalPremiumInclGst: run.finalPremiumInclGst,
    modelFactor: run.modelFactor,
  }));

  if (pricedVersions.length < 2) {
    return {
      pricedVersions,
      mostCompetitiveVersionId: pricedVersions[0]?.versionId ?? null,
      mostProfitableVersionId: pricedVersions[0]?.versionId ?? null,
    };
  }

  const mostCompetitive = pricedVersions.reduce((a, b) =>
    a.finalPremiumInclGst <= b.finalPremiumInclGst ? a : b
  );
  const mostProfitable = pricedVersions.reduce((a, b) =>
    a.modelFactor >= b.modelFactor ? a : b
  );

  return {
    pricedVersions,
    mostCompetitiveVersionId: mostCompetitive.versionId,
    mostProfitableVersionId: mostProfitable.versionId,
  };
}

// ─── 6. Freeze state ──────────────────────────────────────────────────────────

export function computeFreezeState(bundle: RfqBundle): FreezeState {
  const frozenVersion =
    bundle.quoteVersions.find(
      (v) => v.status === VersionStatus.FROZEN || v.status === VersionStatus.SELECTED
    ) ?? null;

  const hasPricing = Object.keys(bundle.actuaryPricing.byVersion).length > 0;
  const isFrozen = !!frozenVersion;
  const policyScreensUnlocked = isFrozen && hasPricing;

  return { frozenVersion, isFrozen, policyScreensUnlocked };
}

// ─── 7. Negotiation headroom ──────────────────────────────────────────────────

export function computeNegotiationHeadroom(
  bundle: RfqBundle,
  escalations: Escalation[]
): HeadroomReport {
  const log = bundle.negotiationLog;
  const latestBrokerRound = [...log]
    .reverse()
    .find((r) => r.party === 'BROKER');
  const latestAsk = latestBrokerRound?.askDiscountPct ?? null;

  const baseAuthority = bundle.mphAppetite?.maxDiscountPct ?? 0;

  const activeOverride =
    escalations.find(
      (e) =>
        e.rfqId === bundle.rfqId &&
        e.kind === EscalationKind.EXTRA_DISCOUNT &&
        e.status === EscalationStatus.APPROVED
    ) ?? null;

  const overrideExtra = activeOverride?.askedPct ?? 0;
  const effectiveAuthority = Math.max(baseAuthority, overrideExtra);

  const isWithinAuthority =
    latestAsk === null ? true : latestAsk <= effectiveAuthority;
  const overByPct =
    latestAsk !== null && latestAsk > effectiveAuthority
      ? latestAsk - effectiveAuthority
      : 0;

  return { latestAsk, effectiveAuthority, isWithinAuthority, overByPct, activeOverride };
}

// ─── 8. Grade allocation summary ─────────────────────────────────────────────

export function computeGradeAllocationSummary(bundle: RfqBundle): GradeAllocationSummary {
  const versionId = bundle.activeVersionId;
  const allocations = bundle.gradeAllocations[versionId] ?? {};
  const allocatedGradeCount = Object.keys(allocations).length;

  // Derive total lives from members (unique grades × avg lives per grade, fallback to censusSummary)
  const gradeGroups: Record<string, number> = {};
  for (const member of bundle.members) {
    gradeGroups[member.grade] = (gradeGroups[member.grade] ?? 0) + 1;
  }

  const totalLives =
    bundle.members.length > 0
      ? bundle.members.length
      : bundle.censusSummary?.totalLives ?? 0;

  // Unallocated = grade keys that appear in members but not in allocations
  const memberGrades = [...new Set(bundle.members.map((m) => m.grade))];
  const unallocatedGrades = memberGrades.filter((g) => !allocations[g]);

  return { versionId, allocatedGradeCount, totalLives, unallocatedGrades };
}

// ─── 9. Plan completeness ─────────────────────────────────────────────────────

export function computePlanCompleteness(plan: Plan): number {
  const checks = [
    !!plan.productCode,
    !!plan.sumAssuredBasis,
    !!plan.eligibilityCriteria,
    !!plan.uwMethod,
    !!plan.rateCardRef,
    plan.benefits.length > 0,
  ];
  const score = checks.filter(Boolean).length;
  return Math.round((score / checks.length) * 100);
}
