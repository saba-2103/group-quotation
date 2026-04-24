# v0 Decisions Summary

**Parent:** [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)  
**Purpose:** Quick-reference architecture summary for leadership, platform, and module teams

This document is the shortest complete statement of the architecture.

If someone asks:

- what are we actually building?
- what decisions are locked?
- what assumptions is this architecture making?
- what is intentionally out of scope?
- what happens if those assumptions stop being true?

this is the document to read first.

---

## One-Line Summary

Keystone UI v0 is a browser-based, metadata-driven UI where each page is fetched as a resolved schema by unique `schemaId` from CDN/S3, rendered as a widget tree, driven by static schema-authored JSONLogic conditions, and backed by direct browser-to-backend API calls with backend validation on every write.

---

## What Is Locked

These decisions should be treated as the default architectural contract.

1. **Schema delivery is direct by `schemaId`.**
The browser fetches a resolved schema artifact directly from CDN/S3. There is no Worker, no runtime schema resolver, and no multi-parameter context matching at delivery time.

2. **Schemas are identified uniquely.**
Each resolved schema artifact has a unique `schemaId`. If a variant exists, it is a different schema artifact with its own `schemaId`.

3. **Conditions are static and schema-authored.**
Conditions come from the product specs and are authored directly in schema.

4. **Conditions use JSONLogic.**
The runtime condition language is JSONLogic with a bounded allowed subset.

5. **The UI reads one runtime data graph.**
The consumer contract for the UI is one graph with `context`, `data`, `form`, and `ui` namespaces.

6. **Forms are widgets.**
The page contract is a widget tree. Forms are widget nodes inside that tree.

7. **Conditions come before variants.**
If a UX difference can be expressed cleanly as a condition, use a condition. Variants are a fallback, not the default.

8. **Backend validation remains authoritative.**
Schema shapes the user experience, but backend APIs validate submitted mutations.

9. **Display semantics are server-resolved.**
Labels, translations, badge variants, and other display mappings are materialised into the schema before the browser fetches it.

10. **Workbench architecture is out of scope.**
No `useWorkbenchBootstrap()`, no dedicated workbench runtime, and no workflow-capability contract are part of v0.

11. **Dynamic field-rule APIs are out of scope.**
No `useFieldConfig()` and no Field Config API are part of v0.

---

## Design Principles

These are the principles that should guide implementation choices when the docs do not spell something out directly.

**Keep the runtime smaller than the ambition.**
The POC should not carry machinery for scale patterns it is not actually using yet.

**Schema is the page contract.**
Structure, bindings, conditions, inheritance, and justified variants all belong to schema.

**Conditions first, variants second.**
Prefer one understandable schema with conditions over many similar schemas.

**One read contract for the UI.**
Even if data is loaded from multiple endpoints, the UI should read one runtime graph.

**Server-resolve display semantics.**
Do not move label mapping or display transformation logic back into components.

**Backend validates writes.**
UI conditions are not authorization or mutation enforcement.

**Keep publication observable and reversible.**
If schema publication fails, the system must degrade predictably and roll back quickly.

**Prefer explicitness over cleverness.**
Explicit `schemaId`, explicit graph paths, explicit value-source rules, explicit variant justification.

---

## Assumptions

These assumptions are load-bearing. If they change, the architecture should be revisited rather than stretched silently.

### Product assumptions

- most condition logic is known up front from specs
- conditions do not change frequently and independently of schema publication
- the initial POC does not need workbench-style coherent multi-panel runtime

### Deployment assumptions

- the POC is on-prem and not multi-tenant in the runtime sense
- schemas can be fetched directly from CDN/S3 without a runtime selector
- schema artifacts are non-sensitive metadata

### Engineering assumptions

- schema authoring is engineering-owned
- Config System remains the source of display semantics
- API contracts and resolved schemas can be validated before and during runtime use

---

## Principal Architectural Bets

There are two major bets in this design.

### 1. Static conditions are good enough

This is the biggest bet. It is the reason `useFieldConfig()` is gone.

Why it is acceptable:

- conditions are product-specified
- conditions are mostly stable
- schema publication is already part of the system

What breaks this assumption:

- regulatory or business rules begin changing often outside schema release cadence
- module teams start needing runtime rule updates without schema republication

If that happens, the right answer is a narrow dynamic rule layer, not more procedural schema logic.

### 2. Direct schema delivery is safe

This is the reason the Worker and runtime schema selector are gone.

Why it is acceptable:

- no multi-tenant delivery requirement in the POC
- schemas are treated as non-sensitive metadata
- `schemaId` is enough to select the correct artifact

What breaks this assumption:

- schemas become sensitive
- delivery must vary by runtime identity context
- private variants must be hidden behind auth-aware delivery

If that happens, the right answer is to add protected delivery or a resolver layer back deliberately.

---

## Key Tradeoffs

Every simplification here has a tradeoff.

| Decision | Benefit | Cost |
|---|---|---|
| Direct `schemaId` delivery | much simpler runtime and operations | no built-in context-based delivery |
| Static schema-authored conditions | simpler runtime, easier debugging | condition changes require schema republication |
| Unified runtime graph | one testable/auditable read model | requires strict graph path discipline |
| Conditions-first policy | limits variant sprawl | some schemas may become more verbose |
| No workbench runtime | coherent POC scope | no support for heavy multi-panel process screens |

---

## What Is Explicitly Out Of Scope

These are not accidental omissions.

- multi-tenant runtime schema selection
- Worker-based schema resolution
- JWT-based schema delivery context matching
- Field Config API
- workbench/bootstrap APIs
- workflow-capability contracts
- business-user-authored dynamic condition rules
- unconstrained expression languages beyond the agreed JSONLogic subset

---

## What Must Still Be True

The simplifications do **not** remove these requirements:

- API responses are contract-validated
- resolved schemas are contract-validated
- schema publication is versioned and reversible
- config changes are audited
- mutation endpoints validate requests on the backend
- schema artifacts contain no PII
- schema size and accessibility guardrails are enforced

---

## Frequently Asked Questions

### Why not keep the Worker just in case we need it later?

Because the POC does not currently need context-based schema selection, and the Worker adds operational and conceptual complexity. The abstraction boundary is preserved through `useViewMetadata(schemaId)`, so a resolver can be reintroduced later if needed.

### Why not keep `useFieldConfig()` just in case rules change later?

Because the current condition set is static and known from the specs. Keeping a dynamic rule path now would add a second moving part without current value. If this assumption breaks later, reintroduce a narrow dynamic rule layer intentionally.

### Are variants banned?

No. Variants are allowed. They are just not the preferred mechanism. A variant must be justified as more maintainable than conditions.

### If there is no runtime resolver, how do variants work?

A variant is just another resolved schema artifact with another `schemaId`. Route logic or explicit configuration chooses which `schemaId` to fetch.

### If schemas are fetched directly, are they public?

For the POC, yes in practice, because the architecture assumes they are non-sensitive metadata. If that assumption changes, delivery will need protection.

### If schema hides a button, is that a permission check?

No. Backend validation is still the real enforcement point.

### What is the biggest thing that could force a redesign?

One of these:

1. rule changes start happening independently of schema publication often enough to hurt delivery speed
2. schema delivery must vary by runtime identity context or must become private
3. the product reintroduces workbench-style screens into v0 scope

---

## Decision Checklist

When a team proposes a change, ask these questions first.

1. Does this preserve direct `schemaId` delivery?
2. Does this keep conditions static and schema-authored?
3. Could this be handled with a condition instead of a variant?
4. Does it preserve the unified runtime graph?
5. Does it keep backend validation as the enforcement point?
6. Is this reintroducing out-of-scope workbench or dynamic-rule complexity?

If the answer to the last question is yes, the proposal is probably not a v0 change.

---

## Where To Go Next

- Full system narrative: [`00-SYSTEM-DESIGN.md`](./00-SYSTEM-DESIGN.md)
- Schema delivery details: [`01-SCHEMA-DELIVERY.md`](./01-SCHEMA-DELIVERY.md)
- Runtime model and conditions: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- Operations and release model: [`05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md`](./05-CONTRACTS-OBSERVABILITY-AND-OPERATIONS.md)
- Schema authoring and review: [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md)
