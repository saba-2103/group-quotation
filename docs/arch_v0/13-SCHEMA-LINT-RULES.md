# Schema Lint Rules

**Purpose:** Machine-checkable validation rules for page schemas.

This document turns the authoring guidance in [`12-PAGE-AUTHORING-MANUAL.md`](./12-PAGE-AUTHORING-MANUAL.md) into explicit rules that a validator, linter, or CI check can enforce.

These rules are intended for:

- schema validation tooling
- CI gates
- editor diagnostics
- AI-agent schema generation checks

---

## Rule Categories

The lint rules are grouped into six categories:

1. identity rules
2. namespace rules
3. binding rules
4. condition rules
5. variant rules
6. publication rules

Not every rule must block local drafting. But anything marked **error** should block publication.

---

## 1. Identity Rules

### `schema-id-required`

**Severity:** error  
Every schema must declare a non-empty `schemaId`.

### `schema-id-format`

**Severity:** error  
`schemaId` must be lowercase kebab-case.

Good:

```text
quote-details
admin-user-list
```

Bad:

```text
QuoteDetails
page_1
```

### `schema-version-required`

**Severity:** error  
Every schema must declare a version string.

---

## 2. Namespace Rules

### `graph-namespaces-required`

**Severity:** error  
Every page schema must declare `graphNamespaces`, even if small.

### `namespace-name-unique`

**Severity:** error  
Namespace keys must be unique within a schema.

### `namespace-name-format`

**Severity:** error  
Namespace names must be camelCase alphanumeric identifiers.

Good:

```text
quote
quoteDraft
pageState
countryOptions
```

Bad:

```text
quote-draft
page_state
form-widget-12
```

### `namespace-name-semantic`

**Severity:** warning  
Namespace names should be semantic, not technical.

Warn on names such as:

- `data1`
- `temp`
- `misc`
- `widgetA`

### `namespace-kind-valid`

**Severity:** error  
Allowed `kind` values are only:

- `api`
- `local`
- `inline`

### `namespace-usage-valid`

**Severity:** error  
Allowed `usage` values are only:

- `domain`
- `form`
- `state`
- `options`

### `namespace-path-derived`

**Severity:** error  
Runtime namespace path is always derived as `graph.<namespaceName>`.

Schemas must not try to redefine this with ad hoc target paths like:

```json
{
  "quote": {
    "target": "graph.someOtherName"
  }
}
```

### `namespace-kind-shape`

**Severity:** error  
Allowed properties depend on `kind`, and the schema contract should be treated as a discriminated union.

This means invalid mixed shapes such as:

```json
{
  "quote": {
    "kind": "api",
    "value": {}
  }
}
```

must fail validation.

#### For `kind: "api"`

Allowed:

- `usage`
- `mode`
- `endpoint`
- `method`
- `dependsOn`

Required:

- `endpoint`

Disallowed:

- `initialValue`
- `initialValueFrom`
- `value`

#### For `kind: "local"`

Allowed:

- `usage`
- `initialValue`
- `initialValueFrom`

At least one of:

- `initialValue`
- `initialValueFrom`

Disallowed:

- `endpoint`
- `method`
- `dependsOn`
- `value`

#### For `kind: "inline"`

Allowed:

- `usage`
- `value`

Required:

- `value`

Disallowed:

- `endpoint`
- `method`
- `dependsOn`
- `initialValue`
- `initialValueFrom`

---

## 3. Binding Rules

### `bind-path-valid-root`

**Severity:** error  
Absolute bind paths may reference only:

- `system.*`
- `graph.*`

### `bind-path-declared-namespace`

**Severity:** error  
Any absolute bind path under `graph.*` must reference a declared namespace.

Good:

```json
{ "bind": "graph.quote.summary" }
```

Bad if `quote` was not declared:

```json
{ "bind": "graph.quote.summary" }
```

### `relative-bind-parent-required`

**Severity:** error  
Relative binds are allowed only when a parent binding scope exists.

### `options-source-path-valid`

**Severity:** error  
`optionsSource.kind: "dataSource"` paths must reference declared `graph.*` namespaces.

### `single-writer-graph-path`

**Severity:** error  
No two independent namespace definitions may resolve to the same runtime path.

### `overlapping-namespace-collision`

**Severity:** error  
Do not allow conflicting parent/child ownership such as:

- `graph.quote`
- `graph.quote.summary`

from separate namespace/source definitions.

---

## 4. Condition Rules

### `condition-jsonlogic-only`

**Severity:** error  
Conditions must be valid JSONLogic objects.

### `condition-allowed-operators`

**Severity:** error  
Allowed operators are only:

- `==`, `!=`
- `<`, `<=`, `>`, `>=`
- `and`, `or`, `!`
- `in`
- `missing`, `missing_some`
- `var`

### `condition-var-root-valid`

**Severity:** error  
`var` references may point only to:

- `system.*`
- declared `graph.*` namespaces

### `condition-var-declared-namespace`

**Severity:** error  
Any `var` path under `graph.*` must reference a declared namespace.

### `condition-key-supported-by-node`

**Severity:** error  
Condition keys must only appear on node types that support them.

Rules:

- `visibleWhen` may appear on any widget node
- `editableWhen` may appear only on editable input/field widgets
- `requiredWhen` may appear only on form-field widgets that contribute submitted values

Example invalid usage:

```json
{
  "type": "SummaryCard",
  "requiredWhen": {
    "==": [
      { "var": "graph.quote.state" },
      "DRAFT"
    ]
  }
}
```

Expected behavior:

- validation should fail before publication
- if it still reaches runtime, the renderer should log and ignore the unsupported key rather than crash the page

### `condition-complexity-budget`

**Severity:** warning  
Conditions should remain readable.

Warn if:

- nesting depth exceeds agreed threshold
- operator count exceeds agreed threshold

Suggested initial warning thresholds:

- depth > 4
- total operators > 10

### `duplicate-condition-pattern`

**Severity:** warning  
If the same JSONLogic condition is repeated across many nodes, flag it for review. It may indicate the page wants a variant or a structural refactor.

---

## 5. Variant Rules

### `variant-schemaid-required`

**Severity:** error  
Every variant must have its own unique `schemaId`.

### `variant-selection-explicit`

**Severity:** error  
Variants must be selected explicitly by route or configuration. They must not rely on hidden runtime selection logic.

### `variant-justification-required`

**Severity:** warning -> error at review gate  
If a variant is introduced, authoring metadata should include a justification field or linked rationale.

Minimum justification should answer:

- why conditions are insufficient
- whether the difference is structural
- how the variant stays in sync with the base schema

### `variant-sprawl-threshold`

**Severity:** warning  
Warn if the number of variants for one page family exceeds the agreed threshold.

Suggested initial threshold:

- > 3 variants for one page family

---

## 6. Publication Rules

### `schema-size-budget`

**Severity:** warning -> error at publish threshold  

Suggested thresholds:

- warn at > 250 KB compressed equivalent
- error at > 1 MB uncompressed

### `widget-count-budget`

**Severity:** warning  
Warn if widget count exceeds 250 nodes.

### `interactive-label-required`

**Severity:** error  
Interactive widgets must have accessible labels.

### `icon-only-action-label-required`

**Severity:** error  
Icon-only actions must provide an accessible label.

### `display-binding-required-for-config-driven-fields`

**Severity:** warning  
If a field/widget expects display semantics from the Config System, ensure a corresponding binding exists.

---

## Recommended Validation Modes

### Editor / local mode

- show errors and warnings
- do not block drafting

### CI mode

- fail on all errors
- report warnings

### Publish mode

- fail on all errors
- fail on configured publication-threshold warnings such as size/accessibility violations

---

## Example Violations

### Invalid namespace name

```json
{
  "graphNamespaces": {
    "form-widget-12": {
      "kind": "local",
      "usage": "form",
      "initialValue": {}
    }
  }
}
```

Violations:

- `namespace-name-format`
- `namespace-name-semantic`

### Invalid condition path

```json
{
  "visibleWhen": {
    "==": [
      { "var": "data.quote.state" },
      "PENDING_APPROVAL"
    ]
  }
}
```

Violation:

- `condition-var-root-valid`

### Conflicting graph ownership

```json
{
  "graphNamespaces": {
    "quote": {
      "kind": "api",
      "endpoint": "/v1/quotes/:quoteId"
    },
    "quoteSummary": {
      "kind": "api",
      "endpoint": "/v1/quotes/:quoteId/summary",
      "target": "graph.quote.summary"
    }
  }
}
```

Violation:

- `namespace-path-derived`
- `overlapping-namespace-collision`

---

## Suggested Next Step

If this architecture is implemented, these lint rules should become:

1. a JSON schema or Zod validator for structure
2. a semantic validator for namespace/path/collision rules
3. a CI gate for publication-blocking failures

---

## Related Docs

- page authoring manual: [`12-PAGE-AUTHORING-MANUAL.md`](./12-PAGE-AUTHORING-MANUAL.md)
- runtime model: [`04-RUNTIME-AND-CONDITIONS.md`](./04-RUNTIME-AND-CONDITIONS.md)
- authoring/review process: [`08-SCHEMA-AUTHORING-AND-REVIEW.md`](./08-SCHEMA-AUTHORING-AND-REVIEW.md)
