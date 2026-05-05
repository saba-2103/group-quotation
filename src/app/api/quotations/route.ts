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
        transactionStatus: "DR",
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
        transactionStatus: "CM",
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
        transactionStatus: "RV",
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
        transactionStatus: "RC",
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
        transactionStatus: "AC",
        channel: "Agent",
        agentName: "John Smith",
    },
    {
        id: "6",
        quotationNumber: "QBAG00000000006",
        effectiveDate: "2025-12-01",
        quotationType: "Renewal",
        clientName: "HDFC Life Insurance",
        quotationClassification: "Group Term Life",
        riskTermClassification: "Yearly renewable",
        quoteVersion: "V1.0",
        mainStatus: "Pending",
        secondaryStatus: "Awaiting Documents",
        lineOfBusiness: "Term Life",
        transactionStatus: "AD",
        channel: "Broker",
        agentName: "Aon Hewitt",
    },
    {
        id: "7",
        quotationNumber: "QBAG00000000007",
        effectiveDate: "2025-12-01",
        quotationType: "New Business",
        clientName: "Tata Capital Ltd",
        quotationClassification: "Group Credit Life",
        riskTermClassification: "Long term with no renewals",
        quoteVersion: "V1.0",
        mainStatus: "Pending",
        secondaryStatus: "Withdrawn",
        lineOfBusiness: "Credit Life",
        transactionStatus: "IA",
        channel: "Direct",
        agentName: "",
    },
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    let filteredData = [...pendingQuotationsMockData];

    // Basic filtering logic
    searchParams.forEach((value, key) => {
        if (!value || value === 'All') return;

        filteredData = filteredData.filter(item => {
            const itemValue = (item as any)[key];
            if (itemValue === undefined) return true; // Skip keys not in data

            // Case-insensitive partial match for strings
            if (typeof itemValue === 'string') {
                return itemValue.toLowerCase().includes(value.toLowerCase());
            }

            // Exact match for other types
            return String(itemValue) === value;
        });
    });

    return NextResponse.json(filteredData);
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
        transactionStatus: "AC",
    };
    pendingQuotationsMockData.push(newQuotation);
    return NextResponse.json(newQuotation, { status: 201 });
}
