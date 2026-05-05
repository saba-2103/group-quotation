# Backend Readiness Matrix

**Status:** Baseline for Phase 3 planning  
**Date:** 2026-04-29  
**Scope:** `test-dashboard`, `claims`, `quotations-list`

---

## Purpose

This document is the backend-readiness matrix required by Phase 3 planning in [`docs/archV1/08-MIGRATION-PLAN.md`](../archV1/08-MIGRATION-PLAN.md).

It records, for each pilot page and each target runtime namespace:

- the target endpoint or lack of backend dependency
- the current owner
- the current readiness state

This matrix gates Phase 3 page migration work.

No pilot-page migration should start until its target namespaces have a known status in this file.

---

## Status Legend

- `ready`: usable now without introducing a new backend dependency
- `mocked`: currently satisfied by an in-repo mock route, temporary adapter, or temporary external mock source
- `pending`: target runtime namespace identified, but no usable backend or mock path is in place yet

For the current baseline, the real backend APIs are not available yet, so API-backed pilot-page namespaces are treated as `mocked`.

---

## Scope Notes

1. This matrix focuses on page runtime namespaces, not every widget prop.
2. Mutation endpoints such as export, clone, version, or withdraw are not listed unless they are part of a runtime graph namespace.
3. `local` and `inline` namespaces are included so the page-family namespace plan is complete, even though they do not depend on backend APIs.
4. Current `src/app/api/*` routes are the starting inventory for mocked API-backed namespaces.

---

## Pilot Page: `test-dashboard`

Current source:

- `schemas/dashboard.json`

Suggested target `schemaId`:

- `test-dashboard`

| Namespace | Kind | Target endpoint | Owner | Status | Notes |
|---|---|---|---|---|---|
| `pendingQuotationsMetric` | `api` | `/api/dashboard/metrics/pending-quotations` | Frontend Platform | mocked | Current in-repo Next route exists under `src/app/api/dashboard/metrics/pending-quotations/route.ts` |
| `newBusinessMetric` | `api` | `/api/dashboard/metrics/new-business` | Frontend Platform | mocked | Current in-repo Next route exists |
| `pendingAlterationsMetric` | `api` | `/api/dashboard/metrics/pending-alterations` | Frontend Platform | mocked | Current in-repo Next route exists |
| `renewalsDueMetric` | `api` | `/api/dashboard/metrics/renewals-due` | Frontend Platform | mocked | Current in-repo Next route exists |
| `revenueForecast` | `api` | `/api/dashboard/ai/revenue-forecast` | Frontend Platform | mocked | Current in-repo Next route exists |
| `riskAnalysis` | `api` | `/api/dashboard/ai/risk-analysis` | Frontend Platform | mocked | Current in-repo Next route exists |
| `conversionFunnel` | `api` | `/api/dashboard/ai/conversion-funnel` | Frontend Platform | mocked | Current in-repo Next route exists |
| `claimsPrediction` | `api` | `/api/dashboard/ai/claims-prediction` | Frontend Platform | mocked | Current in-repo Next route exists |
| `businessProcessLinks` | `inline` | `—` | Frontend Platform | ready | Static quick-link card definitions can remain inline in early v0 |
| `quickActions` | `inline` | `—` | Frontend Platform | ready | Static quick-action link definitions can remain inline in early v0 |
| `pageState` | `local` | `—` | Frontend Platform | ready | Reserve for tab/expansion or interaction state if needed during migration |

Page readiness summary:

- backend-backed namespaces: mocked
- non-backend namespaces: ready
- Phase 3 suitability: yes, this is the safest first pilot page

---

## Pilot Page: `claims`

Current source:

- `schemas/claims-list.json`

Suggested target `schemaId`:

- `claims-list`

| Namespace | Kind | Target endpoint | Owner | Status | Notes |
|---|---|---|---|---|---|
| `claims` | `api` | `https://dummyjson.com/users` | Frontend Platform | mocked | Current schema points to an external dummy data source; replace with an in-repo mock route before long-term migration work continues |
| `filters` | `local` | `—` | Frontend Platform | ready | Target home for lane/priority filter state |
| `filterOptions` | `inline` | `—` | Frontend Platform | ready | Current lane and priority options are static in schema |
| `pageState` | `local` | `—` | Frontend Platform | ready | Reserve for table interaction state, selection, or future list UI state |

Excluded from this namespace matrix:

- `/api/claims/export` action endpoint from the current header action, because it is a mutation/action concern rather than a graph namespace

Page readiness summary:

- backend-backed namespaces: mocked
- one current API dependency is an external dummy source and should be normalized into an internal mock route before or during Phase 3
- non-backend namespaces: ready
- Phase 3 suitability: yes, but after `test-dashboard`

---

## Pilot Page: `quotations-list`

Current source:

- `schemas/quotations.json`

Suggested target `schemaId`:

- `quotations-list`

| Namespace | Kind | Target endpoint | Owner | Status | Notes |
|---|---|---|---|---|---|
| `quotations` | `api` | `/api/quotations` | Frontend Platform | mocked | Current in-repo Next route exists under `src/app/api/quotations/route.ts` |
| `filters` | `local` | `—` | Frontend Platform | ready | Replaces current ad hoc state bucket `page:quotations:filters` |
| `filterOptions` | `inline` | `—` | Frontend Platform | ready | Current branch/channel/intermediary/policy/status options are static in schema |
| `pageState` | `local` | `—` | Frontend Platform | ready | Reserve for list interaction state such as selection, expanded filter UI, or modal state anchors |

Excluded from this namespace matrix:

- row-level action endpoints such as `/api/quotations/:id/clone`, `/api/quotations/:id/version`, and `/api/quotations/:id/withdraw`, because they are mutation/action concerns rather than graph namespaces

Page readiness summary:

- backend-backed namespaces: mocked
- non-backend namespaces: ready
- Phase 3 suitability: yes, after `test-dashboard` and in parallel with or after `claims`

---

## Cross-Page Summary

| Page | Total namespaces | Ready | Mocked | Pending | Notes |
|---|---:|---:|---:|---:|---|
| `test-dashboard` | 11 | 3 | 8 | 0 | Fully mockable from current in-repo routes |
| `claims` | 4 | 3 | 1 | 0 | Normalize external dummy source into internal mock route |
| `quotations-list` | 4 | 3 | 1 | 0 | Uses existing in-repo quotations list route |

Overall conclusion:

- all three Phase 3 pilot pages can proceed using mocked API-backed namespaces
- no pilot page is currently blocked by a completely unknown namespace state
- the main cleanup item before or during Phase 3 is replacing the claims page's external dummy API dependency with an in-repo mock path or equivalent stable mock contract

---

## Update Rules

Update this document when any of the following changes:

- a mocked namespace becomes backed by a real backend endpoint
- a namespace owner changes
- a target endpoint path changes
- a new namespace is added to a pilot page during conversion planning

This file should remain the planning source of truth until all pilot pages leave mocked namespace status.
