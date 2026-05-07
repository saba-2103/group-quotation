# Core Memory

Standing execution preferences for this repo. Subordinate only to explicit user overrides, hard blockers, or repo safety constraints.

## Resume / handoff

- [context/HANDOFF.md](HANDOFF.md) is the single entry point another AI should read first when resuming work.
- [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md) records interim patterns that are acceptable now but expected to simplify once a future architecture lands.
- Keep `context/` docs and `agent_logs/` current as work progresses so another AI can resume mid-stream after rate limits, handoffs, or interruptions.

## Mandatory logging protocol

Before starting any non-trivial task, add a dated entry to [context/SESSION_LOG.md](SESSION_LOG.md) stating what is about to be done. After completing, update the entry with:
- results,
- tests passed,
- files changed,
- next steps.

If the task changes the status of a phase, workstream, or proposal, also update [context/HANDOFF.md](HANDOFF.md) Active Workstreams and the relevant `proposals/PROP-*.md` frontmatter in the same commit.

This is not optional — stale context causes other AIs to redo or contradict completed work.

## Build approach

- **Two distinct rules on rework — apply both.** Recorded 2026-05-07.
  1. **Frontend:** build to the expected real-backend contract, not a thin POC. Avoids frontend rework when real backend lands.
  2. **Mock backend:** don't build mock logic that real backend will replace. Mock-route simulations of significant backend behavior (file storage, workflow engines, validation pipelines, async flows) are throwaway — defer until real backend is known. Frontend can still be written against the contract; it just won't have a working mock to exercise.
- When evaluating a deferred item, separate **frontend cost** from **mock-backend cost**. Build now if frontend cost > 0 and mock cost is small/none. Defer if mock cost is significant. Skip entirely if the item is pure mock simulation (real backend will do it for real, e.g. auto-activation, the maker-checker overlay).
- Front-load foundational work when it meaningfully reduces downstream rework.
- Favor future-compatible shared primitives and workflow-complete building blocks over the narrowest possible first slice.
- Accept moderate early scope expansion when it improves long-term execution speed, surfaces integration issues earlier, and gives later proposals a cleaner base.
- Do not silently trim a feature back to a smaller demo if that creates likely follow-on churn; surface the tradeoff and bias toward the more reusable path.
- Every UI build should include a design preview checkpoint before implementation begins.
- Still flag cost when proposing scope ("this is 2 days vs 4 hours") so the user can choose informed.

## Schema & widget architecture

- This repo is schema-driven. Read [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](../docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md) before adding pages, modules, schemas, widgets, forms, or API surfaces.
- Schemas are composable. Prefer composing with existing widgets/layout primitives instead of teaching workflow components to become generic layout engines. If composition truly falls short, add or propose a new layout/component in the right layer rather than reinventing the wheel inside a feature widget.
- When async child widgets inside workflows need to affect completion, prefer a documented widget-state / eventing contract over schema callbacks. Record the interim rule and the future-architecture convergence note in [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md).

## Branch hygiene

- Do NOT create new branches for every change or feature build unless explicitly requested by the user. Stay on the current branch and use sequential commits to save builds and context to avoid excessive branch proliferation.
- Exception: skills like `/build-feature` and `/execute-proposal` may create a feature branch when the working tree is dirty or when the user is on `main`/`master`. Their branch-hygiene checks are authoritative.

## Reference-doc precedence (Group PAS V1)

When planning, mocking, or coding against the backend contract, resolve disagreements in this order. Higher entries win.

1. **`docs/spec/` (DSL specs) — canon.** Per backend confirmation, all DSL values (enums, struct/data items, API contracts) are stable.
2. **`docs/planning/team_nb_blueprint_v3.md`** — V1 narrative + scope.
3. **`docs/planning/GTL Quotation Module (3).md`** — original product spec; long-term direction (V1 is a subset).
4. **`docs/planning/openapi.json`** — *stale snapshot.* Useful for cross-checking shapes; does not always reflect the latest DSL (e.g. it shows `ProposalMember` while DSL has `PolicyMember`). Trust DSL on disagreement.
5. **`docs/planning/SAMPLE-WORKFLOW.md`** — future-state W1 (full sanction/medical/actuarial/manager-approval flow). Not what V1 ships.

Never silently follow OpenAPI when DSL diverges. Surface the mismatch in `context/SESSION_LOG.md` and proceed from DSL.

## Group PAS V1 — scope locks

These are decisions baked into [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md); change them only with explicit user sign-off:

- **Arch:** stay on existing keystone-ui schema-driven arch. Do not port to the PDF spec's `frontendProjection` pattern. State-aware actions handled via per-schema `stateActions` map + `ActionBar` widget.
- **Maker-checker (V1 demo, UI-only):** backend doesn't implement auth/maker-checker. Frontend ships a role-switcher widget and a UI-only "pending approval" overlay so the demo can show maker → checker hand-off without backend changes. Maker prepares; Checker hits the real backend submit/finalize endpoint. See [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md) → "Maker-checker UI overlay".
- **Out of V1:** real auth (Keycloak), GCL MemberQuote (placeholder IA only), backend-enforced maker-checker, PII/Cerbos UI gating, endorsement/renewal/claims, PDF's UW/RI review states.
- **Existing `/quotations` module + auth-branch zombie forms:** delete and rebuild from scratch. Do not preserve.
- **Reference precedence:** DSL → blueprint → GTL spec → OpenAPI (stale) → SAMPLE-WORKFLOW (future). See section above.
- **Demo target:** internal demo by 2026-05-08 (Friday of plan-locked week).

## Group PAS V1 — interim assumptions (non-blocking)

Backend has not deployed; these are the assumptions we mock against. Each has a corresponding entry in [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md) with risk + convergence trigger. If real backend behaviour differs, replace assumption (one mapper) without rewriting screens.

1. **Async transitions:** backend-suggested cadence — 2s for the first 10s, then 5s out to 60s, then stop. Exported as `STANDARD_POLL_SCHEDULE` from `src/lib/polling.ts`. `useSmartQuery` consumes it via `dataSource.pollSchedule` + `stopWhen`. Mock route flips entity state on a timer.
2. **Quote → Proposal handoff:** auto-create Proposal on `POST /quotes/{id}/finalize`. Frontend polls `GET /proposals/by-quote/{quoteId}`.
3. **Send-for-issuance → PAM Member visibility:** async; poll `GET /policy-admin/members/by-policy-member/{policyMemberId}` until 200.
4. **Error response shape:** Spring default for V1 — `{ timestamp, status, error, message, path }`. Top-level `message` only; **no field-level errors**. Backend can ship a richer `{ code, message, fieldErrors: [...] }` envelope on request — defer until a V1 form actually needs per-field validation feedback.
5. **Pending-breakdown:** no dedicated endpoint in V1; derive client-side by grouping `MemberSummaryDto.pendingReason` from the members list response. Server-side aggregate added later if it becomes hot.
6. **Member-to-Plan Mapping (DMN):** opaque file ref via upload-url flow. UI = "show ref + replace upload"; no authoring tool.
7. **GCL endpoints:** non-functional / stub. Placeholder tab only; no fixtures or actions.
8. **Auth:** open API in V1. No bearer required. No multi-tenant header.
9. **File upload destination:** mock-first via Next.js catch-all route. Real S3/MinIO PUT URL handling deferred until backend deploys with CORS for localhost.
