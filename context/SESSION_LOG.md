# Session Log — Group PAS V1 Frontend

This file is the running record of plans, decisions, and actions for the Group PAS V1 frontend build.
Update it before stopping work so any AI tool (or human) can pick up where we left off.

## How to use this log

- Before starting any non-trivial task, append a dated entry stating what you are about to do.
- After completing it, edit the entry with results, tests run, files touched, and next steps.
- If a task spans multiple sessions, add a continuation note rather than overwriting.
- When status of a phase or proposal changes, update [context/HANDOFF.md](HANDOFF.md) Active Workstreams in the same commit.

---

## Context

**Repo:** keystone-ui
**Branch:** check `git branch --show-current`. Recent V1 plan work was on `feat/group-pas-v1-plan`; new build branch may have been cut by user.
**Product:** Group PAS — Quotation, Issuance (Proposal + PolicyMember + Census), Policy Admin (Client/Policy/Member). UI-only maker-checker overlay for V1 demo.
**Backend specs:** [docs/spec/](../docs/spec/) (DSL, canon).
**Backend blueprint:** [docs/planning/team_nb_blueprint_v3.md](../docs/planning/team_nb_blueprint_v3.md).
**OpenAPI snapshot (stale):** [docs/planning/openapi.json](../docs/planning/openapi.json) — useful for shape cross-check; trust DSL on conflict.
**V1 implementation plan:** [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md)
**Reference precedence + interim assumptions:** [context/CORE_MEMORY.md](CORE_MEMORY.md#reference-doc-precedence-group-pas-v1).

---

## Actions taken

### 2026-05-06 — Plan locked, process scaffolding transferred

- Backend specs and blueprint reviewed; plan written at [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md) with per-task context, outputs, and acceptance criteria.
- Architecture decision: stay on existing keystone-ui schema-driven arch for V1; defer the PDF spec's `frontendProjection` pattern. State-aware actions handled via per-schema `stateActions` map + new `ActionBar` widget.
- Process scaffolding transferred from `feature/2026-05-02-auth-module-2`:
  - `.claude/skills/` — full skill set copied as-is.
  - `proposals/TEMPLATE.md` and `proposals/README.md` copied; auth-specific PROP-NNNN files intentionally left out.
  - Fresh `context/HANDOFF.md`, `context/SESSION_LOG.md` (this file), `context/CORE_MEMORY.md`, `context/ARCH_TRANSITION.md` — process preserved, contents reset for group-pas V1.
- Next: kickoff Phase 0 (teardown of legacy quotations module).

### 2026-05-07 — Plan verification + maker-checker overlay added

User added authoritative reference docs into the repo (`docs/planning/openapi.json`, `docs/planning/team_nb_blueprint_v3.md`, `docs/planning/SAMPLE-WORKFLOW.md`, `docs/planning/GTL Quotation Module (3).md`) and copied DSL specs to `docs/spec/`. Also confirmed maker-checker is needed in V1 demo via UI-only role switcher.

**Backend Q&A absorbed:**
- `docs/spec/` (DSL) is canon. All DSL values for enums, structs, API contracts are stable.
- Issuance entity is `PolicyMember` (not `ProposalMember` as OpenAPI suggested) — OpenAPI snapshot is stale on this point.
- PAM cross-ref is `policyMemberId` (final, not `proposalMemberId`).
- PAM API delta absorbed: `GET /api/policy-admin/members/by-proposal-member/{...}` → `GET /api/policy-admin/members/by-policy-member/{policyMemberId}`. `MemberDto` adds `pendingReason?`, `voidReason?`, `cancellationReason?`. `MemberSummaryDto` adds `pendingReason?`.

**Reference-doc precedence locked** (now in `context/CORE_MEMORY.md`): DSL → blueprint v3 → GTL Quotation Module (3).md → OpenAPI (stale) → SAMPLE-WORKFLOW.md (future).

**V1 interim assumptions logged** (8 entries in `context/ARCH_TRANSITION.md` + scope-locks summary in `context/CORE_MEMORY.md`):
1. Async signalling = 5s polling
2. Quote → Proposal handoff = auto-create on finalize
3. send-for-issuance → PAM Member visibility = async, poll
4. Error response shape = Spring-style `{ message, errors? }`
5. Member-to-Plan DMN = opaque file ref
6. GCL endpoints = stub
7. Auth = open API in V1
8. File upload = mock-first via Next.js routes

**Maker-checker UI overlay** (new ARCH_TRANSITION entry): role switcher widget (Maker / Checker / Ops / Viewer), `roleActions` map alongside `stateActions` on schemas, `awaitingApproval: true` UI-overlay state on Quote/Proposal. Checker's "Approve" calls real backend `submit`. Backend stays unchanged.

**Plan structure changes:**
- Phase 0 deletion list extended to include auth-branch zombie forms (`add-member-form`, `bulk-upload-form` etc.) bundled in `schemas/forms/index.ts` whose widgets aren't on this branch.
- Phase 1 gains **Task 1.9 — Role switcher + role-aware action gating**.
- Tasks 1.1, 1.5, 1.8 updated for `cancellationReason`, summary `pendingReason`, CANCELLED state.
- Tasks 3.3, 3.4, 5.1 updated for `by-policy-member` endpoint rename + reason badges in member lists.
- Task 4.4 explicitly drops the auth-branch 5-step add-member wizard; uses single-step `form-container` with the 8 V1 fields.
- All quote/proposal/member tasks gained `roleActions` gating notes.
- Conventions section restructured: precedence ranking, frontend conventions, coding conventions.

**Files touched:** `docs/group-pas-v1-plan.md` (full rewrite), `context/HANDOFF.md` (drop Local environment section, list canonical docs with precedence), `context/CORE_MEMORY.md` (add precedence rule + V1 assumptions + maker-checker scope lock), `context/ARCH_TRANSITION.md` (added 7 new interim contracts; total 9 entries now), this log.

**Next:** kickoff Phase 0 teardown.

### 2026-05-07 (continued) — Architecture audit + small engine extension

Audited current widget engine vs V1 plan needs. Verdict: existing arch supports the plan with two real gaps (small wrappers) and two verbosity-tax patterns (workable today, future widget-engine cleanups noted).

**Real gaps resolved:**

1. **Polling with stop-condition.** Extended `useSmartQuery` to take `stopWhen: VisibilityCondition` and `maxPollMs?` on `DataSourceConfig`. Implementation uses TanStack's function-form `refetchInterval` — returns `false` when `stopWhen` evaluates truthy against latest data, otherwise returns `refreshInterval`. ~10 LOC added; `npx tsc --noEmit` clean.
   - Files: `src/hooks/useSmartQuery.ts`, `src/types/widget.ts`.
   - Used by Pricing tab (Task 2.4.5) — schema declares poll cadence + stop predicate; component owns hard timeout.

2. **Composite cells deferred.** V1 renders `state` and `pendingReason` as two separate columns instead of building a `composite` cell type. ~20 LOC saved for now; documented as a future widget-engine cleanup.

**Verbosity-tax patterns documented in `docs/STATE_MANAGEMENT_GUIDE.md` (new §8):**

- §8.1 Polling until an async backend computation completes (uses the new `stopWhen`).
- §8.2 State-driven detail page (sibling widgets gated by entity state via `useWidgetState` + `visibleWhen`).
- §8.3 Form fields disabled by parent entity state or current role (dual sibling widgets — editable form vs read-only key-value-grid).
- §8.4 Role context as a global state key (`global:current-role`) so role gating uses the same `stateDependencies` plumbing as state gating.

**ARCH_TRANSITION.md additions:**
- Updated "Async transition signalling" entry to reflect the new `stopWhen` capability.
- Added "State-conditional siblings via `useWidgetState`" — interim verbose pattern, future `state-conditional-section` widget.
- Added "Form-level disable via dual sibling widgets" — interim dual-render pattern, future `disabledWhen` on `FieldConfig`.
- Added "Composite cells deferred — two-column rendering for V1" — interim two-column approach, future `composite` cell type.

**Plan updates:**
- Conventions section now references `STATE_MANAGEMENT_GUIDE.md §8` so all detail-page tasks follow the canonical patterns.
- Task 2.4.5 (Pricing tab) explicitly uses `dataSource.stopWhen` per §8.1.
- Task 3.3 (Policy detail → Members tab) explicitly uses two columns for state + reason.
- New "Future widget-engine cleanups" section in plan listing the 4 deferred items so they don't get lost.

**Files touched:** `src/hooks/useSmartQuery.ts`, `src/types/widget.ts`, `docs/STATE_MANAGEMENT_GUIDE.md`, `docs/group-pas-v1-plan.md`, `context/ARCH_TRANSITION.md`, this log.

**Next:** Phase 0 teardown.
