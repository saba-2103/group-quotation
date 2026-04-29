# Keystone UI — arch_v0 Implementation Tickets

**Generated:** 2026-04-29  
**Source:** `docs/arch_v0/15-MIGRATION-AND-IMPLEMENTATION-PLAN.md` and full arch_v0 set  
**Format:** Each ticket is self-contained and loadable into Linear.

---

## How To Use This Document

- **Epics** map directly to workstreams and phases from the migration plan.
- **IDs** (KUI-001 … KUI-104) are for cross-referencing dependencies inside this doc.
- **Priority:** Urgent → blocks everything; High → blocks a phase; Medium → needed before done; Low → quality/polish.
- **Size:** XS ≈ half-day · S ≈ 1 day · M ≈ 2–3 days · L ≈ 4–5 days · XL ≈ 1 week+
- **Phases run 0 → 6.** Workstream (WS) numbers match the migration plan.
- Tickets marked `[DECISION]` produce a written decision record, not code. Assign to the named owner from the migration plan.

---

## Epic Index

| Epic | Name | Phase / WS | Tickets |
|---|---|---|---|
| EPIC-0 | Pre-Sprint Decisions | Pre-sprint | KUI-001 – KUI-006 |
| EPIC-1 | Inventory & Freeze | Phase 0 | KUI-007 – KUI-011 |
| EPIC-2 | Contract Foundation | Phase 1 / WS1 | KUI-012 – KUI-027 |
| EPIC-3 | Runtime Foundation | Phase 2 / WS2 | KUI-028 – KUI-041 |
| EPIC-4 | API Client & Auth | Phase 2 / WS3 | KUI-042 – KUI-048 |
| EPIC-5 | Route Manifest & Generic Shell | Phase 2 / WS6 | KUI-049 – KUI-055 |
| EPIC-6 | Developer Schema Loop | Phase 2 / WS5-P1 | KUI-056 – KUI-060 |
| EPIC-7 | Delivery Path | Phase 5 / WS7 | KUI-061 – KUI-065 |
| EPIC-8 | Contracts, CI & Operations | Phase 5–6 / WS8 | KUI-066 – KUI-074 |
| EPIC-9 | Migrate test-dashboard | Phase 3 | KUI-075 – KUI-079 |
| EPIC-10 | Migrate claims-list | Phase 3 | KUI-080 – KUI-084 |
| EPIC-11 | Migrate quotations-list | Phase 3 | KUI-085 – KUI-089 |
| EPIC-12 | Detail Pages & Forms | Phase 4 | KUI-090 – KUI-097 |
| EPIC-13 | Packaging & Workspace | Phase 6 / WS9 | KUI-098 – KUI-104 |

---

## EPIC-0 — Pre-Sprint Decisions

> Six decisions that must be resolved before implementation begins. Each produces a written record committed to the repo. No code is written in this epic.

---

### KUI-001 — [DECISION] Lock runtime graph store backing

| | |
|---|---|
| **Epic** | EPIC-0 |
| **Priority** | Urgent |
| **Size** | XS |
| **Depends on** | — |
| **Deadline** | Before WS2 implementation starts |

**Description**  
Confirm that the runtime graph store will be backed by Zustand behind a `RuntimeProvider` abstraction, as recommended in `docs/arch_v0/15-MIGRATION-AND-IMPLEMENTATION-PLAN.md` Pre-Sprint Decision #1. The public contract must be `RuntimeGraph`, not raw Zustand APIs, so the backing can be swapped without touching widgets. The repo already uses Zustand in `useOverlayStore.ts`, confirming it is an accepted dependency.

**Acceptance criteria**
- [ ] Decision record written and committed (owner, rationale, consequences)
- [ ] Confirms: Zustand-backed `RuntimeProvider` abstraction
- [ ] Confirms: widgets access graph through runtime hooks only, never Zustand directly
- [ ] Decision record linked from `docs/arch_v0/15-MIGRATION-AND-IMPLEMENTATION-PLAN.md` Pre-Sprint Decision #1

---

### KUI-002 — [DECISION] Confirm auth backend readiness and mocked auth contract

| | |
|---|---|
| **Epic** | EPIC-0 |
| **Priority** | Urgent |
| **Size** | XS |
| **Depends on** | — |
| **Deadline** | Before the first migrated page consumes authenticated APIs |

**Description**  
Determine whether the auth backend (short-lived JWT + HttpOnly refresh cookie per `docs/arch_v0/11-API-TEAM-CONTRACT.md`) is ready for integration now, or whether early runtime work uses a mocked auth context. Either way the runtime must depend on an auth abstraction, not on a specific mock or backend implementation. The decision shapes how `system.userId`, `system.role`, and `system.permissions` are populated in KUI-030.

**Acceptance criteria**
- [ ] Decision record written: real backend auth or mocked auth, with owner and target integration date
- [ ] Mocked auth interface defined — must satisfy the same contract as the real implementation
- [ ] Decision record linked from Pre-Sprint Decision #2

---

### KUI-003 — [DECISION] Produce backend readiness matrix for pilot pages

| | |
|---|---|
| **Epic** | EPIC-0 |
| **Priority** | Urgent |
| **Size** | S |
| **Depends on** | — |
| **Deadline** | Before the first Phase 3 pilot-page migration begins |

**Description**  
For each pilot page (`test-dashboard`, `claims`, `quotations-list`) list every graph namespace, the backend endpoint it targets, the endpoint owner, and whether it is ready, mocked, or pending. This matrix gates Phase 3 work: a page migration cannot start until its namespaces have a known endpoint state. Current API routes under `src/app/api/*` serve as the starting inventory.

**Acceptance criteria**
- [ ] Matrix covers all three pilot pages
- [ ] Every namespace has: endpoint, owner, status (ready / mocked / pending)
- [ ] Matrix committed to repo (e.g. `docs/planning/BACKEND-READINESS.md`)
- [ ] Decision record linked from Pre-Sprint Decision #3

---

### KUI-004 — [DECISION] Confirm schemaId naming convention

| | |
|---|---|
| **Epic** | EPIC-0 |
| **Priority** | High |
| **Size** | XS |
| **Depends on** | — |
| **Deadline** | Before route manifest and artifact publication are used for real pages |

**Description**  
The lint rule `schema-id-format` requires lowercase kebab-case. The migration plan recommends `quotations-list`, `quotation-details`, `claims-list` as the canonical form. This decision confirms that convention, documents forbidden patterns (no env encoding, no file paths, no mixed dotted/path forms), and establishes who approves new `schemaId` registrations going forward.

**Acceptance criteria**
- [ ] Convention documented and committed
- [ ] Forbidden patterns listed with examples
- [ ] Approval process for new `schemaId`s named
- [ ] Decision record linked from Pre-Sprint Decision #4

---

### KUI-005 — [DECISION] Assign schema bucket and CDN owner

| | |
|---|---|
| **Epic** | EPIC-0 |
| **Priority** | High |
| **Size** | XS |
| **Depends on** | — |
| **Deadline** | Before Phase 5 |

**Description**  
Name the platform/infrastructure owner responsible for provisioning and operating `keystone-resolved-schemas/` in S3/CDN across all target environments. Confirm the bucket naming, environment list (dev / staging / prod), and who holds deployment and rollback access. This unblocks KUI-061 and KUI-062 (delivery path wiring).

**Acceptance criteria**
- [ ] Named owner documented
- [ ] Bucket/path naming confirmed (`keystone-resolved-schemas/{schemaId}.json`)
- [ ] Environment list confirmed
- [ ] Deployment and rollback access model documented
- [ ] Decision record linked from Pre-Sprint Decision #5

---

### KUI-006 — [DECISION] Name runtime governance arbiter

| | |
|---|---|
| **Epic** | EPIC-0 |
| **Priority** | High |
| **Size** | XS |
| **Depends on** | — |
| **Deadline** | Before more than one page family migrates concurrently; no later than end of Phase 2 |

**Description**  
When multiple teams expose missing runtime capabilities at the same time, one person or group must decide whether to add capability to the shared runtime or allow a temporary bridge. Without this arbiter the migration bridge rules from the migration plan cannot be enforced. Every temporary bridge must also have a named owner and a removal milestone — this decision establishes who enforces that rule.

**Acceptance criteria**
- [ ] Named arbiter or review group committed to the record
- [ ] Rule documented: all temporary bridges require owner + removal milestone
- [ ] Escalation path documented for disagreements
- [ ] Decision record linked from Pre-Sprint Decision #6

---

## EPIC-1 — Inventory & Freeze (Phase 0)

> Produce the inventory artifacts that freeze the legacy path and make it auditable. No new features are added to the legacy condition or state model from this point forward.

---

### KUI-007 — Write schema-route inventory script

| | |
|---|---|
| **Epic** | EPIC-1 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | — |

**Description**  
Write a script that scans the repo and emits a table of every route file that directly imports a schema JSON. Currently these are `src/app/test-dashboard/page.tsx`, `src/app/quotations/page.tsx`, `src/app/quotations/[id]/page.tsx`, `src/app/claims/page.tsx`, `src/app/accounting/page.tsx`, and `src/app/payout/page.tsx`. The output table should list: route path, schema file imported, and whether a route manifest entry exists. The script should be re-runnable so the table stays current as migration progresses.

**Acceptance criteria**
- [ ] Script in `scripts/inventory_routes.*` (or equivalent)
- [ ] Output includes: route path, schema file, migration status (legacy / migrated)
- [ ] Script wired to a `package.json` command, e.g. `yarn inventory:routes`
- [ ] Output table committed to `docs/planning/ROUTE-INVENTORY.md`
- [ ] CI can run the script without failing on a clean checkout

---

### KUI-008 — Write src/app/api/* route classification script

| | |
|---|---|
| **Epic** | EPIC-1 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-009 |

**Description**  
Write a script that reads the `@route-class` annotation from each `src/app/api/*` route file (added in KUI-009) and emits a classification table. The table should list every API route, its class (mock / proxy / permanent), and its removal condition or owner. This gives the team a living inventory of which Next API routes are safe to delete as migration progresses versus which are genuinely permanent.

**Acceptance criteria**
- [ ] Script in `scripts/inventory_api_routes.*`
- [ ] Reads `@route-class` annotations from each route file
- [ ] Output table committed to `docs/planning/API-ROUTE-INVENTORY.md`
- [ ] Wired to `yarn inventory:api-routes`
- [ ] Script fails with a clear error if any route file is missing the annotation

---

### KUI-009 — Annotate src/app/api/* route files with @route-class metadata

| | |
|---|---|
| **Epic** | EPIC-1 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | — |

**Description**  
Add a machine-readable `@route-class` comment to every file under `src/app/api/*`. Allowed classes: `mock` (dev/demo only, no real backend), `proxy` (temporary adapter to `localhost:8090`, remove when direct backend access exists), `permanent` (genuinely required app-local endpoint). Based on current code, expected classifications: all `src/app/api/dashboard/*` routes → `mock`; `src/app/api/accounting/` and `src/app/api/moneyout/` → `proxy`; `src/app/api/config/app/` → `mock`; `src/app/api/forms/[id]/` → `mock` (pending schema delivery); `src/app/api/quotations/*` → `proxy`.

**Acceptance criteria**
- [ ] Every file under `src/app/api/*` has exactly one `@route-class: mock | proxy | permanent` comment
- [ ] Each `proxy` and `mock` class has a brief removal condition in the same comment
- [ ] PR reviewed by backend + frontend lead to confirm classifications are correct

---

### KUI-010 — Mark old architecture docs as superseded

| | |
|---|---|
| **Epic** | EPIC-1 |
| **Priority** | Medium |
| **Size** | XS |
| **Depends on** | — |

**Description**  
Add a `> **Status: Superseded** — arch_v0 is the implementation target. See docs/arch_v0/README.md.` banner to `docs/ARCHITECTURE.md` and `docs/KEYSTONE-UI-SYSTEM-DESIGN.md`. These documents describe the Worker-based, `useFieldConfig()`, and `useWorkbenchBootstrap()` architecture that is explicitly out of v0 scope. Leaving them unmarked risks confusing new contributors.

**Acceptance criteria**
- [ ] `docs/ARCHITECTURE.md` has a superseded banner at the top
- [ ] `docs/KEYSTONE-UI-SYSTEM-DESIGN.md` has a superseded banner at the top
- [ ] Both banners link to `docs/arch_v0/README.md`
- [ ] No content is deleted — the docs remain for historical reference

---

### KUI-011 — Commit decision record: arch_v0 is the implementation target

| | |
|---|---|
| **Epic** | EPIC-1 |
| **Priority** | High |
| **Size** | XS |
| **Depends on** | KUI-001 – KUI-006 |

**Description**  
Write and commit a short decision record (`docs/planning/DECISION-ARCH-V0-TARGET.md`) that formally declares `arch_v0` as the only implementation target, lists the scope exclusions (Worker, `useFieldConfig()`, `useWorkbenchBootstrap()`), and confirms Phase 0 is complete. This is the "team agreement" artifact called for in the Phase 0 definition of done.

**Acceptance criteria**
- [ ] Decision record committed with: date, signatories, scope statement, exclusion list
- [ ] Links to the six pre-sprint decision records from EPIC-0
- [ ] Links to the two superseded docs from KUI-010
- [ ] Phase 0 definition of done is satisfied

---

## EPIC-2 — Contract Foundation (Phase 1 / WS1)

> Build the new schema contracts and validators. No runtime code. These contracts are the source of truth that all later workstreams depend on.

---

### KUI-012 — Define TypeScript types: PageSchema, ResolvedSchemaArtifact, RouteManifestEntry

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-004 |

**Description**  
Create `src/schema/types/index.ts` with the three top-level TypeScript types. `PageSchema` contains `schemaId`, `version`, `title?`, `graphNamespaces`, and `widgetTree`. `ResolvedSchemaArtifact` extends `PageSchema` with `resolvedAt` (ISO timestamp). `RouteManifestEntry` contains `path`, `schemaId`, `routeParams?`, `priority?`, and `runtime?: "legacy" | "v0"` (default `"v0"`). These types replace `src/types/widget.ts` for the new runtime path — do not delete the legacy type yet.

**Acceptance criteria**
- [ ] `src/schema/types/index.ts` created and exports all three types
- [ ] `PageSchema.graphNamespaces` uses the `GraphNamespaceDefinition` discriminated union from KUI-013
- [ ] `ResolvedSchemaArtifact` extends `PageSchema` and adds `resolvedAt: string`
- [ ] `RouteManifestEntry.runtime` defaults to `"v0"` per the manifest spec
- [ ] TypeScript compiles cleanly with no `any` in the new types

---

### KUI-013 — Define GraphNamespaceDefinition discriminated union

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | Urgent |
| **Size** | S |
| **Depends on** | — |

**Description**  
Define the `GraphNamespaceDefinition` discriminated union with three members: `ApiGraphNamespace` (`kind: "api"`, required `endpoint`, optional `usage`, `mode`, `method`, `dependsOn`), `LocalGraphNamespace` (`kind: "local"`, optional `usage`, `initialValue`, `initialValueFrom` — at least one required), `InlineGraphNamespace` (`kind: "inline"`, required `value`, optional `usage`). The discriminant is `kind`. Invalid cross-kind fields (e.g. `value` on an `api` namespace) must be structurally impossible, not just documented.

**Acceptance criteria**
- [ ] Three namespace interfaces defined in `src/schema/types/namespaces.ts`
- [ ] Discriminated union exported as `GraphNamespaceDefinition`
- [ ] `ApiGraphNamespace` disallows `initialValue`, `initialValueFrom`, `value`
- [ ] `LocalGraphNamespace` disallows `endpoint`, `method`, `dependsOn`, `value`
- [ ] `InlineGraphNamespace` disallows `endpoint`, `method`, `dependsOn`, `initialValue`, `initialValueFrom`
- [ ] TypeScript-level enforcement, not just comments

---

### KUI-014 — Define canonical WidgetNode contract

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-012 |

**Description**  
Define a `WidgetNode` base type with `type: string`, optional `bind?`, `visibleWhen?`, `children?: WidgetNode[]`, and any common props. Extend it with `FieldWidgetNode` that adds `editableWhen?` and `requiredWhen?` for form-field nodes. This replaces `WidgetConfig` from `src/types/widget.ts` for the new runtime path. The new type must cover all widget families currently in `src/components/widgets/*` at a minimum — the renderer (KUI-039) depends on this contract.

**Acceptance criteria**
- [ ] `WidgetNode` and `FieldWidgetNode` defined in `src/schema/types/widgets.ts`
- [ ] `visibleWhen` allowed on `WidgetNode` (any node)
- [ ] `editableWhen` and `requiredWhen` restricted to `FieldWidgetNode`
- [ ] Existing widget families (`DataTable`, `FormContainer`, `MetricCard`, `FilterBar`, etc.) can be represented without needing `any`
- [ ] `src/types/widget.ts` (legacy) is unchanged — no deletion yet

---

### KUI-015 — Implement Zod schema for PageSchema

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-012, KUI-013, KUI-016 |

**Description**  
Implement the Zod validator for `PageSchema` in `src/schema/validators/PageSchema.zod.ts`. Must validate: `schemaId` as non-empty kebab-case string, `version` as non-empty string, `graphNamespaces` as a record using the namespace discriminated union validators, `widgetTree` as a `WidgetNode`. The namespace map must enforce: unique namespace keys, `kind: "local"` requires at least one of `initialValue` or `initialValueFrom` (cross-field `.refine()`), `dependsOn` references must be declared namespace names, and no dependency cycles.

**Acceptance criteria**
- [ ] `PageSchema.zod.ts` exported from `src/schema/validators/`
- [ ] `schemaId` fails on `PascalCase`, `snake_case`, or empty strings
- [ ] `kind: "api"` with `value` field fails
- [ ] `kind: "local"` with neither `initialValue` nor `initialValueFrom` fails
- [ ] `kind: "local"` with both passes (dual-init warning in lint, not Zod)
- [ ] `dependsOn: ["undeclaredNamespace"]` fails
- [ ] Circular `dependsOn` (`a→b→a`) fails
- [ ] Valid example from `docs/arch_v0/12-PAGE-AUTHORING-MANUAL.md` passes

---

### KUI-016 — Implement Zod schema for ResolvedSchemaArtifact

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-015 |

**Description**  
Implement the Zod validator for `ResolvedSchemaArtifact` in `src/schema/validators/ResolvedSchemaArtifact.zod.ts`. This extends `PageSchema` validation and adds `resolvedAt` as a required ISO datetime string. This validator is used at both publish time (KUI-056) and fetch time (KUI-063) — it is the browser-facing contract gate.

**Acceptance criteria**
- [ ] `ResolvedSchemaArtifact.zod.ts` exported from `src/schema/validators/`
- [ ] All `PageSchema` rules apply
- [ ] `resolvedAt` required and validated as ISO 8601 datetime string
- [ ] Missing `resolvedAt` fails
- [ ] Malformed `resolvedAt` (e.g. `"yesterday"`) fails

---

### KUI-017 — Implement Zod schema for RouteManifestEntry and RouteManifest

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-012 |

**Description**  
Implement Zod validators for `RouteManifestEntry` and `RouteManifest` (array of entries) in `src/schema/validators/RouteManifest.zod.ts`. Per `docs/arch_v0/16-ROUTE-MANIFEST-AND-SCHEMA-RESOLUTION.md`: every entry requires non-empty `path` and `schemaId`, `routeParams` aliases must reference actual path params in the `path` pattern, no duplicate path patterns, no ambiguous effective matches. The `runtime` field defaults to `"v0"` and accepts `"legacy" | "v0"`.

**Acceptance criteria**
- [ ] Entry with empty `schemaId` fails
- [ ] Entry where `routeParams.quoteId: "quoteNumber"` but `:quoteNumber` is not in `path` fails
- [ ] Two entries with identical `path` patterns fail
- [ ] `runtime` field defaults to `"v0"` when omitted
- [ ] Valid manifest from doc example passes

---

### KUI-018 — Implement JSONLogic subset structural validator

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-012 |

**Description**  
Implement a structural validator in `src/schema/validators/jsonlogic.ts` that checks a JSONLogic expression uses only the allowed operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`, `!`, `in`, `missing`, `missing_some`, `var`. Any other operator (e.g. `+`, `substr`, `map`) must fail. The validator must also check nesting depth (warn >4) and total operator count (warn >10) per `condition-complexity-budget` lint rule.

**Acceptance criteria**
- [ ] `validateJsonLogicSubset(expr)` exported from `src/schema/validators/jsonlogic.ts`
- [ ] Operator outside the allowed set returns an error
- [ ] Valid condition from the worked example passes
- [ ] Nesting depth > 4 returns a warning (not error)
- [ ] Operator count > 10 returns a warning
- [ ] Empty object `{}` fails (not a valid condition)

---

### KUI-019 — Implement standalone JSONLogic evaluator against RuntimeGraph

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-018 |

**Description**  
Implement a pure-function JSONLogic evaluator in `src/schema/evaluator/jsonlogic.ts` that takes a condition expression and a `RuntimeGraph` snapshot and returns a boolean. Must only use the allowed operator subset. The evaluator must be completely independent of React — it is a pure function that can be tested against a plain JS object. This is the engine that `ConditionEngine` (KUI-037) will wrap for runtime use.

**Acceptance criteria**
- [ ] `evaluateCondition(expr, graphSnapshot): boolean` exported
- [ ] All allowed operators work correctly
- [ ] `{ "var": "graph.quote.insured.age" }` resolves nested paths correctly
- [ ] `{ "var": "system.role" }` resolves from system root
- [ ] `{ "var": "undeclared.path" }` returns `undefined` (safe, not a throw)
- [ ] Disallowed operator throws or returns false with a logged error
- [ ] 15+ unit tests covering truth tables for each operator

---

### KUI-020 — Implement semantic validator: namespace uniqueness + single-writer ownership

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-015 |

**Description**  
Add semantic validation on top of Zod structure checks. `namespace-name-unique`: no two keys in `graphNamespaces` may be identical (Zod `record()` handles this but emit a clear error). `single-writer-graph-path`: no two namespace definitions may resolve to the same `graph.*` path (e.g. `quote` and `quoteSummary` with `target: "graph.quote"` is illegal). `overlapping-namespace-collision`: `graph.quote` and `graph.quote.summary` from two separate namespace definitions is illegal. These live in `src/schema/lint/namespaces.ts`.

**Acceptance criteria**
- [ ] Duplicate namespace keys caught with clear error message referencing `namespace-name-unique`
- [ ] `target: "graph.someOtherName"` override attempt fails (`namespace-path-derived`)
- [ ] Overlapping parent/child namespace paths fail (`overlapping-namespace-collision`)
- [ ] All three rules have unit tests with fixture schemas

---

### KUI-021 — Implement semantic validator: bind path validity

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-015 |

**Description**  
Validate that all absolute `bind` paths in the widget tree start with `system.` or `graph.`, and that any `graph.*` path references a declared namespace. E.g. `bind: "data.quote.state"` fails `bind-path-valid-root`. `bind: "graph.quote.summary"` where `quote` is not in `graphNamespaces` fails `bind-path-declared-namespace`. Relative binds (no root prefix) are only valid when a parent scope exists — validate this at schema level where statically determinable.

**Acceptance criteria**
- [ ] `bind: "data.quote.state"` fails with `bind-path-valid-root`
- [ ] `bind: "graph.undeclared.field"` fails with `bind-path-declared-namespace`
- [ ] `bind: "graph.quote.summary"` where `quote` is declared passes
- [ ] `bind: "system.role"` passes
- [ ] `optionsSource.path: "graph.undeclared"` fails with `options-source-path-valid`

---

### KUI-022 — Implement semantic validator: condition var paths

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-018, KUI-021 |

**Description**  
Validate that every `{ "var": "..." }` reference inside a condition expression only points to `system.*` or declared `graph.*` namespaces. `{ "var": "data.quote.state" }` fails `condition-var-root-valid`. `{ "var": "graph.undeclared.field" }` fails `condition-var-declared-namespace`. Also validate that `editableWhen` and `requiredWhen` only appear on field-type widget nodes, not on layout/display nodes (`condition-key-supported-by-node`).

**Acceptance criteria**
- [ ] `{ "var": "data.quote.state" }` fails with `condition-var-root-valid`
- [ ] `{ "var": "form.quoteDetails.field" }` fails with `condition-var-root-valid`
- [ ] `{ "var": "graph.undeclared" }` fails with `condition-var-declared-namespace`
- [ ] `requiredWhen` on `SummaryCard` widget type fails with `condition-key-supported-by-node`
- [ ] All valid conditions from the worked example pass

---

### KUI-023 — Implement semantic validator: dependsOn rules + cycle detection

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-015 |

**Description**  
Validate `dependsOn` in `ApiGraphNamespace` against three rules: `namespace-dependsOn-declared` (every name in `dependsOn` must be a declared namespace key), `namespace-dependsOn-system-disallowed` (`system.routeParams.quoteId` is not a valid `dependsOn` value), `namespace-dependsOn-cycle` (topological sort — reject if a cycle exists). The cycle detection must work for chains of any length, not just direct `a→b→a`.

**Acceptance criteria**
- [ ] `dependsOn: ["undeclaredNamespace"]` fails with clear message
- [ ] `dependsOn: ["system.routeParams.quoteId"]` fails
- [ ] Two namespaces each depending on the other fail
- [ ] A three-node cycle (`a→b→c→a`) fails
- [ ] A valid linear chain (`a` ← `b` ← `c`) passes

---

### KUI-024 — Implement semantic validator: route manifest ambiguity

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-017 |

**Description**  
Add route-level semantic validation: detect path patterns that match the same URL without explicit `priority` disambiguation, detect `routeParams` aliases that reference parameter names not present in the `path` pattern, and detect duplicate effective `schemaId` mappings for the same path. These validations run at validation/publish time, not just at runtime.

**Acceptance criteria**
- [ ] `/quotations/:id` and `/quotations/:quoteId` both present → ambiguity error
- [ ] `/quotations/:id` with `routeParams: { quoteId: "quoteNumber" }` → alias error (`:quoteNumber` not in path)
- [ ] Two entries with the same path and same priority → duplicate error
- [ ] `/quotations/new` and `/quotations/:id` coexist without error (static beats parameterized)

---

### KUI-025 — Add validate:schema-contracts script

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-015, KUI-016, KUI-017, KUI-020, KUI-021, KUI-022, KUI-023, KUI-024 |

**Description**  
Wire all schema validators into a single script invokable as `yarn validate:schema-contracts`. The script runs against: all files in `schemas/**/*.json`, any files in `dist/resolved-schemas/` (if present), and the route manifest. It should print a grouped report of errors and warnings per file, exit 1 on any errors, and exit 0 with warnings printed if only warnings are present.

**Acceptance criteria**
- [ ] `yarn validate:schema-contracts` runs without error on a clean checkout
- [ ] Invalid schema in `schemas/` causes a non-zero exit
- [ ] Output groups errors by file and rule ID (e.g. `[namespace-dependsOn-cycle]`)
- [ ] Script is runnable in CI without additional setup

---

### KUI-026 — Add schema test fixtures

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-015, KUI-016, KUI-017 |

**Description**  
Add fixture schemas in `src/tests/schemas/fixtures/` covering: a valid complete `PageSchema`, a schema with a namespace collision, a schema with an invalid condition var path (`data.quote.state`), a schema with a `dependsOn` cycle, and an invalid `RouteManifest` with an ambiguous alias. These fixtures serve as regression tests for all validators. At least one fixture should be the worked example from `docs/arch_v0/12-PAGE-AUTHORING-MANUAL.md`.

**Acceptance criteria**
- [ ] 5+ fixture files created
- [ ] Each fixture has a paired test asserting it passes or fails the expected validators
- [ ] The `12-PAGE-AUTHORING-MANUAL.md` worked example passes all validators cleanly
- [ ] Tests run as part of `yarn test`

---

### KUI-027 — Add JSONLogic evaluator tests against existing pilot schemas

| | |
|---|---|
| **Epic** | EPIC-2 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-019, KUI-026 |

**Description**  
Write evaluator tests using real condition expressions extracted from `schemas/claims-list.json`, `schemas/dashboard.json`, and any form schemas that already contain JSONLogic (the migration plan notes some schemas already use `{ "==": [{ "var": "isMasterPolicy" }, "yes"] }` style conditions). These tests prove the standalone evaluator handles the actual schema content before any page migration begins.

**Acceptance criteria**
- [ ] At least 10 tests using conditions extracted from real existing schemas
- [ ] Tests cover both truthy and falsy graph snapshot inputs
- [ ] Tests confirm the legacy `{ field, operator, value }` shape is rejected by the subset validator
- [ ] All tests pass in `yarn test`

---

## EPIC-3 — Runtime Foundation (Phase 2 / WS2)

> Build the new runtime alongside the legacy renderer. The legacy `WidgetRenderer` stays alive. No existing page breaks.

---

### KUI-028 — Create RuntimeGraph Zustand store + RuntimeProvider

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-001, KUI-012 |

**Description**  
Create the Zustand-backed runtime graph store in `src/runtime/providers/RuntimeProvider.tsx`. The store shape is `RuntimeGraph: { system: { userId, role, permissions, routeParams }, graph: Record<string, unknown> }`. Expose read access via a `useRuntimeGraph()` hook and write access via `useRuntimeGraphActions()`. Widgets must never import Zustand directly — all access is through these hooks. The provider wraps the app (or the schema shell) and is the single source of truth for page state on migrated pages.

**Acceptance criteria**
- [ ] `RuntimeProvider` created in `src/runtime/providers/`
- [ ] `useRuntimeGraph()` returns a typed `RuntimeGraph` snapshot
- [ ] `useRuntimeGraphActions()` exposes `setSystemValue`, `setGraphNamespace`, `patchGraphPath`
- [ ] No Zustand imports outside of `src/runtime/providers/`
- [ ] Provider can be mounted independently for tests without the full Next app
- [ ] Unit test: setting `graph.quote` is immediately readable via `useRuntimeGraph()`

---

### KUI-029 — Implement useViewMetadata(schemaId) — filesystem-backed stub

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | S |
| **Depends on** | KUI-016, KUI-028 |

**Description**  
Implement `useViewMetadata(schemaId)` in `src/runtime/useViewMetadata.ts`. For now, this reads from `public/schemas/{schemaId}.json` (or `dist/resolved-schemas/{schemaId}.json` based on env config). The hook returns `{ schema, status, error }` where `status` is `loading | success | error`. The call site must not change when the backing store switches to CDN in KUI-062 — the abstraction boundary is the contract, not the backing.

**Acceptance criteria**
- [ ] `useViewMetadata("test-dashboard")` loads `public/schemas/test-dashboard.json` if it exists
- [ ] Returns `status: "loading"` while fetching
- [ ] Returns `status: "error"` with `SCHEMA_NOT_FOUND` if file missing
- [ ] Validates fetched artifact with `ResolvedSchemaArtifact` Zod schema before returning
- [ ] Returns `status: "error"` with `SCHEMA_INVALID` if validation fails
- [ ] Hook signature is identical to the CDN-backed version it will become

---

### KUI-030 — Populate system.* from route resolution and auth context

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | S |
| **Depends on** | KUI-028, KUI-002 |

**Description**  
Implement the `system.*` population step in the page boot sequence. `system.routeParams` comes from the resolved route (from KUI-053). `system.userId`, `system.role`, `system.permissions` come from the auth context abstraction (KUI-044, or the mocked version from KUI-002). Per the spec, `system.*` must be fully populated before any `graph.*` API namespace hydration begins. The `system.*` values are read-only from schema-authored widgets.

**Acceptance criteria**
- [ ] `system.routeParams` is populated from `resolvedRoute.routeParams` before hydration
- [ ] `system.role`, `system.userId`, `system.permissions` populated from auth context
- [ ] Population happens before `usePageDataGraph` begins hydrating `api` namespaces
- [ ] Attempting to write `system.*` from a widget-level hook throws a clear error
- [ ] Works with the mocked auth context from KUI-002 decision outcome

---

### KUI-031 — Implement usePageDataGraph — local + inline namespace initialization

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-028, KUI-030 |

**Description**  
Implement the first hydration pass in `src/runtime/usePageDataGraph.ts`: read `graphNamespaces`, initialize all `kind: "inline"` namespaces immediately from their `value`, initialize all `kind: "local"` namespaces that have `initialValue` (not `initialValueFrom`) immediately. Namespaces with only `initialValueFrom` are seeded in KUI-033 after their source resolves. After this pass, the graph has all static state available before any network calls.

**Acceptance criteria**
- [ ] All `inline` namespaces are immediately available in `useRuntimeGraph()` after mount
- [ ] `local` namespaces with `initialValue: {}` are immediately available
- [ ] `local` namespaces with only `initialValueFrom` are `undefined` (not yet seeded)
- [ ] No network calls occur during this pass
- [ ] Unit test with a schema containing only inline/local namespaces renders without any async wait

---

### KUI-032 — Implement usePageDataGraph — topological ordering + eager api hydration

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | L |
| **Depends on** | KUI-031, KUI-036, KUI-023 |

**Description**  
Implement `api` namespace hydration in `usePageDataGraph`. Build the dependency graph from `dependsOn` fields (validated in KUI-023 to be cycle-free), produce a topological sort, and hydrate namespaces in dependency order. Namespaces with no dependencies hydrate in parallel. Dependent namespaces wait for their `dependsOn` targets to resolve successfully before starting. Replace `:paramName` in `endpoint` strings with values from `system.routeParams`. Use `useSmartQuery` (evolved in KUI-036) as the fetch primitive.

**Acceptance criteria**
- [ ] Namespace with `dependsOn: ["quote"]` does not hydrate until `graph.quote` is populated
- [ ] Two independent namespaces hydrate concurrently
- [ ] `:quoteId` in endpoint resolves from `system.routeParams.quoteId`
- [ ] Hydration failure on one namespace emits a runtime warning but does not crash other namespaces
- [ ] `mode: "eager"` namespaces hydrate immediately; `mode: "deferred"` namespaces are skipped

---

### KUI-033 — Implement usePageDataGraph — initialValueFrom seeding

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-031, KUI-032 |

**Description**  
After a `kind: "api"` namespace successfully hydrates, check if any `kind: "local"` namespaces declare `initialValueFrom` pointing at it. If so, seed those local namespaces with a one-time copy of the resolved value. Per the spec: this is a one-time seed, not an ongoing mirror. Subsequent changes to `graph.quote` do not overwrite user edits in `graph.quoteDraft`. If both `initialValue` and `initialValueFrom` are present, `initialValue` is the fallback used until the source resolves.

**Acceptance criteria**
- [ ] `graph.quoteDraft` is seeded from `graph.quote` after `graph.quote` first hydrates successfully
- [ ] Subsequent re-fetches of `graph.quote` do not overwrite `graph.quoteDraft`
- [ ] `initialValue: {}` is used as the draft value until `graph.quote` resolves
- [ ] If `graph.quote` never resolves, `graph.quoteDraft` stays at `initialValue` or uninitialized and emits a runtime hydration warning
- [ ] Unit test: seed happens exactly once even when `graph.quote` is re-fetched

---

### KUI-034 — Implement usePageDataGraph — deferred namespace loaders

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-032 |

**Description**  
For `api` namespaces with `mode: "deferred"`, expose a `loadNamespace(namespaceName)` function from `usePageDataGraph` that triggers hydration on demand. Widgets like selects or tabs that need reference data on interaction use this rather than blocking page load. Deferred namespaces start as `undefined` in the graph and are populated when `loadNamespace` is called.

**Acceptance criteria**
- [ ] Deferred namespace is `undefined` at page mount
- [ ] Calling `loadNamespace("countryOptions")` triggers the fetch and populates `graph.countryOptions`
- [ ] Calling `loadNamespace` twice for the same namespace uses the existing query cache (no duplicate fetch)
- [ ] `dependsOn` is respected even for deferred namespaces when triggered

---

### KUI-035 — Implement usePageDataGraph — endpoint param resolution

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-030, KUI-032 |

**Description**  
Implement template resolution for API endpoint strings. `:paramName` tokens in `endpoint` values (e.g. `/v1/quotes/:quoteId`) must be replaced with the corresponding value from `system.routeParams` before the fetch. If a required param is missing from `system.routeParams`, the namespace should fail gracefully with a `MISSING_ROUTE_PARAM` warning and not attempt the fetch.

**Acceptance criteria**
- [ ] `/v1/quotes/:quoteId` with `system.routeParams.quoteId = "123"` resolves to `/v1/quotes/123`
- [ ] `:quoteId` present in endpoint but missing from `system.routeParams` emits `MISSING_ROUTE_PARAM` and skips the fetch
- [ ] Multiple params in one endpoint all resolve correctly
- [ ] Params not prefixed with `:` are passed through unchanged

---

### KUI-036 — Evolve useSmartQuery into a graph-hydration source-loader primitive

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-028 |

**Description**  
Refactor `src/hooks/useSmartQuery.ts` so it becomes a low-level fetch primitive used by `usePageDataGraph` internally, not called directly by widget components on migrated pages. The hook should accept a `sourceDef` (endpoint, method, auth headers) and return a standard `{ data, status, error, refetch }` shape. Existing widget usages of `useSmartQuery` on legacy pages remain unchanged — this is an evolution, not a breaking rename.

**Acceptance criteria**
- [ ] `useSmartQuery` still works for legacy pages without changes
- [ ] New signature: `useSmartQuery(sourceDef: ApiGraphNamespace & { resolvedEndpoint: string })` accepted by `usePageDataGraph`
- [ ] No widget on a migrated page calls `useSmartQuery` directly (enforced by convention, later lint)
- [ ] Existing `DataTable`, `FormContainer`, etc. legacy usages continue to work

---

### KUI-037 — Implement ConditionEngine

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | S |
| **Depends on** | KUI-019, KUI-028 |

**Description**  
Implement `ConditionEngine` in `src/runtime/condition-engine/index.ts` as a thin wrapper that takes a `ConditionExpr` and calls the standalone evaluator from KUI-019 with the current `RuntimeGraph` snapshot from `useRuntimeGraph()`. The engine is called during render — it is stateless. This is the pull model: the runtime graph store triggers React re-renders, which call the condition engine fresh each time.

**Acceptance criteria**
- [ ] `useCondition(expr: ConditionExpr): boolean` exported from condition engine
- [ ] Uses current graph snapshot from `useRuntimeGraph()`
- [ ] Returns `true` when `expr` is `undefined` or `null` (no condition = always visible)
- [ ] An invalid operator in `expr` logs a warning and returns `false` (safe default)
- [ ] Unit test: changing `graph.quote.state` in the store causes `useCondition` to return a new value on next render

---

### KUI-038 — Implement useValueSource()

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-028, KUI-037 |

**Description**  
Implement `useValueSource()` in `src/runtime/useValueSource.ts`. Resolves four binding forms: (1) absolute path like `graph.quote.summary` — resolved directly from the graph, (2) relative path like `insured.name` — resolved relative to the parent scope from React context, (3) `optionsSource: { kind: "dataSource", path: "graph.countryOptions" }` — resolved from a declared namespace, (4) inline literal values defined directly in the schema.

**Acceptance criteria**
- [ ] Absolute path `graph.quote.insured.age` resolves to the correct nested value
- [ ] Relative path `insured.name` with parent scope `graph.quoteDraft` resolves to `graph.quoteDraft.insured.name`
- [ ] Relative path without any parent scope throws a developer-facing error
- [ ] `optionsSource` path to undeclared namespace returns `[]` with a warning
- [ ] Inline literal value is returned as-is without graph lookup

---

### KUI-039 — Implement SchemaRenderer

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | Urgent |
| **Size** | L |
| **Depends on** | KUI-037, KUI-038, KUI-014 |

**Description**  
Implement `SchemaRenderer` in `src/runtime/SchemaRenderer.tsx`. It walks the `widgetTree` from the resolved schema, evaluates `visibleWhen` before rendering each node (hidden nodes are not mounted), resolves widget type to a React component via `WidgetRegistry`, passes binding scopes downward via React context, and forwards resolved props. For `FieldWidgetNode` nodes, also evaluates `editableWhen` and `requiredWhen` and passes them as props to the widget. Unsupported condition keys on wrong node types are logged and skipped, not thrown.

**Acceptance criteria**
- [ ] Node with `visibleWhen: false` is not mounted (not just hidden with CSS)
- [ ] Binding scope propagates from parent Form node to child field nodes
- [ ] Unknown `type` logs `UNSUPPORTED_WIDGET_TYPE` and renders a fallback placeholder
- [ ] `requiredWhen` on a non-field node logs a warning and is ignored
- [ ] `SchemaRenderer` is completely separate from `src/components/registry/WidgetRenderer.tsx` (legacy)
- [ ] Can render the full worked example schema from the authoring manual

---

### KUI-040 — Add runtime error states

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-029, KUI-032, KUI-039 |

**Description**  
Define and implement three runtime error states surfaced by the schema shell: `SCHEMA_NOT_FOUND` (404 from `useViewMetadata`), `SCHEMA_UNAVAILABLE` (503 / network failure), `SCHEMA_INVALID` (Zod validation failure on fetched artifact), and `NAMESPACE_HYDRATION_FAILURE` (an eager API namespace fails to load). Each state renders a specific UI placeholder (not a blank page) and emits a telemetry event.

**Acceptance criteria**
- [ ] Each error code has a named UI placeholder component with a descriptive message
- [ ] Schema fetch 404 renders `SCHEMA_NOT_FOUND` state
- [ ] Zod validation failure on fetched artifact renders `SCHEMA_INVALID` state
- [ ] Eager namespace 4xx renders `NAMESPACE_HYDRATION_FAILURE` warning (page still renders)
- [ ] Each error emits a console warning with the error code and schemaId

---

### KUI-041 — Wire mocked auth context → system values

| | |
|---|---|
| **Epic** | EPIC-3 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-030, KUI-002 |

**Description**  
Wire the auth context abstraction (from KUI-044, or a mock per KUI-002 decision outcome) into the `system.*` population step. The existing `AppContextProvider` in `src/components/providers/AppContextProvider.tsx` already holds some session state — determine what it provides today and map it to `system.userId`, `system.role`, `system.permissions`. If the real JWT backend is not ready, implement a mock `AuthProvider` that satisfies the same interface with hardcoded dev values.

**Acceptance criteria**
- [ ] `system.role` is populated and evaluates correctly in `visibleWhen: { "==": [{ "var": "system.role" }, "underwriter"] }`
- [ ] Mock auth context injectable via provider for tests
- [ ] `useRuntimeGraph().system.role` returns the expected value in a dev session
- [ ] When auth context changes (re-login), `system.*` updates and conditions re-evaluate

---

## EPIC-4 — API Client & Auth (Phase 2 / WS3)

> Standardize all browser-to-backend access. Runs in parallel with EPIC-3.

---

### KUI-042 — Implement shared API client

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-002 |

**Description**  
Implement `src/lib/api/client.ts` as a layered function: (1) request assembly, (2) auth header injection (Bearer token from auth context), (3) `correlationId` header injection, (4) refresh-and-retry on 401, (5) JSON parsing, (6) optional Zod response validation, (7) telemetry hook. Expose two public functions: `apiGet<T>(url, options?)` and `apiMutate<T>(url, body, options?)`. No component or hook outside `src/lib/api/` and `src/runtime/` may call raw `fetch()` on migrated pages.

**Acceptance criteria**
- [ ] `apiGet` and `apiMutate` exported from `src/lib/api/client.ts`
- [ ] Every request includes `Authorization: Bearer <token>` from auth context
- [ ] Every request includes a `X-Correlation-Id` header
- [ ] 401 response triggers token refresh and one retry automatically
- [ ] Second 401 after refresh redirects to login (or emits `unauthenticated` error)
- [ ] Response can be optionally validated with a passed Zod schema
- [ ] Raw `fetch()` is not called anywhere in the client except at the innermost layer

---

### KUI-043 — Implement typed API error classes

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-042 |

**Description**  
Define typed error classes in `src/lib/api/errors.ts`: `UnauthenticatedError`, `UnauthorizedError`, `ValidationError` (400 + Zod parse failure), `ContractViolationError` (response shape doesn't match expected schema), `NetworkError` (no response). These replace the current pattern of checking `response.ok` and throwing generic `Error` objects. All error types should carry the original response and request context.

**Acceptance criteria**
- [ ] Five error classes exported from `src/lib/api/errors.ts`
- [ ] Client throws the correct typed error for each HTTP/parse scenario
- [ ] `ContractViolationError` includes the Zod parse errors
- [ ] Errors are caught and re-thrown as typed classes, not swallowed
- [ ] Unit tests for each error path

---

### KUI-044 — Implement auth-context abstraction

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-002 |

**Description**  
Implement `src/lib/api/auth.ts` with a `useAuthContext()` hook that returns `{ accessToken, refresh(), decodedClaims }`. The `decodedClaims` object exposes `userId`, `role`, and `permissions` — the values that populate `system.*`. If the real JWT backend is not ready (per KUI-002), provide a `MockAuthProvider` that returns hardcoded dev values satisfying the same interface. The shared API client (KUI-042) and runtime system population (KUI-030) both depend on this abstraction.

**Acceptance criteria**
- [ ] `useAuthContext()` returns `{ accessToken, refresh, decodedClaims }`
- [ ] `decodedClaims` maps to `{ userId, role, permissions }` at minimum
- [ ] `MockAuthProvider` can substitute the real provider for tests and dev
- [ ] Auth context is consumed by the API client for token injection
- [ ] Auth context is consumed by `system.*` population (KUI-030)

---

### KUI-045 — Add Zod response-validation helper to shared client

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-042, KUI-043 |

**Description**  
Add an optional `schema?: ZodSchema` option to `apiGet` and `apiMutate`. When provided, the parsed JSON response is validated with the schema before being returned. If validation fails, a `ContractViolationError` is thrown with the Zod errors attached. This is the mechanism by which graph namespace hydration validates API responses before they enter the runtime graph.

**Acceptance criteria**
- [ ] `apiGet(url, { schema: MyZodSchema })` validates response and throws `ContractViolationError` on mismatch
- [ ] `apiGet(url)` without `schema` passes response through without Zod validation
- [ ] Validation failures are reported to the telemetry hook (KUI-046)
- [ ] Unit tests: valid response passes, invalid shape throws correct error

---

### KUI-046 — Add telemetry hook to shared client

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-042 |

**Description**  
Add a telemetry callback interface to the API client that can be configured at app initialization. The client calls the hook on: successful responses (with duration), 4xx/5xx errors (with status + URL), contract violations (with error details), and retry attempts. This is a placeholder for Sentry/Datadog integration — the hook interface is stable; the implementation of where events go is wired up by the app shell.

**Acceptance criteria**
- [ ] Telemetry hook interface defined and exported from `src/lib/api/client.ts`
- [ ] Client calls the hook on the four specified events
- [ ] Default no-op telemetry hook if none configured (no errors on unconfigured apps)
- [ ] App shell in `src/app/layout.tsx` or equivalent can register a handler

---

### KUI-047 — Migrate useActionHandler to shared client

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-042, KUI-043 |

**Description**  
Refactor `src/hooks/useActionHandler.ts` to use `apiMutate` from the shared client instead of raw `fetch()`. Replace the current `refreshKey`-based invalidation with namespace-level revalidation where the schema declares the affected namespace. For legacy pages that still use `refreshKey`, keep the old behavior as a fallback. This is the migration boundary: newly migrated pages use namespace revalidation; legacy pages keep `refreshKey` until migrated.

**Acceptance criteria**
- [ ] `useActionHandler` no longer calls raw `fetch()` directly
- [ ] Uses `apiMutate` for all HTTP mutations
- [ ] On success, calls `refetchNamespace(namespaceName)` for namespaces declared in the action's schema config
- [ ] `refreshKey` fallback still works for legacy (unmigrated) pages
- [ ] Typed error classes from KUI-043 are surfaced to the UI correctly

---

### KUI-048 — Classify and document all src/app/api/* routes

| | |
|---|---|
| **Epic** | EPIC-4 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-009 |

**Description**  
Based on the `@route-class` annotations added in KUI-009, produce the full classification table for `src/app/api/*`. For each route: confirm the class, assign an owner, and (for `proxy` and `mock` classes) define the removal condition. The 20+ dashboard metric routes are all candidates for `mock`. The accounting and moneyout proxy routes point to `localhost:8090` and should be classified as `proxy`. The `forms/[id]` route serves the legacy form registry and should be `mock` until direct schema delivery exists.

**Acceptance criteria**
- [ ] Classification table committed to `docs/planning/API-ROUTE-INVENTORY.md`
- [ ] Every route has: class, owner, removal condition or "permanent" justification
- [ ] All `proxy` routes have a backend owner named
- [ ] No route is left unclassified
- [ ] Table auto-generated by the script from KUI-008

---

## EPIC-5 — Route Manifest & Generic Shell (Phase 2 / WS6)

> Make route-to-schema mapping explicit. Runs in parallel with EPIC-3 and EPIC-4.

---

### KUI-049 — Add source-controlled route manifest + Zod validator

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-017, KUI-004 |

**Description**  
Create `src/routes/manifest.ts` (or `manifest.json`) as the source-controlled route manifest. Initially populate it with entries for the three pilot pages: `test-dashboard`, `claims`, `quotations`. Each entry uses the confirmed `schemaId` naming convention from KUI-004. Add the `runtime: "legacy"` flag to all entries initially — they will switch to `runtime: "v0"` page by page during Phase 3 migrations. Wire the Zod validator from KUI-017 to validate the manifest at startup and in CI.

**Acceptance criteria**
- [ ] `src/routes/manifest.ts` created with entries for all current schema-driven pages
- [ ] All entries start with `runtime: "legacy"` until individually migrated
- [ ] Validation runs at app startup and fails fast on invalid entries
- [ ] CI validates the manifest as part of `yarn validate:schema-contracts`
- [ ] Duplicate path or ambiguous alias in the manifest causes a startup error

---

### KUI-050 — Implement route matcher

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-049 |

**Description**  
Implement `resolveRoute(pathname: string): ResolvedRoute | null` in `src/routes/resolveRoute.ts`. Rules: exact static path beats parameterized, more-specific path beats less-specific, `priority` field breaks ties, ambiguous effective matches (no priority) throw at validation time not at runtime. Extracted route params are merged with any `routeParams` aliases from the manifest entry and returned as `routeParams: Record<string, string>`.

**Acceptance criteria**
- [ ] `/quotations/new` resolves before `/quotations/:id` without needing `priority`
- [ ] `/quotations/123` resolves with `routeParams: { id: "123", quoteId: "123" }` given the example manifest
- [ ] Non-matching path returns `null`
- [ ] `resolveRoute` is a pure function with no side effects (easily unit-testable)
- [ ] 10+ unit tests covering precedence, param extraction, aliasing, and null returns

---

### KUI-051 — Add runtime flag handling to route manifest

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-049, KUI-050 |

**Description**  
Add `runtime: "legacy" | "v0"` awareness to the generic schema shell. When the matched manifest entry has `runtime: "legacy"`, the shell delegates to the existing legacy Next page handler (or renders the legacy `WidgetRenderer` with the directly imported schema). When `runtime: "v0"` (or omitted, since `"v0"` is the default), the shell uses the new runtime. This flag is the migration control that lets teams switch pages one at a time.

**Acceptance criteria**
- [ ] Shell renders legacy path for `runtime: "legacy"` entries
- [ ] Shell renders new runtime path for `runtime: "v0"` entries
- [ ] Missing `runtime` field defaults to `"v0"`
- [ ] Switching an entry from `"legacy"` to `"v0"` in the manifest changes behavior immediately without code changes

---

### KUI-052 — Implement generic schema page shell

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | Urgent |
| **Size** | M |
| **Depends on** | KUI-029, KUI-050, KUI-051, KUI-039 |

**Description**  
Create `src/app/[[...slug]]/page.tsx` as the catch-all generic schema shell. On each request: call `resolveRoute(pathname)` → if null return 404 (`ROUTE_NOT_FOUND`). If matched, call `useViewMetadata(schemaId)` → handle schema error states from KUI-040. If schema loads, mount `RuntimeProvider`, populate `system.*`, and render `SchemaRenderer` with the resolved schema. The shell accepts optional host-app extras like auth guards or breadcrumbs via layout composition.

**Acceptance criteria**
- [ ] Unmatched path returns Next 404 page
- [ ] Matched path with missing artifact shows `SCHEMA_NOT_FOUND` error state
- [ ] Matched path with valid artifact renders `SchemaRenderer`
- [ ] `system.routeParams` is populated from resolved route before rendering
- [ ] Existing legacy pages are not affected (their routes still work via direct Next page files or `runtime: "legacy"` manifest entries)

---

### KUI-053 — Inject resolved routeParams into system.routeParams

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-050, KUI-030 |

**Description**  
Wire the output of `resolveRoute` into the `system.*` population step. The `ResolvedRoute.routeParams` map becomes `system.routeParams` in the runtime graph. This makes params like `quoteId` available to schema-authored bindings (`system.routeParams.quoteId`) and to API namespace endpoint templates (`:quoteId` in KUI-035).

**Acceptance criteria**
- [ ] `system.routeParams.id` and `system.routeParams.quoteId` both available for `/quotations/123` with the example manifest entry
- [ ] Condition `{ "var": "system.routeParams.quoteId" }` evaluates correctly
- [ ] Empty `routeParams: {}` for static paths like `/quotations` does not cause errors

---

### KUI-054 — Add route manifest tests

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-050 |

**Description**  
Write unit tests for `resolveRoute` and the manifest validator covering all cases from `docs/arch_v0/16-ROUTE-MANIFEST-AND-SCHEMA-RESOLUTION.md`: static path precedence, parameterized path precedence, ambiguity rejection without priority, alias mapping, ROUTE_NOT_FOUND for unmatched paths, and the distinction between ROUTE_NOT_FOUND vs SCHEMA_NOT_FOUND.

**Acceptance criteria**
- [ ] `/quotations/new` beats `/quotations/:id` test
- [ ] Ambiguous match without priority fails validation test
- [ ] Invalid alias (`quoteNumber` not in path) fails validation test
- [ ] Matched route with `schemaId` → `SCHEMA_NOT_FOUND` is a different code than `ROUTE_NOT_FOUND` test
- [ ] All tests pass in `yarn test`

---

### KUI-055 — Document route rollback procedure

| | |
|---|---|
| **Epic** | EPIC-5 |
| **Priority** | Medium |
| **Size** | XS |
| **Depends on** | KUI-052 |

**Description**  
Write `docs/planning/ROUTE-ROLLBACK-PROCEDURE.md` documenting the exact steps to roll back a migrated page if the resolved artifact is missing or invalid in a target environment. Per the migration plan: the first rollback option is reverting the manifest entry `runtime` field from `"v0"` back to `"legacy"`, not editing runtime code. The procedure should be runnable in under 5 minutes.

**Acceptance criteria**
- [ ] Procedure documented: revert `runtime: "v0"` → `runtime: "legacy"` in manifest
- [ ] Steps include: verify rollback, re-deploy or hot-reload manifest, confirm legacy page renders
- [ ] Procedure tested against at least one page in a staging-like environment before Phase 3 begins
- [ ] Document linked from the per-page migration checklist

---

## EPIC-6 — Developer Schema Loop (Phase 2 / WS5 Phase 1)

> The thinnest viable publication path. Engineers need a local dev loop that matches the eventual CDN contract.

---

### KUI-056 — Implement publish_resolved_schemas script

| | |
|---|---|
| **Epic** | EPIC-6 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-016, KUI-025 |

**Description**  
Create `scripts/publish_resolved_schemas.ts` (or `.mjs`). The script: (1) reads source schemas from `schemas/`, (2) resolves any `$ref` composition via `src/lib/schemaResolver.ts`, (3) stamps `schemaId`, `version`, and `resolvedAt` metadata, (4) validates the result with `ResolvedSchemaArtifact` Zod schema from KUI-016 — fails on any validation error, (5) writes to `dist/resolved-schemas/{schemaId}.json`. Existing `scripts/generate_form_index.mjs` output can be consumed as an input to this pipeline but is not the output.

**Acceptance criteria**
- [ ] Script runs without error against existing schemas in `schemas/`
- [ ] Output file at `dist/resolved-schemas/{schemaId}.json` validates against `ResolvedSchemaArtifact`
- [ ] Invalid source schema causes script to exit non-zero with a clear error
- [ ] `resolvedAt` is stamped with the current ISO datetime
- [ ] `dist/resolved-schemas/` is gitignored (build output, not source)

---

### KUI-057 — Add yarn schemas:dev command

| | |
|---|---|
| **Epic** | EPIC-6 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-056, KUI-029 |

**Description**  
Wire a `yarn schemas:dev` command in `package.json` that watches `schemas/**/*.json` for changes, re-runs the publish script on change, and writes updated artifacts to the local fetch path used by `useViewMetadata` (from KUI-029). This is the dev loop: edit a source schema → artifact rebuilds automatically → next schema fetch in the browser picks up the change. Without this, developers will bypass the publication contract and go back to direct JSON imports.

**Acceptance criteria**
- [ ] `yarn schemas:dev` starts a watcher and rebuilds on schema file change
- [ ] Rebuilt artifact is immediately fetchable by `useViewMetadata`
- [ ] Build errors are printed clearly to the terminal without crashing the watcher
- [ ] The local fetch path (e.g. `public/schemas/`) is served by Next dev server without additional config

---

### KUI-058 — Define published artifact path contract

| | |
|---|---|
| **Epic** | EPIC-6 |
| **Priority** | High |
| **Size** | XS |
| **Depends on** | KUI-056, KUI-004 |

**Description**  
Document and enforce the canonical artifact path contract: `dist/resolved-schemas/{schemaId}.json` for local builds, `keystone-resolved-schemas/{schemaId}.json` on S3/CDN. The `schemaId` format must match the kebab-case convention from KUI-004. Add a validation check to the publish script that rejects any artifact whose `schemaId` field doesn't match the filename.

**Acceptance criteria**
- [ ] Path contract documented in `docs/planning/ARTIFACT-PATH-CONTRACT.md`
- [ ] Publish script rejects artifact where `schemaId` ≠ filename stem
- [ ] Local and CDN paths documented side by side with examples
- [ ] `useViewMetadata` uses the local path in dev and CDN path in production (env-aware in KUI-061)

---

### KUI-059 — Add schemaId index manifest

| | |
|---|---|
| **Epic** | EPIC-6 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-056 |

**Description**  
Have the publish script emit a `dist/resolved-schemas/index.json` listing all published `schemaId`s with their `version` and `resolvedAt`. This index is used by deployment checks, the post-publish verification script (KUI-065), and CI to confirm expected schemas are present after a publish run.

**Acceptance criteria**
- [ ] `index.json` emitted alongside artifacts in `dist/resolved-schemas/`
- [ ] Index contains `[{ schemaId, version, resolvedAt }]` for each published artifact
- [ ] CI can diff the index against an expected schema list to catch missing artifacts
- [ ] Index is validated (non-empty, all referenced `schemaId`s match their files) before the publish script exits

---

### KUI-060 — Write manual publication runbook

| | |
|---|---|
| **Epic** | EPIC-6 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-056, KUI-057, KUI-058 |

**Description**  
Write `docs/planning/PUBLICATION-RUNBOOK.md` documenting the early v0 manual publication flow: validate source schemas → run publish script → verify artifacts → upload to S3 → confirm CDN fetch → rollback procedure. This runbook is used until event-driven materialisation (WS5 Phase 2) replaces it. It must be executable by any engineer without specialist knowledge.

**Acceptance criteria**
- [ ] Runbook covers the full loop: validate → publish → verify → upload → confirm → rollback
- [ ] Each step has an exact command or UI action
- [ ] Rollback step references the versioned S3 restore procedure from `docs/arch_v0/01-SCHEMA-DELIVERY.md`
- [ ] Runbook reviewed and walkthrough-tested by at least one engineer who did not write it

---

## EPIC-7 — Delivery Path (Phase 5 / WS7)

> Switch from local artifact reads to real CDN/S3 delivery. Runs after Phase 3 pilot pages prove the runtime.

---

### KUI-061 — Add environment-aware schema base URL config

| | |
|---|---|
| **Epic** | EPIC-7 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-005 |

**Description**  
Add a `NEXT_PUBLIC_SCHEMA_BASE_URL` environment variable (or equivalent) that controls where `useViewMetadata` fetches schemas. In development: `public/schemas/` (local filesystem via Next static). In staging/production: `https://<cdn-host>/keystone-resolved-schemas/`. The abstraction from KUI-029 means `useViewMetadata` itself does not change — only the base URL it uses.

**Acceptance criteria**
- [ ] `NEXT_PUBLIC_SCHEMA_BASE_URL` documented in `.env.example`
- [ ] Dev default points to `public/schemas/`
- [ ] Staging/prod values documented per environment
- [ ] Missing env var in production fails fast with a clear startup error

---

### KUI-062 — Switch useViewMetadata to env-aware CDN/S3 backing

| | |
|---|---|
| **Epic** | EPIC-7 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-029, KUI-061 |

**Description**  
Update `useViewMetadata` to construct the full fetch URL as `${SCHEMA_BASE_URL}/${schemaId}.json` and make a real HTTP fetch. Add `Cache-Control: public, max-age=300, stale-while-revalidate=3600` header expectations in the client. The hook interface is unchanged from KUI-029 — this is a backing swap only.

**Acceptance criteria**
- [ ] In dev: fetches from `public/schemas/{schemaId}.json`
- [ ] In prod: fetches from `${SCHEMA_BASE_URL}/{schemaId}.json`
- [ ] Response is still validated with `ResolvedSchemaArtifact` Zod schema before use
- [ ] Cache headers present in HTTP response are respected by the browser
- [ ] No page component changes required — only `useViewMetadata` internals change

---

### KUI-063 — Add fetch-time artifact Zod validation

| | |
|---|---|
| **Epic** | EPIC-7 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-016, KUI-062 |

**Description**  
Ensure that every schema fetched by `useViewMetadata` is validated with `ResolvedSchemaArtifact.zod.ts` before it enters the runtime. If the fetched JSON fails validation, return `status: "error"` with `SCHEMA_INVALID` and emit a telemetry event. This is the browser-side gate equivalent to publish-time validation. A corrupt or outdated artifact should never silently reach `SchemaRenderer`.

**Acceptance criteria**
- [ ] Valid artifact passes and reaches `SchemaRenderer` unchanged
- [ ] Artifact missing `resolvedAt` fails with `SCHEMA_INVALID`
- [ ] Artifact with invalid namespace shape fails with `SCHEMA_INVALID`
- [ ] Validation failure emits the Zod error details to the telemetry hook
- [ ] `SCHEMA_INVALID` error state UI (from KUI-040) is shown on validation failure

---

### KUI-064 — Implement SCHEMA_NOT_FOUND / SCHEMA_UNAVAILABLE / SCHEMA_INVALID fetch errors

| | |
|---|---|
| **Epic** | EPIC-7 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-040, KUI-062 |

**Description**  
Ensure `useViewMetadata` maps HTTP responses to the correct named error codes: 404 → `SCHEMA_NOT_FOUND`, 503 + network timeout → `SCHEMA_UNAVAILABLE`, Zod failure → `SCHEMA_INVALID`. These codes are then used by the schema shell (KUI-052) to render the appropriate error state. The error codes are the same codes used in monitoring alerts — they must be consistent between runtime and ops tooling.

**Acceptance criteria**
- [ ] 404 response → `SCHEMA_NOT_FOUND` code in hook error state
- [ ] 503 or network failure → `SCHEMA_UNAVAILABLE` code
- [ ] Zod parse failure → `SCHEMA_INVALID` code
- [ ] Each error code produces the correct error state UI from KUI-040
- [ ] Error code is included in the telemetry event payload

---

### KUI-065 — Add post-publish verification script

| | |
|---|---|
| **Epic** | EPIC-7 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-059, KUI-063 |

**Description**  
Create `scripts/verify_published_schemas.ts` that reads the `index.json` from KUI-059, fetches each artifact from the configured schema base URL, validates it with `ResolvedSchemaArtifact` Zod schema, and checks `resolvedAt` freshness (warn if older than a configurable threshold, e.g. 2 hours). Exits non-zero if any critical `schemaId` is unreachable or invalid. Run this script in CI after a publish step and optionally as a post-deploy smoke check.

**Acceptance criteria**
- [ ] Script fetches all `schemaId`s from index and validates each
- [ ] Prints per-schemaId result: `✓ reachable + valid`, `✗ not found`, `✗ invalid`
- [ ] Exits 1 if any schema fails
- [ ] `resolvedAt` older than threshold prints a warning (not error)
- [ ] Configurable base URL via env var so it can point at staging or prod

---

## EPIC-8 — Contracts, CI & Operations (Phase 5–6 / WS8)

> Add operational gates before broad adoption. Runs in parallel with Phase 5.

---

### KUI-066 — Add CI job: schema contract validation

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-025 |

**Description**  
Add a CI job that runs `yarn validate:schema-contracts` against all source schemas in `schemas/` and any checked-in resolved artifacts. The job fails on any schema contract error (errors from `13-SCHEMA-LINT-RULES.md`) and reports warnings. This job must pass before any PR can merge.

**Acceptance criteria**
- [ ] CI job runs on every PR
- [ ] Failing schema in `schemas/` causes CI to fail
- [ ] Warnings are printed but do not block merge
- [ ] Job runs in under 60 seconds on the current schema set

---

### KUI-067 — Add CI job: route manifest validation

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-049, KUI-024 |

**Description**  
Add a CI job that validates `src/routes/manifest.ts` using the route manifest Zod validator and semantic ambiguity checks from KUI-024. Also validates that all `schemaId`s referenced in the manifest exist in the published schema index (when available). Runs on every PR.

**Acceptance criteria**
- [ ] Ambiguous route in manifest fails CI
- [ ] Invalid `routeParams` alias fails CI
- [ ] `schemaId` not in index (when index exists) prints a warning
- [ ] Job runs in under 30 seconds

---

### KUI-068 — Add CI job: resolved artifact validation

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-056, KUI-016 |

**Description**  
Add a CI job that runs the publish script and validates all emitted artifacts with `ResolvedSchemaArtifact` Zod schema. This ensures the full publication pipeline (resolve → stamp → validate → write) works cleanly on CI before any deployment. Fails if any artifact is invalid or if `resolvedAt` is missing.

**Acceptance criteria**
- [ ] CI builds and validates all resolved artifacts from source schemas
- [ ] Any artifact that fails `ResolvedSchemaArtifact` validation fails CI
- [ ] Artifact index is checked: all source schemas produce a corresponding output
- [ ] Job is the gate before any deployment step

---

### KUI-069 — Add CI job: smoke render against published artifacts

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-039, KUI-056 |

**Description**  
Add a smoke render CI job that mounts `SchemaRenderer` with each published artifact in a headless test environment and asserts: no unhandled errors thrown, all declared namespaces initialized (with mock data for API namespaces), the widget tree renders without `UNSUPPORTED_WIDGET_TYPE` warnings. Uses React Testing Library. Fixtures use the locally published artifacts, not raw source schemas.

**Acceptance criteria**
- [ ] One smoke render test per pilot page (`test-dashboard`, `claims`, `quotations-list`)
- [ ] Tests use published artifacts from `dist/resolved-schemas/`, not direct JSON imports
- [ ] `UNSUPPORTED_WIDGET_TYPE` warnings cause test failure
- [ ] Unhandled errors cause test failure
- [ ] Tests run in `yarn test` without a running dev server

---

### KUI-070 — Add publish-time size budget check

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-056 |

**Description**  
Add size budget enforcement to the publish script. Per `docs/arch_v0/01-SCHEMA-DELIVERY.md`: warn at > 250 KB compressed equivalent, error (block publish) at > 1 MB uncompressed, warn at > 250 widget nodes. The publish script should emit these as warnings/errors before writing the artifact.

**Acceptance criteria**
- [ ] Artifact > 1 MB uncompressed → publish script exits non-zero
- [ ] Artifact between 250 KB compressed equivalent and the error threshold → warning printed, publish continues
- [ ] Widget count > 250 → warning printed
- [ ] Size metrics emitted to stdout in a parseable format for CI dashboards

---

### KUI-071 — Add publish-time accessibility checks

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-056 |

**Description**  
Add schema-level accessibility checks to the publish script. Per `docs/arch_v0/01-SCHEMA-DELIVERY.md`: icon-only actions without `ariaLabel` or equivalent accessible label are errors; interactive form widgets without labels are errors; unsupported design-token references are warnings. These checks run against the resolved artifact before write.

**Acceptance criteria**
- [ ] Icon-only action widget with no accessible label → publish error
- [ ] `TextField` widget with no `label` property → publish error
- [ ] Both checks are skippable with a `--skip-a11y` flag for dev-only artifacts
- [ ] Violations are reported with node path in the widget tree for easy debugging

---

### KUI-072 — Instrument runtime telemetry: schema fetch + namespace hydration

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-046, KUI-040, KUI-032 |

**Description**  
Instrument two runtime telemetry points: (1) schema fetch outcome — emit `schema.fetch.success` with `schemaId` and duration, or `schema.fetch.error` with error code, (2) namespace hydration duration — emit `namespace.hydration.duration` per namespace with `namespaceName`, `kind`, and ms taken. Use the telemetry hook from KUI-046.

**Acceptance criteria**
- [ ] `schema.fetch.success` event emitted on successful schema load with `schemaId` and `durationMs`
- [ ] `schema.fetch.error` emitted with `schemaId` and error code on failure
- [ ] `namespace.hydration.duration` emitted for each api namespace after hydration
- [ ] Events appear in the browser console in dev mode at `debug` level
- [ ] Hook interface documented for Sentry/Datadog wiring

---

### KUI-073 — Instrument runtime telemetry: condition failures + contract violations

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-037, KUI-045 |

**Description**  
Add telemetry for two more runtime events: (1) condition evaluation failures — when `evaluateCondition` encounters an unknown operator or malformed expression, emit `condition.evaluation.error` with `schemaId`, node type, and expression, (2) contract violations — when `apiGet` or `apiMutate` response fails Zod validation, emit `api.contract.violation` with URL, expected schema name, and Zod errors.

**Acceptance criteria**
- [ ] `condition.evaluation.error` emitted on malformed condition at runtime
- [ ] `api.contract.violation` emitted when response shape mismatches Zod schema
- [ ] Both events appear in dev console at `warn` level
- [ ] Events do not crash the page — they are observability signals only

---

### KUI-074 — Document alert ownership and escalation paths

| | |
|---|---|
| **Epic** | EPIC-8 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-072, KUI-073 |

**Description**  
Write `docs/planning/ALERT-OWNERSHIP.md` defining who owns each category of alert: schema delivery failures (platform/infra), namespace hydration failures (module team + backend owner), condition evaluation errors (schema author), API contract violations (API team + frontend platform). Include the escalation path and the expected SLA from `docs/arch_v0/00-SYSTEM-DESIGN.md` (contract violation alerting < 5 min; hotfix rollback < 15 min).

**Acceptance criteria**
- [ ] Document covers all four alert categories
- [ ] Each category has: owner, escalation path, target response time
- [ ] References SLOs from `docs/arch_v0/00-SYSTEM-DESIGN.md`
- [ ] Document reviewed by platform lead and backend lead

---

## EPIC-9 — Migrate test-dashboard (Phase 3)

> First pilot page migration. Runs after EPIC-2 contracts stabilize and EPIC-3 runtime proof-of-concept exists.

---

### KUI-075 — test-dashboard: route manifest entry + schemaId

| | |
|---|---|
| **Epic** | EPIC-9 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-049, KUI-003, KUI-004 |

**Description**  
Add the route manifest entry for `test-dashboard`. Assign `schemaId: "test-dashboard"`. Mark `runtime: "legacy"` initially. Review the backend readiness matrix from KUI-003 to confirm which namespaces can point to real endpoints and which stay mocked. Produce a completed conversion worksheet per `docs/templates/PAGE_MIGRATION_CHECKLIST.md` listing: current schema file, target `schemaId`, required `graphNamespaces`, widgets with private fetches, route params, and legacy conditions to rewrite.

**Acceptance criteria**
- [ ] Manifest entry added with `schemaId: "test-dashboard"` and `runtime: "legacy"`
- [ ] Manifest validation passes after entry is added
- [ ] Conversion worksheet completed and committed to `docs/planning/migrations/test-dashboard.md`
- [ ] Backend readiness column filled in for each planned namespace

---

### KUI-076 — test-dashboard: convert schema to arch_v0 format

| | |
|---|---|
| **Epic** | EPIC-9 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-075, KUI-015, KUI-019 |

**Description**  
Convert `schemas/dashboard.json` to the `PageSchema` format: add `schemaId`, `version`, `graphNamespaces`, and restructure the widget tree to bind to `graph.*` and `system.*`. Move widget-owned `dataSource` definitions into page-level `graphNamespaces`. Convert filter/tab state to explicit `graph.filters` and `graph.pageState` local namespaces. The current dashboard schema uses many direct API calls from individual widget `dataSource` configs — these become the namespace declarations.

**Acceptance criteria**
- [ ] Converted schema passes `yarn validate:schema-contracts`
- [ ] All widget `dataSource` configs removed from widget tree — namespace declarations replace them
- [ ] `graph.filters` and `graph.pageState` declared as `kind: "local"` namespaces
- [ ] Schema validates against `PageSchema` Zod contract
- [ ] No undeclared `bind` paths remain in the widget tree

---

### KUI-077 — test-dashboard: replace legacy conditions with JSONLogic

| | |
|---|---|
| **Epic** | EPIC-9 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-076, KUI-018, KUI-019 |

**Description**  
Replace any remaining `{ field, operator, value }` condition objects in the converted test-dashboard schema with JSONLogic equivalents. Run `yarn validate:schema-contracts` to confirm `condition-jsonlogic-only` passes. Test each converted condition against the evaluator from KUI-019 with representative graph snapshots to confirm behavioral parity with the legacy conditions.

**Acceptance criteria**
- [ ] Zero `{ field, operator, value }` condition objects remain in the schema
- [ ] All conditions pass `condition-jsonlogic-only` and `condition-allowed-operators` lint rules
- [ ] Evaluator tests written for each converted condition
- [ ] `yarn validate:schema-contracts` exits 0 on the converted schema

---

### KUI-078 — test-dashboard: publish resolved artifact + smoke render

| | |
|---|---|
| **Epic** | EPIC-9 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-076, KUI-077, KUI-056, KUI-069 |

**Description**  
Run `yarn schemas:dev` to produce `dist/resolved-schemas/test-dashboard.json`. Validate the artifact with `ResolvedSchemaArtifact`. Add a smoke render test (per KUI-069 pattern) that mounts `SchemaRenderer` with this artifact using mock API data for all `api` namespaces. Confirm the page renders without errors, all declared namespaces initialize, and conditions evaluate correctly.

**Acceptance criteria**
- [ ] `dist/resolved-schemas/test-dashboard.json` passes Zod validation
- [ ] `resolvedAt` is present and recent
- [ ] Smoke render test passes in `yarn test`
- [ ] No `UNSUPPORTED_WIDGET_TYPE` warnings in smoke render output
- [ ] `visibleWhen` conditions on the dashboard produce correct show/hide in the smoke test

---

### KUI-079 — test-dashboard: switch route to generic shell, remove legacy import

| | |
|---|---|
| **Epic** | EPIC-9 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-078, KUI-052, KUI-055 |

**Description**  
Flip the manifest entry for `test-dashboard` from `runtime: "legacy"` to `runtime: "v0"`. Verify the page renders correctly through the generic schema shell. Remove the direct schema JSON import from `src/app/test-dashboard/page.tsx` and simplify or delete that route file if it is no longer needed. The page must pass the page-level acceptance checklist from `docs/templates/PAGE_MIGRATION_CHECKLIST.md`.

**Acceptance criteria**
- [ ] Manifest entry: `runtime: "v0"`
- [ ] `src/app/test-dashboard/page.tsx` no longer imports `schemas/dashboard.json` directly
- [ ] Page renders through `SchemaRenderer` in a dev session
- [ ] All items in `docs/templates/PAGE_MIGRATION_CHECKLIST.md` checked off for test-dashboard
- [ ] Legacy `WidgetRenderer` is not invoked for this page

---

## EPIC-10 — Migrate claims-list (Phase 3)

> Second pilot page migration. Starts after test-dashboard proves the runtime path.

---

### KUI-080 — claims: route manifest entry + schemaId

| | |
|---|---|
| **Epic** | EPIC-10 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-079, KUI-003 |

**Description**  
Add manifest entry for the claims list page. Assign `schemaId: "claims-list"`. Complete the conversion worksheet. Review the backend readiness matrix for claims API endpoints currently proxied through `src/app/api/` (if any) and confirm namespace targets.

**Acceptance criteria**
- [ ] Manifest entry with `schemaId: "claims-list"` and `runtime: "legacy"`
- [ ] Conversion worksheet committed to `docs/planning/migrations/claims-list.md`
- [ ] Backend readiness for each planned namespace confirmed

---

### KUI-081 — claims: convert schema to arch_v0 format

| | |
|---|---|
| **Epic** | EPIC-10 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-080, KUI-015 |

**Description**  
Convert `schemas/claims-list.json` to `PageSchema` format. Declare `graphNamespaces` for the claims list data, filter state (`graph.filters`), and any page-level interaction state. Move widget-owned `dataSource` configs to namespace declarations. The claims list currently uses `FilterBar` with `useWidgetState` keys — these become `graph.filters` local namespace.

**Acceptance criteria**
- [ ] Schema passes `yarn validate:schema-contracts`
- [ ] `graph.filters` declared as `kind: "local"` with `initialValue: {}`
- [ ] Claims list data declared as `kind: "api"` namespace
- [ ] No widget in the tree calls its own data source directly
- [ ] Zod validation passes

---

### KUI-082 — claims: replace legacy conditions with JSONLogic

| | |
|---|---|
| **Epic** | EPIC-10 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-081 |

**Description**  
Replace any legacy condition syntax in the claims schema with JSONLogic. Verify with the evaluator. Write evaluator tests for each converted condition with representative claims data snapshots.

**Acceptance criteria**
- [ ] Zero legacy condition objects remain
- [ ] All conditions pass `condition-jsonlogic-only`
- [ ] Evaluator tests cover truthy + falsy cases for each condition
- [ ] `yarn validate:schema-contracts` exits 0

---

### KUI-083 — claims: publish resolved artifact + smoke render

| | |
|---|---|
| **Epic** | EPIC-10 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-082, KUI-056 |

**Description**  
Publish `dist/resolved-schemas/claims-list.json` and add a smoke render test. Confirm the claims list renders with mock data, filter state initializes from `graph.filters`, and all conditions evaluate.

**Acceptance criteria**
- [ ] Artifact validates against `ResolvedSchemaArtifact`
- [ ] Smoke render test passes
- [ ] `graph.filters` initializes correctly in the smoke test
- [ ] Filter state changes re-evaluate `visibleWhen` conditions correctly

---

### KUI-084 — claims: switch route to generic shell, remove legacy import

| | |
|---|---|
| **Epic** | EPIC-10 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-083 |

**Description**  
Flip manifest to `runtime: "v0"`. Remove direct schema import from `src/app/claims/page.tsx`. Complete page-level acceptance checklist.

**Acceptance criteria**
- [ ] Manifest entry: `runtime: "v0"`
- [ ] No direct JSON import in claims route file
- [ ] Full acceptance checklist checked off
- [ ] Legacy renderer not invoked for this page

---

## EPIC-11 — Migrate quotations-list (Phase 3)

> Third pilot page migration.

---

### KUI-085 — quotations-list: route manifest entry + schemaId

| | |
|---|---|
| **Epic** | EPIC-11 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-084, KUI-003 |

**Description**  
Add manifest entry for `quotations-list`. Assign `schemaId: "quotations-list"`. Complete conversion worksheet. Quotations list currently uses `page:quotations:filters` style state keys in `useWidgetState` — note these in the worksheet as state to convert to `graph.filters`.

**Acceptance criteria**
- [ ] Manifest entry with `schemaId: "quotations-list"` and `runtime: "legacy"`
- [ ] Conversion worksheet notes `page:quotations:filters` → `graph.filters` conversion
- [ ] Backend readiness confirmed for quotations list endpoint

---

### KUI-086 — quotations-list: convert schema to arch_v0 format

| | |
|---|---|
| **Epic** | EPIC-11 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-085, KUI-015 |

**Description**  
Convert the quotations list schema to `PageSchema` format. Replace `page:quotations:filters` state key with `graph.filters` local namespace. Declare quotation list data as `kind: "api"` namespace pointing to the quotations list endpoint (currently proxied through `src/app/api/quotations/route.ts`).

**Acceptance criteria**
- [ ] Schema passes `yarn validate:schema-contracts`
- [ ] `page:quotations:filters` string key fully replaced by `graph.filters` namespace declaration
- [ ] Widget tree binds to `graph.filters.*` instead of `useWidgetState` keys
- [ ] Zod validation passes

---

### KUI-087 — quotations-list: replace legacy conditions with JSONLogic

| | |
|---|---|
| **Epic** | EPIC-11 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-086 |

**Description**  
Replace legacy conditions in the quotations list schema. Some quotations schemas already author JSONLogic (`{ "==": [{ "var": "isMasterPolicy" }, "yes"] }`-style) — validate those pass the subset validator. Replace any remaining legacy shapes.

**Acceptance criteria**
- [ ] All conditions are valid JSONLogic subset
- [ ] Existing JSONLogic conditions pass `condition-allowed-operators`
- [ ] Evaluator tests written for all conditions
- [ ] `yarn validate:schema-contracts` exits 0

---

### KUI-088 — quotations-list: publish resolved artifact + smoke render

| | |
|---|---|
| **Epic** | EPIC-11 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-087, KUI-056 |

**Description**  
Publish `dist/resolved-schemas/quotations-list.json` and add a smoke render test. Confirm filter state initializes, list data namespace hydrates with mock data, and table renders without errors.

**Acceptance criteria**
- [ ] Artifact validates against `ResolvedSchemaArtifact`
- [ ] Smoke render test passes
- [ ] `graph.filters` initializes and filter changes re-evaluate conditions

---

### KUI-089 — quotations-list: switch route to generic shell, remove legacy import

| | |
|---|---|
| **Epic** | EPIC-11 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-088 |

**Description**  
Flip manifest to `runtime: "v0"`. Remove direct schema import from `src/app/quotations/page.tsx`. Complete acceptance checklist.

**Acceptance criteria**
- [ ] Manifest entry: `runtime: "v0"`
- [ ] No direct JSON import in quotations route file
- [ ] Full acceptance checklist checked off
- [ ] `useWidgetState` no longer called with `page:quotations:filters` key

---

## EPIC-12 — Detail Pages & Forms (Phase 4)

> Migrate the form-heavy and tabbed detail pages after the runtime is proven on list pages.

---

### KUI-090 — Define form draft namespace pattern

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-033, KUI-089 |

**Description**  
Document and implement the canonical form draft pattern: `graph.<entity>` as `kind: "api"` domain namespace, `graph.<entity>Draft` as `kind: "local"` with `initialValueFrom: "graph.<entity>"`. Write one reference schema demonstrating this pattern and add it to the test fixtures. This pattern must be proven before any form-heavy page (quotation-details, accounting) is migrated.

**Acceptance criteria**
- [ ] Reference schema fixture with draft pattern added to `src/tests/schemas/fixtures/`
- [ ] Fixture validates against `PageSchema` Zod schema
- [ ] `graph.quoteDraft` seeds from `graph.quote` after first hydration in a smoke test
- [ ] Pattern documented in `docs/planning/FORM-DRAFT-PATTERN.md` with examples

---

### KUI-091 — Migrate FormContainer to graph-bound draft namespace

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-090, KUI-038 |

**Description**  
Adapt `src/components/widgets/forms/FormContainer.tsx` so it reads its form state from `graph.<formNamespace>` (the draft namespace declared in the schema) rather than owning it locally via `react-hook-form` internal state. `react-hook-form` can remain as the field validation and submit mechanism, but its initial values come from the graph and mutations write back to the graph. The legacy `FormContainer` behavior must remain available for unmigrated pages.

**Acceptance criteria**
- [ ] `FormContainer` accepts a `bind` prop pointing to a `graph.*` local namespace
- [ ] Form fields populate from the bound namespace value at mount
- [ ] Field changes update the bound graph namespace path via `patchGraphPath`
- [ ] Legacy `FormContainer` (without `bind` prop) continues to work unchanged
- [ ] `editableWhen` and `requiredWhen` conditions are evaluated and respected per field

---

### KUI-092 — Migrate useActionHandler to graph-aware revalidation

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-047, KUI-032 |

**Description**  
Extend `useActionHandler` to support namespace revalidation as the post-mutation refresh mechanism. When a schema action declares `revalidate: ["quote"]`, the handler calls `refetchNamespace("quote")` after a successful mutation rather than invalidating a `refreshKey` string. For schemas that still use `refreshKey`, the old behavior is preserved. This enables the re-fetch mutation pattern from `docs/arch_v0/04-RUNTIME-AND-CONDITIONS.md`.

**Acceptance criteria**
- [ ] Action with `revalidate: ["quote"]` triggers re-fetch of `graph.quote` after success
- [ ] `refreshKey` fallback still works for legacy pages
- [ ] Re-fetch causes `graph.quote` to re-hydrate and conditions to re-evaluate
- [ ] `graph.quoteDraft` is NOT automatically re-seeded on re-fetch unless the schema explicitly declares that behavior

---

### KUI-093 — Replace refreshKey invalidation on migrated pages

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | Medium |
| **Size** | M |
| **Depends on** | KUI-092 |

**Description**  
For all pages migrated in EPIC-9–11 that still use `refreshKey` strings in their action handlers, replace those with namespace-level `revalidate` declarations in the schema. This removes the last stringly-typed invalidation patterns from migrated pages. Legacy pages keep `refreshKey` until migrated.

**Acceptance criteria**
- [ ] Zero `refreshKey` usages remain in schemas for `test-dashboard`, `claims-list`, `quotations-list`
- [ ] Each action that previously used `refreshKey` now declares `revalidate: [namespaceName]`
- [ ] Smoke render tests pass with the updated schemas
- [ ] `yarn validate:schema-contracts` exits 0 on updated schemas

---

### KUI-094 — quotation-details: convert schema to arch_v0 format

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | High |
| **Size** | XL |
| **Depends on** | KUI-090, KUI-091, KUI-003 |

**Description**  
Convert `src/app/quotations/[id]/page.tsx` and its associated schemas to `PageSchema` format. This is the most complex page: it has multiple tabs, nested forms, `$ref` stitching via `src/lib/schemaResolver.ts`, and draft state (`graph.quoteDraft`). Declare all API namespaces including the sub-resources (`/members`, `/plans`, `/exclusions`, `/documents`, `/subsidiaries` — currently proxied through `src/app/api/quotations/[id]/*`). Use `dependsOn` for namespaces that require `quoteId` from a prior API call. The source schema should be resolved before publication — browser never sees `$ref`.

**Acceptance criteria**
- [ ] Converted schema passes `yarn validate:schema-contracts`
- [ ] All sub-resource namespaces declared with correct `dependsOn` relationships
- [ ] `graph.quoteDraft` uses `initialValueFrom: "graph.quote"`
- [ ] No `$ref` remains in the published artifact
- [ ] Schema passes size budget check (< 250 KB compressed)

---

### KUI-095 — quotation-details: publish artifact + smoke render + shell cutover

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-094, KUI-056 |

**Description**  
Publish `dist/resolved-schemas/quotation-details.json`. Add smoke render test covering the main tab with mock data for all namespaces. Add manifest entry for `/quotations/:id` with `routeParams: { quoteId: "id" }`. Switch to `runtime: "v0"`. Complete acceptance checklist.

**Acceptance criteria**
- [ ] Artifact validates and passes size budget
- [ ] Smoke render test covers main tab rendering
- [ ] `system.routeParams.quoteId` correctly resolves to the `:id` URL segment
- [ ] API namespace endpoints resolve `:quoteId` from `system.routeParams`
- [ ] Full acceptance checklist checked off for quotation-details

---

### KUI-096 — Document mutation pattern (draft init, submit, revalidation)

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-091, KUI-092, KUI-095 |

**Description**  
Write `docs/planning/MUTATION-PATTERN.md` documenting the canonical form mutation pattern used in quotation-details: initialize `graph.quoteDraft` from `graph.quote`, user edits update `graph.quoteDraft`, submit action calls `apiMutate`, on success `revalidate: ["quote"]` refreshes server state, `graph.quoteDraft` persists (not auto-cleared) unless explicit reset declared. Also document the patch-plus-revalidate variant for low-risk optimistic updates.

**Acceptance criteria**
- [ ] Document covers both re-fetch and patch-plus-revalidate patterns
- [ ] Form state lifecycle documented: initialize → edit → submit → revalidate → persist
- [ ] Auto-clear vs persist behavior documented with schema examples
- [ ] Document linked from the migration checklist template

---

### KUI-097 — Document and test detail-route rollback pattern

| | |
|---|---|
| **Epic** | EPIC-12 |
| **Priority** | Medium |
| **Size** | S |
| **Depends on** | KUI-095, KUI-055 |

**Description**  
Document the rollback procedure specific to detail routes (which have `routeParams`), and test it against `quotation-details`. The rollback is: revert manifest entry to `runtime: "legacy"`, which falls back to the legacy Next page handler at `src/app/quotations/[id]/page.tsx`. Confirm the legacy page still works after the migration by not deleting it until Phase 6.

**Acceptance criteria**
- [ ] Rollback procedure tested: flip manifest to `legacy`, confirm legacy page renders
- [ ] Procedure documented in `docs/planning/ROUTE-ROLLBACK-PROCEDURE.md` (update from KUI-055)
- [ ] Legacy route file (`src/app/quotations/[id]/page.tsx`) preserved and functional until explicit cleanup
- [ ] Test confirms < 5-minute rollback time

---

## EPIC-13 — Packaging & Workspace Extraction (Phase 6 / WS9)

> Extract reusable packages after at least two page families are stable on the new runtime. Phase 5 gate: packaging open questions must be resolved first.

---

### KUI-098 — Resolve packaging open questions (Phase 5 gate)

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | High |
| **Size** | S |
| **Depends on** | KUI-089 |

**Description**  
Resolve the five open questions from `docs/arch_v0/14-PACKAGING-AND-ADOPTION-STRATEGY.md` before WS9 begins: (1) what the CLI scaffold generates, (2) whether auth/API client stays app-local or becomes a shared package, (3) which current widgets are stable enough for `@keystone/widgets`, (4) whether a strict public API review gate is needed per package, (5) which internal package registry and versioning model to use. Each answer committed as a decision record.

**Acceptance criteria**
- [ ] All five questions answered in a committed decision record
- [ ] Decision record linked from the packaging strategy doc
- [ ] Answers reviewed by platform lead and at least one module team
- [ ] No WS9 package extraction starts without this ticket closed

---

### KUI-099 — Add workspace root + apps/ and packages/ scaffolding

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-098 |

**Description**  
Add workspace configuration to `package.json` (or `pnpm-workspace.yaml` / `turbo.json`). Create `apps/keystone-demo/` and `packages/` directories. Move the current application into `apps/keystone-demo/` without changing any behavior. All existing `yarn` commands must continue to work from the repo root.

**Acceptance criteria**
- [ ] Workspace root configured with `apps/*` and `packages/*`
- [ ] All existing tests pass after the restructure
- [ ] `yarn dev` still starts the Next app
- [ ] `yarn build` and `yarn test` still work from the repo root
- [ ] No import paths broken

---

### KUI-100 — Extract packages/design-system

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-099 |

**Description**  
Move all `src/components/ui/*` primitives into `packages/design-system/`. Redirect all internal imports. Publish to internal registry as `@keystone/design-system`. This is the most stable and lowest-coupling layer — start here. `src/stories/ui/*` Storybook stories move with the components.

**Acceptance criteria**
- [ ] All `src/components/ui/*` components moved to `packages/design-system/src/`
- [ ] Internal imports in `apps/keystone-demo` updated to `@keystone/design-system`
- [ ] All tests pass
- [ ] Storybook stories work from the package
- [ ] Package exports a clean `index.ts` with named exports for all components

---

### KUI-101 — Extract packages/schema

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | High |
| **Size** | M |
| **Depends on** | KUI-100, KUI-027 |

**Description**  
Move `src/schema/types/`, `src/schema/validators/`, `src/schema/lint/`, and `src/schema/evaluator/` into `packages/schema/`. Publish as `@keystone/schema`. This package is the shared authoring contract for all teams. The JSONLogic evaluator, Zod validators, and lint rules all live here.

**Acceptance criteria**
- [ ] All schema type/validator/lint modules in `packages/schema/src/`
- [ ] `@keystone/schema` imported cleanly from `apps/keystone-demo`
- [ ] `yarn validate:schema-contracts` still works after extraction
- [ ] All schema tests pass
- [ ] Package has no dependency on React or Next

---

### KUI-102 — Extract packages/runtime

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | High |
| **Size** | L |
| **Depends on** | KUI-101, KUI-089 |

**Description**  
Move `src/runtime/` into `packages/runtime/`. This package includes: `RuntimeProvider`, `useViewMetadata`, `usePageDataGraph`, `ConditionEngine`, `useValueSource`, `SchemaRenderer`. Extract only after the new runtime path is the default for at least two page families (`test-dashboard` and `claims-list`). The package depends on `@keystone/schema` but not on `@keystone/widgets` or Next.

**Acceptance criteria**
- [ ] All runtime modules in `packages/runtime/src/`
- [ ] Depends only on `@keystone/schema` and React (not Next, not widgets)
- [ ] `apps/keystone-demo` imports runtime from `@keystone/runtime`
- [ ] All smoke render tests pass after extraction
- [ ] Legacy `WidgetRenderer` stays in `apps/keystone-demo` (not extracted)

---

### KUI-103 — Extract packages/widgets

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | Medium |
| **Size** | L |
| **Depends on** | KUI-102 |

**Description**  
Move stable, schema-driven widget implementations into `packages/widgets/`: `DataTable`, `FormContainer` (adapted version from KUI-091), `MetricCard`, `FilterBar`, `TabsContainer`, `ChartWidget`, layout widgets. Product-specific or one-off widgets stay in `apps/keystone-demo`. Extract only widgets that are stable and whose contracts are not expected to change. Publish as `@keystone/widgets`.

**Acceptance criteria**
- [ ] Agreed set of stable widgets moved to `packages/widgets/src/`
- [ ] Widget package depends on `@keystone/design-system`, `@keystone/schema`, `@keystone/runtime`
- [ ] Legacy `WidgetRenderer` and `WidgetRegistry` in `apps/` are updated to use widgets from package
- [ ] All existing tests pass
- [ ] Product-specific widgets explicitly left in `apps/` with a comment

---

### KUI-104 — Build starter reference app + CLI scaffolder

| | |
|---|---|
| **Epic** | EPIC-13 |
| **Priority** | Low |
| **Size** | XL |
| **Depends on** | KUI-103, KUI-098 |

**Description**  
Create a supported reference app based on `apps/keystone-demo` (or a simplified version) and a `create-keystone-app` CLI scaffolder that generates a minimal but standards-compliant host application. The scaffolder must include: provider wiring, auth model, shared API client example, example routes, and example schemas following the authoring manual. The scaffold output is the starting point for any new product team building on Keystone.

**Acceptance criteria**
- [ ] `create-keystone-app my-app` generates a runnable Next application
- [ ] Generated app includes: `RuntimeProvider`, mock auth, one example schema-driven route, `yarn schemas:dev` command
- [ ] Generated app validates with `yarn validate:schema-contracts`
- [ ] Reference app and scaffolder documented in `docs/arch_v0/14-PACKAGING-AND-ADOPTION-STRATEGY.md`
- [ ] Reviewed by at least one module team building a new screen

---

## Dependency Summary

```
Pre-Sprint (EPIC-0)
  KUI-001–006 (no deps)

Phase 0 (EPIC-1)
  KUI-007 → nothing
  KUI-008 → KUI-009
  KUI-009 → nothing
  KUI-010 → nothing
  KUI-011 → KUI-001–006

Phase 1 (EPIC-2) — parallel with nothing yet
  KUI-012 → KUI-004
  KUI-013 → nothing
  KUI-014 → KUI-012
  KUI-015 → KUI-012, KUI-013, KUI-016
  KUI-016 → KUI-015
  KUI-017 → KUI-012
  KUI-018 → KUI-012
  KUI-019 → KUI-018
  KUI-020–024 → KUI-015 or KUI-017/018
  KUI-025 → KUI-015–024
  KUI-026 → KUI-015–017
  KUI-027 → KUI-019, KUI-026

Phase 2 — WS2 (EPIC-3), WS3 (EPIC-4), WS6 (EPIC-5), WS5-P1 (EPIC-6) all parallel
  EPIC-3 → KUI-001 (decision), KUI-012–019
  EPIC-4 → KUI-002 (decision)
  EPIC-5 → KUI-017, KUI-004 (decision)
  EPIC-6 → KUI-016, KUI-025

Phase 3 (EPICs 9–11) — sequential (one page proves the next)
  Each EPIC-9/10/11 ticket → prior phase complete

Phase 4 (EPIC-12)
  → EPIC-9–11 complete, EPIC-3 runtime proven

Phase 5 (EPIC-7, EPIC-8)
  → Phase 3 pilot pages live

Phase 6 (EPIC-13)
  KUI-098 (gate) → KUI-089
  KUI-099–104 sequential per doc
```

---

## Ticket Count by Epic

| Epic | Tickets | Total |
|---|---|---|
| EPIC-0 Pre-Sprint Decisions | KUI-001–006 | 6 |
| EPIC-1 Inventory & Freeze | KUI-007–011 | 5 |
| EPIC-2 Contract Foundation | KUI-012–027 | 16 |
| EPIC-3 Runtime Foundation | KUI-028–041 | 14 |
| EPIC-4 API Client & Auth | KUI-042–048 | 7 |
| EPIC-5 Route Manifest & Shell | KUI-049–055 | 7 |
| EPIC-6 Dev Schema Loop | KUI-056–060 | 5 |
| EPIC-7 Delivery Path | KUI-061–065 | 5 |
| EPIC-8 CI & Operations | KUI-066–074 | 9 |
| EPIC-9 Migrate test-dashboard | KUI-075–079 | 5 |
| EPIC-10 Migrate claims-list | KUI-080–084 | 5 |
| EPIC-11 Migrate quotations-list | KUI-085–089 | 5 |
| EPIC-12 Detail Pages & Forms | KUI-090–097 | 8 |
| EPIC-13 Packaging & Workspace | KUI-098–104 | 7 |
| **Total** | | **104** |
