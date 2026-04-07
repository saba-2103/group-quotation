import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://group-pas-dev.anairacloud.com/api';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handleProxy(request: NextRequest, { params }: RouteContext) {
    const resolvedParams = await params;
    const method = request.method;
    const path = resolvedParams.path?.join('/') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const targetUrl = `${BACKEND_URL}/${path}${queryString}`;

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
                fetchOptions.body = text;
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
