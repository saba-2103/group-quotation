// ─── Enums ────────────────────────────────────────────────────────────────────

export enum RfqStatus {
  DATA_PENDING = 'DATA_PENDING',
  CENSUS_CLEANED = 'CENSUS_CLEANED',
  EXPERIENCE_NORMALIZED = 'EXPERIENCE_NORMALIZED',
  BENEFITS_READY = 'BENEFITS_READY',
  PRICING = 'PRICING',
  PRICING_IN_PROGRESS = 'PRICING_IN_PROGRESS',
  UW_REVIEW = 'UW_REVIEW',
  QUOTE_GENERATED = 'QUOTE_GENERATED',
  SHARED = 'SHARED',
  NEGOTIATION = 'NEGOTIATION',
  FINAL = 'FINAL',
  ISSUED = 'ISSUED',
  REJECTED = 'REJECTED',
}

export enum BusinessType {
  NEW = 'NEW',
  RENEWAL = 'RENEWAL',
  TAKEOVER = 'TAKEOVER',
}

export enum SchemeType {
  EMPLOYER_OBLIGATORY = 'EMPLOYER_OBLIGATORY',
  EMPLOYER_VOLUNTARY = 'EMPLOYER_VOLUNTARY',
  AFFINITY = 'AFFINITY',
  MICRO = 'MICRO',
}

export enum SchemeUsage {
  EMPLOYER_EMPLOYEE = 'Employer–employee',
  NON_EMPLOYER_EMPLOYEE = 'Non employer–employee',
}

export enum ParticipationType {
  COMPULSORY = 'COMPULSORY',
  VOLUNTARY = 'VOLUNTARY',
}

export enum LobType {
  GTL = 'GTL',
}

export enum IntermediaryType {
  BROKER = 'BROKER',
  CORPORATE_AGENT = 'CORPORATE_AGENT',
  DIRECT = 'DIRECT',
  BANCASSURANCE = 'BANCASSURANCE',
}

export enum QuoteSegment {
  SME = 'SME',
  MID = 'MID',
  LARGE = 'LARGE',
}

export enum PricingBasis {
  MANUAL = 'MANUAL',
  EXPERIENCE = 'EXPERIENCE',
  BLEND = 'BLEND',
}

export enum SumAssuredBasis {
  FLAT = 'FLAT',
  SALARY_MULTIPLE = 'SALARY_MULTIPLE',
  GRADE_SLAB = 'GRADE_SLAB',
}

export enum CoverPattern {
  LEVEL = 'LEVEL',
  REDUCING = 'REDUCING',
}

export enum TermBasis {
  POLICY_YEAR = 'POLICY_YEAR',
  MEMBER_SPECIFIC = 'MEMBER_SPECIFIC',
}

export enum LivesCovered {
  MEMBER_ONLY = 'MEMBER_ONLY',
  MEMBER_SPOUSE = 'MEMBER_SPOUSE',
  FAMILY_VARIANTS = 'FAMILY_VARIANTS',
}

export enum RiskTermClassification {
  LEVEL = 'LEVEL',
  DECREASING = 'DECREASING',
  STEP_UP = 'STEP_UP',
  MULTI_LAYER = 'MULTI_LAYER',
}

export enum PlanStructure {
  SINGLE_PLAN = 'SINGLE_PLAN',
  MULTI_PLAN = 'MULTI_PLAN',
}

export enum VersionStatus {
  DRAFT = 'DRAFT',
  SHARED = 'SHARED',
  SELECTED = 'SELECTED',
  FROZEN = 'FROZEN',
  ARCHIVED = 'ARCHIVED',
}

export enum HandoffKind {
  ACTUARY = 'ACTUARY',
  UW = 'UW',
  OPS = 'OPS',
}

export enum HandoffStatus {
  REQUESTED = 'REQUESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PUBLISHED = 'PUBLISHED',
  RETURNED = 'RETURNED',
}

export enum PlanHandoffStatus {
  DRAFT = 'DRAFT',
  PRICING_REQUESTED = 'PRICING_REQUESTED',
  UW_REFERRED = 'UW_REFERRED',
  PRICED = 'PRICED',
  RETURNED = 'RETURNED',
}

export enum NegotiationParty {
  BROKER = 'BROKER',
  INSURER = 'INSURER',
}

export enum NegotiationKind {
  COUNTER = 'COUNTER',
  ACCEPT = 'ACCEPT',
  DECLINE = 'DECLINE',
}

export enum EscalationKind {
  FREEZE_VERSION = 'FREEZE_VERSION',
  EXTRA_DISCOUNT = 'EXTRA_DISCOUNT',
  POLICY_FLAG = 'POLICY_FLAG',
}

export enum EscalationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum FclPattern {
  NONE = 'NONE',
  OVERALL = 'OVERALL',
  BY_GRADE = 'BY_GRADE',
  BY_AGE_BAND = 'BY_AGE_BAND',
  BY_GENDER = 'BY_GENDER',
  BY_CATEGORY = 'BY_CATEGORY',
}

export enum DocumentType {
  SIGNED_PROPOSAL = 'SIGNED_PROPOSAL',
  QUOTE_ACCEPTANCE = 'QUOTE_ACCEPTANCE',
  BOARD_RESOLUTION = 'BOARD_RESOLUTION',
  FINAL_PLACEMENT_LETTER = 'FINAL_PLACEMENT_LETTER',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  SIGNED = 'SIGNED',
  APPROVED = 'APPROVED',
}

export enum CensusQuality {
  G = 'Good',
  A = 'Average',
  R = 'Poor',
}

export enum GateStatus {
  PASS = 'PASS',
  WARN = 'WARN',
  FAIL = 'FAIL',
}

export enum MilestoneState {
  DONE = 'DONE',
  IN_PROGRESS = 'IN_PROGRESS',
  WARNING = 'WARNING',
  TODO = 'TODO',
  BLOCKED = 'BLOCKED',
}

export enum MpCategory {
  SME = 'SME',
  MID = 'MID',
  LARGE = 'LARGE',
  ULTRA_LARGE = 'ULTRA_LARGE',
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PriorPolicy {
  insurer?: string;
  masterPolicyNumber?: string;
  premium?: number;
  lossRatio?: number;
  experienceAvailable?: boolean;
  experienceYears?: number;
  fclBasis?: string;
}

export interface PolicyConfig {
  policyYearStart?: string;
  policyYearEnd?: string;
  gracePeriodDays: number;
  billingFrequency: string;
  collectionMethod: string;
  subsidiariesEnabled: boolean;
}

export interface DefaultPlanStructure {
  planStructure: PlanStructure;
  sumAssuredBasis: SumAssuredBasis;
  gradeMapping: boolean;
  defaultPlanCount?: number;
  pricingBasis: PricingBasis;
}

export interface CensusSummary {
  totalLives: number;
  quality: { trafficLight: CensusQuality };
}

export interface MphAppetite {
  category: string;
  maxDiscountPct: number;
  uwAuthorityBand: string;
  preapprovedCardRef?: string;
}

export interface FclPolicy {
  quoteDefault: FclPattern;
  byVersion: Record<string, FclPattern>;
}

export interface ProductPin {
  productCode: string;
  filedVersion: string;
  contentHash: string;
}

export interface ValidationReceipt {
  configHash: string;
  productPins: ProductPin[];
  validatedAt: string;
}

export interface QuoteVersion {
  id: string;
  versionNo: number;
  name: string;
  note?: string;
  status: VersionStatus;
  fclPatternOverride?: FclPattern;
  validationReceipt?: ValidationReceipt;
  createdAt: string;
}

export interface NegotiationRound {
  roundNo: number;
  party: NegotiationParty;
  kind: NegotiationKind;
  versionId: string;
  askDiscountPct?: number;
  askPremium?: number;
  note?: string;
  by: string;
  at: string;
}

export interface PlanPriceResult {
  planId: string;
  premium: number;
  lives: number;
  effectiveDiscountPct: number;
}

export interface PriceRun {
  technicalPremium: number;
  breakEvenFloor: number;
  negotiatedPremium: number;
  modelFactor: number;
  feasible: boolean;
  finalPremiumInclGst: number;
  perLifePremium: number;
  lives: number;
  pricedAt: string;
  byPlan: Record<string, PlanPriceResult>;
}

export interface ActuaryPricing {
  byVersion: Record<string, PriceRun>;
}

export interface SalesOwner {
  userId: string;
  name: string;
}

export interface FinalRateCard {
  ref: string;
  insurer: string;
  grossUpFactor: number;
  gstPct: number;
  blendedRatePermille: number;
  scheduleCellCount: number;
  allocatedAt: string;
}

export interface ExcludedClause {
  code: string;
  label: string;
  byDesk: string;
  reason: string;
}

export interface RfqBase {
  rfqId: string;
  employerName: string;
  industry?: string;
  statusStage: RfqStatus;
  businessType: BusinessType;
  schemeType: SchemeType;
  lob: LobType;
  participationType: ParticipationType;
  schemeUsage: SchemeUsage;
  intermediaryType?: IntermediaryType;
  brokerName?: string;
  brokerCode?: string;
  channel?: string;
  quoteSegment?: QuoteSegment;
  effectiveDate?: string;
  policyConfig: PolicyConfig;
  defaultPlanStructure: DefaultPlanStructure;
  priorPolicy?: PriorPolicy;
  sumAssuredBasis: SumAssuredBasis;
  coverPattern: CoverPattern;
  termBasis: TermBasis;
  livesCovered: LivesCovered;
  riskTermClassification?: RiskTermClassification;
  activeVersionId: string;
  quoteVersions: QuoteVersion[];
  negotiationLog: NegotiationRound[];
  gradeAllocations: Record<string, Record<string, string>>;
  actuaryPricing: ActuaryPricing;
  mphAppetite?: MphAppetite;
  fclPolicy: FclPolicy;
  finalRateCard?: FinalRateCard;
  salesOwner?: SalesOwner;
  censusSummary?: CensusSummary;
  headcountData?: HeadcountData;
  masterPolicyNumber?: string;
  issuedAt?: string;
  policyDetails?: PolicyDetails;
  finalPlacement?: FinalPlacement;
  updatedAt: string;
  createdAt: string;
}

export interface PolicyDetails {
  endorsementSchedule?: string;
  reinsuranceMethod?: 'PROPORTIONAL' | 'NON_PROPORTIONAL' | 'NONE';
  specialTerms?: string;
  renewalTerms?: string;
  signingDate?: string;
}

export interface FinalPlacement {
  placementDate?: string;
  broker?: string;
  commissionPct?: number;
  placementNotes?: string;
  finalPremiumConfirmed?: number;
  policyDeliveredDate?: string;
}

export interface PolicyFlag {
  id: string;
  label: string;
  value: boolean;
  requiresEscalation: boolean;
  escalationKind: EscalationKind;
}

export interface Plan {
  planId: string;
  rfqId: string;
  quoteVersionId: string;
  name: string;
  productCode?: string;
  sumAssuredBasis: SumAssuredBasis;
  coverPattern: CoverPattern;
  eligibilityCriteria?: string;
  uwMethod?: string;
  rateCardRef?: string;
  benefits: string[];
  excludedClauses: ExcludedClause[];
  handoffStatus: PlanHandoffStatus;
  handoffTaskId?: string;
  completeness: number;
}

export interface Coverage {
  coverageId: string;
  memberNumber: string;
  planId: string;
  status: string;
  sumAssured: number;
}

export interface Member {
  memberNumber: string;
  rfqId: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  grade: string;
  salary: number;
  sumAssured: number;
  coverages: Coverage[];
}

export interface Subsidiary {
  subsidiaryId: string;
  rfqId: string;
  name: string;
  registrationNumber?: string;
  lives: number;
}

export interface ClaimsYear {
  year: number;
  lives: number;
  premium: number;
  claims: number;
  lossRatio: number;
}

export interface GradeRow {
  grade: string;
  lives: number;
  avgSalary: number;
  avgSumAssured: number;
}

export interface HeadcountData {
  totalLives: number;
  grades: GradeRow[];
}

export interface LargeLoss {
  id: string;
  year: number;
  amount: number;
  cause: string;
  note?: string;
}

export interface ClaimsExperience {
  rfqId: string;
  years: ClaimsYear[];
  largeLosses: LargeLoss[];
}

export interface Document {
  documentId: string;
  rfqId: string;
  type: DocumentType;
  status: DocumentStatus;
  name: string;
  uploadedAt: string;
  source: string;
}

export interface HandoffTask {
  taskId: string;
  rfqId: string;
  planId: string;
  versionId: string;
  kind: HandoffKind;
  status: HandoffStatus;
  reason: string;
  note?: string;
  lives: number;
  slaHours: number;
  requestedAt: string;
  startedAt?: string;
  returnedAt?: string;
  publishedAt?: string;
  returnNote?: string;
  publishedPremium?: number;
  publishedDiscountPct?: number;
  publishedNote?: string;
}

export interface Escalation {
  id: string;
  kind: EscalationKind;
  rfqId: string;
  versionId?: string;
  subject: string;
  askedPct?: number;
  bufferPct?: number;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  status: EscalationStatus;
  decisionNote?: string;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isCustom: boolean;
  censusAware: boolean;
}

export interface RfqBundle extends RfqBase {
  plans: Plan[];
  members: Member[];
  subsidiaries: Subsidiary[];
  documents: Document[];
  claimsExperience?: ClaimsExperience;
  policyFlags?: PolicyFlag[];
}
