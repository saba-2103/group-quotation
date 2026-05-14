// Entity → wire-DTO mappers. The DSL DTOs flatten money to amount+currency
// pairs and serialize composite shapes (plans, census, premium) to *Json
// strings. These mappers do that flattening so route handlers can return the
// fixtures unmodified-looking from the wire.
//
// V1 demo affordance: every DTO that carries a `clientId` is enriched with
// a `clientName` lookup from the in-memory client store, so screens can
// surface human-readable labels alongside the raw IDs without a second
// API call. Real backend will likely add this on the wire too.

import { CLIENTS } from '@/mocks/group-pas';
import type { MockQuote } from '@/mocks/group-pas/quotation/quotes';
import type { MockProposal } from '@/lib/api-mock/group-pas/store';

function clientNameFor(clientId: string): string {
  // Read from the static seed list rather than the mutable store to avoid an
  // import cycle (store imports dtos via consumers). Clients aren't mutated
  // in V1 demo flows, so the static read is correct.
  return CLIENTS.find((c) => c.id === clientId)?.name ?? clientId;
}
import type {
  CensusSubmission,
  CensusSubmissionDto,
  CensusSubmissionRow,
  CensusSubmissionRowDto,
  PolicyMember,
  PolicyMemberDto,
  PolicyMemberSummaryDto,
  ProposalDto,
  ProposalSummaryDto,
} from '@/types/group-pas/issuance';
import type {
  Client,
  ClientDto,
  ClientSummaryDto,
  Member,
  MemberDto,
  MemberSummaryDto,
  Policy,
  PolicyDto,
  PolicySummaryDto,
} from '@/types/group-pas/policy-admin';
import type {
  MemberQuote,
  MemberQuoteDto,
  QuoteDto,
  QuoteSummaryDto,
} from '@/types/group-pas/quotation';

const ISO_PLACEHOLDER = '';

// `awaitingApproval` is a UI-only mock field for the V1 maker-checker overlay
// (see context/ARCH_TRANSITION.md). Carried in the response so client gating
// can read it from the same poll without a separate endpoint. Real backend
// will never set this — the field is dropped when V1 maker-checker lands.
//
// `clientName` is a V1-demo enrichment alongside the raw clientId so the UI
// can surface a human-readable label without a second fetch.
export type MockQuoteDto = QuoteDto & {
  awaitingApproval?: boolean;
  clientName?: string;
};

export function quoteToDto(q: MockQuote): MockQuoteDto {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    clientId: q.clientId,
    clientName: clientNameFor(q.clientId),
    policyType: q.policyType,
    premiumType: q.premiumType ?? '',
    effectiveDate: q.effectiveDate ?? ISO_PLACEHOLDER,
    expiryDate: q.expiryDate ?? ISO_PLACEHOLDER,
    inceptionDate: q.inceptionDate ?? ISO_PLACEHOLDER,
    ageDefinitionRule: q.ageDefinitionRule ?? '',
    riskTermClassification: q.riskTermClassification ?? '',
    lineOfBusiness: q.lineOfBusiness ?? '',
    status: q.status,
    plans: q.plans.map((p) => ({
      id: `${q.id}-${p.planNo}`,
      planNo: p.planNo,
      planName: p.planName ?? '',
      productsJson: JSON.stringify(p.products),
      rateCardFile: p.rateCardFile,
      coverAmountFormulaJson: JSON.stringify(p.coverAmountFormula),
      freeCoverLimitFormulaJson: JSON.stringify(p.freeCoverLimitFormula ?? null),
    })),
    headcount: q.aggregateCensus?.headcount ?? 0,
    estimatedPremium: {
      totalAmount: q.premium?.amount.amount ?? 0,
      currency: q.premium?.amount.currency ?? 'INR',
      byPlanJson: JSON.stringify(q.premium?.breakup ?? []),
    },
    memberToPlanMappingJson: q.memberToPlanMapping ?? '',
    censusFileFormatJson: JSON.stringify(q.censusFileFormat ?? null),
    awaitingApproval: q.awaitingApproval,
  };
}

export type MockQuoteSummaryDto = QuoteSummaryDto & { clientName?: string };

export function quoteToSummary(q: MockQuote): MockQuoteSummaryDto {
  return {
    id: q.id,
    quoteNumber: q.quoteNumber,
    clientId: q.clientId,
    clientName: clientNameFor(q.clientId),
    policyType: q.policyType,
    status: q.status,
    headcount: q.aggregateCensus?.headcount ?? 0,
    premiumAmount: q.premium?.amount ?? { amount: 0, currency: 'INR' },
  };
}

// `awaitingApproval` mock-only field — see `MockQuoteDto` note above.
export type MockProposalDto = ProposalDto & {
  awaitingApproval?: boolean;
  clientName?: string;
};
export type MockProposalSummaryDto = ProposalSummaryDto & {
  clientName?: string;
};

export function proposalToDto(p: MockProposal): MockProposalDto {
  return {
    id: p.id,
    quoteId: p.quoteId,
    clientId: p.clientId,
    clientName: clientNameFor(p.clientId),
    policyType: p.policyType,
    state: p.state,
    plansJson: JSON.stringify(p.plans),
    memberToPlanMapping: p.memberToPlanMapping,
    aggregateCensusJson: JSON.stringify(p.aggregateCensus),
    estimatedPremiumJson: JSON.stringify(p.estimatedPremium),
    policyId: p.policyId ?? '',
    policyNumber: p.policyNumber ?? '',
    awaitingApproval: p.awaitingApproval,
  };
}

export function proposalToSummary(p: MockProposal): MockProposalSummaryDto {
  return {
    id: p.id,
    quoteId: p.quoteId,
    clientId: p.clientId,
    clientName: clientNameFor(p.clientId),
    policyType: p.policyType,
    state: p.state,
    policyId: p.policyId ?? '',
    policyNumber: p.policyNumber ?? '',
  };
}

export function policyMemberToDto(m: PolicyMember): PolicyMemberDto {
  const md = m.memberData;
  return {
    id: m.id,
    policyId: m.policyId,
    memberId: m.memberId,
    planNo: m.planNo,
    state: m.state,
    name: md.name,
    dob: md.dob ?? '',
    gender: md.gender ?? '',
    salary: md.salary ?? 0,
    sumInsured: md.sumInsured ?? 0,
    annualPremiumAmount: m.premium?.annualPremium.amount ?? 0,
    annualPremiumCurrency: m.premium?.annualPremium.currency ?? 'INR',
    classificationResultJson: JSON.stringify(m.classificationResult ?? null),
    uwDecisionJson: JSON.stringify(m.uwDecision ?? null),
    floatDeductionId: m.floatDeductionId ?? '',
    reclassificationCount: m.reclassificationCount,
    archivedReason: '',
    censusSubmissionId: m.censusSubmissionId ?? '',
    censusRowNumber: m.censusRowNumber ?? 0,
  };
}

export function policyMemberToSummary(m: PolicyMember): PolicyMemberSummaryDto {
  return {
    id: m.id,
    policyId: m.policyId,
    memberId: m.memberId,
    planNo: m.planNo,
    state: m.state,
    name: m.memberData.name,
    annualPremiumAmount: m.premium?.annualPremium.amount ?? 0,
    annualPremiumCurrency: m.premium?.annualPremium.currency ?? 'INR',
  };
}

export function censusSubmissionToDto(c: CensusSubmission): CensusSubmissionDto {
  return {
    id: c.id,
    policyId: c.policyId,
    fileRef: c.file.fileRef,
    status: c.status,
    totalRows: c.totalRows,
    acceptedRows: c.acceptedRows,
    rejectedRows: c.rejectedRows,
    createdMemberCount: c.createdMemberCount,
  };
}

export function censusRowToDto(r: CensusSubmissionRow): CensusSubmissionRowDto {
  return {
    id: r.id,
    submissionId: r.submissionId,
    rowNumber: r.rowNumber,
    status: r.status,
    ingestionErrorsJson: JSON.stringify(r.ingestionErrors),
    policyMemberId: r.policyMemberId ?? '',
  };
}

export function clientToDto(c: Client): ClientDto {
  return {
    id: c.id,
    clientNumber: c.clientNumber,
    name: c.name,
    alternateName: c.alternateName ?? '',
    businessRegistrationNumber: c.businessRegistrationNumber,
    incorporationDate: c.incorporationDate ?? '',
    gstRegistrationNumber: c.gstRegistrationNumber ?? '',
    taxReferenceNumber: c.taxReferenceNumber ?? '',
    clientCategory: c.clientCategory ?? '',
    industryCategory: c.industryCategory ?? '',
    countryCode: c.countryCode,
    communicationPreference: c.communicationPreference ?? '',
    clientUrl: c.clientUrl ?? '',
    contactPersonName: c.contactPersonName ?? '',
    contactPersonPhone: c.contactPersonPhone ?? '',
    isSubsidiary: c.isSubsidiary,
    isVip: c.isVip,
    isBlacklisted: c.isBlacklisted,
    effectiveDate: c.effectiveDate,
    endDate: c.endDate ?? '',
    state: c.state,
  };
}

export function clientToSummary(c: Client): ClientSummaryDto {
  return {
    id: c.id,
    clientNumber: c.clientNumber,
    name: c.name,
    countryCode: c.countryCode,
    industryCategory: c.industryCategory ?? '',
    isVip: c.isVip,
    state: c.state,
  };
}

export type MockPolicyDto = PolicyDto & { clientName?: string };

export function policyToDto(p: Policy): MockPolicyDto {
  return {
    id: p.id,
    policyNumber: p.policyNumber,
    clientId: p.clientId,
    clientName: clientNameFor(p.clientId),
    proposalId: p.proposalId,
    policyType: p.policyType,
    effectiveDate: p.effectiveDate ?? '',
    expiryDate: p.expiryDate ?? '',
    premiumType: p.premiumType ?? '',
    lineOfBusiness: p.lineOfBusiness ?? '',
    riskTermClassification: p.riskTermClassification ?? '',
    inceptionDate: p.inceptionDate ?? '',
    ageDefinitionRule: p.ageDefinitionRule ?? '',
    activationThreshold: p.activationThreshold,
    pendingReason: p.pendingReason ?? '',
    state: p.state,
    plans: p.plans.map((plan) => ({
      id: `${p.id}-${plan.planNo}`,
      planNo: plan.planNo,
      planName: plan.planName ?? '',
      productsJson: JSON.stringify(plan.products),
      rateCardFile: plan.rateCardFile,
      coverAmountFormulaJson: JSON.stringify(plan.coverAmountFormula),
      freeCoverLimitFormulaJson: JSON.stringify(
        plan.freeCoverLimitFormula ?? null,
      ),
    })),
    estimatedPremium: p.estimatedPremium,
  };
}

export type MockPolicySummaryDto = PolicySummaryDto & { clientName?: string };

export function policyToSummary(p: Policy): MockPolicySummaryDto {
  return {
    id: p.id,
    policyNumber: p.policyNumber,
    clientId: p.clientId,
    clientName: clientNameFor(p.clientId),
    policyType: p.policyType,
    state: p.state,
  };
}

export function memberToDto(m: Member): MemberDto {
  return {
    id: m.id,
    memberNumber: m.memberNumber,
    policyId: m.policyId,
    policyMemberId: m.policyMemberId,
    planNo: m.planNo,
    state: m.state,
    pendingReason: m.pendingReason ?? '',
    voidReason: m.voidReason ?? '',
    cancellationReason: m.cancellationReason ?? '',
    name: m.name,
    dob: m.dob,
    gender: m.gender,
    salary: m.salary,
    occupation: m.occupation ?? '',
    mobile: m.mobile ?? '',
    email: m.email ?? '',
    governmentIdType: m.governmentIdType ?? '',
    governmentIdNumber: m.governmentIdNumber ?? '',
    sumInsured: m.sumInsured,
    premium: m.premium,
    uwDecision: m.uwDecision,
    transactionRefs: m.transactionRefs,
    floatReservationId: m.floatReservationId,
    additionalAttributesJson: m.additionalAttributesJson,
  };
}

export function memberToSummary(m: Member): MemberSummaryDto {
  return {
    id: m.id,
    memberNumber: m.memberNumber,
    policyId: m.policyId,
    policyMemberId: m.policyMemberId,
    planNo: m.planNo,
    state: m.state,
    pendingReason: m.pendingReason,
    name: m.name,
    mobile: m.mobile ?? '',
    sumInsured: m.sumInsured,
    annualPremium: m.premium.annualPremium,
  };
}

// MemberQuote (GCL) — see src/mocks/group-pas/quotation/member-quotes.ts.
export function memberQuoteToDto(q: MemberQuote): MemberQuoteDto {
  const md = q.memberData;
  return {
    id: q.id,
    policyId: q.policyId,
    planNo: q.planNo ?? '',
    status: q.status,
    name: md.name,
    dob: md.dob ?? '',
    gender: md.gender ?? '',
    salary: md.salary ?? 0,
    sumAssured: q.sumAssured?.amount ?? 0,
    annualPremiumAmount: q.premium?.amount.amount ?? 0,
    annualPremiumCurrency: q.premium?.amount.currency ?? 'INR',
    premiumBreakupJson: JSON.stringify(q.premium?.breakup ?? []),
  };
}
