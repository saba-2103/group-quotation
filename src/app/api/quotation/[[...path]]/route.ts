// Mock catch-all for the Quotation API (docs/spec/quotation/QuotationApi.api).
// Set GROUP_PAS_BACKEND_URL to short-circuit the mock layer and proxy to the
// live backend instead.

import type { NextRequest, NextResponse } from 'next/server';

import {
  memberQuoteToDto,
  quoteToDto,
  quoteToSummary,
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
import { nextId, scheduleTransition, store } from '@/lib/api-mock/group-pas/store';
import type {
  AggregateCensus,
  Plan,
  QuotePremium,
} from '@/types/group-pas/common';
import type {
  CensusFileFormat,
  QuoteSummaryDto,
} from '@/types/group-pas/quotation';

type RouteContext = { params: Promise<{ path?: string[] }> };

// Helper — find by id with mutation.
function findQuote(id: string) {
  return store.quotes.find((q) => q.id === id);
}

// Auto-creates a Proposal entry when a Quote is finalized (mirrors the W2
// trigger documented in the issuance domain). Appends to the issuance store so
// `GET /api/issuance/proposals/by-quote/:quoteId` returns 200 once the Quote
// transitions to FINALIZED.
function autoCreateProposalFromQuote(quoteId: string) {
  const quote = findQuote(quoteId);
  if (!quote) return;
  // Skip if already created (idempotent).
  if (store.proposals.some((p) => p.quoteId === quoteId)) return;
  store.proposals.push({
    id: nextId('PRO'),
    quoteId,
    clientId: quote.clientId,
    policyType: quote.policyType,
    state: 'DRAFT',
    plans: quote.plans,
    memberToPlanMapping: quote.memberToPlanMapping ?? '',
    aggregateCensus:
      quote.aggregateCensus ?? { headcount: 0, planBreakdown: [] },
    estimatedPremium:
      quote.premium ?? {
        amount: { amount: 0, currency: 'INR' },
        breakup: [],
      },
  });
}

const ENUM_VALUES: Record<string, string[]> = {
  PolicyType: ['GTL', 'GCL', 'GH'],
  PremiumType: ['ANNUAL', 'SINGLE'],
  AgeDefinitionRule: ['ALB', 'ANB', 'COMPLETED_YEARS'],
  RiskTermClassification: [
    'YEARLY_RENEWABLE',
    'LONG_TERM',
    'SINGLE_PREMIUM',
    'LIMITED_PAY',
    'MASS_MARKET',
    'TAILOR_MADE',
  ],
  CensusFileType: ['CSV', 'XLSX'],
  Currency: ['INR', 'USD'],
  QuoteStatus: [
    'DRAFT',
    'SUBMITTED',
    'SENT_TO_CLIENT',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'EXPIRED',
    'FINALIZED',
  ],
};

const routes: RouteEntry[] = [
  // ── Common ──
  {
    method: 'GET',
    pattern: 'enums/:enumType',
    handler: (req, params) => {
      const search = req.nextUrl.searchParams.get('search')?.toLowerCase() ?? '';
      const values = ENUM_VALUES[params.enumType] ?? [];
      return json(
        search ? values.filter((v) => v.toLowerCase().includes(search)) : values,
      );
    },
  },
  {
    method: 'POST',
    pattern: 'files/upload-url',
    handler: async (req) => {
      const body = await readJson<{ fileName: string; contentType: string }>(req);
      const fileId = nextId('FILE');
      return json({
        uploadUrl: `/api/_mock/uploads/${encodeURIComponent(body?.fileName ?? fileId)}`,
        fileId,
      });
    },
  },
  {
    method: 'POST',
    pattern: 'files/download-url',
    handler: async (req) => {
      const body = await readJson<{ fileId: string }>(req);
      return json({
        downloadUrl: `/api/_mock/downloads/${encodeURIComponent(body?.fileId ?? 'file')}`,
      });
    },
  },

  // ── Quote — list / search endpoints (must precede /quotes/:quoteId) ──
  {
    method: 'GET',
    pattern: 'quotes/by-client',
    handler: (req) => {
      const clientId = req.nextUrl.searchParams.get('clientId');
      const list = clientId
        ? store.quotes.filter((q) => q.clientId === clientId)
        : store.quotes;
      return json(list.map(quoteToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'quotes/by-status',
    handler: (req) => {
      const status = req.nextUrl.searchParams.get('status');
      const list = status
        ? store.quotes.filter((q) => q.status === status)
        : store.quotes;
      return json(list.map(quoteToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'quotes/search',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const clientId = sp.get('clientId');
      const status = sp.get('status');
      const policyType = sp.get('policyType');
      const page = Number(sp.get('page') ?? '0');
      const size = Number(sp.get('size') ?? '20');
      const filtered = store.quotes.filter(
        (q) =>
          (!clientId || q.clientId === clientId) &&
          (!status || q.status === status) &&
          (!policyType || q.policyType === policyType),
      );
      const start = page * size;
      const slice = filtered.slice(start, start + size);
      return json(slice.map(quoteToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'quotes/list',
    handler: (req) => {
      const page = Number(req.nextUrl.searchParams.get('page') ?? '0');
      const size = Number(req.nextUrl.searchParams.get('size') ?? '20');
      const start = page * size;
      const slice = store.quotes.slice(start, start + size);
      const summaries: QuoteSummaryDto[] = slice.map(quoteToSummary);
      return json(summaries);
    },
  },

  // ── Quote — by id ──
  {
    method: 'GET',
    pattern: 'quotes/:quoteId',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound(`quotes/${params.quoteId}`);
      return json(quoteToDto(q));
    },
  },
  {
    method: 'POST',
    pattern: 'quotes',
    handler: async (req) => {
      const body = await readJson<{ clientId: string; policyType: string }>(req);
      const id = nextId('QTE');
      store.quotes.push({
        id,
        clientId: body?.clientId ?? '',
        policyType: (body?.policyType as 'GTL' | 'GCL' | 'GH') ?? 'GTL',
        status: 'DRAFT',
        plans: [],
      });
      return json({ quoteId: id });
    },
  },
  {
    method: 'PUT',
    pattern: 'quotes/:quoteId/policy-detail',
    handler: async (req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound(`quotes/${params.quoteId}/policy-detail`);
      const body = await readJson<{
        premiumType?: 'ANNUAL' | 'SINGLE';
        effectiveDate?: string;
        expiryDate?: string;
        inceptionDate?: string;
        ageDefinitionRule?: 'ALB' | 'ANB' | 'COMPLETED_YEARS';
        riskTermClassification?: string;
        lineOfBusiness?: string;
      }>(req);
      if (body) Object.assign(q, body);
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/plans',
    handler: async (req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound(`quotes/${params.quoteId}/plans`);
      const plan = await readJson<Plan>(req);
      if (plan) q.plans.push(plan);
      return ok();
    },
  },
  {
    method: 'PUT',
    pattern: 'quotes/:quoteId/plans/:planNo',
    handler: async (req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('plans');
      const updated = await readJson<Plan>(req);
      if (updated) {
        const idx = q.plans.findIndex((p) => p.planNo === params.planNo);
        if (idx >= 0) q.plans[idx] = updated;
        else q.plans.push(updated);
      }
      return ok();
    },
  },
  {
    method: 'DELETE',
    pattern: 'quotes/:quoteId/plans/:planNo',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('plans');
      q.plans = q.plans.filter((p) => p.planNo !== params.planNo);
      return ok();
    },
  },
  {
    method: 'PUT',
    pattern: 'quotes/:quoteId/member-to-plan-mapping',
    handler: async (req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('mapping');
      const body = await readJson<{ mapping: string }>(req);
      q.memberToPlanMapping = body?.mapping ?? '';
      return ok();
    },
  },
  {
    method: 'PUT',
    pattern: 'quotes/:quoteId/aggregate-census',
    handler: async (req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('aggregate-census');
      const body = await readJson<AggregateCensus>(req);
      if (body) q.aggregateCensus = body;
      return ok();
    },
  },
  {
    method: 'PUT',
    pattern: 'quotes/:quoteId/census-file-format',
    handler: async (req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('census-file-format');
      const body = await readJson<CensusFileFormat>(req);
      if (body) q.censusFileFormat = body;
      return ok();
    },
  },

  // ── Quote — state transitions ──
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/request-price',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('request-price');
      // Simulator: backend computes the premium asynchronously.
      scheduleTransition(() => {
        const totalInr = (q.aggregateCensus?.headcount ?? 50) * 36_000;
        const premium: QuotePremium = {
          amount: { amount: totalInr, currency: 'INR' },
          breakup: q.plans.map((p) => ({
            planNo: p.planNo,
            amount: {
              amount: Math.round(totalInr / Math.max(q.plans.length, 1)),
              currency: 'INR',
            },
          })),
        };
        q.premium = premium;
      });
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/submit',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('submit');
      q.status = 'SUBMITTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/send-to-client',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('send-to-client');
      q.status = 'SENT_TO_CLIENT';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/accept',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('accept');
      q.status = 'ACCEPTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/reject',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('reject');
      q.status = 'REJECTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/withdraw',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('withdraw');
      q.status = 'WITHDRAWN';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/expire',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('expire');
      q.status = 'EXPIRED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/finalize',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('finalize');
      q.status = 'FINALIZED';
      // Async W2 trigger: a Proposal materialises shortly after finalize.
      scheduleTransition(() => autoCreateProposalFromQuote(q.id));
      return ok();
    },
  },

  // ── UI-only maker-checker overlay (not in DSL) ──
  // POST sets, DELETE clears `awaitingApproval` on a Quote. Removed once the
  // backend implements real maker-checker (see context/ARCH_TRANSITION.md).
  {
    method: 'POST',
    pattern: 'quotes/:quoteId/awaiting-approval',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('awaiting-approval');
      q.awaitingApproval = true;
      return ok();
    },
  },
  {
    method: 'DELETE',
    pattern: 'quotes/:quoteId/awaiting-approval',
    handler: (_req, params) => {
      const q = findQuote(params.quoteId);
      if (!q) return notFound('awaiting-approval');
      q.awaitingApproval = false;
      return ok();
    },
  },

  // ── MemberQuote (GCL) — backend has these wired; we mirror them ──
  {
    method: 'GET',
    pattern: 'member-quotes',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const policyId = sp.get('policyId');
      const status = sp.get('status');
      const list = store.memberQuotes.filter(
        (q) =>
          (!policyId || q.policyId === policyId) &&
          (!status || q.status === status),
      );
      return json(list.map(memberQuoteToDto));
    },
  },
  {
    method: 'POST',
    pattern: 'member-quotes',
    handler: async (req) => {
      const body = await readJson<{
        policyId: string;
        name: string;
        dob?: string;
        gender?: string;
        salary?: number;
        occupation?: string;
        sumAssured?: number;
      }>(req);
      const id = nextId('MQT');
      store.memberQuotes.push({
        id,
        policyId: body?.policyId ?? '',
        status: 'DRAFT',
        memberData: {
          name: body?.name ?? '',
          dob: body?.dob,
          gender: body?.gender,
          salary: body?.salary,
          occupation: body?.occupation,
        },
        sumAssured: body?.sumAssured
          ? { amount: body.sumAssured, currency: 'INR' }
          : undefined,
      });
      return json({ memberQuoteId: id });
    },
  },
  {
    method: 'GET',
    pattern: 'member-quotes/:memberQuoteId',
    handler: (_req, params) => {
      const q = store.memberQuotes.find((x) => x.id === params.memberQuoteId);
      if (!q) return notFound(`member-quotes/${params.memberQuoteId}`);
      return json(memberQuoteToDto(q));
    },
  },
  {
    method: 'PUT',
    pattern: 'member-quotes/:memberQuoteId/premium',
    handler: async (req, params) => {
      const q = store.memberQuotes.find((x) => x.id === params.memberQuoteId);
      if (!q) return notFound('member-quote-premium');
      const body = await readJson<{
        annualPremiumAmount: number;
        currency: string;
      }>(req);
      if (body) {
        q.premium = {
          amount: { amount: body.annualPremiumAmount, currency: body.currency as 'INR' | 'USD' },
          breakup: [
            {
              productCode: 'TERM-LIFE',
              premium: { amount: body.annualPremiumAmount, currency: body.currency as 'INR' | 'USD' },
            },
          ],
        };
      }
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'member-quotes/:memberQuoteId/submit',
    handler: (_req, params) => {
      const q = store.memberQuotes.find((x) => x.id === params.memberQuoteId);
      if (!q) return notFound('member-quote-submit');
      q.status = 'SUBMITTED';
      return ok();
    },
  },
  {
    method: 'POST',
    pattern: 'member-quotes/:memberQuoteId/finalize',
    handler: (_req, params) => {
      const q = store.memberQuotes.find((x) => x.id === params.memberQuoteId);
      if (!q) return notFound('member-quote-finalize');
      q.status = 'FINALIZED';
      return ok();
    },
  },
];

async function handle(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { path = [] } = await ctx.params;
  const proxied = await proxyIfConfigured(req, ['api', 'quotation', ...path]);
  if (proxied) return proxied;
  return dispatch(req, path, routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
