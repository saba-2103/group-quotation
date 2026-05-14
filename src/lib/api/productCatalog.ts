// Typed clients for the Product Catalog API
// (group-pas/productCatalog ProductCatalogController). Mirrors the
// quotation/issuance/policy-admin client shape — thin wire callers that
// React Query hooks wrap. Catalog is advisory until the real Product
// Configurator + Rule Engine ship; same wire shape, local swap-out.

import type { Plan, PlanBenefit, PlanProduct } from '@/types/group-pas/common';

import { api } from './client';

const BASE = '/api/product-catalog';

export const listPlans = () => api.get<Plan[]>(`${BASE}/plans`);

export const listProducts = () => api.get<PlanProduct[]>(`${BASE}/products`);

export const listBenefits = () => api.get<PlanBenefit[]>(`${BASE}/benefits`);
