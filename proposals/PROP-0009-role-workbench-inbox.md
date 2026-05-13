---
id: PROP-0009
title: Role-workbench + Dashboard Inbox in the group-insurance portal
status: done
next_step: monitor demo, then file PROP-0010 build
proposer: agent:claude
created: 2026-05-13
category: architecture
impact: high
effort: m
evidence:
  - /Users/seriousblack/.claude/plans/read-docs-planning-demo-narrative-gtl-gc-cosmic-dove.md
  - docs/planning/DEMO_NARRATIVE_GTL_GCL.md
  - src/types/group-pas/roles.ts:4
  - src/components/widgets/role/RoleSwitcher.tsx
  - src/components/widgets/actions/ActionBar.tsx:45
  - src/app/api/config/app/route.ts:7
  - src/mocks/original/group-insurance/config/app-config-mock.ts:19
  - schemas/dashboard.json
  - src/shared/types.ts:1
related: [PROP-0010, PROP-0011, PROP-0012, PROP-0013]
pr: null
---

## Problem

[docs/planning/DEMO_NARRATIVE_GTL_GCL.md](docs/planning/DEMO_NARRATIVE_GTL_GCL.md) walks through six personas (Sales, Partner Agent, MPH, Member, UW, Ops) but the current `group-insurance` portal:
- Ships a role enum (`maker | checker | ops | viewer`) that doesn't match the narrative personas.
- Has zero menu-level RBAC — every role sees the same 5-module sidebar ([src/components/navigation/IconRail.tsx](src/components/navigation/IconRail.tsx), [src/shared/types.ts:1](src/shared/types.ts:1)).
- Has no "what should I do next" surface — `grep` for `inbox|todo|task|workbench|queue` in `src/` returns nothing. [schemas/dashboard.json](schemas/dashboard.json) is metric-cards-only.
- Has no schema-level role-visibility field — `WidgetRenderer` renders every child regardless of role.

Action-level RBAC exists ([src/components/widgets/actions/ActionBar.tsx:45](src/components/widgets/actions/ActionBar.tsx:45) — `roleActions`), and the schema-driven list/filter widgets are reusable, but the workbench framing is missing. Switching role does nothing visible beyond hiding a few buttons.

Backend state-based filtering for inbox queries is confirmed against the live OpenAPI (`/quotes/search?status=`, `/proposals/search?state=`, etc.). Ownership filters aren't needed — V1 inboxes filter by *state*, not *owner*, because auth is still open (CORE_MEMORY §interim-assumptions #8).

**GTL "awaiting members" threshold counter (Q1 resolved 2026-05-13):** `GET /api/policy-admin/policies/{policyId}` returns `activationThreshold` and `pendingReason` on `PolicyDto` ([PolicyDto.java:31-32](file:///Users/seriousblack/dev_anaira/group-pas/group-pas/policyAdmin/PolicyAdminQuery/src-gen/main/java/com/anaira/policyadmin/query/PolicyDto.java)). The current member count is **not** returned — UI must compute it by counting `PENDING|ACTIVE` rows from `GET /api/issuance/policies/{policyId}/members`. Workflow stores `memberCount` only in its private `dataAttributes`. Acceptable for V1; revisit if the dual fetch becomes hot.

## Proposed change

Turn the role switcher into a workbench switcher inside the current `group-insurance` portal. Scope: **Sales + Partner Agent only**. The four other personas get their own portals via PROP-0010 / PROP-0011 / PROP-0012 / PROP-0013.

1. **Expand the role enum** to the six narrative personas, dropping `maker / checker / ops / viewer`:
   ```ts
   // src/types/group-pas/roles.ts
   export type Role = 'sales' | 'partner_agent' | 'mph' | 'member' | 'uw' | 'ops';
   ```
   Sweep `"maker" / "checker" / "ops" / "viewer"` across: [RoleSwitcher.tsx](src/components/widgets/role/RoleSwitcher.tsx), [PlanCard.tsx](src/components/widgets/data/PlanCard.tsx), [EditableTable.tsx](src/components/widgets/data/EditableTable.tsx), 11 schemas under `schemas/` (5 `*-detail.json`, 5 `tabs/quote/*.json`, `member-quote-detail.json`), [ActionBar.unit.test.tsx](src/tests/unit/actions/ActionBar.unit.test.tsx). Each schema's `roleActions` is the explicit demo-script decision about which persona presses which button.

2. **Limit the in-portal switcher** to `sales | partner_agent`. The other four roles exist in the enum (so action-RBAC schemas can name them) but aren't selectable until their portals exist.

3. **Make `/api/config/app` role-aware** so the menu is filtered server-side, matching the post-auth posture:
   - [src/app/api/config/app/route.ts:7](src/app/api/config/app/route.ts:7) reads `&role=<Role>` and filters `menuItems` against a per-item `allowedRoles` table.
   - Per-item table in [src/mocks/original/group-insurance/config/app-config-mock.ts](src/mocks/original/group-insurance/config/app-config-mock.ts). First cut: Home → all; Quotation → sales, partner_agent; Issuance → sales; Policy Admin → sales, partner_agent; Accounting → sales (refine when demo script is walked).
   - `AppContextProvider` passes `role` from `useRole()` and re-fetches on role change.

4. **Add `visibleRoles?: Role[]` to the schema renderer.** `WidgetRenderer` calls `useRole()` and skips children whose `visibleRoles` is set and doesn't include the current role. ~15 LOC. Generic — usable by every future portal (PROP-0010..PROP-0013) and for detail-page tab gating later.

5. **Add an Inbox section to [schemas/dashboard.json](schemas/dashboard.json).** A `section-group` containing N `data-table` children, each scoped to one entity + state filter with `visibleRoles`. For the current portal:
   - `inbox-sales-my-quotes` (visible to sales) → `/api/quotation/quotes/search?status=DRAFT,SUBMITTED`
   - `inbox-sales-finalize-proposal` (visible to sales) → `/api/issuance/proposals/search?state=ACCEPTED_BY_CLIENT`
   - `inbox-partner-census-upload` (visible to partner_agent) → `/api/policy-admin/policies/search?state=ACTIVE,PENDING`
   Exact state strings verified against `state-map.ts` during build. Row click → existing detail route (already wired).

6. **Minor `data-table` wiring** (no new widget): a `compact` props preset (smaller column set, narrower paddings) and `rowHref` templating with `{id}` substitution — confirm existing support during build, otherwise add.

7. **Action-RBAC sweep.** Each `roleActions` block in the 11 schemas gets re-keyed to the new role names. Walking the demo script step-by-step sets the values.

## Alternatives considered

- **Keep `maker/checker` aliases for the new roles.** Rejected. Alias debt is forever; the rename is one PR; reading "maker = Sales" mentally for the rest of the project's life isn't worth saving an hour of sweep work.
- **Client-side filter of `menuItems` in `DualPanelNav` instead of server-side `/api/config/app` filter.** Rejected. The real backend (post-auth) returns the menu pre-filtered by JWT permissions; mirroring that contract now means the UI doesn't have to be reworked when auth lands.
- **Build a dedicated `inbox-widget` component.** Rejected. Existing `data-table` + new `visibleRoles` field does the job. A bespoke widget is a feature dressed as architecture.
- **Defer until auth lands.** Rejected. The demo narrative needs the workbench framing now; auth is months out per CORE_MEMORY scope locks.

---

## Project-context fit

Aligns with [context/CORE_MEMORY.md "API-driven scope"](context/CORE_MEMORY.md) (build the UI when the API surface exists; don't gate on conceptual buckets) and the schema-driven architecture rule. The `visibleRoles` renderer field is exactly the kind of shared primitive CORE_MEMORY favours over per-feature one-offs. Backend identity propagation deferred to post-auth — confirmed by API team that JWT will carry user identity (see plan §"Questions resolved").

Sibling proposals (PROP-0010..PROP-0013) build on the three primitives this proposal introduces (6-role enum, `visibleRoles`, role-aware `/api/config/app`). Approving and shipping this first unblocks the deferred portals.

## Pros
- Single highest-impact UX uplift for the demo: switching role visibly reshapes the workbench instead of silently toggling buttons.
- All primitives are reusable — the deferred portal proposals add zero new schema-engine concepts.
- No backend dependency. Live OpenAPI confirms all state filters needed for the Sales + Partner Agent inboxes.
- Server-side menu filtering matches the post-auth posture; no rework when JWT-driven permissions land.

## Cons
- Mechanical sweep across 11 schemas + 3 TSX files for the role rename. ~1 PR's worth of touch, no design risk.
- `roleActions` decisions on each schema need a demo-script walk-through to set correctly; an unwalked schema will gate the wrong actions for the wrong persona.
- `partner_agent` inbox section's exact endpoint+state combination is somewhat heuristic for V1 (filter by `ACTIVE,PENDING` policies); refinement may be needed once the demo script is walked.

## Recommendation
approve.

---

## Implementation notes
