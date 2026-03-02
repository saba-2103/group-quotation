import { NextResponse } from 'next/server';

const pendingQuotationsMockData: any[] = [
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

export async function GET() {
    return NextResponse.json(pendingQuotationsMockData);
}

export async function POST(request: Request) {
    const body = await request.json() as Record<string, any>;
    const newQuotation = {
        ...body,
        id: String(pendingQuotationsMockData.length + 1),
        quotationNumber: `QBAG${Date.now()}`,
        quoteVersion: "V1.0",
        mainStatus: "Pending",
        secondaryStatus: "Draft",
        transactionStatus: "Active",
    };
    pendingQuotationsMockData.push(newQuotation);
    return NextResponse.json(newQuotation, { status: 201 });
}
