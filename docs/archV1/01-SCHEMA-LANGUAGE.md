# Schema Language v1

## Purpose

This document defines the schema language Keystone UI should adopt if it wants business-facing UI logic to live in schema rather than leak into page wrappers.

This is not just a richer configuration object for widget props.

It is a stronger contract for:

- state declaration
- data loading
- derived values
- action semantics
- workflows
- rendering

## What This Language Must Express

A schema language that can only describe widget structure and simple data bindings will produce page wrapper code as soon as the product needs:

- global shell state shared across pages
- multi-step action orchestration
- view-model transforms and derived data
- workflow transitions and state machines
- structural runtime pruning based on runtime conditions
- request policies for mutations

This language is designed to express all of those declaratively so that none of them require code outside the schema.

## Design Goals

The language must be:

1. **Declarative**
2. **Bounded**
3. **Typed**
4. **Composable**
5. **Runtime-executable**
6. **Reviewable by humans**
7. **Strict enough for linting and publication gates**

## Top-Level Schema Shape

Recommended resolved artifact shape:

```ts
interface PageSchemaV1 {
  schemaId: string;
  version: string;
  metadata?: SchemaMetadata;
  runtime: RuntimeDeclaration;
  access?: AccessPolicy;
  requestPolicies?: Record<string, RequestPolicyDefinition>;
  workflows?: Record<string, WorkflowDefinition>;
  actions?: Record<string, ActionPipeline>;
  widgetTree: WidgetNode;
}
```

### Metadata

```ts
interface SchemaMetadata {
  title?: string;
  owner?: string;
  tags?: string[];
  routeFamily?: string;
  description?: string;
}
```

### Runtime

```ts
interface RuntimeDeclaration {
  scopes: RuntimeScopeDeclaration;
  namespaces: Record<string, NamespaceDefinition>;
  derived?: Record<string, DerivedDefinition>;
}
```

## Runtime Scopes

`archV1` uses three explicit runtime scopes.

### `system.*`
- readonly
- auth/session/route/deployment context
- populated by the runtime, never authored by schema

### `app.*`
- mutable cross-page state
- persisted or session-scoped shell state
- examples:
  - `app.activePolicy`
  - `app.activeOrganisation`
  - `app.userPreferences`

### `page.*`
- page-local state and data
- examples:
  - `page.policy`
  - `page.filters`
  - `page.claimDraft`
  - `page.workflow.addMember`

Keeping these three scopes separate prevents shell-level state from leaking into page-local data and vice versa.

## Namespace Definitions

Each namespace declares how a branch is hydrated and who owns it.

```ts
type NamespaceKind = "api" | "local" | "inline";
type NamespaceScope = "app" | "page";
type NamespaceUsage = "domain" | "draft" | "state" | "options" | "workflow";

interface BaseNamespace {
  scope: NamespaceScope;
  usage: NamespaceUsage;
}

interface ApiNamespace extends BaseNamespace {
  kind: "api";
  endpoint: string;
  method?: "GET";
  requestPolicy?: RequestPolicyRef;
  dependsOn?: string[];
  mode?: "eager" | "deferred";
  refresh?: RefreshPolicy;
}

interface LocalNamespace extends BaseNamespace {
  kind: "local";
  initialValue?: unknown;
  initialValueFrom?: string;
  persist?: PersistPolicy;
}

interface InlineNamespace extends BaseNamespace {
  kind: "inline";
  value: unknown;
}

interface DerivedNamespace extends BaseNamespace {
  kind: "derived";
  from: string | string[];
  transform: TransformExpr;
}
```

### Example

```json
{
  "runtime": {
    "scopes": {
      "app": { "persistProvider": "localStorage" },
      "page": {}
    },
    "namespaces": {
      "activePolicy": {
        "scope": "app",
        "kind": "local",
        "usage": "state",
        "persist": { "provider": "localStorage", "key": "active_policy" }
      },
      "policies": {
        "scope": "page",
        "kind": "api",
        "usage": "domain",
        "endpoint": "/api/mph/policies",
        "mode": "eager",
        "requestPolicy": "authenticatedRead"
      },
      "filters": {
        "scope": "page",
        "kind": "local",
        "usage": "state",
        "initialValue": {}
      }
    }
  }
}
```

## Binding Model

Bindings should be explicit and uniform.

### Absolute binding

```json
{ "$bind": "page.policy.policy_no" }
```

### Relative binding

```json
{ "$bind": "insured.name" }
```

This resolves relative to a declared parent binding scope.

### Inline value

```json
{ "$value": "Claims" }
```

### Expression value

```json
{
  "$expr": {
    "if": [
      { "==": [{ "var": "system.role" }, "Viewer"] },
      "Read only",
      "Operational"
    ]
  }
}
```

## Condition Model

The default condition language remains JSONLogic, but with explicit attachment semantics.

Allowed keys:
- `visibleWhen`
- `enabledWhen`
- `editableWhen`
- `requiredWhen`
- `mountWhen`

`mountWhen` is new and important.

### Why `mountWhen` matters

Without `mountWhen`, pruning elements like tab panels from a rendered list requires page wrapper code — the widget only knows how to render children, not omit them structurally.

`visibleWhen` is not enough when the runtime must:

- omit a tab from a tab list
- omit a section from layout flow entirely
- avoid subscribing a child to data it should not even mount

### Example

```json
{
  "id": "fund-values-tab",
  "type": "TabPanel",
  "mountWhen": {
    "==": [
      { "var": "page.policy.product_extension_tabs.fundValues" },
      true
    ]
  }
}
```

## Derived Values And Transforms

Schemas need to define view-model shaping without React wrappers.

The transform vocabulary is bounded and declarative.

### Supported transform operators
- `map`
- `filter`
- `pick`
- `pluck`
- `join`
- `coalesce`
- `formatDate`
- `formatCurrency`
- `switch`
- `groupBy`
- `count`

### Example: benefit plans to table rows

```json
{
  "runtime": {
    "derived": {
      "page.benefitPlanRows": {
        "from": "page.policy.benefit_plans",
        "transform": {
          "map": {
            "as": "plan",
            "to": {
              "plan_name": { "$bind": "plan.plan_name" },
              "premium_mode": { "$bind": "plan.premium_mode" },
              "riders_display": {
                "join": {
                  "source": { "$bind": "plan.riders" },
                  "separator": ", "
                }
              }
            }
          }
        }
      }
    }
  }
}
```

This is exactly the kind of logic that should not require a page wrapper.

## Transform DSL Governance

The transform DSL is intentionally bounded. That boundedness is a feature.

### Why the DSL stays small

Every operator added to the transform DSL is a new primitive the runtime must implement, test, and support across all schema versions. A DSL with unchecked growth becomes effectively Turing-complete, at which point schema review becomes impossible and the safety of the declarative contract is lost.

The current operator list is the stable core. Adding a new operator requires explicit platform team review.

### When to propose a new operator

A new operator is worth proposing when:

- the same use case appears in three or more independent schemas
- the use case cannot be achieved by composing existing operators
- the operator has a single, clear, and bounded behavior with no hidden conditionals

A new operator is not appropriate when:

- the use case appears only once in one schema
- the use case is better handled by a backend projection that shapes the data before it reaches the frontend
- implementing the operator would require conditional logic or side effects

### The `$expr` escape hatch

`$expr` exists for one-off computed values that do not justify a new operator.

```json
{
  "$expr": {
    "if": [
      { "==": [{ "var": "system.role" }, "Viewer"] },
      "Read only",
      "Operational"
    ]
  }
}
```

Using `$expr` inside a derived transform is allowed, but it requires explicit acknowledgement in review. A PR that uses `$expr` inside a transform must include a note in the schema metadata or the PR description explaining why no existing operator was sufficient.

If `$expr` usage starts recurring for the same pattern across schemas, that is the signal to propose a proper operator.

### Escalation path

If existing operators are insufficient:

1. Check whether a backend projection can handle the shaping before it reaches the schema.
2. Try composing existing operators to see if the result is achievable without a new one.
3. If neither works, raise an operator proposal with the platform team and cite at least three schema use cases to justify the addition.

## Actions As First-Class Pipelines

The schema language must define action pipelines, not single-step handlers only.

Example shape:

```ts
interface ActionPipeline {
  steps: ActionStep[];
}

type ActionStep =
  | { type: "setState"; target: string; value: unknown }
  | { type: "apiMutation"; request: ApiRequest }
  | { type: "invalidateNamespace"; target: string | string[] }
  | { type: "navigate"; to: string }
  | { type: "emitEvent"; name: string; payload?: unknown }
  | { type: "guard"; when: ConditionExpr; else?: ActionStep[] };
```

### Example: policy switch

```json
{
  "actions": {
    "switchPolicy": {
      "steps": [
        {
          "type": "setState",
          "target": "app.activePolicy",
          "value": { "$bind": "event.selectedPolicy" }
        },
        {
          "type": "apiMutation",
          "request": {
            "endpoint": "/api/mph/policies/{{event.selectedPolicy.id}}/context",
            "method": "PATCH",
            "policy": "authenticatedMutation",
            "body": {
              "last_policy_id": { "$bind": "event.selectedPolicy.id" }
            }
          }
        },
        {
          "type": "navigate",
          "to": "/mph/policies/{{event.selectedPolicy.id}}"
        }
      ]
    }
  }
}
```

## Request Policies

Schema should not hardcode raw headers per action.

Instead it references named request policies:

```json
{
  "requestPolicies": {
    "authenticatedRead": {
      "auth": "session",
      "includeHeaders": ["X-User-Role", "X-User-Id"]
    },
    "authenticatedMutation": {
      "auth": "session",
      "includeHeaders": ["X-User-Role", "X-User-Id", "X-Correlation-Id", "Idempotency-Key"]
    }
  }
}
```

## Workflow Declarations

Complex flows should declare state machines in schema, not rely only on widget-local behavior.

That is specified in [`04-WORKFLOWS-AND-STATE-MACHINES.md`](./04-WORKFLOWS-AND-STATE-MACHINES.md).

## Internationalization

Display strings in schema must be authored as translation keys, not literal strings. The runtime resolves keys against the active locale at render time.

### Translation key bindings

The `$value` form is permitted only for non-translatable values like CSS classes or canonical identifiers:

```json
{ "$value": "Claims" }
```

For user-visible strings, use `$t`:

```json
{ "$t": "policy.detail.claims.tab" }
```

The runtime resolves `$t` against the active locale. The locale comes from `system.locale`, which the host app populates before runtime boot.

### Locale-aware formatters

The transform DSL operators `formatDate` and `formatCurrency` are locale-aware automatically. They read the active locale from the runtime context, not from inline configuration:

```json
{
  "transform": {
    "formatDate": {
      "source": { "$bind": "policy.startDate" },
      "format": "long"
    }
  }
}
```

The format key (`"long"`, `"short"`, `"compact"`) maps to a locale-specific format definition the host app supplies. Schemas do not include locale-specific format strings directly.

### Pluralization

Translation keys with pluralization use the runtime's pluralization helper:

```json
{ "$t": "members.count", "count": { "$bind": "page.memberCount" } }
```

The host's translation provider handles plural forms per locale.

### RTL considerations

The runtime does not enforce RTL layout — that is a host application styling concern. However, schemas must not encode directional assumptions in icon names or labels. Use direction-neutral keys (`"icon": "next"`, not `"icon": "arrow-right"`) and let the host's styling layer handle the visual direction.

### Lint requirement

Any string literal in a schema position that is normally user-visible — button labels, headings, validation messages, tab titles — must use `$t`, not `$value`. The lint rule produces a warning when `$value` is used in a user-visible position. The warning can be suppressed for canonical strings with an explicit annotation, but the default is to flag them.

## Access Policy

Schema should express UX-level access expectations clearly.

Example:

```json
{
  "access": {
    "roles": ["SuperAdmin", "Maker", "Approver", "Viewer"],
    "actions": {
      "addMember": ["SuperAdmin", "Maker"],
      "startRenewal": ["SuperAdmin", "Maker"]
    }
  }
}
```

This does not replace backend enforcement. It standardizes the frontend contract.

## Final Position

If the architecture wants business logic to live in schema, the language must be able to describe:

- state
- transforms
- structural conditions
- actions
- workflows
- request policies

Anything less will keep producing wrapper code.
