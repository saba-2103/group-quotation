import { organizations } from '../seeds/organizations';
import { users } from '../seeds/users';
import { policies } from '../seeds/policies';
import { members } from '../seeds/members';
import { nominees } from '../seeds/nominees';
import { endorsements } from '../seeds/endorsements';
import { claims } from '../seeds/claims';
import { claimDocuments } from '../seeds/claim-documents';
import { renewals } from '../seeds/renewals';
import { billingStatements } from '../seeds/billing';
import { documents } from '../seeds/documents';
import { corporateDocuments } from '../seeds/corporate-documents';
import { bankProfiles } from '../seeds/bank-profiles';
import { wallets, walletLedger, bankGuarantees } from '../seeds/wallet';
import { setupCases } from '../seeds/setup-cases';
import { auditLog } from '../seeds/audit-log';
import { tasks } from '../seeds/tasks';
import { notifications } from '../seeds/notifications';
import { serviceRequests } from '../seeds/service-requests';

import type {
  Organization,
  MPHUser,
  Policy,
  Member,
  Nominee,
  Endorsement,
  Claim,
  ClaimDocument,
  Renewal,
  BillingStatement,
  Document,
  CorporateDocument,
  BankProfile,
  Wallet,
  WalletLedgerEntry,
  BankGuarantee,
  SetupCase,
  AuditEntry,
  Task,
  Notification,
  ServiceRequest,
} from '../types';

export interface MPHStore {
  organizations: Organization[];
  users: MPHUser[];
  policies: Policy[];
  members: Member[];
  nominees: Nominee[];
  endorsements: Endorsement[];
  claims: Claim[];
  claimDocuments: ClaimDocument[];
  renewals: Renewal[];
  billingStatements: BillingStatement[];
  documents: Document[];
  corporateDocuments: CorporateDocument[];
  bankProfiles: BankProfile[];
  wallets: Wallet[];
  walletLedger: WalletLedgerEntry[];
  bankGuarantees: BankGuarantee[];
  setupCases: SetupCase[];
  auditLog: AuditEntry[];
  tasks: Task[];
  notifications: Notification[];
  serviceRequests: ServiceRequest[];
}

function deepClone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

function createStore(): MPHStore {
  return {
    organizations: deepClone(organizations),
    users: deepClone(users),
    policies: deepClone(policies),
    members: deepClone(members),
    nominees: deepClone(nominees),
    endorsements: deepClone(endorsements),
    claims: deepClone(claims),
    claimDocuments: deepClone(claimDocuments),
    renewals: deepClone(renewals),
    billingStatements: deepClone(billingStatements),
    documents: deepClone(documents),
    corporateDocuments: deepClone(corporateDocuments),
    bankProfiles: deepClone(bankProfiles),
    wallets: deepClone(wallets),
    walletLedger: deepClone(walletLedger),
    bankGuarantees: deepClone(bankGuarantees),
    setupCases: deepClone(setupCases),
    auditLog: deepClone(auditLog),
    tasks: deepClone(tasks),
    notifications: deepClone(notifications),
    serviceRequests: deepClone(serviceRequests),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __mphStore: MPHStore | undefined;
}

export function getStore(): MPHStore {
  if (!global.__mphStore) {
    global.__mphStore = createStore();
  }
  return global.__mphStore;
}

export function resetStore(): void {
  global.__mphStore = createStore();
}
