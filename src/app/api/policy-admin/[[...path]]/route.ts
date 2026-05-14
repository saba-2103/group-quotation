// Mock catch-all for the Policy Admin API (docs/spec/policy-admin/PolicyAdminApi.api).
// Set GROUP_PAS_BACKEND_URL to short-circuit the mock layer and proxy upstream.

import type { NextRequest, NextResponse } from 'next/server';

import {
  clientToDto,
  clientToSummary,
  memberToDto,
  memberToSummary,
  policyToDto,
  policyToSummary,
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
import { nextId, store } from '@/lib/api-mock/group-pas/store';
import type { MemberPremium } from '@/types/group-pas/common';
import type {
  Client,
  ClientRegistrationData,
  Member,
  Policy,
  PolicyPlanConfig,
} from '@/types/group-pas/policy-admin';

type RouteContext = { params: Promise<{ path?: string[] }> };

const PAM_ENUM_VALUES: Record<string, string[]> = {
  PolicyState: ['CREATED', 'PENDING', 'ACTIVE', 'CANCELLED'],
  PolicyPendingReason: ['AWAITING_MIN_MEMBERS', 'AWAITING_COMPLIANCE'],
  MemberState: ['PENDING', 'ACTIVE', 'VOID', 'CANCELLED'],
  MemberPendingReason: [
    'PENDING_FLOAT_RESERVATION',
    'PENDING_APPROVAL',
    'PENDING_POLICY_ACTIVATION',
  ],
  MemberVoidReason: [
    'FLOAT_UNAVAILABLE',
    'APPROVAL_REJECTED',
    'POLICY_CANCELLED',
    'WITHDRAWN_BY_PROPOSER',
  ],
  CommunicationPreference: ['EMAIL', 'LETTER', 'PORTAL'],
};

const routes: RouteEntry[] = [
  // ── Common ──
  {
    method: 'GET',
    pattern: 'enums/:enumType',
    handler: (req, params) => {
      const search = req.nextUrl.searchParams.get('search')?.toLowerCase() ?? '';
      const values = PAM_ENUM_VALUES[params.enumType] ?? [];
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

  // ── Client list/lookup (specific paths first) ──
  {
    method: 'GET',
    pattern: 'clients/by-number/:clientNumber',
    handler: (_req, params) => {
      const c = store.clients.find(
        (x) => x.clientNumber === params.clientNumber,
      );
      if (!c) return notFound(`clients/by-number/${params.clientNumber}`);
      return json(clientToDto(c));
    },
  },
  {
    method: 'GET',
    pattern: 'clients/by-registration',
    handler: (req) => {
      const reg = req.nextUrl.searchParams.get('businessRegistrationNumber');
      const c = store.clients.find((x) => x.businessRegistrationNumber === reg);
      if (!c) return notFound('clients/by-registration');
      return json(clientToDto(c));
    },
  },
  {
    method: 'GET',
    pattern: 'clients/by-name',
    handler: (req) => {
      const name = req.nextUrl.searchParams.get('name')?.toLowerCase() ?? '';
      return json(
        store.clients
          .filter((c) => c.name.toLowerCase().includes(name))
          .map(clientToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'clients/search',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const name = sp.get('name')?.toLowerCase();
      const country = sp.get('countryCode');
      const industry = sp.get('industryCategory');
      const category = sp.get('clientCategory');
      const state = sp.get('state');
      const isVip = sp.get('isVip');
      const page = Number(sp.get('page') ?? '0');
      const size = Number(sp.get('size') ?? '20');
      const filtered = store.clients.filter(
        (c) =>
          (!name || c.name.toLowerCase().includes(name)) &&
          (!country || c.countryCode === country) &&
          (!industry || c.industryCategory === industry) &&
          (!category || c.clientCategory === category) &&
          (!state || c.state === state) &&
          (isVip === null || String(c.isVip) === isVip),
      );
      return json(
        filtered.slice(page * size, page * size + size).map(clientToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'clients/list',
    handler: (req) => {
      const page = Number(req.nextUrl.searchParams.get('page') ?? '0');
      const size = Number(req.nextUrl.searchParams.get('size') ?? '20');
      return json(
        store.clients
          .slice(page * size, page * size + size)
          .map(clientToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'clients/:clientId',
    handler: (_req, params) => {
      const c = store.clients.find((x) => x.id === params.clientId);
      if (!c) return notFound(`clients/${params.clientId}`);
      return json(clientToDto(c));
    },
  },
  {
    method: 'POST',
    pattern: 'clients',
    handler: async (req) => {
      const body = await readJson<{ registrationData: ClientRegistrationData }>(req);
      const reg = body?.registrationData;
      const id = nextId('CLI');
      const number = `C-${Date.now().toString().slice(-6)}`;
      const client: Client = {
        id,
        clientNumber: number,
        name: reg?.name ?? '',
        alternateName: reg?.alternateName,
        businessRegistrationNumber: reg?.businessRegistrationNumber ?? '',
        incorporationDate: reg?.incorporationDate,
        gstRegistrationNumber: reg?.gstRegistrationNumber,
        taxReferenceNumber: reg?.taxReferenceNumber,
        clientCategory: reg?.clientCategory,
        industryCategory: reg?.industryCategory,
        countryCode: reg?.countryCode ?? 'IN',
        communicationPreference: reg?.communicationPreference,
        clientUrl: reg?.clientUrl,
        contactPersonName: reg?.contactPersonName,
        contactPersonPhone: reg?.contactPersonPhone,
        isSubsidiary: reg?.isSubsidiary ?? false,
        isVip: reg?.isVip ?? false,
        isBlacklisted: reg?.isBlacklisted ?? false,
        effectiveDate: reg?.effectiveDate ?? new Date().toISOString().slice(0, 10),
        endDate: reg?.endDate,
        state: 'ACTIVE',
      };
      store.clients.push(client);
      return json({ clientId: id, clientNumber: number });
    },
  },

  // ── Policy list/lookup (specific paths first) ──
  {
    method: 'GET',
    pattern: 'policies/by-number/:policyNumber',
    handler: (_req, params) => {
      const p = store.policies.find(
        (x) => x.policyNumber === params.policyNumber,
      );
      if (!p) return notFound(`policies/by-number/${params.policyNumber}`);
      return json(policyToDto(p));
    },
  },
  {
    method: 'GET',
    pattern: 'policies/by-proposal/:proposalId',
    handler: (_req, params) => {
      const p = store.policies.find(
        (x) => x.proposalId === params.proposalId,
      );
      if (!p) return notFound(`policies/by-proposal/${params.proposalId}`);
      return json(policyToDto(p));
    },
  },
  {
    method: 'GET',
    pattern: 'policies/by-client',
    handler: (req) => {
      const clientId = req.nextUrl.searchParams.get('clientId');
      const list = clientId
        ? store.policies.filter((p) => p.clientId === clientId)
        : store.policies;
      return json(list.map(policyToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'policies/by-state',
    handler: (req) => {
      const state = req.nextUrl.searchParams.get('state');
      const list = state
        ? store.policies.filter((p) => p.state === state)
        : store.policies;
      return json(list.map(policyToSummary));
    },
  },
  {
    method: 'GET',
    pattern: 'policies/search',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const clientId = sp.get('clientId');
      const state = sp.get('state');
      const policyType = sp.get('policyType');
      const page = Number(sp.get('page') ?? '0');
      const size = Number(sp.get('size') ?? '20');
      const filtered = store.policies.filter(
        (p) =>
          (!clientId || p.clientId === clientId) &&
          (!state || p.state === state) &&
          (!policyType || p.policyType === policyType),
      );
      return json(
        filtered.slice(page * size, page * size + size).map(policyToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'policies/list',
    handler: (req) => {
      const page = Number(req.nextUrl.searchParams.get('page') ?? '0');
      const size = Number(req.nextUrl.searchParams.get('size') ?? '20');
      return json(
        store.policies
          .slice(page * size, page * size + size)
          .map(policyToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'policies/:policyId',
    handler: (_req, params) => {
      const p = store.policies.find((x) => x.id === params.policyId);
      if (!p) return notFound(`policies/${params.policyId}`);
      return json(policyToDto(p));
    },
  },
  {
    method: 'POST',
    pattern: 'policies',
    handler: async (req) => {
      const body = await readJson<{
        clientId: string;
        proposalId: string;
        policyType: string;
        effectiveDate?: string;
        expiryDate?: string;
        premiumType?: string;
        lineOfBusiness?: string;
        riskTermClassification?: string;
        inceptionDate?: string;
        ageDefinitionRule?: string;
        activationThreshold?: number;
        plans?: PolicyPlanConfig[];
        estimatedPremium?: { amount: number; currency: 'INR' | 'USD' };
      }>(req);
      const id = nextId('POL');
      const number = `GTL-POL-${Date.now().toString().slice(-6)}`;
      const policy: Policy = {
        id,
        policyNumber: number,
        clientId: body?.clientId ?? '',
        proposalId: body?.proposalId ?? '',
        policyType: body?.policyType ?? 'GTL',
        effectiveDate: body?.effectiveDate,
        expiryDate: body?.expiryDate,
        premiumType: body?.premiumType,
        lineOfBusiness: body?.lineOfBusiness,
        riskTermClassification: body?.riskTermClassification,
        inceptionDate: body?.inceptionDate,
        ageDefinitionRule: body?.ageDefinitionRule,
        activationThreshold: body?.activationThreshold ?? 30,
        pendingReason: 'AWAITING_MIN_MEMBERS',
        state: 'PENDING',
        plans: body?.plans ?? [],
        estimatedPremium:
          body?.estimatedPremium ?? { amount: 0, currency: 'INR' },
      };
      store.policies.push(policy);
      return json({ policyId: id, policyNumber: number });
    },
  },
  {
    method: 'POST',
    pattern: 'policies/:policyId/cancel',
    handler: async (req, params) => {
      const p = store.policies.find((x) => x.id === params.policyId);
      if (!p) return notFound(`policies/${params.policyId}/cancel`);
      await readJson<{ reason: string }>(req);
      p.state = 'CANCELLED';
      return ok();
    },
  },
  // ── Member endpoints ──
  {
    method: 'GET',
    pattern: 'members/by-number/:memberNumber',
    handler: (_req, params) => {
      const m = store.members.find(
        (x) => x.memberNumber === params.memberNumber,
      );
      if (!m) return notFound(`members/by-number/${params.memberNumber}`);
      return json(memberToDto(m));
    },
  },
  {
    method: 'GET',
    pattern: 'members/by-policy-member/:policyMemberId',
    handler: (_req, params) => {
      const m = store.members.find(
        (x) => x.policyMemberId === params.policyMemberId,
      );
      if (!m) {
        return notFound(`members/by-policy-member/${params.policyMemberId}`);
      }
      return json(memberToDto(m));
    },
  },
  {
    method: 'GET',
    pattern: 'members/search',
    handler: (req) => {
      const sp = req.nextUrl.searchParams;
      const policyId = sp.get('policyId');
      const planNo = sp.get('planNo');
      const name = sp.get('name')?.toLowerCase();
      const policyMemberId = sp.get('policyMemberId');
      const state = sp.get('state');
      const govIdType = sp.get('governmentIdType');
      const govIdNumber = sp.get('governmentIdNumber');
      const mobile = sp.get('mobile');
      const email = sp.get('email');
      const page = Number(sp.get('page') ?? '0');
      const size = Number(sp.get('size') ?? '20');

      // Co-required validation per the .api comment.
      if ((!!govIdType) !== (!!govIdNumber)) {
        return json(
          {
            timestamp: new Date().toISOString(),
            status: 400,
            error: 'Bad Request',
            message:
              'governmentIdType and governmentIdNumber must be supplied together (MEM_VAL_001)',
            path: '/api/policy-admin/members/search',
          },
          400,
        );
      }

      const filtered = store.members.filter(
        (m) =>
          (!policyId || m.policyId === policyId) &&
          (!planNo || m.planNo === planNo) &&
          (!name || m.name.toLowerCase().includes(name)) &&
          (!policyMemberId || m.policyMemberId === policyMemberId) &&
          (!state || m.state === state) &&
          (!govIdType || m.governmentIdType === govIdType) &&
          (!govIdNumber || m.governmentIdNumber === govIdNumber) &&
          (!mobile || m.mobile === mobile) &&
          (!email || m.email === email),
      );
      return json(
        filtered.slice(page * size, page * size + size).map(memberToSummary),
      );
    },
  },
  {
    method: 'GET',
    pattern: 'members/:memberId',
    handler: (_req, params) => {
      const m = store.members.find((x) => x.id === params.memberId);
      if (!m) return notFound(`members/${params.memberId}`);
      return json(memberToDto(m));
    },
  },
  {
    method: 'GET',
    pattern: 'policies/:policyId/members',
    handler: (_req, params) => {
      const list = store.members.filter(
        (m) => m.policyId === params.policyId,
      );
      return json(list.map(memberToSummary));
    },
  },
  {
    method: 'POST',
    pattern: 'policies/:policyId/members',
    handler: async (req, params) => {
      const body = await readJson<{
        policyMemberId: string;
        name: string;
        dob: string;
        gender: string;
        salary: number;
        occupation?: string;
        mobile?: string;
        email?: string;
        governmentIdType?: string;
        governmentIdNumber?: string;
        sumInsured: number;
        planNo: string;
        premium: MemberPremium;
        transactionRefs: string[];
        additionalAttributesJson?: string;
      }>(req);
      const id = nextId('MEM');
      const number = `M-${Date.now().toString().slice(-7)}`;
      const member: Member = {
        id,
        memberNumber: number,
        policyId: params.policyId,
        policyMemberId: body?.policyMemberId ?? '',
        planNo: body?.planNo ?? '',
        state: 'PENDING',
        pendingReason: 'PENDING_FLOAT_RESERVATION',
        name: body?.name ?? '',
        dob: body?.dob ?? '',
        gender: body?.gender ?? '',
        salary: body?.salary ?? 0,
        occupation: body?.occupation,
        mobile: body?.mobile,
        email: body?.email,
        governmentIdType: body?.governmentIdType,
        governmentIdNumber: body?.governmentIdNumber,
        sumInsured: body?.sumInsured ?? 0,
        premium:
          body?.premium ?? {
            annualPremium: { amount: 0, currency: 'INR' },
            breakup: [],
          },
        transactionRefs: body?.transactionRefs ?? [],
        additionalAttributesJson: body?.additionalAttributesJson,
      };
      store.members.push(member);
      return json({ memberId: id, memberNumber: number });
    },
  },
];

async function handle(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { path = [] } = await ctx.params;
  const proxied = await proxyIfConfigured(req, ['api', 'policy-admin', ...path]);
  if (proxied) return proxied;
  return dispatch(req, path, routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
