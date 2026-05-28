---
id: PROP-0014
title: Replace raw-JSON plan editor with Product Catalog compose flow
status: draft
proposer: agent:propose
created: 2026-05-13
category: component
impact: high
effort: m
evidence:
  - https://github.com/Anaira-AI/group-pas/pull/45
  - /Users/seriousblack/dev_anaira/group-pas/group-pas/productCatalog/src/main/java/com/anaira/productcatalog/ProductCatalogController.java
  - /Users/seriousblack/dev_anaira/group-pas/group-pas/productCatalog/src/main/java/com/anaira/productcatalog/StubProductCatalogClient.java
  - src/components/widgets/forms/PlanForm.tsx
  - src/components/widgets/data/PlanCard.tsx
  - src/types/group-pas/common.ts
related:
  - PROP-0004
pr: null
---

## Problem

PROP-0004 shipped the Plans tab card grid with a deliberately interim editor: `productsJson` / `coverAmountFormulaJson` / `freeCoverLimitFormulaJson` are raw JSON textareas. That's fine for read-side parity but unusable for the demo's compose narrative — a broker cannot meaningfully hand-write a `PlanProduct[]` array with nested benefits and exclusions. PROP-0004 explicitly deferred the structured editor.

Backend now provides what was missing. PR #45 (`pranay/product-catalog-mock`, merged 2026-05-11, on `paspas` branch of `group-pas`) ships a stub Product Catalog module with three GETs under `/api/product-catalog`: `plans` (4 sample bouquets), `products` (6: GTL-BASE + ADB/APD/CI/TPD-RIDER/WP), `benefits` (32 incl. all 25 IRDAI critical-illness conditions). Response shape is the exact `Plan / PlanProduct / PlanBenefit / PlanExclusion` types already in [src/types/group-pas/common.ts:36-62](src/types/group-pas/common.ts) — zero FE type churn. The catalog is the source of truth for the compose flow until the real Product Configurator lands; swap is local (same wire contract).

## Proposed change

Three layered additions; the compose-flow POST target stays at the existing `/api/quotation/quotes/{id}/plans`, so PROP-0004's CardGrid + ActionBar wiring is untouched.

1. **Proxy/mock route** — new `src/app/api/product-catalog/[[...path]]/route.ts`, mirroring the pattern at [src/app/api/quotation/[[...path]]/route.ts](src/app/api/quotation/[[...path]]/route.ts): use `proxyIfConfigured` when `GROUP_PAS_BACKEND_URL` is set, else serve a fixture under `src/lib/api-mock/group-pas/fixtures/product-catalog.ts` whose contents are a direct port of `StubProductCatalogClient` (4 plans, 6 products, 32 benefits). One source of truth, both modes return identical JSON.

2. **Typed client** — `src/lib/api/productCatalog.ts` exposing `listPlans(): Promise<Plan[]>`, `listProducts(): Promise<PlanProduct[]>`, `listBenefits(): Promise<PlanBenefit[]>`. No new types; consume existing ones from `@/types/group-pas/common`.

3. **Compose UI in PlanForm** — rework [src/components/widgets/forms/PlanForm.tsx](src/components/widgets/forms/PlanForm.tsx) to drive the products repeater from the catalog instead of a JSON textarea:
   - **Pick-a-template (optional)**: dropdown of `plans[]` (`GTL-BASIC / GTL-STANDARD / GTL-COMPREHENSIVE / GCL-BASIC`); selecting one seeds `products[]` + `coverAmountFormula` + `freeCoverLimitFormula` + `rateCardFile` from the catalog plan, then user can edit.
   - **Add product**: multi-select against `products[]` filtered by `productType` (BASE first, then RIDER). Adding a product pulls its `benefits[]` and `exclusions[]` from the catalog as the starting bouquet.
   - **Per-product benefit toggles**: each benefit shows `mandatory` flag (read-only when `true`); non-mandatory benefits (e.g. `ACCIDENTAL_PPD` on APD) are removable.
   - **Per-product exclusion toggles**: standard product-level exclusions render as removable chips (e.g. `HAZARDOUS_PURSUITS` for white-collar groups).
   - **Cover-amount + free-cover-limit**: keep the existing `AmountFormulaField` from PROP-0004 — schema unchanged, but pre-fill from chosen template.
   - **Raw-JSON escape hatch**: collapsed "Advanced" disclosure that still allows pasting JSON, in case the catalog doesn't yet have a product the user needs. Belt-and-braces for v1.

PlanCard read-side ([src/components/widgets/data/PlanCard.tsx](src/components/widgets/data/PlanCard.tsx)) needs no changes — it already renders the same shape.

**Out of scope (v1):** server-side validation of composed codes (catalog is advisory per PR #45), per-rider cover caps (no model yet), policy-level vs rider-specific exclusion bifurcation. Flag these in the form's helper text so the demo narrative is honest.

## Alternatives considered

- **Keep raw-JSON editor, just document the catalog endpoints.** Rejected — the catalog exists *specifically* to unblock the FE compose flow per PR #45's "Demo narrative" section. Not consuming it leaves the demo with a hand-typed JSON gap exactly where the storyline needs the broker clicking through products and benefits.
- **Drive everything from `/plans` (templates) and skip `/products` + `/benefits`.** Rejected — templates alone don't let the user *modify* the bouquet (add a rider, drop a benefit). PR #45's demo narrative explicitly opens with `/products` and treats `/plans` as a starting-point shortcut.
- **Wait for the real Product Configurator / Rule Engine.** Rejected — the stub was built for FE consumption now; swap-out is local (same Plan/PlanProduct/PlanBenefit/PlanExclusion shape) when the real backend lands. Deferring blocks the compose narrative indefinitely.
- **Cache the catalog at module-load and avoid the proxy route.** Rejected for v1 — the proxy route is the project's existing pattern (`/api/quotation/*`, `/api/issuance/*`, `/api/policy-admin/*`); deviating without reason fragments the toggle behavior around `GROUP_PAS_BACKEND_URL`.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit


## Pros


## Cons


## Recommendation


---

<!-- Filled by /execute-proposal. -->

## Implementation notes
