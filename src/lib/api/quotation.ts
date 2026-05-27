// Typed clients for the Quotation API (docs/spec/quotation/QuotationApi.api).
// Function names mirror the DSL operation names; no business logic — these are
// thin wire callers that React Query hooks (useSmartQuery / useMutation) wrap.

import type {
  AggregateCensus,
  FileDownloadUrlRequest,
  FileDownloadUrlResponse,
  FileUploadUrlRequest,
  FileUploadUrlResponse,
  Plan,
} from '@/types/group-pas/common';
import type {
  CensusFileFormat,
  MemberQuoteDto,
  QuoteDto,
  QuoteSummaryDto,
} from '@/types/group-pas/quotation';

import { api } from './client';

const BASE = '/api/quotation';

// ── Common: enums + presigned files ──

export const listEnumValues = (enumType: string, search?: string) =>
  api.get<string[]>(`${BASE}/enums/${encodeURIComponent(enumType)}`, { search });

export const getFileUploadUrl = (request: FileUploadUrlRequest) =>
  api.post<FileUploadUrlResponse>(`${BASE}/files/upload-url`, request);

export const getFileDownloadUrl = (request: FileDownloadUrlRequest) =>
  api.post<FileDownloadUrlResponse>(`${BASE}/files/download-url`, request);

// ── Quote ──

export interface CreateQuoteRequest {
  clientId: string;
  policyType: string;
}
export interface CreateQuoteResponse {
  quoteId: string;
}

export const createQuote = (request: CreateQuoteRequest) =>
  api.post<CreateQuoteResponse>(`${BASE}/quotes`, request);

export interface UpdatePolicyDetailRequest {
  premiumType: string;
  effectiveDate: string;
  expiryDate: string;
  inceptionDate: string;
  ageDefinitionRule: string;
  riskTermClassification: string;
  lineOfBusiness: string;
}

export const updatePolicyDetail = (
  quoteId: string,
  request: UpdatePolicyDetailRequest,
) => api.put<void>(`${BASE}/quotes/${quoteId}/policy-detail`, request);

export const addPlan = (quoteId: string, request: Plan) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/plans`, request);

export const updatePlan = (quoteId: string, planNo: string, request: Plan) =>
  api.put<void>(`${BASE}/quotes/${quoteId}/plans/${planNo}`, request);

export const removePlan = (quoteId: string, planNo: string) =>
  api.delete<void>(`${BASE}/quotes/${quoteId}/plans/${planNo}`);

export const updateMemberToPlanMapping = (quoteId: string, mapping: string) =>
  api.put<void>(`${BASE}/quotes/${quoteId}/member-to-plan-mapping`, { mapping });

export const updateAggregateCensus = (
  quoteId: string,
  request: AggregateCensus,
) => api.put<void>(`${BASE}/quotes/${quoteId}/aggregate-census`, request);

export const updateCensusFileFormat = (
  quoteId: string,
  request: CensusFileFormat,
) => api.put<void>(`${BASE}/quotes/${quoteId}/census-file-format`, request);

export interface UpdatePremiumRequest {
  total: { amount: number; currency: string };
  byPlan: Array<{ planNo: string; amount: number; currency: string }>;
}

export const updatePremium = (quoteId: string, request: UpdatePremiumRequest) =>
  api.put<void>(`${BASE}/quotes/${quoteId}/premium`, request);

export const requestQuotePrice = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/request-price`);

export const submitQuote = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/submit`);

export const sendToClient = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/send-to-client`);

export const acceptQuote = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/accept`);

export const rejectQuote = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/reject`);

export const withdrawQuote = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/withdraw`);

export const expireQuote = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/expire`);

export const finalizeQuote = (quoteId: string) =>
  api.post<void>(`${BASE}/quotes/${quoteId}/finalize`);

export const getQuoteById = (quoteId: string) =>
  api.get<QuoteDto>(`${BASE}/quotes/${quoteId}`);

export const findQuotesByClient = (clientId: string) =>
  api.get<QuoteSummaryDto[]>(`${BASE}/quotes/by-client`, { clientId });

export const findQuotesByStatus = (status: string) =>
  api.get<QuoteSummaryDto[]>(`${BASE}/quotes/by-status`, { status });

// `type` (not `interface`) so it structurally satisfies the QueryParams
// index-signature shape consumed by the api wrapper.
export type SearchQuotesParams = {
  clientId?: string;
  status?: string;
  policyType?: string;
  page: number;
  size: number;
};

export const searchQuotes = (params: SearchQuotesParams) =>
  api.get<QuoteSummaryDto[]>(`${BASE}/quotes/search`, params);

export const listAllQuotes = (page: number, size: number) =>
  api.get<QuoteSummaryDto[]>(`${BASE}/quotes/list`, { page, size });

// ── MemberQuote (GCL) — placeholder per V1 scope ──

export interface CreateMemberQuoteRequest {
  policyId: string;
  name: string;
  dob?: string;
  gender?: string;
  salary?: number;
  occupation?: string;
  sumAssured?: number;
}
export interface CreateMemberQuoteResponse {
  memberQuoteId: string;
}

export const createMemberQuote = (request: CreateMemberQuoteRequest) =>
  api.post<CreateMemberQuoteResponse>(`${BASE}/member-quotes`, request);

export interface UpdateMemberPremiumRequest {
  name: string;
  dob?: string;
  gender?: string;
  salary?: number;
  occupation?: string;
  annualPremiumAmount: number;
  currency: string;
  breakup: Array<{
    productCode: string;
    benefitCode?: string;
    premiumAmount: number;
    currency: string;
  }>;
}

export const updateMemberPremium = (
  memberQuoteId: string,
  request: UpdateMemberPremiumRequest,
) => api.put<void>(`${BASE}/member-quotes/${memberQuoteId}/premium`, request);

export const submitMemberQuote = (memberQuoteId: string) =>
  api.post<void>(`${BASE}/member-quotes/${memberQuoteId}/submit`);

export const finalizeMemberQuote = (memberQuoteId: string) =>
  api.post<void>(`${BASE}/member-quotes/${memberQuoteId}/finalize`);

export const getMemberQuoteById = (memberQuoteId: string) =>
  api.get<MemberQuoteDto>(`${BASE}/member-quotes/${memberQuoteId}`);

export const findMemberQuotes = (params: { policyId?: string; status?: string }) =>
  api.get<MemberQuoteDto[]>(`${BASE}/member-quotes`, params);
