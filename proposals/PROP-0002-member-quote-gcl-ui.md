---
id: PROP-0002
title: Audit + finish Member-Quote (GCL / W4) UI — most of it already exists
status: in-progress
next_step: /execute-proposal PROP-0002
proposer: agent:claude
created: 2026-05-13
category: spec
impact: medium
effort: s
evidence:
  - /Users/seriousblack/.claude/plans/do-you-have-repo-clever-diffie.md
  - docs/planning/team_nb_blueprint_v3.md:301
  - docs/planning/team_nb_blueprint_v3.md:636
  - docs/planning/team_nb_blueprint_v3.md:117
  - src/lib/api/quotation.ts:143-192
  - src/schemas/member-quote.json
related:
  - PROP-0001
pr: null
---

## Problem

**Correction to the original audit.** When I first filed this proposal I claimed the Member-Quote UI was unbuilt. After reading the files: most of it already exists. The real gap is smaller — this proposal is now an **audit + finish-up** task, not a from-scratch build.

What's already there:
- Routes: [src/app/quotation/member-quotes/page.tsx](src/app/quotation/member-quotes/page.tsx) (list) and [src/app/quotation/member-quotes/[id]/page.tsx](src/app/quotation/member-quotes/%5Bid%5D/page.tsx) (detail) — both render schemas through `WidgetRenderer`.
- Schemas: [schemas/member-quote.json](schemas/member-quote.json) (list) and [schemas/member-quote-detail.json](schemas/member-quote-detail.json) (detail).
- Forms registered in [schemas/forms/index.ts](schemas/forms/index.ts): `create-member-quote-form`, `set-member-quote-premium-form`.
- Client wrappers: [src/lib/api/quotation.ts:143-192](src/lib/api/quotation.ts) — all 6 endpoints.
- Types: [src/types/group-pas/quotation.ts:92-100,148-161](src/types/group-pas/quotation.ts) (`MemberQuote` domain + `MemberQuoteDto` wire).
- Quote-detail "placeholder tab" at [schemas/tabs/quote/member-quotes-placeholder.json](schemas/tabs/quote/member-quotes-placeholder.json) is in fact a deliberate **pointer** to `/quotation/member-quotes` explaining that MemberQuotes hang off a Policy, not a Quote.

Backend blueprint ([docs/planning/team_nb_blueprint_v3.md](docs/planning/team_nb_blueprint_v3.md) §3.2 line 301, §6.5 line 636) confirms the workflow shape: GCL master policy stays ACTIVE; each loan-disbursement creates a new MemberQuote with DRAFT → SUBMITTED → FINALIZED lifecycle. Partner system is the primary caller; ops UI is for visibility + manual override.

The remaining gaps (to be confirmed in CLARIFY):
- **Verify each endpoint is actually exercisable from the UI** — the wrappers and forms exist, but are all 6 endpoints (`create`, `search`, `getById`, `updatePremium`, `submit`, `finalize`) reachable through the rendered schemas? Possible that one or more workflow buttons isn't surfaced on the detail page.
- **`/quotation/member-quotes/new` route** — does it exist for manual create, or is the list page the only entry?
- **Search/filter completeness** — does the list schema support filtering by `policyId` and `status` per backend `searchMemberQuotes`?
- **Navigation discoverability** — is the `/quotation/member-quotes` route reachable from the sidebar, or only from the placeholder tab? Per V1 plan Task 0.2 the GCL nav item was disabled "coming soon"; needs to be enabled if it isn't already.
- **Fixtures** — does the mock side ([src/mocks/group-pas/quotation/](src/mocks/group-pas/quotation/)) seed any MemberQuotes so the list isn't empty in mock mode? Per ARCH_TRANSITION #7 the prior policy was "no fixtures or actions" — now lifted, so fixtures need to be added.
- **Tooltip honesty** — if any backend behaviour is partially stubbed, the affected button should show `disabledTooltip` per the established pattern (Quote `requestPrice` is the precedent).

## Proposed change

CLARIFY stage in `/build-feature` audits the existing pages against the 6 backend endpoints and produces a punch list. Implementation then closes whatever the audit finds. Expected shape of the work:

**Likely deltas in existing schemas:**
- [schemas/member-quote.json](schemas/member-quote.json) — add filter chips for `policyId` / `status` if missing; confirm pagination + sort.
- [schemas/member-quote-detail.json](schemas/member-quote-detail.json) — confirm `stateActions` map covers all 4 workflow transitions (set-premium DRAFT-only, submit DRAFT→SUBMITTED, finalize SUBMITTED→FINALIZED). Add `disabledTooltip` where backend is stubbed.

**Likely new files:**
- `src/app/quotation/member-quotes/new/page.tsx` — wraps the existing `create-member-quote-form` (already in the forms registry).
- `schemas/tabs/policy/member-quotes.json` — read-only sub-tab on GCL policy detail (cross-link to the standalone list), referenced from `schemas/policy-detail.json`.

**Likely fixture work:**
- [src/mocks/group-pas/quotation/](src/mocks/group-pas/quotation/) — seed 2–3 MemberQuotes across the lifecycle so the mock list isn't empty (consistent with the rest of the GCL fixtures policy lift).
- Possibly a mock route under `src/app/api/quotation/member-quotes/[[...path]]/route.ts` if proxy fallthrough isn't already in place.

**Navigation:**
- Confirm `/quotation/member-quotes` is reachable from the sidebar (per V1 plan Task 0.2 the item was disabled "Coming soon"; remove that gate now that the V1 scope lock is lifted).

**Out of scope (still):**
- Visibility gating per `policyType === GCL` on the active client — that's tenant/role plumbing, separate concern.

## Alternatives considered

- **Treat the existing pages as "done" and close this proposal** — rejected. The pages render, but I haven't verified each of the 6 endpoints is exercisable end-to-end, fixtures are missing, and the nav item may still be gated "coming soon". A 30-minute audit pass is the difference between "renders" and "works".
- **Embed inside the master quote detail instead of the standalone page** — already rejected by the existing implementation: the in-quote tab is a pointer to `/quotation/member-quotes` because MemberQuotes attach to a *Policy*, not a Quote (blueprint §3.2). Keep the current design.
- **Skip the manual create page; partner-only** — viable, but the `create-member-quote-form` schema already exists in the registry. Trivial cost to wrap it in a route.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit

**This conflicts with an explicit V1 scope lock.** [CORE_MEMORY.md:78](context/CORE_MEMORY.md) and [docs/group-pas-v1-plan.md:9](docs/group-pas-v1-plan.md) both say: *"Out of V1: ... GCL MemberQuote (placeholder IA only)"*. [CORE_MEMORY.md:93](context/CORE_MEMORY.md) interim-assumption #7 goes further: *"GCL endpoints: non-functional / stub. Placeholder tab only; no fixtures or actions."* Task 2.4.6 at [docs/group-pas-v1-plan.md:411-416](docs/group-pas-v1-plan.md) intentionally ships a placeholder tab reading "GCL Member Quotes — coming in a future release". The OpenAPI endpoints exist (and DSL has [docs/spec/quotation/MemberQuoteWorkflow.workflow](docs/spec/quotation/MemberQuoteWorkflow.workflow)) but per the reference-precedence rule, the V1 scope-lock and ARCH_TRANSITION assumption win over endpoint presence — the backend side is acknowledged stubbed.

## Pros

- Backend DSL is canon-stable ([docs/spec/quotation/MemberQuoteWorkflow.workflow](docs/spec/quotation/MemberQuoteWorkflow.workflow)) so the contract isn't moving.
- Client wrappers + types + form schemas already exist (3 schemas, 6 wrappers) — incremental cost to wire pages is lower than a from-scratch feature.
- Ops visibility into partner-driven flows is a real need once GCL goes live.

## Cons

- Direct violation of documented V1 scope lock — approving here would be the kind of silent scope expansion CORE_MEMORY explicitly warns against.
- Backend GCL endpoints are stubs today per ARCH_TRANSITION assumption #7; building the UI now means it can't be exercised end-to-end, and we'd be mocking endpoints whose real behaviour isn't decided yet — exactly the "mock-backend cost is significant, defer" case in CORE_MEMORY build-approach rule.
- Conflicts with the still-rendered placeholder tab (Task 2.4.6) — would need to remove that tab, which is a deliberate IA marker.

## Recommendation

**approve.** User lifted the V1 scope lock on 2026-05-13 with the API-driven-scope rule now in [CORE_MEMORY.md](context/CORE_MEMORY.md) ("if backend API exists and behaviour is understood, build the UI"). The cons above (placeholder tab conflict, stub-backend risk) become things to handle inside the build (replace the placeholder tab, surface stub behaviour via disabled-with-tooltip), not reasons to defer. Pick up via `/build-feature PROP-0002` so CLARIFY confirms which stub behaviours need the disabled-with-tooltip treatment.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
