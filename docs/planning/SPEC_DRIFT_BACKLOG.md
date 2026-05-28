# Spec-drift backlog — DSL-conformance findings (2026-05-28)

Surfaced by the spec-first regression suite (`src/tests/schemas/` static + `tests/e2e/backend-contract.spec.ts` live). 13 UI endpoints currently fail DSL conformance: the schemas call routes the DSL specs (`docs/spec/`) do **not** declare.

**These are flagged for analysis — they may be real schema bugs OR endpoints the DSL has not caught up to.** Decide case-by-case before changing the UI; the DSL itself may need to be regenerated/extended.

Per CORE_MEMORY canon, DSL beats the blueprint, the GTL spec, and `openapi.json` (the last is stale). The static regression suite encodes that ranking: `src/tests/schemas/endpoint-conformance.test.tsx` has one assertion per finding below.

---

## Issuance (3)

### 1. `POST /api/issuance/policy-members/:id/classify`
- **UI source:** `schemas/policy-member-detail.json`
- **DSL says:** Classify is workflow-internal (a system command), not HTTP-exposed (`docs/spec/issuance/IssuanceApi.api`).
- **Decide:** does the UI invoke a real backend route here? If yes → DSL needs updating. If no → drop the action from the schema.

### 2 / 3. `GET` + `POST /api/issuance/proposals/:id/members`
- **UI source:** `schemas/tabs/proposal/members.json`, `schemas/forms/add-policy-member-form.json`
- **DSL says:** Members are scoped under `/policies/:policyId/members`, not under proposals.
- **Live evidence:** `tests/e2e/interactions.spec.ts:94` already has a `test.fixme` documenting a live 404 here — strongly suggests this is a real UI bug (wrong scope), not a DSL gap.

---

## Accounting (10) — likely a coherent domain-naming drift

### `/api/accounting/direct-journals*` (5 endpoints — GET list, GET detail, POST/PUT/DELETE lines)
- **UI source:** `schemas/tabs/accounting/direct-journals.json`, `direct-journals-detail.json`, `direct-journal-lines.json`, `forms/{add,edit}-direct-journal-line-form.json`
- **DSL says:** `/api/accounting/journals` (no `direct-` prefix); lines are **embedded** in the journal DTO, not exposed as a `…/lines` sub-resource.

### `/api/accounting/system-journals`
- **UI source:** `schemas/tabs/accounting/system-journals.json`
- **DSL says:** No such endpoint declared.

### `/api/accounting/{events,journals,posting-rules}/:id/lines` (3)
- **UI source:** `schemas/tabs/accounting/{event,journal,posting-rules}-lines.json`
- **DSL says:** Lines are embedded in the parent DTO; no `…/lines` sub-resources.

The accounting module appears to predate the current DSL precedence — it may need a coordinated reconciliation (DSL extension *or* UI rewrite) rather than per-endpoint fixes.

---

## What's NOT a finding (intentional)

- **45 UI endpoints out of DSL scope** (payouts/`moneyout`, `dashboard`, `claims`, `dummyjson`) — not failures; the suite only asserts against endpoints the DSL covers. Printed for visibility in the test output.
- **State-machine conformance — GREEN.** Every `state-map.ts` entity map + every schema's `stateActions` key conforms to the DSL state enums. The earlier hypothesis that the shipped `policyMember` states (`PRICED`, `REFERRED_TO_UW`, `SENT_FOR_ISSUANCE`, `ARCHIVED`) diverged from the spec was actually the **blueprint §4.2 being stale**, not the UI — the UI matches the DSL canon. Reconcile the blueprint, not the UI.
- **`openapi.json` (`/api/issuance/proposal-members/*`)** is the documented stale outlier (CORE_MEMORY §Reference-doc precedence). UI + live backend + DSL all use `/policy-members/*`. Regenerate `openapi.json` when convenient; no UI change needed.

---

## Reconciliation options (per finding)

- **Fix the UI schema** to use the DSL-declared endpoint → red turns green.
- **Update the DSL** (`docs/spec/`) if these are real backend additions the spec hasn't caught up to → red turns green.
- **Document an intentional deviation** if the UI legitimately needs a path the DSL excludes (rare; needs explicit justification).

When a finding is resolved, the corresponding assertion in `endpoint-conformance.test.tsx` flips green automatically — no test change needed.

---

## CI status

The 13 reds cause `jest --selectProjects schemas` to exit non-zero, so the **Unit Tests** CI job will be red on PRs touching this branch and on `main` post-merge — until the backlog is reconciled. Build, deploy-preview, and e2e remain green. Merge is not blocked (no required status checks; review ruleset is the only gate).

## Useful side-finding from the live-backend contract test

- Backend list/search endpoints return **bare JSON arrays**, not the Spring `content` envelope. `useDataTable` / `useSmartQuery` consumers must continue treating responses as arrays. Worth keeping in mind when reading mock-vs-real differences.
