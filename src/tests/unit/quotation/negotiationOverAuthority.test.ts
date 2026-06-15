/**
 * Test Suite 3 — Negotiation Over-Authority
 *
 * Tests computeNegotiationHeadroom and the escalationStore
 * authority-override flow using pure computation + in-memory store.
 */

import { computeNegotiationHeadroom } from '@/lib/computations';
import {
  EscalationKind,
  EscalationStatus,
  NegotiationParty,
  NegotiationKind,
  type Escalation,
  type RfqBundle,
  type MphAppetite,
  type NegotiationRound,
} from '@/lib/types';

// ─── Minimal fixtures ────────────────────────────────────────────────────────

function makeBundle(
  negotiationLog: NegotiationRound[] = [],
  appetite: MphAppetite | undefined = undefined,
  overrides: Partial<RfqBundle> = {}
): RfqBundle {
  return {
    rfqId: 'rfq-002',
    employerName: 'Bharat Steel Corp',
    statusStage: 'NEGOTIATION' as RfqBundle['statusStage'],
    businessType: 'NEW' as RfqBundle['businessType'],
    schemeType: 'STANDARD' as RfqBundle['schemeType'],
    lob: 'GTL' as RfqBundle['lob'],
    participationType: 'COMPULSORY' as RfqBundle['participationType'],
    schemeUsage: 'PRIMARY' as RfqBundle['schemeUsage'],
    sumAssuredBasis: 'FLAT' as RfqBundle['sumAssuredBasis'],
    coverPattern: 'EMPLOYEE_ONLY' as RfqBundle['coverPattern'],
    termBasis: 'ANNUAL' as RfqBundle['termBasis'],
    livesCovered: 'ALL_EMPLOYEES' as RfqBundle['livesCovered'],
    activeVersionId: 'ver-002',
    quoteVersions: [],
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
    negotiationLog,
    gradeAllocations: {},
    actuaryPricing: { byVersion: {} },
    fclPolicy: { quoteDefault: 'NONE' as RfqBundle['fclPolicy']['quoteDefault'], byVersion: {} },
    mphAppetite: appetite,
    plans: [],
    members: [],
    subsidiaries: [],
    documents: [],
    updatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── computeNegotiationHeadroom ───────────────────────────────────────────────

describe('computeNegotiationHeadroom', () => {
  const appetite: MphAppetite = {
    category: 'LARGE',
    maxDiscountPct: 12,
    uwAuthorityBand: 'B',
  };

  it('returns latestAsk=null and isWithinAuthority=true when no broker rounds exist', () => {
    const bundle = makeBundle([], appetite);
    const report = computeNegotiationHeadroom(bundle, []);
    expect(report.latestAsk).toBeNull();
    expect(report.isWithinAuthority).toBe(true);
    expect(report.overByPct).toBe(0);
    expect(report.effectiveAuthority).toBe(12);
  });

  it('returns isWithinAuthority=true when broker ask is within base authority', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 10,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
    ];
    const bundle = makeBundle(log, appetite);
    const report = computeNegotiationHeadroom(bundle, []);
    expect(report.latestAsk).toBe(10);
    expect(report.isWithinAuthority).toBe(true);
    expect(report.overByPct).toBe(0);
    expect(report.activeOverride).toBeNull();
  });

  it('returns isWithinAuthority=false and overByPct=3 when broker asks 15% vs 12% authority', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 15,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
    ];
    const bundle = makeBundle(log, appetite);
    const report = computeNegotiationHeadroom(bundle, []);
    expect(report.latestAsk).toBe(15);
    expect(report.isWithinAuthority).toBe(false);
    expect(report.overByPct).toBe(3);
    expect(report.effectiveAuthority).toBe(12);
  });

  it('takes the LATEST broker round when multiple rounds exist', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 15,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
      {
        roundNo: 2,
        party: NegotiationParty.INSURER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 11,
        by: 'usr-101',
        at: '2026-06-11T09:00:00Z',
      },
      {
        roundNo: 3,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 13,
        by: 'broker-01',
        at: '2026-06-12T08:00:00Z',
      },
    ];
    const bundle = makeBundle(log, appetite);
    const report = computeNegotiationHeadroom(bundle, []);
    // Latest broker round is round 3 with askDiscountPct=13
    expect(report.latestAsk).toBe(13);
    expect(report.isWithinAuthority).toBe(false);
    expect(report.overByPct).toBeCloseTo(1, 5);
  });

  it('returns isWithinAuthority=true after an EXTRA_DISCOUNT escalation is APPROVED', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 15,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
    ];
    const bundle = makeBundle(log, appetite);

    // Approved escalation granting 15% override
    const approvedEscalation: Escalation = {
      id: 'esc-001',
      kind: EscalationKind.EXTRA_DISCOUNT,
      rfqId: 'rfq-002',
      versionId: 'ver-002',
      subject: 'Broker asked 15%, need override',
      askedPct: 15,
      requestedBy: 'usr-101',
      requestedAt: '2026-06-10T11:00:00Z',
      decidedBy: 'usr-admin',
      decidedAt: '2026-06-10T14:00:00Z',
      status: EscalationStatus.APPROVED,
    };

    const report = computeNegotiationHeadroom(bundle, [approvedEscalation]);
    expect(report.effectiveAuthority).toBe(15); // override lifts authority to 15
    expect(report.isWithinAuthority).toBe(true);
    expect(report.overByPct).toBe(0);
    expect(report.activeOverride).not.toBeNull();
    expect(report.activeOverride?.id).toBe('esc-001');
  });

  it('does not use a PENDING escalation to raise authority', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 15,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
    ];
    const bundle = makeBundle(log, appetite);

    const pendingEscalation: Escalation = {
      id: 'esc-002',
      kind: EscalationKind.EXTRA_DISCOUNT,
      rfqId: 'rfq-002',
      subject: 'Pending extra discount',
      askedPct: 15,
      requestedBy: 'usr-101',
      requestedAt: '2026-06-10T11:00:00Z',
      status: EscalationStatus.PENDING,
    };

    const report = computeNegotiationHeadroom(bundle, [pendingEscalation]);
    expect(report.effectiveAuthority).toBe(12); // base authority only
    expect(report.isWithinAuthority).toBe(false);
    expect(report.activeOverride).toBeNull();
  });

  it('does not use a REJECTED escalation to raise authority', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 15,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
    ];
    const bundle = makeBundle(log, appetite);

    const rejectedEscalation: Escalation = {
      id: 'esc-003',
      kind: EscalationKind.EXTRA_DISCOUNT,
      rfqId: 'rfq-002',
      subject: 'Rejected extra discount',
      askedPct: 15,
      requestedBy: 'usr-101',
      requestedAt: '2026-06-10T11:00:00Z',
      decidedBy: 'usr-admin',
      decidedAt: '2026-06-10T14:00:00Z',
      status: EscalationStatus.REJECTED,
    };

    const report = computeNegotiationHeadroom(bundle, [rejectedEscalation]);
    expect(report.effectiveAuthority).toBe(12);
    expect(report.isWithinAuthority).toBe(false);
    expect(report.activeOverride).toBeNull();
  });

  it('uses effectiveAuthority=0 when no appetite is set on the bundle', () => {
    const log: NegotiationRound[] = [
      {
        roundNo: 1,
        party: NegotiationParty.BROKER,
        kind: NegotiationKind.COUNTER,
        versionId: 'ver-002',
        askDiscountPct: 5,
        by: 'broker-01',
        at: '2026-06-10T10:00:00Z',
      },
    ];
    const bundle = makeBundle(log, undefined); // no appetite
    const report = computeNegotiationHeadroom(bundle, []);
    expect(report.effectiveAuthority).toBe(0);
    expect(report.latestAsk).toBe(5);
    expect(report.isWithinAuthority).toBe(false);
  });
});
