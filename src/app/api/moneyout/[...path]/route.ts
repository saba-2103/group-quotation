import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:8090/moneyout/api';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handleProxy(request: NextRequest, { params }: RouteContext) {
    const resolvedParams = await params;
    const method = request.method;
    const path = resolvedParams.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    let targetUrl = `${BACKEND_URL}/${path}${queryString}`;

    if (path === 'payouts/search') {
        const searchParamsObj = request.nextUrl.searchParams;
        if (!searchParamsObj.has('lob')) searchParamsObj.set('lob', '');
        if (!searchParamsObj.has('component')) searchParamsObj.set('component', '');
        if (!searchParamsObj.has('payoutState')) searchParamsObj.set('payoutState', '');
        if (!searchParamsObj.has('payoutReason')) searchParamsObj.set('payoutReason', '');
        if (!searchParamsObj.has('entityType')) searchParamsObj.set('entityType', '');
        if (!searchParamsObj.has('entityId')) searchParamsObj.set('entityId', '');
        if (!searchParamsObj.has('startDate')) searchParamsObj.set('startDate', '1900-01-01');
        if (!searchParamsObj.has('endDate')) searchParamsObj.set('endDate', '2100-01-01');
        if (!searchParamsObj.has('page')) searchParamsObj.set('page', '0');
        if (!searchParamsObj.has('size')) searchParamsObj.set('size', '50');
        targetUrl = `${BACKEND_URL}/${path}?${searchParamsObj.toString()}`;
    }

    try {
        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        };

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            // Check if body exists before parsing
            const text = await request.text();
            if (text) {
                if (method === 'POST' && path === 'payouts') {
                    const bodyObj = JSON.parse(text);
                    const mappedBody = {
                        payoutDate: bodyObj.payoutDate,
                        lob: bodyObj.lob,
                        component: bodyObj.component,
                        genType: "USER",
                        reason: bodyObj.reason,
                        primaryEntityType: bodyObj.primaryEntityType,
                        primaryEntityId: bodyObj.primaryEntityId,
                        transactionAmount: {
                            amount: bodyObj.amount,
                            currency: bodyObj.currency
                        },
                        remarks: bodyObj.remarks || "",
                        tender: {
                            payoutMode: bodyObj.payoutMode,
                            isDigital: true,
                            transactionAmount: {
                                amount: bodyObj.amount,
                                currency: bodyObj.currency
                            },
                            payeeName: bodyObj.payeeName,
                            payeeRole: "CLAIMANT",
                            payeeClientId: bodyObj.payeeClientId || "",
                            payeeBankAccount: bodyObj.payeeBankAccount || "",
                            payeeIfscCode: bodyObj.payeeIfscCode || "",
                            payeeSwiftCode: bodyObj.payeeSwiftCode || "",
                            remarks: bodyObj.tenderRemarks || ""
                        },
                        sources: [
                            {
                                entity1Type: bodyObj.primaryEntityType,
                                entity1Id: bodyObj.primaryEntityId,
                                entity2Type: bodyObj.secondaryEntityType || (bodyObj.component === "CLAIMS" ? "CLAIM" : "REFUND"),
                                entity2Id: bodyObj.secondaryEntityId || bodyObj.primaryEntityId,
                                transactionAmount: {
                                    amount: bodyObj.amount,
                                    currency: bodyObj.currency
                                },
                                sourceType: bodyObj.sourceType || (bodyObj.component === "CLAIMS" ? "CLAIM" : "CUST_REFUND"),
                                sourceDocumentId: bodyObj.sourceDocumentId || bodyObj.primaryEntityId,
                                remarks: bodyObj.sourceRemarks || bodyObj.reason
                            }
                        ]
                    };
                    fetchOptions.body = JSON.stringify(mappedBody);
                } else {
                    fetchOptions.body = text;
                }
            }
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Handle no content response
        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        const text = await response.text();
        if (!text) {
            return new NextResponse(null, { status: response.status });
        }

        const data = JSON.parse(text);
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error(`Error proxying request to ${targetUrl}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch from backend', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest, context: RouteContext) {
    return handleProxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
    return handleProxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
    return handleProxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    return handleProxy(request, context);
}
