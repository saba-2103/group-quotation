// Tiny routing/proxy helpers for the Group PAS mock API layer.

import { NextResponse, type NextRequest } from 'next/server';

export type Handler = (
  req: NextRequest,
  params: Record<string, string>,
) => Promise<NextResponse> | NextResponse;

export interface RouteEntry {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pattern: string; // e.g. "quotes/:quoteId/plans/:planNo"
  handler: Handler;
}

// Splits the actual path against the pattern. Returns extracted params or null
// if the pattern doesn't match.
export function matchPath(
  pattern: string,
  actual: string,
): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean);
  const ap = actual.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    const pSeg = pp[i];
    const aSeg = ap[i];
    if (pSeg.startsWith(':')) {
      params[pSeg.slice(1)] = decodeURIComponent(aSeg);
    } else if (pSeg !== aSeg) {
      return null;
    }
  }
  return params;
}

export function json<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function ok(): NextResponse {
  return NextResponse.json({ ok: true });
}

export function notFound(path: string): NextResponse {
  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `No mock handler for ${path}`,
      path: `/${path}`,
    },
    { status: 404 },
  );
}

// Routes we keep handling locally even in proxy mode. Backend doesn't
// implement these — see context/ARCH_TRANSITION.md and SESSION_LOG.md
// 2026-05-07 backend-investigation entry. When the backend ships any of
// these (e.g. real Quote-level approval), drop the regex and let the
// proxy take over.
const MOCK_ONLY_PATTERNS: RegExp[] = [
  // UI-only maker-checker overlay (Quote + Proposal).
  /\/awaiting-approval$/,
  // Client-derived breakdown — V1 interim assumption #5; backend has no equiv.
  /\/pending-breakdown$/,
  // Proposal-scoped member shortcuts; backend uses /policies/:id/members.
  /\/issuance\/proposals\/[^/]+\/members\b/,
];

// Real-backend toggle. When GROUP_PAS_BACKEND_URL is set, requests short-
// circuit the mock layer and proxy to the live backend — except those
// matched by MOCK_ONLY_PATTERNS, which fall through to the local dispatcher.
export async function proxyIfConfigured(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse | null> {
  const backend = process.env.GROUP_PAS_BACKEND_URL;
  if (!backend) return null;

  const fullPath = '/' + pathSegments.join('/');
  if (MOCK_ONLY_PATTERNS.some((re) => re.test(fullPath))) {
    return null; // fall through to mock dispatcher
  }

  const search = req.nextUrl.searchParams.toString();
  const target = `${backend.replace(/\/$/, '')}/${pathSegments.join('/')}${
    search ? `?${search}` : ''
  }`;
  const init: RequestInit = {
    method: req.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  };
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const text = await req.text();
    if (text) init.body = text;
  }
  const upstream = await fetch(target, init);
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });
  const body = await upstream.text();
  if (!body) return new NextResponse(null, { status: upstream.status });
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function readJson<T>(req: NextRequest): Promise<T | undefined> {
  const text = await req.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

// Dispatches against an ordered route table; first match wins. Falls through
// to a per-method default for unmatched paths.
export async function dispatch(
  req: NextRequest,
  pathSegments: string[],
  routes: RouteEntry[],
): Promise<NextResponse> {
  const path = pathSegments.join('/');
  for (const route of routes) {
    if (route.method !== req.method) continue;
    const params = matchPath(route.pattern, path);
    if (params) return route.handler(req, params);
  }
  if (req.method === 'GET') return notFound(path);
  return ok();
}
