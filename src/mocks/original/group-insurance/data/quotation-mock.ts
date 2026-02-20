import type { RowData, RecordData } from "@shared/types";

/**
 * Mock record detail data
 */
const recordDetailData: RecordData = {
  id: "1",
  quotationNumber: "QBAG00000000001",
  clientName: "Reliance Group",
  policyType: "Group Term Life",
  policyNumber: "",
  masterPolicyNumber: "321013",
  isMasterPolicy: false,
  tranno: "",
  branch: "Mumbai",
  policyClassification: "True Group",
  productMix: "Investment products only",
  riskTermClassification: "Yearly renewable",
  effectiveDate: "2025-12-01",
};

// ============================================
// Pending Quotations List Mock
// ============================================

const pendingQuotationsMockData: RowData[] = [
  {
    id: "1",
    quotationNumber: "QBAG00000000001",
    effectiveDate: "2025-12-01",
    quotationType: "New Business",
    clientName: "Reliance Group",
    quotationClassification: "Group Term Life",
    riskTermClassification: "Yearly renewable",
    quoteVersion: "V1.0",
    mainStatus: "Pending",
    secondaryStatus: "Initial due diligence with Prospect",
    lineOfBusiness: "Term Life",
    transactionStatus: "Active",
    channel: "Broker",
    agentName: "Marsh Insurance Brokers",
  },
  {
    id: "2",
    quotationNumber: "QBAG00000000002",
    effectiveDate: "2025-12-01",
    quotationType: "New Business",
    clientName: "Reliance Petrolium Ltd",
    quotationClassification: "Group Term Life",
    riskTermClassification: "Yearly renewable",
    quoteVersion: "V1.0",
    mainStatus: "Pending",
    secondaryStatus: "Gathering initial data from Prospect",
    lineOfBusiness: "Term Life",
    transactionStatus: "Active",
    channel: "Agent",
    agentName: "AON Insurance Brokers",
  },
  {
    id: "3",
    quotationNumber: "QBAG00000000003",
    effectiveDate: "2025-12-01",
    quotationType: "Renewal",
    clientName: "Bajaj Finance Ltd",
    quotationClassification: "Group Credit Life",
    riskTermClassification: "Long term with no renewals",
    quoteVersion: "V2.0",
    mainStatus: "Pending",
    secondaryStatus: "Pricing",
    lineOfBusiness: "Credit Life",
    transactionStatus: "Active",
    channel: "Direct",
    agentName: "",
  },
  {
    id: "4",
    quotationNumber: "QBAG00000000004",
    effectiveDate: "2025-12-01",
    quotationType: "New Business",
    clientName: "Motilal Oswal Home Finance Ltd",
    quotationClassification: "Group Credit Life",
    riskTermClassification: "Long term with no renewals",
    quoteVersion: "V1.0",
    mainStatus: "Pending",
    secondaryStatus: "Quote follow-up",
    lineOfBusiness: "Credit Life",
    transactionStatus: "Active",
    channel: "Broker",
    agentName: "Willis Towers Watson",
  },
  {
    id: "5",
    quotationNumber: "QBAG00000000005",
    effectiveDate: "2025-12-01",
    quotationType: "New Business",
    clientName: "Muthoot Finance",
    quotationClassification: "Group Credit Life",
    riskTermClassification: "Long term with no renewals",
    quoteVersion: "V1.1",
    mainStatus: "Pending",
    secondaryStatus: "Quote accepted by Prospect",
    lineOfBusiness: "Credit Life",
    transactionStatus: "Active",
    channel: "Agent",
    agentName: "John Smith",
  },
];

export const getPendingQuotationsListMock = async (): Promise<RowData[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return pendingQuotationsMockData;
};

/**
 * Get record details by ID (generic mock)
 */
export const getRecordDetailMock = (_id: string): RecordData => {
  // For now, return the same mock data regardless of ID
  return recordDetailData;
};
