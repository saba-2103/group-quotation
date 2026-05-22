# Schema Design Reference

The complete developer reference for building screens in keystone-ui.

This repo is **schema-driven**: pages, forms, tables, and workflows are described as JSON schemas that the runtime renders. Most features ship without writing a React component — you compose existing widgets in a JSON file and wire it to a Next.js route.

This reference covers everything a developer needs to:

- Understand what the framework gives you for free
- Build a new screen end-to-end (list page, detail page, tabbed workflow, form-driven modal)
- Pick the right widget for a job
- Extend the framework when a widget genuinely doesn't exist
- Debug the common failure modes

---

## Who this is for

- **New developers** joining the team — start with [01-architecture.md](01-architecture.md) and walk through it in order.
- **Developers building a new module** — skim 01, then go straight to [11-cookbook.md](11-cookbook.md) → *"Recipe: New module from scratch."* Use 02 onwards as reference when you hit specifics.
- **Developers extending the framework** (new widget, new action type, new field type) — read 01 + 02 + [11-cookbook.md](11-cookbook.md) → *"Recipe: Register a new widget."*
- **Code reviewers** — sections 02, 03, 05 contain the contracts the code is expected to follow.

---

## Table of contents

| # | Document | What it covers |
|---|----------|---------------|
| 0 | [README.md](README.md) | This page — entry point |
| 1 | [01-architecture.md](01-architecture.md) | The mental model, runtime data flow, file map |
| 2 | [02-widget-catalog.md](02-widget-catalog.md) | Every registered widget — shape, props, when to use |
| 3 | [03-schemas.md](03-schemas.md) | The JSON schema format, `$ref` resolution, file organisation |
| 4 | [04-data-sources.md](04-data-sources.md) | `dataSource`, `useSmartQuery`, polling, state dependencies |
| 5 | [05-actions.md](05-actions.md) | `ActionConfig`, every action type, confirmation dialogs, refresh keys |
| 6 | [06-forms.md](06-forms.md) | `form-container` deep dive, validations, dynamic options, overlaid forms |
| 7 | [07-state-and-conditions.md](07-state-and-conditions.md) | `useWidgetState`, `useRole`, JSONLogic conditions for visibility and polling |
| 8 | [08-pages-and-routing.md](08-pages-and-routing.md) | Next.js wiring, `$ref` resolution at the page boundary, template substitution |
| 9 | [09-api-routes.md](09-api-routes.md) | Mock routes, error envelope conventions, proxy patterns |
| 10 | [10-design-system.md](10-design-system.md) | Tokens (`globals.css`), Tailwind setup, customising colours and radii |
| 11 | [11-cookbook.md](11-cookbook.md) | Step-by-step recipes for common tasks |
| 12 | [12-troubleshooting.md](12-troubleshooting.md) | Symptoms → diagnoses → fixes |
| 13 | [13-glossary.md](13-glossary.md) | Terms used throughout these docs |

---

## The 30-second mental model

A screen is a tree of **widgets**. Each widget node in the tree is a small piece of JSON:

```json
{
  "id": "unique-id",
  "type": "data-table",
  "dataSource": { "api": { "endpoint": "/api/things", "method": "GET" } },
  "props": { "columns": [...], "rowActions": [...] },
  "children": [...]
}
```

The runtime does four things for you:

1. **Resolve `$ref` shortcuts** — schemas can reference other schemas by path so you can split a 2000-line file into per-tab files.
2. **Fetch data** — if a widget has a `dataSource`, the renderer fetches it (with caching, polling, refetch invalidation) before passing data into the component.
3. **Render the widget** — look up the `type` in the widget registry, pass props + data, recurse into `children`.
4. **Dispatch actions** — when a user clicks anything (button, row, link), an `ActionConfig` (navigate / api-mutation / open-modal / …) is dispatched through a single handler that knows about confirmation dialogs, refresh keys, toast messages, and chained `onSuccess` actions.

That's it. Pages, tabs, forms, dashboards, tables — all of it is JSON in this shape, rendered by [`WidgetRenderer`](../../src/components/registry/WidgetRenderer.tsx) and [`WidgetRegistry`](../../src/components/registry/WidgetRegistry.tsx).

---

## What changed from the original `NEW_MODULE_IMPLEMENTATION_GUIDE.md`?

The original guide is a quickstart — it walks you through one happy-path build. **This reference is comprehensive.** It documents the contracts the runtime expects, the full registry of widgets and action types, every hook the framework exposes, and the edge cases each piece handles.

If the quickstart is enough to get you moving, use it. Come here when you hit something the quickstart doesn't cover.

---

## Conventions used in this reference

- **File paths** are relative to the repo root: `src/components/widgets/data/DataTable/index.tsx`.
- **Schema paths** are also relative to the repo root: `schemas/quotations.json`.
- Code blocks marked `json` are valid schema-file content. Code blocks marked `tsx` are TypeScript/React.
- ⚠️ marks a non-obvious gotcha worth slowing down for.
- 💡 marks an idiomatic pattern worth memorising.

---

## Where to ask questions

Bugs and additions to this reference go through the proposal flow — file under `proposals/` with status `draft` and tag it `docs:schema-reference`. The reference is the single source of truth for what the framework promises; if the code and docs disagree, surface the mismatch.
