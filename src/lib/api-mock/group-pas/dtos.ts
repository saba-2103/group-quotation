// Entity → wire-DTO mappers. The DSL DTOs flatten money to amount+currency
// pairs and serialize composite shapes (plans, census, premium) to *Json
// strings. These mappers do that flattening so route handlers can return the
// fixtures unmodified-looking from the wire.

import type { MockQuote } from '@/mocks/group-pas/quotation/quotes';
import type {
  CensusSubmission,
  CensusSubmissionDto,
  CensusSubmissionRow,
  CensusSubmissionRowDto,
  PolicyMember,
  PolicyMemberDto,
  PolicyMemberSummaryDto,
  Proposal,
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
  QuoteDto,
  QuoteSummaryDto,
} from '@/types/group-pas/quotation';

const ISO_PLACEHOLDER = '';

export function quoteToDto(q: MockQuote): QuoteDto {
  return {
    id: q.id,
    clientId: q.clientId,
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
  };
}

export function quoteToSummary(q: MockQuote): QuoteSummaryDto {
  return {
    id: q.id,
    clientId: q.clientId,
    policyType: q.policyType,
    status: q.status,
    headcount: q.aggregateCensus?.headcount ?? 0,
    premiumAmount: q.premium?.amount ?? { amount: 0, currency: 'INR' },
  };
}

export function proposalToDto(p: Proposal): ProposalDto {
  return {
    id: p.id,
    quoteId: p.quoteId,
    clientId: p.clientId,
    policyType: p.policyType,
    state: p.state,
    plansJson: JSON.stringify(p.plans),
    memberToPlanMapping: p.memberToPlanMapping,
    aggregateCensusJson: JSON.stringify(p.aggregateCensus),
    estimatedPremiumJson: JSON.stringify(p.estimatedPremium),
    policyId: p.policyId ?? '',
    policyNumber: p.policyNumber ?? '',
  };
}

export function proposalToSummary(p: Proposal): ProposalSummaryDto {
  return {
    id: p.id,
    quoteId: p.quoteId,
    clientId: p.clientId,
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

export function policyToDto(p: Policy): PolicyDto {
  return {
    id: p.id,
    policyNumber: p.policyNumber,
    clientId: p.clientId,
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

export function policyToSummary(p: Policy): PolicySummaryDto {
  return {
    id: p.id,
    policyNumber: p.policyNumber,
    clientId: p.clientId,
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
