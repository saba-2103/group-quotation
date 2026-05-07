// Typed clients for the Issuance API (docs/spec/issuance/IssuanceApi.api).

import type {
  AggregateCensus,
  Plan,
  QuotePremium,
} from '@/types/group-pas/common';
import type {
  CensusSubmissionDto,
  CensusSubmissionRowDto,
  InitiateCensusSubmissionResult,
  PolicyMemberDto,
  PolicyMemberSummaryDto,
  ProposalDto,
  ProposalSummaryDto,
} from '@/types/group-pas/issuance';

import { api } from './client';

const BASE = '/api/issuance';

// ── Proposal ──

export interface CreateProposalRequest {
  quoteId: string;
  clientId: string;
  policyType: string;
  plans: Plan[];
  memberToPlanMapping: string;
  aggregateCensus: AggregateCensus;
  estimatedPremium: QuotePremium;
}
export interface CreateProposalResponse {
  proposalId: string;
}

export const createProposal = (request: CreateProposalRequest) =>
  api.post<CreateProposalResponse>(`${BASE}/proposals`, request);

export interface UpdateProposalRequest {
  plans: Plan[];
  memberToPlanMapping: string;
  aggregateCensus: AggregateCensus;
  estimatedPremium: QuotePremium;
}

export const updateProposal = (
  proposalId: string,
  request: UpdateProposalRequest,
) => api.put<void>(`${BASE}/proposals/${proposalId}`, request);

export const submitProposal = (proposalId: string) =>
  api.post<void>(`${BASE}/proposals/${proposalId}/submit`);

export const finalizeProposal = (proposalId: string) =>
  api.post<void>(`${BASE}/proposals/${proposalId}/finalize`);

export const cancelProposal = (proposalId: string, reason: string) =>
  api.post<void>(`${BASE}/proposals/${proposalId}/cancel`, { reason });

export const getProposalById = (proposalId: string) =>
  api.get<ProposalDto>(`${BASE}/proposals/${proposalId}`);

export const getProposalByQuoteId = (quoteId: string) =>
  api.get<ProposalDto>(`${BASE}/proposals/by-quote/${quoteId}`);

export const findProposalsByClient = (clientId: string) =>
  api.get<ProposalSummaryDto[]>(`${BASE}/proposals/by-client`, { clientId });

export const findProposalsByState = (state: string) =>
  api.get<ProposalSummaryDto[]>(`${BASE}/proposals/by-state`, { state });

export type SearchProposalsParams = {
  clientId?: string;
  state?: string;
  page: number;
  size: number;
};

export const searchProposals = (params: SearchProposalsParams) =>
  api.get<ProposalSummaryDto[]>(`${BASE}/proposals/search`, params);

export const listAllProposals = (page: number, size: number) =>
  api.get<ProposalSummaryDto[]>(`${BASE}/proposals/list`, { page, size });

// ── PolicyMember (W3) ──

export interface CreatePolicyMemberRequest {
  memberId: string;
  planNo: string;
  name: string;
  dob?: string;
  gender?: string;
  salary?: number;
  occupation?: string;
  sumInsured: number;
}
export interface CreatePolicyMemberResponse {
  policyMemberId: string;
}

export const createPolicyMember = (
  policyId: string,
  request: CreatePolicyMemberRequest,
) =>
  api.post<CreatePolicyMemberResponse>(
    `${BASE}/policies/${policyId}/members`,
    request,
  );

export interface UpdatePolicyMemberRequest {
  planNo: string;
  name: string;
  dob?: string;
  gender?: string;
  salary?: number;
  occupation?: string;
  sumInsured: number;
}

export const updatePolicyMember = (
  policyMemberId: string,
  request: UpdatePolicyMemberRequest,
) => api.put<void>(`${BASE}/policy-members/${policyMemberId}`, request);

export const pricePolicyMember = (policyMemberId: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/price`);

export const confirmMaf = (policyMemberId: string, confirmedAt: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/confirm-maf`, {
    confirmedAt,
  });

export const approveUwCase = (policyMemberId: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/uw/approve`);

export const rejectUwCase = (policyMemberId: string, reason: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/uw/reject`, {
    reason,
  });

export const rejectPolicyMember = (policyMemberId: string, reason: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/reject`, { reason });

export const sendPolicyMemberForIssuance = (policyMemberId: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/send-for-issuance`);

export const archivePolicyMember = (policyMemberId: string, reason: string) =>
  api.post<void>(`${BASE}/policy-members/${policyMemberId}/archive`, { reason });

export const getPolicyMemberById = (policyMemberId: string) =>
  api.get<PolicyMemberDto>(`${BASE}/policy-members/${policyMemberId}`);

export const findMembersByPolicy = (policyId: string) =>
  api.get<PolicyMemberSummaryDto[]>(`${BASE}/policies/${policyId}/members`);

export const findMembersByPolicyAndState = (policyId: string, state: string) =>
  api.get<PolicyMemberSummaryDto[]>(
    `${BASE}/policies/${policyId}/members/by-state`,
    { state },
  );

export type SearchPolicyMembersParams = {
  policyId?: string;
  state?: string;
  page: number;
  size: number;
};

export const searchPolicyMembers = (params: SearchPolicyMembersParams) =>
  api.get<PolicyMemberSummaryDto[]>(`${BASE}/policy-members/search`, params);

// ── CensusSubmission ──

export const initiateCensusSubmission = (policyId: string) =>
  api.post<InitiateCensusSubmissionResult>(
    `${BASE}/policies/${policyId}/census-submissions`,
  );

export const ingestCensusFile = (submissionId: string) =>
  api.post<void>(`${BASE}/census-submissions/${submissionId}/ingest`);

export const submitCensusSubmission = (submissionId: string) =>
  api.post<void>(`${BASE}/census-submissions/${submissionId}/submit`);

export const getCensusSubmissionById = (submissionId: string) =>
  api.get<CensusSubmissionDto>(`${BASE}/census-submissions/${submissionId}`);

export const listCensusSubmissionRows = (
  submissionId: string,
  status?: string,
) =>
  api.get<CensusSubmissionRowDto[]>(
    `${BASE}/census-submissions/${submissionId}/rows`,
    { status },
  );

export const listCensusSubmissionsByPolicy = (policyId: string) =>
  api.get<CensusSubmissionDto[]>(
    `${BASE}/policies/${policyId}/census-submissions`,
  );
