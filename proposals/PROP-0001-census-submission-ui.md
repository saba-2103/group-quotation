---
id: PROP-0001
title: Wire Census Submission UI (proposal-stage bulk member upload)
status: in-progress
next_step: /execute-proposal PROP-0001
proposer: agent:claude
created: 2026-05-13
category: spec
impact: high
effort: l
evidence:
  - /Users/seriousblack/.claude/plans/do-you-have-repo-clever-diffie.md
  - docs/planning/GTL Quotation Module (3).md:5705
  - docs/planning/GTL Quotation Module (3).md:6086
  - docs/planning/team_nb_blueprint_v3.md:106
  - src/lib/api/issuance.ts:175-202
  - src/schemas/tabs/proposal/members.json
related: []
pr: null
---

## Problem

The Group PAS backend ships a full bulk census submission pipeline under `census-submission-api` — six endpoints covering initiate / ingest / submit / list / row-level validation — but the keystone-ui frontend has **zero pages** wired to it. Today, an operator adding members to a proposal can only do it one row at a time through the single-member add form ([src/schemas/forms/add-policy-member-form.json](src/schemas/forms/add-policy-member-form.json)). A 50- or 200-member group is unrealistic to enter by hand.

The members tab schema even acknowledges the gap in copy: `src/schemas/tabs/proposal/members.json` line 80 reads "Add a single member or bulk-upload a census file to populate this list" — the bulk path is explicitly described but unbuilt.

The product spec ([docs/planning/GTL Quotation Module (3).md](docs/planning/GTL%20Quotation%20Module%20%283%29.md)) calls census ingestion a first-class step:
- §D "Raw Census Ingestion Pipeline" (line 5705) — `PIPE_CENSUS_INGEST` must run *before* quote compute
- §10.4 (line 4100) "Validate census processing pipeline" — `census_normalization_catalog_gtl.json` → `census_validation_catalog_gtl.json`
- §9 (line 6491) lists the canonical census ingest steps: parse → column-map → normalize → validate → publish canonical members

Backend blueprint ([docs/planning/team_nb_blueprint_v3.md](docs/planning/team_nb_blueprint_v3.md) §4 CensusIngestService) confirms the service is built; nothing in the UI drives it.

Unwired endpoints (all in `census-submission-api`):
- `POST /api/issuance/policies/{policyId}/census-submissions` — initiate (returns presigned upload URL)
- `POST /api/issuance/census-submissions/{id}/ingest` — parse uploaded file
- `POST /api/issuance/census-submissions/{id}/submit` — finalize submission
- `GET  /api/issuance/policies/{policyId}/census-submissions` — submission history
- `GET  /api/issuance/census-submissions/{id}` — status
- `GET  /api/issuance/census-submissions/{id}/rows` — per-row validation errors

Type definitions already exist at [src/types/group-pas/issuance.ts:231-249](src/types/group-pas/issuance.ts) (`CensusSubmissionDto`, `CensusSubmissionRowDto`). Only the UI surface and the typed client wrappers are missing.

## Proposed change

Add a "Census" section to the proposal-detail screen that drives the full submission lifecycle.

**Client wrappers** ([src/lib/api/issuance.ts](src/lib/api/issuance.ts)):
- `initiateCensusSubmission(policyId, body)` → `CensusSubmissionDto` + presigned upload URL
- `ingestCensusFile(submissionId)` → triggers parse
- `submitCensusSubmission(submissionId)` → finalize
- `getCensusSubmission(submissionId)` → status polling
- `listCensusSubmissionRows(submissionId, statusFilter?)` → row table data
- `listCensusSubmissionsByPolicy(policyId)` → history

**Schemas** (new files under [src/schemas/](src/schemas/)):
- `tabs/proposal/census.json` — section with submission history table + "Upload new" button
- `forms/upload-census-form.json` — file picker + template-format selector → POST upload URL → PUT file → call ingest
- `views/census-submission-detail.json` — status banner, rows table with status filter chips (VALID / INVALID / WARNING), submit action
- `tables/census-submission-rows.json` — paginated row table showing per-row validation results

**Pages** (new routes):
- `/issuance/proposals/[id]/census` — list + create
- `/issuance/proposals/[id]/census/[submissionId]` — detail with row-level errors and submit

**Cross-link**: add a "Bulk upload" CTA next to "Add member" in `tabs/proposal/members.json` that deep-links into `/census`.

Stay inside the existing schema-driven UI pattern (`useSmartQuery` + `useActionHandler`) — no new architectural concepts. Use the existing presigned-upload helper from quotation common-api as a reference pattern.

## Alternatives considered

- **Build it inside the existing members tab** — rejected. The members tab is row-centric (table of policy members); a submission has its own lifecycle (parse → validate → submit) and history. Cramming the submission detail into a modal there hides the row-validation table which is the whole point of the screen.
- **Defer until V2** — rejected. Spec §D explicitly puts census ingestion *before* quote compute, the backend is built, and types/comments already point at the gap. Deferring leaves the demo flow with a known dead-end.
- **Do nothing** — viable only if we accept that real-customer proposals (50+ members) are unenterable through the UI. We don't.

---

<!-- The sections below are filled by /review-proposals — proposer should leave them blank. -->

## Project-context fit

This is **the same scope as V1 plan Task 4.5** at [docs/group-pas-v1-plan.md:548-562](docs/group-pas-v1-plan.md) — initiate → upload → ingest → row review → submit, with the exact endpoint set and the two-page layout (`/census/new` + `/census/[submissionId]`). It's tracked as deferred-from-demo item **D4** at [docs/group-pas-v1-plan.md:665](docs/group-pas-v1-plan.md) ("Single-member-add covers demo"). DSL canon at [docs/spec/issuance/IssuanceApi.api](docs/spec/issuance/IssuanceApi.api) lines 201–232 confirms the endpoints are stable per the reference-precedence rule in [CORE_MEMORY.md:60-70](context/CORE_MEMORY.md). Types already exist at [src/types/group-pas/issuance.ts:231-249](src/types/group-pas/issuance.ts). Per [CORE_MEMORY.md "Build approach"](context/CORE_MEMORY.md), mock cost is significant (file storage + validation pipeline) so the mock side should stay thin and the real-backend contract should drive the frontend shape.

## Pros

- Closes the single highest-impact V1 backlog item (D4) — present V1 demo flow forces operators to enter members one at a time.
- DSL-canonical endpoints + existing wire types mean no contract drift risk; this is wire-up work, not design work.
- Schemas/forms registry already has the dead `bulk-upload-form` slot from the auth-branch cleanup ([docs/group-pas-v1-plan.md:91,105](docs/group-pas-v1-plan.md)) — a real implementation reclaims it.
- Unlocks the cross-link already promised in members-tab copy ([src/schemas/tabs/proposal/members.json:80](src/schemas/tabs/proposal/members.json)), removing a known dead-end.

## Cons

- Effort is `l`: presigned-upload + ingest + row table + status polling + history list is ~5 schema files + 2 routes + 6 client wrappers. Real backend behaviour on `/ingest` is async — needs the `STANDARD_POLL_SCHEDULE` pattern from [src/lib/polling.ts](src/lib/polling.ts).
- Mock-backend cost is non-trivial (parse + validate pipeline) — per CORE_MEMORY build-approach rule, mock should stay a stub and the feature should be exercised in proxy mode against real backend, not local mock.
- File-upload deps still open (CORS for `/files/upload-url` per HANDOFF.md open-item #1) — proxy-mode demo may need a workaround until S3 wiring lands.

## Recommendation

**approve.** This is V1-scoped, DSL-canonical, types-ready, and the largest open backlog item. Equivalent to picking up Task 4.5 / D4 — on approval, mark D4 in [docs/group-pas-v1-plan.md](docs/group-pas-v1-plan.md) as tracked via PROP-0001 to avoid duplicate tracking. Build via `/build-feature PROP-0001` so the CLARIFY stage can confirm the mock-vs-proxy posture before code.

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
