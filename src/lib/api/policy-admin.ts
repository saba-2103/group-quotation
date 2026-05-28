// Typed clients for the Policy Admin API (docs/spec/policy-admin/PolicyAdminApi.api).
// Cross-ref endpoint is /members/by-policy-member/:policyMemberId per the
// 2026-05-07 backend Q&A (OpenAPI snapshot is stale on this point).

import type {
  FileDownloadUrlRequest,
  FileDownloadUrlResponse,
  FileUploadUrlRequest,
  FileUploadUrlResponse,
  MemberPremium,
  Money,
} from '@/types/group-pas/common';
import type {
  ClientDto,
  ClientRegistrationData,
  ClientSummaryDto,
  MemberDto,
  MemberSummaryDto,
  MemberUwDecision,
  PolicyDto,
  PolicyPlanConfig,
  PolicySummaryDto,
} from '@/types/group-pas/policy-admin';

import { api } from './client';

const BASE = '/api/policy-admin';

// ── Client ──

export interface CreateClientRequest {
  registrationData: ClientRegistrationData;
}
export interface CreateClientResponse {
  clientId: string;
  clientNumber: string;
}

export const createClient = (request: CreateClientRequest) =>
  api.post<CreateClientResponse>(`${BASE}/clients`, request);

export const getClientById = (clientId: string) =>
  api.get<ClientDto>(`${BASE}/clients/${clientId}`);

export const getClientByNumber = (clientNumber: string) =>
  api.get<ClientDto>(`${BASE}/clients/by-number/${clientNumber}`);

export const getClientByRegistration = (businessRegistrationNumber: string) =>
  api.get<ClientDto>(`${BASE}/clients/by-registration`, {
    businessRegistrationNumber,
  });

export const findClientsByName = (name: string) =>
  api.get<ClientSummaryDto[]>(`${BASE}/clients/by-name`, { name });

export type SearchClientsParams = {
  name?: string;
  countryCode?: string;
  industryCategory?: string;
  clientCategory?: string;
  state?: string;
  isVip?: boolean;
  page: number;
  size: number;
};

export const searchClients = (params: SearchClientsParams) =>
  api.get<ClientSummaryDto[]>(`${BASE}/clients/search`, params);

export const listAllClients = (page: number, size: number) =>
  api.get<ClientSummaryDto[]>(`${BASE}/clients/list`, { page, size });

// ── Common: enums + presigned files ──

export const listEnumValues = (enumType: string, search?: string) =>
  api.get<string[]>(`${BASE}/enums/${encodeURIComponent(enumType)}`, { search });

export const getFileUploadUrl = (request: FileUploadUrlRequest) =>
  api.post<FileUploadUrlResponse>(`${BASE}/files/upload-url`, request);

export const getFileDownloadUrl = (request: FileDownloadUrlRequest) =>
  api.post<FileDownloadUrlResponse>(`${BASE}/files/download-url`, request);

// ── Policy ──

export interface CreatePolicyRequest {
  clientId: string;
  proposalId: string;
  policyType: string;
  effectiveDate: string;
  expiryDate: string;
  premiumType: string;
  lineOfBusiness: string;
  riskTermClassification: string;
  inceptionDate: string;
  ageDefinitionRule: string;
  activationThreshold: number;
  plans: PolicyPlanConfig[];
  estimatedPremium: Money;
}
export interface CreatePolicyResponse {
  policyId: string;
  policyNumber: string;
}

export const createPolicy = (request: CreatePolicyRequest) =>
  api.post<CreatePolicyResponse>(`${BASE}/policies`, request);

export const cancelPolicy = (policyId: string, reason: string) =>
  api.post<void>(`${BASE}/policies/${policyId}/cancel`, { reason });

export const getPolicyById = (policyId: string) =>
  api.get<PolicyDto>(`${BASE}/policies/${policyId}`);

export const getPolicyByNumber = (policyNumber: string) =>
  api.get<PolicyDto>(`${BASE}/policies/by-number/${policyNumber}`);

export const getPolicyByProposal = (proposalId: string) =>
  api.get<PolicyDto>(`${BASE}/policies/by-proposal/${proposalId}`);

export const findPoliciesByClient = (clientId: string) =>
  api.get<PolicySummaryDto[]>(`${BASE}/policies/by-client`, { clientId });

export const findPoliciesByState = (state: string) =>
  api.get<PolicySummaryDto[]>(`${BASE}/policies/by-state`, { state });

export type SearchPoliciesParams = {
  clientId?: string;
  state?: string;
  policyType?: string;
  page: number;
  size: number;
};

export const searchPolicies = (params: SearchPoliciesParams) =>
  api.get<PolicySummaryDto[]>(`${BASE}/policies/search`, params);

export const listAllPolicies = (page: number, size: number) =>
  api.get<PolicySummaryDto[]>(`${BASE}/policies/list`, { page, size });

// ── Member ──

export interface AddMemberRequest {
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
  uwDecision?: MemberUwDecision;
  transactionRefs: string[];
  additionalAttributesJson?: string;
}
export interface AddMemberResponse {
  memberId: string;
  memberNumber: string;
}

export const addMember = (policyId: string, request: AddMemberRequest) =>
  api.post<AddMemberResponse>(
    `${BASE}/policies/${policyId}/members`,
    request,
  );

export const getMemberById = (memberId: string) =>
  api.get<MemberDto>(`${BASE}/members/${memberId}`);

export const getMemberByNumber = (memberNumber: string) =>
  api.get<MemberDto>(`${BASE}/members/by-number/${memberNumber}`);

export const findMembersByPolicy = (policyId: string) =>
  api.get<MemberSummaryDto[]>(`${BASE}/policies/${policyId}/members`);

// PAM cross-ref — uses `policyMemberId` per the 2026-05-07 backend Q&A
// (OpenAPI snapshot still shows the stale `proposalMemberId` shape).
export const findMemberByPolicyMember = (policyMemberId: string) =>
  api.get<MemberDto>(`${BASE}/members/by-policy-member/${policyMemberId}`);

export type SearchMembersParams = {
  policyId?: string;
  planNo?: string;
  // Sent on the wire as `name` per the @query alias.
  name?: string;
  policyMemberId?: string;
  state?: string;
  // governmentIdType + governmentIdNumber are co-required.
  governmentIdType?: string;
  governmentIdNumber?: string;
  mobile?: string;
  email?: string;
  page: number;
  size: number;
};

export const searchMembers = (params: SearchMembersParams) =>
  api.get<MemberSummaryDto[]>(`${BASE}/members/search`, params);
