// Mock catch-all for the Product Catalog API
// (group-pas/productCatalog/.../ProductCatalogController.java).
// Set GROUP_PAS_BACKEND_URL to short-circuit the mock layer and proxy to the
// live backend instead. Fixture is a direct port of StubProductCatalogClient.

import type { NextRequest, NextResponse } from 'next/server';

import {
  CATALOG_BENEFITS,
  CATALOG_PLANS,
  CATALOG_PRODUCTS,
} from '@/lib/api-mock/group-pas/fixtures/product-catalog';
import {
  dispatch,
  json,
  proxyIfConfigured,
  type RouteEntry,
} from '@/lib/api-mock/group-pas/http';

type RouteContext = { params: Promise<{ path?: string[] }> };

const routes: RouteEntry[] = [
  {
    method: 'GET',
    pattern: 'plans',
    handler: () => json(CATALOG_PLANS),
  },
  {
    method: 'GET',
    pattern: 'products',
    handler: () => json(CATALOG_PRODUCTS),
  },
  {
    method: 'GET',
    pattern: 'benefits',
    handler: () => json(CATALOG_BENEFITS),
  },
];

async function handle(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path = [] } = await ctx.params;
  const proxied = await proxyIfConfigured(req, ['api', 'product-catalog', ...path]);
  if (proxied) return proxied;
  return dispatch(req, path, routes);
}

export const GET = handle;
