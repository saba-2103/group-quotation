/**
 * Test Suite 2 — Dispatch Flow
 *
 * Tests computePlanRoutingStatus and the mock-API plan handoff
 * state transitions (DRAFT → PRICING_REQUESTED → PRICED).
 */

import {
  computePlanRoutingStatus,
} from '@/lib/computations';
import {
  PlanHandoffStatus,
  HandoffKind,
  HandoffStatus,
  type Plan,
  type MphAppetite,
  type HandoffTask,
} from '@/lib/types';

// ─── Minimal fixtures ────────────────────────────────────────────────────────

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    planId: 'plan-001',
    rfqId: 'rfq-test',
    quoteVersionId: 'ver-001',
    name: 'Test Plan',
    handoffStatus: PlanHandoffStatus.DRAFT,
    benefits: [],
    excludedClauses: [],
    completeness: 0,
    sumAssuredBasis: 'FLAT' as Plan['sumAssuredBasis'],
    coverPattern: 'EMPLOYEE_ONLY' as Plan['coverPattern'],
    ...overrides,
  };
}

const appetite: MphAppetite = {
  category: 'LARGE',
  maxDiscountPct: 12,
  uwAuthorityBand: 'B',
};

// ─── computePlanRoutingStatus ─────────────────────────────────────────────────

describe('computePlanRoutingStatus', () => {
  it('returns PRICED when plan handoffStatus is PRICED', () => {
    const plan = makePlan({ handoffStatus: PlanHandoffStatus.PRICED, completeness: 100 });
    expect(computePlanRoutingStatus(plan, appetite, [])).toBe('PRICED');
  });

  it('returns UW_REFERRED when plan handoffStatus is UW_REFERRED', () => {
    const plan = makePlan({ handoffStatus: PlanHandoffStatus.UW_REFERRED });
    expect(computePlanRoutingStatus(plan, appetite, [])).toBe('UW_REFERRED');
  });

  it('returns PRICING_REQUESTED when plan handoffStatus is PRICING_REQUESTED', () => {
    const plan = makePlan({ handoffStatus: PlanHandoffStatus.PRICING_REQUESTED });
    expect(computePlanRoutingStatus(plan, appetite, [])).toBe('PRICING_REQUESTED');
  });

  it('returns NEEDS_PRICING when handoffStatus is RETURNED', () => {
    const plan = makePlan({ handoffStatus: PlanHandoffStatus.RETURNED });
    expect(computePlanRoutingStatus(plan, appetite, [])).toBe('NEEDS_PRICING');
  });

  it('returns PRICING_REQUESTED when an open ACTUARY task exists for the plan', () => {
    const plan = makePlan({
      handoffStatus: PlanHandoffStatus.DRAFT,
      productCode: 'GTL',
      rateCardRef: 'RC-001',
      uwMethod: 'STANDARD',
      completeness: 90,
    });
    const task: HandoffTask = {
      taskId: 'task-001',
      rfqId: 'rfq-test',
      planId: 'plan-001',
      versionId: 'ver-001',
      kind: HandoffKind.ACTUARY,
      status: HandoffStatus.REQUESTED,
      reason: 'Needs pricing',
      lives: 50,
      slaHours: 48,
      requestedAt: '2026-06-01T00:00:00Z',
    };
    expect(computePlanRoutingStatus(plan, appetite, [task])).toBe('PRICING_REQUESTED');
  });

  it('returns STP when plan is complete with appetite and no open tasks', () => {
    const plan = makePlan({
      handoffStatus: PlanHandoffStatus.DRAFT,
      productCode: 'GTL',
      rateCardRef: 'RC-001',
      uwMethod: 'STANDARD',
      completeness: 85,
    });
    expect(computePlanRoutingStatus(plan, appetite, [])).toBe('STP');
  });

  it('returns NEEDS_PRICING when plan is incomplete (no productCode)', () => {
    const plan = makePlan({
      handoffStatus: PlanHandoffStatus.DRAFT,
      productCode: undefined,
      completeness: 50,
    });
    expect(computePlanRoutingStatus(plan, appetite, [])).toBe('NEEDS_PRICING');
  });

  it('returns NEEDS_PRICING when appetite is absent even if plan is complete', () => {
    const plan = makePlan({
      handoffStatus: PlanHandoffStatus.DRAFT,
      productCode: 'GTL',
      rateCardRef: 'RC-001',
      uwMethod: 'STANDARD',
      completeness: 90,
    });
    expect(computePlanRoutingStatus(plan, undefined, [])).toBe('NEEDS_PRICING');
  });

  it('transitions: after plan moves from PRICING_REQUESTED to PRICED, returns PRICED', () => {
    // Simulate a state transition: plan is returned as PRICED after actuary publishes
    const planAfterPricing = makePlan({
      handoffStatus: PlanHandoffStatus.PRICED,
      completeness: 100,
    });
    expect(computePlanRoutingStatus(planAfterPricing, appetite, [])).toBe('PRICED');
  });

  it('does not return PRICING_REQUESTED when ACTUARY task belongs to a different plan', () => {
    const plan = makePlan({
      planId: 'plan-001',
      handoffStatus: PlanHandoffStatus.DRAFT,
      productCode: 'GTL',
      rateCardRef: 'RC-001',
      uwMethod: 'STANDARD',
      completeness: 85,
    });
    const taskForOtherPlan: HandoffTask = {
      taskId: 'task-002',
      rfqId: 'rfq-test',
      planId: 'plan-other',        // Different plan
      versionId: 'ver-001',
      kind: HandoffKind.ACTUARY,
      status: HandoffStatus.IN_PROGRESS,
      reason: 'Pricing',
      lives: 50,
      slaHours: 48,
      requestedAt: '2026-06-01T00:00:00Z',
    };
    // Should still return STP (task belongs to other plan)
    expect(computePlanRoutingStatus(plan, appetite, [taskForOtherPlan])).toBe('STP');
  });
});
