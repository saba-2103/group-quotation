# 03 — Schemas

This document covers how a schema file is structured, how `$ref` works, and how to organise schemas as a module grows.

If [02-widget-catalog.md](02-widget-catalog.md) is "what widgets exist", this is "how do I put them together into a file."

---

## The `WidgetConfig` shape

Every node in a schema tree conforms to [`WidgetConfig`](../../src/types/widget.ts):

```ts
interface WidgetConfig {
  id: string;                          // Unique per page; used as React key
  type: WidgetType;                    // Registry key (e.g. "data-table")
  props?: Record<string, any>;         // Widget-specific config
  layout?: {
    colSpan?: number;                  // 1-4, for grid-layout children
    hidden?: boolean;                  // Skip rendering
    // (Other layout constraints may be added; see src/types/widget.ts)
  };
  dataSource?: DataSourceConfig;       // Fetch config (see 04)
  children?: WidgetConfig[];           // Nested widgets
}
```

Five required-or-common fields, each with a single job. Memorise these.

### `id`

A string unique within the page. React uses it as a key. Two widgets with the same `id` on the same page is a bug. Conventions:

- Kebab-case: `claim-summary-card`, `policy-section`
- Prefix by module when ambiguous: `claims-table`, `claims-decisions-tab`
- Schema-file-level top id is `<module>-<view>-page`: `claims-list-page`, `claims-detail-page`

### `type`

The widget-registry key. See [02-widget-catalog.md](02-widget-catalog.md) for the full list. Unknown types render as an error.

### `props`

All widget-specific config goes here. The shape varies per widget — consult the catalog or the widget's source.

⚠️ **Common mistake:** putting `fields` / `actions` / `columns` directly on the root of the config instead of under `props`. They must be inside `props`.

```json
// WRONG
{ "type": "form-container", "fields": [...] }

// RIGHT
{ "type": "form-container", "props": { "fields": [...] } }
```

### `dataSource`

Optional. When present, the renderer runs `useSmartQuery(dataSource)` before mounting the component and injects `data`, `isLoading`, `error` into the widget's props. See [04-data-sources.md](04-data-sources.md).

### `children`

For container widgets (`stack-layout`, `grid-layout`, `section-group`, `tabs-container`, …) — the nested widget configs. Each child is rendered by the container, usually via `<WidgetRenderer config={child} />`.

⚠️ All registered widgets on `main` store nested widgets under `children`. Feature-branch widgets sometimes nest under non-standard paths (e.g. an `accordion-group` widget puts children under `props.items[].children`). When you write a new widget, follow the `children` convention — otherwise the page-level `{{id}}` walker can't reach those nested endpoints. See [08-pages-and-routing.md](08-pages-and-routing.md).

### `layout`

Rendering hints. The most common is `colSpan` (which the renderer turns into a `col-span-N md:col-span-N` class on the wrapper). `hidden: true` skips rendering entirely.

⚠️ There is no `layout.visibleWhen` on `main` — see [07-state-and-conditions.md → JSONLogic](07-state-and-conditions.md#jsonlogic). Conditional rendering today happens through `field.visibleWhen` (forms), `rowAction.visible` (table rows), or by gating at the schema level.

---

## A complete example

A page schema with a header, a summary, and a tabbed body — exercising most of the shape:

```json
{
  "id": "claim-detail-page",
  "type": "stack-layout",
  "props": { "gap": 6, "className": "p-6" },
  "children": [
    {
      "id": "header",
      "type": "page-header",
      "props": {
        "title": "Claim Details",
        "breadcrumbs": [
          { "label": "Claims", "href": "/claims" },
          { "label": "Detail" }
        ]
      }
    },
    {
      "id": "summary",
      "type": "key-value-grid",
      "dataSource": { "api": { "endpoint": "/api/v1/claims/:id", "method": "GET" } },
      "props": {
        "columns": 4,
        "fields": [
          { "id": "claim-no", "label": "Claim No", "accessorKey": "claim_no" }
        ]
      }
    },
    {
      "id": "tabs",
      "type": "tabs-container",
      "children": [
        { "$ref": "schemas/tabs/claims/overview.json" },
        { "$ref": "schemas/tabs/claims/audit.json" }
      ]
    }
  ]
}
```

Read top to bottom: a vertical stack of three widgets — a header (no fetch), a summary (fetches the claim), and tabs (each tab pulled in via `$ref`).

---

## `$ref` — composing schemas

When a schema would otherwise be 1000+ lines, split it. The runtime resolves three kinds of `$ref`:

### Tab refs — `schemas/tabs/...`

```json
{ "$ref": "schemas/tabs/claims/overview.json" }
```

At render time, [`resolveSchemaRefs`](../../src/lib/schemaResolver.ts) dynamically imports the file. The file's top-level object replaces the `$ref` node in the tree.

⚠️ The path is **literal** — `schemas/tabs/...` relative to the repo root, including the `.json` extension. Webpack uses a strongly-typed import prefix to bound the bundle, so other paths won't resolve.

⚠️ When the imported file's top-level node has its own `id` and `type`, those become the rendered node — the parent's `id`/`type` (if it had any alongside the `$ref`) is ignored. Properties siblings of `$ref` are merged onto the resolved node, but the resolved node wins on conflicts.

**Recommended convention:** put per-module tab files under `schemas/tabs/<module>/<tab-name>.json`. Each file is a `tab-panel` widget with its own `children`.

Example tab file (`schemas/tabs/claims/audit.json`):
```json
{
  "id": "claims-audit-tab",
  "type": "tab-panel",
  "props": { "label": "Audit", "icon": "ScrollText" },
  "children": [
    { "id": "audit-log", "type": "data-table", "dataSource": { ... } }
  ]
}
```

### Form refs — `schemas/forms/...`

```json
{ "$ref": "schemas/forms/register-claim-form.json" }
```

Forms work differently from tabs — they're **pre-bundled into a registry** at build time. The generator script `scripts/generate_form_index.mjs` reads every JSON file under `schemas/forms/` and emits `schemas/forms/index.ts`:

```ts
// Auto-generated (do not edit by hand)
export const forms_registry: Record<string, any> = {
  'register-claim-form': { ...inlined JSON... },
  'edit-policy-form': { ...inlined JSON... }
};
```

`resolveSchemaRefs` looks up the form id in this registry, not from disk. The script runs on `npm run predev`, so editing a form schema and forgetting to regenerate means your changes don't show up. Fix:

```bash
npm run predev
# or directly:
node scripts/generate_form_index.mjs
```

⚠️ **There's no third $ref kind.** Page-level schemas (`schemas/quotations.json`) can't be `$ref`'d — they're imported directly by `page.tsx`.

### Sibling properties

You can put properties next to `$ref` and they'll be merged onto the resolved node:

```json
{ "$ref": "schemas/tabs/claims/overview.json", "id": "claims-overview-override" }
```

The resolved object's `id` is "claims-overview-override", everything else comes from the file. Use this sparingly — it's confusing in code review.

---

## Schema file organisation

The convention that's emerged across modules:

```
schemas/
├── <module>.json                     # List page (e.g. quotations.json, quote.json, policy.json)
├── <module>-detail.json              # Detail page (quote-detail.json, policy-detail.json, member-detail.json, ...)
├── <module>-<view>.json              # Other top-level views
├── tabs/
│   └── <module>/                     # Per-module tab schemas (quote/, policy/, proposal/ on feat/new-buisiness)
│       ├── overview.json
│       ├── plans.json
│       ├── census.json
│       └── ...
├── forms/
│   ├── create-quote-form.json
│   ├── plan-edit-form.json
│   ├── upload-census-form.json
│   ├── ...
│   └── index.ts                      # Auto-generated, do not edit
├── tables/                           # (feat/new-buisiness) shared column configs e.g. census-submission-rows.json
└── views/                            # (feat/new-buisiness) shared view fragments e.g. census-submission-detail.json
```

⚠️ `schemas/tables/` and `schemas/views/` exist on `feat/new-buisiness` only — they hold reusable column configs and view fragments referenced by tab schemas. On `main` only `schemas/`, `schemas/tabs/`, and `schemas/forms/` are present.

For a new module, you typically end up with:
- One list-page schema (`<module>.json`)
- One detail-page schema (`<module>-detail.json`)
- 4–10 tab files under `schemas/tabs/<module>/`
- 2–10 form files under `schemas/forms/`

If you're writing more than that, ask why — see [11-cookbook.md → "When a feature doesn't fit"](11-cookbook.md).

---

## File naming rules

- All filenames are kebab-case: `claim-detail.json`, `register-claim-form.json`
- Tab filenames match the tab content, not the file path. If `policy-vehicle.json` actually contains the Overview tab, **rename it `overview.json`** — file names should be greppable.
- Form files end with `-form.json` (the registry generator strips the extension to derive the id, so `register-claim-form.json` becomes form id `register-claim-form`).

---

## Validation

The repo ships a schema validation script at `scripts/validate-schemas.ts`. Run it before opening a PR:

```bash
npx tsx scripts/validate-schemas.ts
```

It catches:
- Unknown widget types (typos in `type`)
- Required props missing for known widgets
- Broken `$ref` paths
- Duplicate `id`s within a single resolved tree

Add it to your local pre-commit hook if you find yourself shipping broken schemas often.

---

## Quoted vs unquoted JSON formatting

Schemas are checked in as plain JSON. Two formatting preferences worth knowing:

1. **Sort keys?** No. The reading order matters — `type` first, then `dataSource`, then `props`, then `children`. Don't alphabetise.
2. **Quote-style?** Standard JSON double quotes. Don't use single quotes (it'll parse-fail).

There's no `prettier` step on JSON schemas in CI today, so manual consistency matters.

---

## Common schema mistakes

A short list of the patterns that show up in PRs every week:

1. **Putting widget config at the root instead of under `props`.** Fields, columns, actions, items — they all belong inside `"props": { ... }`. The schema validator catches this; CI doesn't run it on every commit yet.

2. **Forgetting to regenerate the forms registry.** Edit a form file, see no change in the UI — run `npm run predev` (or just `node scripts/generate_form_index.mjs`).

3. **`$ref` with a relative path.** Paths must be `schemas/...` from the repo root, not `./tabs/...` or `../forms/...`.

4. **Reusing an `id` across tabs.** The resolved tree has duplicate keys, React warns in dev. Prefix tab content ids by tab name.

5. **Using `actions` where `props.actions` is expected.** Several widgets (`form-container`, `data-table`) expect `actions` *inside* `props`. `page-header` also keeps `actions` inside `props`. There's no widget that takes top-level `actions`.

6. **Mixing `colSpan` and `gridTemplateColumns`.** If the parent `grid-layout` uses `gridTemplateColumns: "65fr 35fr"`, children's `colSpan` is ignored. Pick one approach per layout.

7. **Trying to use schema variables.** There's no `$variables` block, no Handlebars, no template-engine semantics. The only string substitution is `:param` (in `linkRoute` / endpoint paths, via row data) and `{{id}}` (in page-level template substitution, manually applied in `page.tsx`). See [08-pages-and-routing.md](08-pages-and-routing.md).

---

## What schemas can't do

It's worth being explicit about the limits:

- ❌ **Conditional widgets that depend on a fetch result.** Widget-level `visibleWhen` is not on `main`. For per-row visibility use `rowAction.visible`; for per-field visibility use `field.visibleWhen`. Section-level conditional rendering is a known gap.
- ❌ **Computed values.** No JSONPath transforms inside `props` (other than the dotted accessors in field configs). If you need to combine three response fields into one display, render two widgets and let CSS handle layout.
- ❌ **Loops.** Schemas don't have a "for each item, render this widget" construct. Use `data-table` instead.
- ❌ **Imperative orchestration.** A schema is declarative. If you need "run mutation A, then if it succeeds run B, then navigate" — that's what `api-mutation.onSuccess` is for; see [05-actions.md](05-actions.md).

When you hit one of these, you have two options: redesign the schema, or propose a new widget. Don't write a custom React component inside a tab — that breaks the schema-driven model and the next dev won't know to look there.

---

**Next:** [04-data-sources.md](04-data-sources.md) — how `dataSource` works, polling, state dependencies.
