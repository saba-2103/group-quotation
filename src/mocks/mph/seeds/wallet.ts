import { Wallet, WalletLedgerEntry, BankGuarantee } from '../types';

export const wallets: Wallet[] = [
  {
    id: 'wallet-001',
    policyId: 'pol-gtl-001',
    organizationId: 'org-001',
    type: 'CD',
    balance: 450000,
    currency: 'INR',
    status: 'Active',
    lastUpdatedAt: '2026-04-28T09:00:00Z',
    createdAt: '2024-04-01T00:00:00Z',
  },
  {
    id: 'wallet-002',
    policyId: 'pol-gcl-002',
    organizationId: 'org-001',
    type: 'CD',
    balance: 85000,
    currency: 'INR',
    status: 'Active',
    lastUpdatedAt: '2026-04-15T10:00:00Z',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'wallet-003',
    policyId: 'pol-sav-003',
    organizationId: 'org-001',
    type: 'Fund',
    balance: 48500000,
    currency: 'INR',
    status: 'Active',
    lastUpdatedAt: '2026-03-31T23:59:59Z',
    createdAt: '2020-04-01T00:00:00Z',
  },
];

export const walletLedger: WalletLedgerEntry[] = [
  // pol-gtl-001 CD account entries
  { id: 'led-001', walletId: 'wallet-001', policyId: 'pol-gtl-001', type: 'Credit', amount: 500000, balance: 500000, description: 'Initial CD deposit — policy inception', referenceId: 'bill-002', transactionDate: '2024-04-01T00:00:00Z' },
  { id: 'led-002', walletId: 'wallet-001', policyId: 'pol-gtl-001', type: 'Debit', amount: 25000, balance: 475000, description: 'Debit for endorsement processing — END-2024-001', referenceId: 'end-001', transactionDate: '2024-06-01T00:00:00Z' },
  { id: 'led-003', walletId: 'wallet-001', policyId: 'pol-gtl-001', type: 'Credit', amount: 50000, balance: 525000, description: 'Top-up credit', referenceId: null, transactionDate: '2024-10-15T00:00:00Z' },
  { id: 'led-004', walletId: 'wallet-001', policyId: 'pol-gtl-001', type: 'Debit', amount: 75000, balance: 450000, description: 'Annual renewal endorsement processing fee', referenceId: 'ren-001', transactionDate: '2025-04-05T00:00:00Z' },

  // pol-gcl-002 CD account entries
  { id: 'led-005', walletId: 'wallet-002', policyId: 'pol-gcl-002', type: 'Credit', amount: 100000, balance: 100000, description: 'Initial CD deposit — GCL policy inception', referenceId: null, transactionDate: '2024-06-01T00:00:00Z' },
  { id: 'led-006', walletId: 'wallet-002', policyId: 'pol-gcl-002', type: 'Debit', amount: 15000, balance: 85000, description: 'Processing fee — member additions Q3 2024', referenceId: 'end-010', transactionDate: '2024-09-30T00:00:00Z' },

  // pol-sav-003 Fund entries
  { id: 'led-007', walletId: 'wallet-003', policyId: 'pol-sav-003', type: 'Credit', amount: 35000000, balance: 35000000, description: 'Opening fund balance transferred', referenceId: null, transactionDate: '2020-04-01T00:00:00Z' },
  { id: 'led-008', walletId: 'wallet-003', policyId: 'pol-sav-003', type: 'Credit', amount: 7500000, balance: 42500000, description: 'Annual contribution 2023-24', referenceId: 'bill-011', transactionDate: '2024-04-25T00:00:00Z' },
  { id: 'led-009', walletId: 'wallet-003', policyId: 'pol-sav-003', type: 'Credit', amount: 2600000, balance: 45100000, description: 'Investment income FY 2024-25', referenceId: null, transactionDate: '2025-03-31T23:59:59Z' },
  { id: 'led-010', walletId: 'wallet-003', policyId: 'pol-sav-003', type: 'Debit', amount: 6500000, balance: 38600000, description: 'Gratuity claim paid — mbr-049 (CLM-SAV-2026-012)', referenceId: 'clm-012', transactionDate: '2026-01-31T00:00:00Z' },
  { id: 'led-011', walletId: 'wallet-003', policyId: 'pol-sav-003', type: 'Credit', amount: 9900000, balance: 48500000, description: 'Annual contribution 2024-25 (partial — balance overdue)', referenceId: 'bill-012', transactionDate: '2026-03-31T23:59:59Z' },
];

export const bankGuarantees: BankGuarantee[] = [
  {
    id: 'bg-001',
    policyId: 'pol-gtl-001',
    organizationId: 'org-001',
    bgNumber: 'BG-HDFC-2024-001',
    bankName: 'HDFC Bank',
    amount: 1000000,
    currency: 'INR',
    issuedDate: '2024-04-01',
    expiryDate: '2027-03-31',
    status: 'Active',
    purpose: 'Security deposit for Group Term Life policy',
    documentUrl: null,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-04-01T00:00:00Z',
  },
];
