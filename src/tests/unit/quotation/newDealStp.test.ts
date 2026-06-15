/**
 * Test Suite 1 — New Deal STP
 *
 * Tests the pure computation layer for readiness gates and freeze state
 * using minimal RfqBundle fixtures that mirror the MSW seed data shape.
 */

import {
  computeReadinessGates,
  computeFreezeState,
} from '@/lib/computations';
import {
  CensusQuality,
  GateStatus,
  PlanHandoffStatus,
  VersionStatus,
  type RfqBundle,
  type Plan,
  type QuoteVersion,
} from '@/lib/types';

// ─── Minimal fixtures ────────────────────────────────────────────────────────

function makeBundle(overrides: Partial<RfqBundle> = {}): RfqBundle {
  return {
    rfqId: 'rfq-test',
    employerName: 'Test Corp',
    statusStage: 'DATA_PENDING' as RfqBundle['statusStage'],
    businessType: 'NEW' as RfqBundle['businessType'],
    schemeType: 'STANDARD' as RfqBundle['schemeType'],
    lob: 'GTL' as RfqBundle['lob'],
    participationType: 'COMPULSORY' as RfqBundle['participationType'],
    schemeUsage: 'PRIMARY' as RfqBundle['schemeUsage'],
    sumAssuredBasis: 'FLAT' as RfqBundle['sumAssuredBasis'],
    coverPattern: 'EMPLOYEE_ONLY' as RfqBundle['coverPattern'],
    termBasis: 'ANNUAL' as RfqBundle['termBasis'],
    livesCovered: 'ALL_EMPLOYEES' as RfqBundle['livesCovered'],
    activeVersionId: 'ver-001',
    quoteVersions: [
      {
        id: 'ver-001',
        versionNo: 1,
        name: 'v1',
        status: VersionStatus.DRAFT,
        createdAt: '2026-01-01T00:00:00Z',
      } satisfies QuoteVersion,
    ],
    policyConfig: {
      gracePeriodDays: 30,
      billingFrequency: 'ANNUAL',
      collectionMethod: 'CHEQUE',
      subsidiariesEnabled: false,
    },
    defaultPlanStructure: {
      planStructure: 'STANDARD' as RfqBundle['defaultPlanStructure']['planStructure'],
      sumAssuredBasis: 'FLAT' as RfqBundle['sumAssuredBasis'],
      gradeMapping: false,
      pricingBasis: 'STANDARD' as RfqBundle['defaultPlanStructure']['pricingBasis'],
    },
    negotiationLog: [],
    gradeAllocations: {},
    actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: 'NONE' as RfqBundle['fclPolicy']['quoteDefault'], byVersion: {} },
    plans: [],
    members: [],
    subsidiaries: [],
    documents: [],
    updatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePlan(id: string, overrides: Partial<Plan> = {}): Plan {
  return {
    planId: id,
    rfqId: 'rfq-test',
    quoteVersionId: 'ver-001',
    name: `Plan ${id}`,
    handoffStatus: PlanHandoffStatus.DRAFT,
    benefits: [],
    excludedClauses: [],
    completeness: 0,
    sumAssuredBasis: 'FLAT' as Plan['sumAssuredBasis'],
    coverPattern: 'EMPLOYEE_ONLY' as Plan['coverPattern'],
    ...overrides,
  };
}

// ─── computeReadinessGates ────────────────────────────────────────────────────

describe('computeReadinessGates', () => {
  it('returns issuanceReady=false for a bare bundle with no members, no pricing, no plans', () => {
    const bundle = makeBundle();
    const report = computeReadinessGates(bundle);
    expect(report.issuanceReady).toBe(false);
    expect(report.failingCount).toBeGreaterThan(0);
  });

  it('census quality bucket FAILS when censusSummary quality is Poor (R)', () => {
    const bundle = makeBundle({
      censusSummary: { totalLives: 50, quality: { trafficLight: CensusQuality.R } },
    });
    const report = computeReadinessGates(bundle);
    const censusBucket = report.buckets.find((b) => b.label === 'Census & Members');
    expect(censusBucket?.overall).toBe(GateStatus.FAIL);
  });

  it('census quality bucket WARNs when quality is Average (A)', () => {
    const bundle = makeBundle({
      members: [
        { memberNumber: 'M001', rfqId: 'rfq-test', name: 'A', dateOfBirth: '1990-01-01', gender: 'M', grade: 'G1', salary: 500000, sumAssured: 1000000, coverages: [] },
      ],
      censusSummary: { totalLives: 1, quality: { trafficLight: CensusQuality.A } },
    });
    const report = computeReadinessGates(bundle);
    const censusBucket = report.buckets.find((b) => b.label === 'Census & Members');
    const censusQualityGate = censusBucket?.gates.find((g) => g.key === 'census-quality');
    expect(censusQualityGate?.status).toBe(GateStatus.WARN);
  });

  it('returns issuanceReady=true when all gates pass', () => {
    const pricedPlan = makePlan('plan-001', {
      productCode: 'GTL',
      rateCardRef: 'RC-001',
      uwMethod: 'STANDARD',
      handoffStatus: PlanHandoffStatus.PRICED,
      completeness: 100,
    });

    const bundle = makeBundle({
      effectiveDate: '2026-07-01',
      members: [
        { memberNumber: 'M001', rfqId: 'rfq-test', name: 'A', dateOfBirth: '1990-01-01', gender: 'M', grade: 'G1', salary: 500000, sumAssured: 1000000, coverages: [] },
      ],
      censusSummary: { totalLives: 1, quality: { trafficLight: CensusQuality.G } },
      plans: [pricedPlan],
      actuaryPricing: {
        byVersion: {
          'ver-001': {
            technicalPremium: 1000,
            breakEvenFloor: 800,
            negotiatedPremium: 900,
            modelFactor: 1.0,
            feasible: true,
            finalPremiumInclGst: 1080,
            perLifePremium: 1080,
            lives: 1,
            pricedAt: '2026-06-01T00:00:00Z',
            byPlan: {},
          },
        },
      },
    });

    const report = computeReadinessGates(bundle);
    expect(report.issuanceReady).toBe(true);
    expect(report.failingCount).toBe(0);
  });

  it('UW bucket FAILs when a plan is stuck in UW_REFERRED', () => {
    const uwPlan = makePlan('plan-uw', {
      productCode: 'GTL',
      rateCardRef: 'RC-001',
      uwMethod: 'STANDARD',
      handoffStatus: PlanHandoffStatus.UW_REFERRED,
    });
    const bundle = makeBundle({ plans: [uwPlan] });
    const report = computeReadinessGates(bundle);
    const uwBucket = report.buckets.find((b) => b.label === 'Underwriting');
    expect(uwBucket?.overall).toBe(GateStatus.FAIL);
  });
});

// ─── computeFreezeState ───────────────────────────────────────────────────────

describe('computeFreezeState', () => {
  it('returns isFrozen=false and policyScreensUnlocked=false for a DRAFT version', () => {
    const bundle = makeBundle(); // version is DRAFT by default
    const state = computeFreezeState(bundle);
    expect(state.isFrozen).toBe(false);
    expect(state.frozenVersion).toBeNull();
    expect(state.policyScreensUnlocked).toBe(false);
  });

  it('returns isFrozen=true and policyScreensUnlocked=true when a FROZEN version with pricing exists', () => {
    const frozenVersion: QuoteVersion = {
      id: 'ver-001',
      versionNo: 1,
      name: 'v1',
      status: VersionStatus.FROZEN,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const bundle = makeBundle({
      quoteVersions: [frozenVersion],
      actuaryPricing: {
        byVersion: {
          'ver-001': {
            technicalPremium: 1000,
            breakEvenFloor: 800,
            negotiatedPremium: 900,
            modelFactor: 1.0,
            feasible: true,
            finalPremiumInclGst: 1080,
            perLifePremium: 1080,
            lives: 10,
            pricedAt: '2026-06-01T00:00:00Z',
            byPlan: {},
          },
        },
      },
    });
    const state = computeFreezeState(bundle);
    expect(state.isFrozen).toBe(true);
    expect(state.frozenVersion?.id).toBe('ver-001');
    expect(state.policyScreensUnlocked).toBe(true);
  });

  it('returns policyScreensUnlocked=false when frozen but no pricing', () => {
    const frozenVersion: QuoteVersion = {
      id: 'ver-001',
      versionNo: 1,
      name: 'v1',
      status: VersionStatus.FROZEN,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const bundle = makeBundle({
      quoteVersions: [frozenVersion],
      // no pricing
    });
    const state = computeFreezeState(bundle);
    expect(state.isFrozen).toBe(true);
    expect(state.policyScreensUnlocked).toBe(false);
  });

  it('recognises SELECTED versions as frozen', () => {
    const selectedVersion: QuoteVersion = {
      id: 'ver-001',
      versionNo: 1,
      name: 'v1',
      status: VersionStatus.SELECTED,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const bundle = makeBundle({ quoteVersions: [selectedVersion] });
    const state = computeFreezeState(bundle);
    expect(state.isFrozen).toBe(true);
  });
});
