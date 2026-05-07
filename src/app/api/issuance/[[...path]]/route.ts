// Mock catch-all for the Issuance API (docs/spec/issuance/IssuanceApi.api).
// Set GROUP_PAS_BACKEND_URL to short-circuit the mock layer and proxy upstream.

import type { NextRequest, NextResponse } from 'next/server';

import {
  censusRowToDto,
  censusSubmissionToDto,
  policyMemberToDto,
  policyMemberToSummary,
  proposalToDto,
  proposalToSummary,
} from '@/lib/api-mock/group-pas/dtos';
import {
  dispatch,
  json,
  notFound,
  ok,
  proxyIfConfigured,
  readJson,
  type RouteEntry,
} from '@/lib/api-mock/group-pas/http';
import {
  nextId,
  scheduleTransition,
  store,
  type MockProposal,
} from '@/lib/api-mock/group-pas/store';
import type {
  AggregateCensus,
  MemberPremium,
  Plan,
  QuotePremium,
} from '@/types/group-pas/common';
import type {
  CensusSubmission,
  PolicyMember,
  Proposal,
} from '@/types/group-pas/issuance';
import type {
  Member,
  Policy,
} from '@/types/group-pas/policy-admin';

type RouteContext = { params: Promise<{ path?: string[] }> };

function findProposal(id: string): MockProposal | undefined {
  return store.proposals.find((p) => p.id === id);
}

function findPolicyMember(id: string): PolicyMember | undefined {
  return store.policyMembers.find((m) => m.id === id);
}

// W2 step 4: Policy Admin returns the master policy after Proposal.finalize.
// Simulates that handoff by stamping policyId/policyNumber back onto the
// Proposal and creating a Policy in the PAM store.
function autoCreatePolicyForProposal(proposalId: string) {
  const p = findProposal(proposalId);
  if (!p || p.policyId) return;
  const policy: Policy = {
    id: nextId('POL'),
    policyNumber: `GTL-POL-${Date.now().toString().slice(-6)}`,
    clientId: p.clientId,
    proposalId: p.id,
    policyType: p.policyType,
    activationThreshold: 30,
    pendingReason: 'AWAITING_MIN_MEMBERS',
    state: 'PENDING',
    plans: p.plans.map((plan) => ({
      planNo: plan.planNo,
      planName: plan.planName,
      products: plan.products,
      rateCardFile: plan.rateCardFile,
      coverAmountFormula: plan.coverAmountFormula,
      freeCoverLimitFormula: plan.freeCoverLimitFormula,
    })),
    estimatedPremium: p.estimatedPremium.amount,
  };
  store.policies.push(policy);
  p.policyId = policy.id;
  p.policyNumber = policy.policyNumber;
  p.state = 'POLICY_CREATED';
}

// W3: send-for-issuance handoff — once a PolicyMember crosses to
// SENT_FOR_ISSUANCE, PAM eventually exposes a Member shell. Mocks that delay so
// `GET /api/policy-admin/members/by-policy-member/:id` returns 200 once the
// poll catches it.
function autoCreatePamMember(policyMemberId: string) {
  const pm = findPolicyMember(policyMemberId);
  if (!pm) return;
  if (store.members.some((m) => m.policyMemberId === policyMemberId)) return;
  const md = pm.memberData;
  const premium: MemberPremium = pm.premium ?? {
    annualPremium: { amount: 0, currency: 'INR' },
    breakup: [],
  };
  const member: Member = {
    id: nextId('MEM'),
    memberNumber: `M-${Date.now().toString().slice(-7)}`,
    policyId: pm.policyId,
    policyMemberId: pm.id,
    planNo: pm.planNo,
    state: 'PENDING',
    pendingReason: 'PENDING_FLOAT_RESERVATION',
    name: md.name,
    dob: md.dob ?? '',
    gender: md.gender ?? '',
    salary: md.salary ?? 0,
    occupation: md.occupation,
    sumInsured: md.sumInsured ?? 0,
    premium,
    transactionRefs: [],
  };
  store.members.push(member);
  // Mirror the PolicyMember transition that the workflow runtime would emit.
  pm.state = 'ADDED';
  pm.floatDeductionId = nextId('FLT-DED');
}

const routes: RouteEntry[] = [
  // ── Proposal — list / search (must precede /proposals/:proposalId) ──
  {
    method: 'GET',
    pattern: 'proposals/by-quote/:quoteId',
    handler: (_req, params) => {
      const p = store.proposals.find((x) => x.quoteId === params.quoteId);
      if (!p) return notFound(`proposals/by-quote/${params.quoteId}`);
      return json(proposalToDto(p));
    },
  },
  {
    method: 'GET',
    pattern: 'proposals/by-client',
    handler: (req) => {
      const clientId = req.nextUrl.searchParams.get('clientId');
      const list = clientId
        ? store.proposals.filter((p) => p.clientId === clientId)
        : store.proposals;
      return json(list.map(proposalToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'proposals/by-state',
    handler: (req) => {
      const state = req.nextUrl.searchParams.get('state');
      const list = state
        ? store.proposals.filter((p) => p.state === state)
        : store.proposals;
      return json(list.map(proposalToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'proposals/search',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const clientId = sp.get('clientId');
      const state = sp.get('state');
      const page = Number(sp.get('page') ?? '0');
      const size = Number(sp.get('size') ?? '20');
      const filtered = store.proposals.filter(
        (p) =>
          (!clientId || p.clientId === clientId) &&
          (!state || p.state === state),
      );
      return json(
        filtered.slice(page * size, page * size + size).map(proposalToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'proposals/list',
    handler: (req) => {
      const page = Number(req.nextUrl.searchParams.get('page') ?? '0');
      const size = Number(req.nextUrl.searchParams.get('size') ?? '20');
      return json(
        store.proposals
          .slice(page * size, page * size + size)
          .map(proposalToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'proposals/:proposalId',
    handler: (_req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound(`proposals/${params.proposalId}`);
      return json(proposalToDto(p));
    },
  },
  {
    method: 'POST',
    pattern: 'proposals',
    handler: async (req) => {
      const body = await readJson<{
        quoteId: string;
        clientId: string;
        policyType: string;
        plans: Plan[];
        memberToPlanMapping: string;
        aggregateCensus: AggregateCensus;
        estimatedPremium: QuotePremium;
      }>(req);
      const id = nextId('PRO');
      store.proposals.push({
        id,
        quoteId: body?.quoteId ?? '',
        clientId: body?.clientId ?? '',
        policyType: body?.policyType ?? 'GTL',
        state: 'DRAFT',
        plans: body?.plans ?? [],
        memberToPlanMapping: body?.memberToPlanMapping ?? '',
        aggregateCensus:
          body?.aggregateCensus ?? { headcount: 0, planBreakdown: [] },
        estimatedPremium:
          body?.estimatedPremium ?? {
            amount: { amount: 0, currency: 'INR' },
            breakup: [],
          },
      });
      return json({ proposalId: id });
    },
  },
  {
    method: 'PUT',
    pattern: 'proposals/:proposalId',
    handler: async (req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound(`proposals/${params.proposalId}`);
      const body = await readJson<Partial<Proposal>>(req);
      if (body) Object.assign(p, body);
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'proposals/:proposalId/submit',
    handler: (_req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound('submit');
      p.state = 'SUBMITTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'proposals/:proposalId/finalize',
    handler: (_req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound('finalize');
      p.state = 'FINALIZED';
      scheduleTransition(() => autoCreatePolicyForProposal(p.id));
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'proposals/:proposalId/cancel',
    handler: async (req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound('cancel');
      const body = await readJson<{ reason: string }>(req);
      p.state = 'CANCELLED';
      void body; // reason currently unused on the read side
      return ok();
    },
  },

  // ── UI-only maker-checker overlay (not in DSL) ──
  {
    method: 'POST',
    pattern: 'proposals/:proposalId/awaiting-approval',
    handler: (_req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound('awaiting-approval');
      p.awaitingApproval = true;
      return ok();
    },
  },
  {
    method: 'DELETE',
    pattern: 'proposals/:proposalId/awaiting-approval',
    handler: (_req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound('awaiting-approval');
      p.awaitingApproval = false;
      return ok();
    },
  },

  // ── Census submissions ──
  {
    method: 'GET',
    pattern: 'policies/:policyId/census-submissions',
    handler: (_req, params) => {
      const list = store.censusSubmissions.filter(
        (c) => c.policyId === params.policyId,
      );
      return json(list.map(censusSubmissionToDto));
    },
  },
  {
    method: 'POST',
    pattern: 'policies/:policyId/census-submissions',
    handler: (_req, params) => {
      const submission: CensusSubmission = {
        id: nextId('CSB'),
        policyId: params.policyId,
        file: { fileRef: '', sizeBytes: 0, contentHash: '' },
        status: 'INITIATED',
        totalRows: 0,
        acceptedRows: 0,
        rejectedRows: 0,
        createdMemberCount: 0,
      };
      store.censusSubmissions.push(submission);
      return json({
        submissionId: submission.id,
        uploadUrl: `/api/_mock/uploads/${encodeURIComponent(submission.id)}`,
        fileRef: `census/${params.policyId}/${submission.id}.xlsx`,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      });
    },
  },
  {
    method: 'GET',
    pattern: 'census-submissions/:submissionId',
    handler: (_req, params) => {
      const c = store.censusSubmissions.find((x) => x.id === params.submissionId);
      if (!c) return notFound(`census-submissions/${params.submissionId}`);
      return json(censusSubmissionToDto(c));
    },
  },
  {
    method: 'GET',
    pattern: 'census-submissions/:submissionId/rows',
    handler: (req, params) => {
      const status = req.nextUrl.searchParams.get('status');
      const list = store.censusRows.filter(
        (r) =>
          r.submissionId === params.submissionId &&
          (!status || r.status === status),
      );
      return json(list.map(censusRowToDto));
    },
  },
  {
    method: 'POST',
    pattern: 'census-submissions/:submissionId/ingest',
    handler: (_req, params) => {
      const c = store.censusSubmissions.find((x) => x.id === params.submissionId);
      if (!c) return notFound('ingest');
      c.status = 'INGESTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'census-submissions/:submissionId/submit',
    handler: (_req, params) => {
      const c = store.censusSubmissions.find((x) => x.id === params.submissionId);
      if (!c) return notFound('submit');
      c.status = 'SUBMITTED';
      scheduleTransition(() => {
        c.status = 'COMPLETED';
        c.createdMemberCount = c.acceptedRows;
      }, 5_000);
      return ok();
    },
  },

  // ── Proposal-scoped member shortcuts (resolve to underlying policy) ──
  // Lets the proposal-detail "Members" tab and add-member form work without
  // hardcoding the policyId. 400s if the proposal hasn't reached POLICY_CREATED
  // (no policy → can't enrol members yet).
  {
    method: 'GET',
    pattern: 'proposals/:proposalId/members',
    handler: (req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound(`proposals/${params.proposalId}/members`);
      if (!p.policyId) {
        return json(
          {
            timestamp: new Date().toISOString(),
            status: 400,
            error: 'Bad Request',
            message:
              'Proposal has no policy yet — submit and finalize first to create the master policy.',
            path: `/api/issuance/proposals/${params.proposalId}/members`,
          },
          400,
        );
      }
      const state = req.nextUrl.searchParams.get('state');
      const list = store.policyMembers.filter(
        (m) => m.policyId === p.policyId && (!state || m.state === state),
      );
      return json(list.map(policyMemberToSummary));
    },
  },
  {
    method: 'POST',
    pattern: 'proposals/:proposalId/members',
    handler: async (req, params) => {
      const p = findProposal(params.proposalId);
      if (!p) return notFound(`proposals/${params.proposalId}/members`);
      if (!p.policyId) {
        return json(
          {
            timestamp: new Date().toISOString(),
            status: 400,
            error: 'Bad Request',
            message:
              'Cannot add a member: proposal has no policy yet. Submit and finalize the proposal first.',
            path: `/api/issuance/proposals/${params.proposalId}/members`,
          },
          400,
        );
      }
      const body = await readJson<{
        memberId: string;
        planNo: string;
        name: string;
        dob?: string;
        gender?: string;
        salary?: number;
        occupation?: string;
        sumInsured: number;
      }>(req);
      const id = nextId('PMB');
      store.policyMembers.push({
        id,
        policyId: p.policyId,
        memberId: body?.memberId ?? nextId('MEM-INT'),
        planNo: body?.planNo ?? '',
        state: 'CREATED',
        memberData: {
          name: body?.name ?? '',
          dob: body?.dob,
          gender: body?.gender,
          salary: body?.salary,
          occupation: body?.occupation,
          sumInsured: body?.sumInsured,
          planNo: body?.planNo,
        },
        reclassificationCount: 0,
      });
      return json({ policyMemberId: id });
    },
  },

  // ── PolicyMember — list/search (must precede /policy-members/:id) ──
  {
    method: 'GET',
    pattern: 'policies/:policyId/members',
    handler: (_req, params) => {
      const list = store.policyMembers.filter(
        (m) => m.policyId === params.policyId,
      );
      return json(list.map(policyMemberToSummary));
    },
  },
  {
    method: 'POST',
    pattern: 'policies/:policyId/members',
    handler: async (req, params) => {
      const body = await readJson<{
        memberId: string;
        planNo: string;
        name: string;
        dob?: string;
        gender?: string;
        salary?: number;
        occupation?: string;
        sumInsured: number;
      }>(req);
      const id = nextId('PMB');
      store.policyMembers.push({
        id,
        policyId: params.policyId,
        memberId: body?.memberId ?? nextId('MEM-INT'),
        planNo: body?.planNo ?? '',
        state: 'CREATED',
        memberData: {
          name: body?.name ?? '',
          dob: body?.dob,
          gender: body?.gender,
          salary: body?.salary,
          occupation: body?.occupation,
          sumInsured: body?.sumInsured,
          planNo: body?.planNo,
        },
        reclassificationCount: 0,
      });
      return json({ policyMemberId: id });
    },
  },
  {
    method: 'GET',
    pattern: 'policies/:policyId/members/by-state',
    handler: (req, params) => {
      const state = req.nextUrl.searchParams.get('state');
      const list = store.policyMembers.filter(
        (m) =>
          m.policyId === params.policyId && (!state || m.state === state),
      );
      return json(list.map(policyMemberToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'policy-members/search',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const policyId = sp.get('policyId');
      const state = sp.get('state');
      const page = Number(sp.get('page') ?? '0');
      const size = Number(sp.get('size') ?? '20');
      const filtered = store.policyMembers.filter(
        (m) =>
          (!policyId || m.policyId === policyId) &&
          (!state || m.state === state),
      );
      return json(
        filtered
          .slice(page * size, page * size + size)
          .map(policyMemberToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'policy-members/:policyMemberId',
    handler: (_req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound(`policy-members/${params.policyMemberId}`);
      return json(policyMemberToDto(m));
    },
  },
  {
    method: 'PUT',
    pattern: 'policy-members/:policyMemberId',
    handler: async (req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('update-member');
      const body = await readJson<{
        planNo: string;
        name: string;
        dob?: string;
        gender?: string;
        salary?: number;
        occupation?: string;
        sumInsured: number;
      }>(req);
      if (body) {
        m.planNo = body.planNo;
        m.memberData = {
          name: body.name,
          dob: body.dob,
          gender: body.gender,
          salary: body.salary,
          occupation: body.occupation,
          sumInsured: body.sumInsured,
          planNo: body.planNo,
        };
        m.state = 'CREATED';
        m.premium = undefined;
      }
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/price',
    handler: (_req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('price');
      const inr = (amount: number) => ({
        annualPremium: { amount, currency: 'INR' as const },
        breakup: [{ productCode: 'TERM-LIFE', premium: { amount, currency: 'INR' as const } }],
      });
      scheduleTransition(() => {
        m.premium = inr(Math.round((m.memberData.salary ?? 1_000_000) * 0.03));
        m.state = 'PRICED';
      }, 2_500);
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/confirm-maf',
    handler: (_req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('confirm-maf');
      m.state = 'MAF_CONFIRMED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/uw/approve',
    handler: (_req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('uw-approve');
      m.uwDecision = { decision: 'APPROVED', exclusions: [] };
      m.state = 'CLASSIFYING';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/uw/reject',
    handler: async (req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('uw-reject');
      const body = await readJson<{ reason: string }>(req);
      m.uwDecision = {
        decision: 'REJECTED',
        exclusions: [],
        notes: body?.reason,
      };
      m.state = 'REJECTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/reject',
    handler: async (req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('reject');
      await readJson<{ reason: string }>(req);
      m.state = 'REJECTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/send-for-issuance',
    handler: (_req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('send-for-issuance');
      m.state = 'SENT_FOR_ISSUANCE';
      // PAM Member visibility lands shortly after the handoff.
      scheduleTransition(() => autoCreatePamMember(m.id), 4_000);
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'policy-members/:policyMemberId/archive',
    handler: async (req, params) => {
      const m = findPolicyMember(params.policyMemberId);
      if (!m) return notFound('archive');
      await readJson<{ reason: string }>(req);
      m.state = 'ARCHIVED';
      return ok();
    },
  },
];

async function handle(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { path = [] } = await ctx.params;
  const proxied = await proxyIfConfigured(req, ['api', 'issuance', ...path]);
  if (proxied) return proxied;
  return dispatch(req, path, routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
