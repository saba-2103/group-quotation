import { NextResponse } from 'next/server';

const pendingQuotationsMockData = [
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
        policyNumber: "POL001",
        masterPolicyNumber: "-",
        isMasterPolicy: "No",
        tranno: "TXN9876",
        branch: "Mumbai",
        policyClassification: "Standard",
        productMix: "Term Life Package",
    },
    {
        id: "2",
        quotationNumber: "QBAG00000000002",
        effectiveDate: "2025-12-01",
        clientName: "Reliance Petrolium Ltd",
        quotationClassification: "Group Term Life",
        riskTermClassification: "Yearly renewable",
        policyNumber: "POL002",
        isMasterPolicy: "Yes",
    }
];

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const quotation = pendingQuotationsMockData.find(q => q.id === id);

    if (quotation) {
        return NextResponse.json(quotation);
    }

    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
}
