# Design — PROP-0009 Role-workbench + Dashboard Inbox

Run-id: 2026-05-13-role-workbench-inbox
Branch: feat/new-buisiness (existing dev branch, per project branch-hygiene)

## Goal

Turn the role-switcher in the `group-insurance` portal into a workbench switcher: picking a role filters the menu server-side, scopes available actions, and surfaces a Dashboard Inbox listing the role's actionable items.

**Scope expanded 2026-05-13 (user direction):** all 6 narrative roles (`sales | partner_agent | mph | member | uw | ops`) are selectable in this portal as a stopgap until each gets its own dedicated portal (PROP-0010..PROP-0013). When each portal lands, drop the corresponding entry from this portal's switcher (one-line config change). The role itself stays in the enum.

## In-scope

1. Role enum rename + sweep: `maker | checker | ops | viewer` → `sales | partner_agent | mph | member | uw | ops`.
2. `visibleRoles?: Role[]` field on every schema node, honored by `WidgetRenderer`.
3. Role-aware `/api/config/app` (server-side menu filter) + `AppContextProvider` re-fetch on role change.
4. Dashboard Inbox section in `schemas/dashboard.json`: three role-scoped `data-table` children.
5. RoleSwitcher restricted to `sales | partner_agent` in this portal (other roles exist in the enum for action-RBAC but aren't selectable here).
6. ActionBar maker-checker special cases collapsed (see "Architecture Transition Note").
7. `data-table` config-level support for `compact` and `rowHref` if not already present.

## Out-of-scope

- New widgets (renderer field only, no UI widget invention).
- New backend endpoints (all required endpoints exist per the live OpenAPI).
- The four deferred portals — separate proposals.
- Detail-page tab-level role gating (`visibleRoles` field is generic so future schemas can use it, but no detail page changes in this PR).
- Auth / JWT (still UI-local role).

## Data shape

### Role type (src/types/group-pas/roles.ts)
```ts
export type Role = 'sales' | 'partner_agent' | 'mph' | 'member' | 'uw' | 'ops';
export const ROLES: Role[] = ['sales', 'partner_agent', 'mph', 'member', 'uw', 'ops'];
```

### NavigationItem (src/shared/types.ts)
Add `allowedRoles?: Role[]` — server-side filter; UI just consumes the filtered list.

### Schema node (no type change, just a documented optional field)
Any widget config may carry `visibleRoles?: Role[]`. `WidgetRenderer` skips children whose `visibleRoles` is set and doesn't include the current role.

### app-config-mock.ts allowedRoles table (expanded 6-role)
| Menu item | allowedRoles |
|---|---|
| Home | (omitted = all) |
| Quotation | sales, partner_agent, mph |
| Issuance | sales, mph, uw |
| Policy Admin | sales, partner_agent, member, ops |
| Accounting | sales |

Refinable when demo script is walked end-to-end.

## Components / files to modify

| File | Change |
|---|---|
| `src/types/group-pas/roles.ts` | 6-role union + `ROLES` const |
| `src/contexts/RoleContext.tsx` | DEFAULT_ROLE = `'sales'`; readStoredRole validator uses `ROLES.includes(...)` |
| `src/components/widgets/role/RoleSwitcher.tsx` | ROLE_META rewritten with 6 entries; ROLE_ORDER lists all 6 (stopgap; drop entries when their portals land) |
| `src/shared/types.ts` | Add `allowedRoles?: Role[]` to `NavigationItem` |
| `src/app/api/config/app/route.ts` | Read `role` query param, filter `menuItems` (and `subMenuItems` recursively) by `allowedRoles` |
| `src/mocks/original/group-insurance/config/app-config-mock.ts` | Annotate menu items with `allowedRoles` per table above |
| `src/components/providers/AppContextProvider.tsx` | Pull `role` from `useRole()`, include in queryKey + fetch URL |
| `src/components/registry/WidgetRenderer.tsx` | Add `useRole()` + early-return when `config.visibleRoles?.length` and current role not included |
| `schemas/dashboard.json` | Add Inbox `section-group` with 3 `data-table` children, each `visibleRoles` scoped |
| `src/components/widgets/data/DataTable/index.tsx` + types.ts | Wire optional `compact` prop (smaller column padding/font); confirm/add config-level `rowHref` |
| `src/components/widgets/actions/ActionBar.tsx` | Rename role-string special cases: `'maker' → 'sales'`, `'checker' → 'mph'`. Maker-checker demo theatre preserved under new names. |
| `src/components/widgets/data/EditableTable.tsx` | `editableRoles` type → `Role[]`; default `["sales"]` |
| `src/tests/unit/actions/ActionBar.unit.test.tsx` | Replace `'maker'/'checker'/'viewer'` with the new role names; remove tests covering the dropped role-special-case branches; add a `visibleRoles` test for WidgetRenderer separately if cheap |
| 11 schemas under `schemas/` (5 `*-detail`, 5 `tabs/quote/*`, 1 `member-quote-detail`) | Schema-sweep. New keys per action-id split (see "Action mapping" below). `viewer` keys dropped. |
| `schemas/policy-member-detail.json` (additional) | Add new `confirm-maf` action wired to `POST /api/issuance/policy-members/{id}/confirm-maf`. Visible to `member` role, gated to `MAF_PENDING` state. Single-click confirm; OTP form deferred to PROP-0011. |

## API surface

- `GET /api/config/app?appId=group-insurance&role=<Role>` — now returns menu pre-filtered. Frontend doesn't filter again.
- All inbox queries: existing `/api/quotation/quotes/search?status=...`, `/api/issuance/proposals/search?state=...`, `/api/policy-admin/policies/search?state=...`. No backend change.

## Action mapping for the schema sweep

Per-action mapping discovered from the audit of the 11 schemas:

| Schema | Old `maker` actions → | Old `checker` actions → |
|---|---|---|
| `quote-detail.json` | send-for-approval, withdraw → `sales` | submit/send-to-client/clear-approval/expire/finalize/withdraw → `sales`; accept/reject → `mph` |
| `proposal-detail.json` | submit → `sales` | finalize, cancel → `sales` |
| `policy-detail.json` | (none) | cancel → `sales` |
| `member-quote-detail.json` | set-premium, submit → `sales` | finalize → `sales` |
| `policy-member-detail.json` | repair-edit → `ops` (already covered by ops key) | price/classify/reject/archive/send-for-issuance/pam-link → `sales`; uw-approve/uw-reject → `uw` |
| `tabs/quote/*.json` (5 files) | all maker actions (edit-*, add-plan, request-price, edit-census-file-format) → `sales`; census + member-mapping also → `partner_agent` | replace-mapping → `sales` |

`ops` keys stay `ops` (no rename). `viewer` keys dropped entirely. Where `partner_agent` makes narrative sense (census-upload, member-mapping), add to the list — Sales still has it too (both roles can do these per demo §2A.1 "Partner Agent / Sales → ...").

## Inbox schema concrete shape

Insert as a new section in `schemas/dashboard.json` after `metrics-section` — 7 role-scoped data-tables:

```jsonc
{
  "id": "inbox-section",
  "type": "section-group",
  "props": { "title": "Inbox", "columns": 1 },
  "children": [
    {
      "id": "inbox-sales-my-quotes",
      "type": "data-table",
      "visibleRoles": ["sales"],
      "props": {
        "title": "Quotes awaiting your action",
        "compact": true,
        "rowHref": "/quotation/{id}",
        "columns": [
          { "key": "registrationNumber", "label": "Reg #" },
          { "key": "clientName", "label": "Client" },
          { "key": "status", "label": "Status", "cell": "state-badge", "props": { "entity": "quote" } },
          { "key": "updatedAt", "label": "Updated", "cell": "datetime" }
        ]
      },
      "dataSource": {
        "api": { "endpoint": "/api/quotation/quotes/search",
                 "params": { "status": "DRAFT,SUBMITTED", "size": 10 } }
      }
    },
    {
      "id": "inbox-sales-finalize-proposal",
      "type": "data-table",
      "visibleRoles": ["sales"],
      "props": {
        "title": "Proposals ready to finalize",
        "compact": true,
        "rowHref": "/issuance/proposals/{id}",
        "columns": [
          { "key": "proposalId", "label": "Proposal #" },
          { "key": "clientName", "label": "Client" },
          { "key": "state", "label": "State", "cell": "state-badge", "props": { "entity": "proposal" } }
        ]
      },
      "dataSource": {
        "api": { "endpoint": "/api/issuance/proposals/search",
                 "params": { "state": "SUBMITTED", "size": 10 } }
      }
    },
    {
      "id": "inbox-partner-onboard-members",
      "type": "data-table",
      "visibleRoles": ["partner_agent"],
      "props": {
        "title": "Policies needing member onboarding",
        "compact": true,
        "rowHref": "/policy-admin/policies/{id}",
        "columns": [
          { "key": "policyNumber", "label": "Policy #" },
          { "key": "clientName", "label": "Client" },
          { "key": "state", "label": "State", "cell": "state-badge", "props": { "entity": "policy" } }
        ]
      },
      "dataSource": {
        "api": { "endpoint": "/api/policy-admin/policies/search",
                 "params": { "state": "PENDING,ACTIVE", "size": 10 } }
      }
    }
  ]
}
```

Column keys verified during build against current list-page schemas (`schemas/quote.json`, `schemas/proposal.json`, `schemas/policy.json`).

## Edge cases

- **Search params with commas (`status=DRAFT,SUBMITTED`):** confirm `useSmartQuery` doesn't URL-encode the comma (it splits server-side). If it does, switch to repeated params or single-state sections per state.
- **`visibleRoles` on a `section-group` whose all children are hidden:** the section-group itself renders an empty container with title. Add a check to also hide the parent if all children resolve to null, OR set `visibleRoles` on the parent too. Simpler: rely on schema authors to set `visibleRoles` consistently; document the gotcha.
- **Role change mid-page:** `AppContextProvider`'s queryKey includes `role` so menu re-fetches; `WidgetRenderer` re-renders via context update. No manual invalidation needed.
- **Mock-mode `/api/config/app`:** filter logic must work for the static mock config object (mutates a copy, not the source).
- **Tests that previously asserted `'maker'`/`'checker'` behavior:** rewrite to assert `'sales'` equivalent; delete the role-asymmetry tests (overlay scaffolding behavior removed).

## Architecture Transition Note

The maker-checker overlay scaffolding (V1 transitional, audit pass 2026-05-11) is partially dismantled here: the role-asymmetry between `'maker'` and `'checker'` in ActionBar.tsx is removed because neither role exists in the new enum and the demo narrative has no in-portal approver persona. The `awaitingApproval` state lock survives via `stateActions` (state-based gating preserved). When the real backend approval workflow lands, a future PR can re-introduce role asymmetry on a different axis (e.g., `sales` vs a senior-sales role) without needing to undo this work.

## Test plan

- Unit: `src/tests/unit/actions/ActionBar.unit.test.tsx` updated for the new role names. Negative tests for the dropped role-special-case branches removed.
- Unit (new, small): `src/tests/unit/registry/WidgetRenderer.visibleRoles.test.tsx` — three cases: no `visibleRoles` → renders; role included → renders; role excluded → null.
- Integration check (manual via preview): cycle `sales` ↔ `partner_agent` in switcher, confirm menu re-filters and Inbox sections swap.
- Lint + typecheck must pass.

## Design Preview — composition shape

- Composition only: zero new components/widgets.
- One renderer addition (`visibleRoles` field).
- One endpoint extension (`role` query param).
- One schema section added (`schemas/dashboard.json`).
- One enum sweep across 14 files (~mechanical regex).

Desktop / mobile: no layout change — Inbox is a vertical stack of `data-table` widgets inside the existing `section-group` which already handles single-column on narrow viewports.

## Files touched (estimate)

~16 files changed:
- 3 enum/role files
- 1 nav type
- 1 endpoint, 1 mock, 1 provider
- 1 renderer
- 1 dashboard schema
- 11 RBAC schemas (sweep)
- 1 datatable widget tweak (compact/rowHref) — may already exist
- 1 EditableTable type tweak
- 2 test files (1 updated, 1 new)
