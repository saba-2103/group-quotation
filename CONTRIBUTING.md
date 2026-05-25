# Contributing to keystone-ui

A guide for frontend engineers joining the project. Read this end to end before opening your first PR — most of the friction in the codebase comes from misunderstanding the mental model, not from the code itself.

---

## 1. The one thing you must internalise first

**This is not a normal React project.** Most screens are described in JSON and rendered by a generic runtime. You will spend more time writing schemas than writing components.

A page looks like this:

```json
{
  "id": "vendors-page",
  "type": "stack-layout",
  "children": [
    { "id": "header", "type": "page-header", "props": { "title": "Vendors" } },
    {
      "id": "table",
      "type": "data-table",
      "dataSource": { "api": { "endpoint": "/api/v1/vendors", "method": "GET" } },
      "props": { "columns": [/* … */] }
    }
  ]
}
```

There is **no `VendorsPage.tsx`** with state, effects, and JSX. The runtime ([`WidgetRenderer`](src/components/registry/WidgetRenderer.tsx)) walks the schema, fetches data, dispatches actions, and renders registered widgets. Your job, most of the time, is to compose the existing widget vocabulary in JSON and wire it to a Next.js route.

When the existing widgets genuinely don't cover a need, you extend the framework — you do **not** fork it into bespoke React for one feature. See [Recipe 11 — Register a new widget](docs/schema-design-reference/11-cookbook.md#recipe-11--register-a-new-widget).

---

## 2. Required reading (in order, before your first task)

| # | Doc | Why |
|---|-----|-----|
| 1 | [docs/schema-design-reference/README.md](docs/schema-design-reference/README.md) | The 30-second mental model + branch context |
| 2 | [01-architecture.md](docs/schema-design-reference/01-architecture.md) | Runtime data flow, file map, the four core hooks |
| 3 | [02-widget-catalog.md](docs/schema-design-reference/02-widget-catalog.md) | The whole widget vocabulary — skim, then refer back |
| 4 | [11-cookbook.md](docs/schema-design-reference/11-cookbook.md) | Step-by-step recipes — this is what you'll work from day to day |
| 5 | [13-glossary.md](docs/schema-design-reference/13-glossary.md) | Vocabulary used everywhere else |

Reference docs you'll come back to once you start building:

- [03-schemas.md](docs/schema-design-reference/03-schemas.md) — schema file format, `$ref` resolution
- [04-data-sources.md](docs/schema-design-reference/04-data-sources.md) — `useSmartQuery`, polling, state dependencies
- [05-actions.md](docs/schema-design-reference/05-actions.md) — every `ActionConfig` type
- [06-forms.md](docs/schema-design-reference/06-forms.md) — `form-container`, validation, dynamic options
- [07-state-and-conditions.md](docs/schema-design-reference/07-state-and-conditions.md) — `useWidgetState`, JSONLogic
- [08-pages-and-routing.md](docs/schema-design-reference/08-pages-and-routing.md) — Next.js wiring, template substitution
- [09-api-routes.md](docs/schema-design-reference/09-api-routes.md) — mock routes, error envelope conventions
- [10-design-system.md](docs/schema-design-reference/10-design-system.md) — tokens, Tailwind setup
- [12-troubleshooting.md](docs/schema-design-reference/12-troubleshooting.md) — bookmark this; you will need it

---

## 3. Branch model — know which branch you're on

There are two branches you must keep straight. Confusing them wastes hours.

- **`main`** — the canonical framework. 21 registered widgets, the generic typed API client ([`src/lib/api/client.ts`](src/lib/api/client.ts) + `error-mapper.ts`), `DetailPageSkeleton`, role gating in `WidgetRenderer` (`visibleRoles`), the schema `$ref` plumbing. **Framework primitives land here once they're polished.** All framework PRs target `main`.
- **`feat/new-buisiness`** — `main` plus **9 domain widgets** for Group PAS V1 (`card-grid`, `plan-card`, `editable-table`, `dmn-decision-table`, `activation-counter`, `plan-form`, `census-file-format-form`, `confirm-maf-button`, `polling-banner`), the domain-typed API modules (`src/lib/api/{quotation,issuance,policy-admin,productCatalog}.ts`), the [`src/lib/api-mock/group-pas/`](src/lib/api-mock/group-pas/) mock backend, and Group PAS app routes. **Domain code stays on this branch by design.** Group PAS feature work lands here.

Rule of thumb:

| You're doing… | Branch off | Merge into |
|---------------|------------|------------|
| New widget, new hook, new action type, framework bug fix | `main` | `main` |
| Group PAS module / screen / form | `feat/new-buisiness` | `feat/new-buisiness` |
| Cherry-picking a framework change back from feat-branch to main | `chore/cherry-pick-…` off `main` | `main` (then trigger merge of `main` → `feat/new-buisiness`) |

When in doubt, ask before branching. Reverse-engineering a misplaced PR is painful.

---

## 4. Local setup

Prerequisites: Node 20+, npm or yarn.

```bash
git clone git@github.com:Anaira-AI/keystone-ui.git
cd keystone-ui
npm install
npm run dev          # http://localhost:3000
```

Other commands you'll use:

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # next lint
npm run format           # prettier --write .
npm run test             # jest (unit + schema tests)
npm run test:vitest      # vitest unit project
npm run test:schemas     # schema-only Jest project (validates schemas/*.json)
npm run preview          # local Cloudflare runtime build + preview
npm run storybook        # design-system catalog
```

`predev` and `prebuild` regenerate [`schemas/forms/index.ts`](schemas/forms/index.ts) — **do not edit that file by hand**; it's generated from `schemas/forms/*.json` by [`scripts/generate_form_index.mjs`](scripts/generate_form_index.mjs).

---

## 5. Your daily workflow

There are skill-driven pipelines for almost everything. Use them — they encode reviewer expectations.

1. **Propose** — `/propose` writes a structured proposal under `proposals/` (id `PROP-NNNN`). Triage happens via `/review-proposals`.
2. **Build** — once approved:
   - `/build-feature PROP-NNNN` is the **default**. It runs CLARIFY → DESIGN → BUILD with user gates. Use this when the design isn't already locked.
   - `/execute-proposal PROP-NNNN` is for mechanical, tightly-scoped changes whose design is locked. Skips clarification.
3. **Verify locally** — `/preview-and-deploy` runs lint, tests, and a Cloudflare preview before any deploy gate.
4. **Open a PR** — branch is pushed and a PR is opened against the right base branch (see §3). Link the proposal in the description.
5. **Review** — `/review` for human review style; `/ultrareview` (user-triggered) runs a multi-agent cloud review.

Don't skip the proposal step for non-trivial work. Reviewers expect to see the design conversation captured in `proposals/` before code lands.

---

## 6. Schema-writing conventions

A few non-obvious rules that come up in review every time.

### Use `$ref` to split big schemas

Top-level page schemas live in `schemas/*.json`. Tab panels and forms are split into:

- `schemas/tabs/<module>/*.json` — referenced from a `tabs-container` via `{ "$ref": "schemas/tabs/foo/bar.json" }`.
- `schemas/forms/*.json` — looked up at runtime by form `id` (because of the auto-generated forms registry).

[`resolveSchemaRefs`](src/lib/schemaResolver.ts) walks every node server-side and splices refs in before render. Don't reach for runtime fetches of schema fragments — use `$ref`.

### Don't recompute IDs in JSON — make them stable

Every node needs a stable `id`. Widget state, action targets, conditions, and refresh keys all depend on these. Renaming an `id` is a breaking change to anything that references it.

### `dataSource` belongs on the widget that needs the data, not its parent

If three widgets share a query, each declares its own `dataSource` and React Query dedupes by key. Hoisting fetches into an ancestor "for performance" works around a problem you don't have and breaks polling/refresh semantics.

### Template substitution happens at the page boundary, not in widgets

`{{id}}` and other route-param placeholders are substituted in `src/app/<route>/page.tsx` *before* `<WidgetRenderer />` mounts — see [`updateEndpoints`](src/lib/endpointUtils.ts) and [08-pages-and-routing.md](docs/schema-design-reference/08-pages-and-routing.md). Don't expect the runtime to do this for you.

### One `ActionConfig` for one user intent

Every button, link, row action, form submit resolves to an `ActionConfig` (`navigate` / `api-mutation` / `open-modal` / `api-download` / `trigger-event` / `update-widget-state`). Chained behaviour (mutate → invalidate → toast → navigate) belongs in `onSuccess`, not in a hand-rolled handler. See [05-actions.md](docs/schema-design-reference/05-actions.md).

### Roles gate at the widget level via `visibleRoles`

`WidgetRenderer` hides children whose `visibleRoles` doesn't match the current role. Don't write role checks inside a widget component — use the field. Footgun: an empty `visibleRoles: []` hides the widget from everyone. Use `undefined` to mean "visible to all".

---

## 7. Code conventions (when you do write React)

When you genuinely need a new widget or a hook:

- **Co-locate** widget files under [`src/components/widgets/<category>/<WidgetName>/`](src/components/widgets/) with `index.tsx` and any local hooks/utils.
- **Register** the widget in [`src/components/registry/WidgetRegistry.tsx`](src/components/registry/WidgetRegistry.tsx) — this is the only place the `type` string gets a component.
- **Type the schema shape** in [`src/types/widget.ts`](src/types/widget.ts) — extend `WidgetConfig`, `DataSourceConfig`, or `ActionConfig`. Schema files are validated against these.
- **Use design tokens, not hardcoded colours.** [`src/app/globals.css`](src/app/globals.css) defines `--color-*`, `--radius-*`, `--spacing-*` CSS variables. Hex literals in components fail review.
- **Primitives live in [`src/components/ui/`](src/components/ui/)** — Button, Card, Badge, Tooltip. Use them inside widgets; never reach past them for raw Radix or HTML.
- **TS strict.** No `any`. If you find yourself wanting one, the schema shape is probably wrong.
- **No comments explaining what the code does.** Only the *why* when it's non-obvious (a workaround, a hidden invariant). Naming and types should carry the rest.

---

## 8. Tests you must run before pushing

The CI gate is `npm run lint && npm run typecheck && npm run test && npm run test:vitest`. Run these locally before opening a PR.

- **Schema tests** (`npm run test:schemas`) validate every JSON file in `schemas/` against the type definitions in [`src/types/widget.ts`](src/types/widget.ts). If you add a schema, this catches typos and bad references.
- **Unit tests** (`npm run test:unit`) cover hooks (`useSmartQuery`, `useActionHandler`, `useWidgetState`, etc.) and renderer behaviour.
- **Vitest** (`npm run test:vitest`) covers a separate unit project — both run in CI.

If you touch UI that's previewable, **run the dev server and look at it.** Type checks verify code correctness, not feature correctness.

---

## 9. PR & review etiquette

- **Title:** conventional commit style (`feat(quotation): …`, `fix(data-table): …`, `docs(schema-ref): …`). Keep under 70 chars.
- **Description:** one paragraph on *why*, a short bullet list of *what*, and a checkbox test plan. Link the proposal (`Closes PROP-NNNN`) and any related PRs.
- **Replying to review comments:** always reply inline on the thread, with the SHA of the fixing commit and one line on the rationale. Don't just push a fixup and assume the reviewer reconnects the dots.
- **Cherry-picks across branches:** put the source PR number in the commit message (`port from PR #65`) — see existing commits like `chore(core-arch): port framework-level changes from feat/new-buisiness` for the format.
- **No `--no-verify`.** If a pre-commit hook fails, fix the underlying issue.

---

## 10. Common pitfalls (read this preemptively)

[12-troubleshooting.md](docs/schema-design-reference/12-troubleshooting.md) is the long form. The greatest hits:

- **"My widget renders but no data" →** dataSource missing, endpoint typo, or `{{param}}` not substituted at the page boundary.
- **"`$ref` resolved to undefined" →** path is relative to repo root, not to the file with the `$ref`. Always `schemas/tabs/foo/bar.json`, never `./bar.json`.
- **"Row action doesn't fire" →** action sits on the wrong widget node, or `rowIdKey` doesn't match the key in the row data.
- **"Form options come back empty" →** dynamic options need a `dataSource` *and* a label/value mapping. See [06-forms.md](docs/schema-design-reference/06-forms.md).
- **"Polling never stops" →** `stopWhen` is JSONLogic against the *response* shape, not the request. See [04-data-sources.md](docs/schema-design-reference/04-data-sources.md).
- **"Hidden from everyone" →** `visibleRoles: []` (empty array) hides; omit the field instead.
- **"Data shows wrong values after navigation" →** missing `refreshKey` on an action; React Query is serving cache.

---

## 11. When to extend the framework

Add a widget when:

- The shape is genuinely new (a chart type, an editor, a layout idiom not covered).
- You'd be writing the same React composition more than twice across modules.
- A reviewer in the proposal triage agrees the framework is the right home.

Don't add a widget when:

- An existing one + different `props` would do.
- You're trying to escape a constraint (role gating, validation, polling) that the framework already handles a different way.
- You haven't checked [02-widget-catalog.md](docs/schema-design-reference/02-widget-catalog.md) cover-to-cover.

The whole point of the schema-driven model is that the widget surface stays bounded. Every new widget is a long-term commitment.

---

## 12. Where to ask

- **Schema reference bugs / gaps:** file a proposal under `proposals/` with status `draft` and tag `docs:schema-reference`.
- **Framework bugs:** proposal with tag `framework`; if it's blocking you, ping in chat first.
- **Group PAS domain questions:** check [`<group-pas-repo>/spec/`](../group-pas/spec/) and [docs/group-pas-v1-plan.md](docs/group-pas-v1-plan.md) before asking.
- **Stuck on something general:** the cookbook and troubleshooting docs are usually faster than asking. If they're wrong, fix them in the same PR.

Welcome aboard. The framework rewards patience in the first week — once the mental model clicks, you ship features in JSON faster than you'd write a single React component.
