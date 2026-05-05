import type { Member, Nominee, Claim, Endorsement } from '../types';

export interface ValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
}

const ok: ValidationResult = { valid: true };
const fail = (code: string, message: string): ValidationResult => ({ valid: false, code, message });

// VR-DATE-LWD: LWD must be >= today and >= DOJ
export function validateLWD(lwdDate: string, doj: string): ValidationResult {
  const lwd = new Date(lwdDate);
  const dojDate = new Date(doj);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lwd < today) return fail('VR-DATE-LWD', 'Last working day cannot be in the past');
  if (lwd < dojDate) return fail('VR-DATE-LWD', 'Last working day cannot be before date of joining');
  return ok;
}

// VR-MEM-01: Member must have Active status to be exited
export function validateMemberCanExit(member: Member): ValidationResult {
  if (member.status !== 'Active') {
    return fail('VR-MEM-01', `Member cannot be exited — current status is '${member.status}'`);
  }
  return ok;
}

// VR-MEM-02: Member DOB must make age between 18 and 70 at DOJ
export function validateMemberAge(dob: string, doj: string): ValidationResult {
  const birth = new Date(dob);
  const join = new Date(doj);
  const ageAtJoin = (join.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (ageAtJoin < 18) return fail('VR-MEM-02', 'Member must be at least 18 years old at date of joining');
  if (ageAtJoin > 70) return fail('VR-MEM-02', 'Member must be under 70 years old at date of joining');
  return ok;
}

// VR-CLAIM-01: Claim can only be filed for Active or Exited (death after exit) members
export function validateClaimMember(member: Member): ValidationResult {
  if (member.status === 'Pending Approval') {
    return fail('VR-CLAIM-01', 'Claims cannot be filed for members in Pending Approval status');
  }
  if (member.status === 'Rejected') {
    return fail('VR-CLAIM-01', 'Claims cannot be filed for rejected members');
  }
  return ok;
}

// VR-CLAIM-DUPLICATE: No two open claims for the same member on the same policy
export function validateNoDuplicateClaim(
  existingClaims: Claim[],
  memberId: string,
  policyId: string
): ValidationResult {
  const openStatuses: Claim['status'][] = [
    'Draft', 'Submitted', 'Documents Pending', 'Under Assessment', 'Query Raised', 'Investigation', 'Approved',
  ];
  const duplicate = existingClaims.find(
    (c) => c.memberId === memberId && c.policyId === policyId && openStatuses.includes(c.status)
  );
  if (duplicate) {
    return fail('VR-CLAIM-DUPLICATE', `An open claim already exists for this member (${duplicate.claimNumber})`);
  }
  return ok;
}

// VR-AUTH-01: Maker and approver cannot be the same person
export function validateMakerChecker(makerId: string, approverId: string): ValidationResult {
  if (makerId === approverId) {
    return fail('VR-AUTH-01', 'Maker and approver cannot be the same user');
  }
  return ok;
}

// VR-NOM-01: Nominee share percentages must sum to exactly 100
export function validateNomineeShares(nominees: Nominee[]): ValidationResult {
  if (nominees.length === 0) return fail('VR-NOM-01', 'At least one nominee is required');
  const total = nominees.reduce((sum, n) => sum + n.sharePercent, 0);
  if (total !== 100) {
    return fail('VR-NOM-01', `Nominee shares must total 100% (currently ${total}%)`);
  }
  return ok;
}

// VR-REN-01: Census must be locked before quote can be accepted
export function validateRenewalCensusLocked(censusLockedAt: string | undefined): ValidationResult {
  if (!censusLockedAt) {
    return fail('VR-REN-01', 'Census must be locked before accepting a renewal quote');
  }
  return ok;
}

// VR-END-01: Endorsement effective date cannot be in the past (beyond 30 days tolerance)
export function validateEndorsementDate(effectiveDate: string): ValidationResult {
  const effective = new Date(effectiveDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  if (effective < cutoff) {
    return fail('VR-END-01', 'Endorsement effective date cannot be more than 30 days in the past');
  }
  return ok;
}

// VR-SHARE-01: Sum of shares across nominees of a single member must equal 100
export function validateMemberNomineeShares(allNominees: Nominee[], memberId: string): ValidationResult {
  const memberNominees = allNominees.filter((n) => n.memberId === memberId);
  return validateNomineeShares(memberNominees);
}
