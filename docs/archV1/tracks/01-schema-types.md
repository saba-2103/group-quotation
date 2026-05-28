# Track 1 — Schema Contracts, Types, & Version Validator

## Goal

Define every TypeScript type the runtime exchanges, the `zod` schemas used at boundaries, and a `validateSchemaVersion` function. Also publish the empty test-harness contracts that Tracks 2, 3, 5, 6 fill in.

This track is **pure types and one validator**. No runtime behavior. Downstream tracks build against these exports.

## You Own

- `src/lib/runtime/types/`
- `src/lib/runtime/__fixtures__/trivial.ts` (replace the Track 0 placeholder)

## Inputs

Track 0 scaffold exists.

## Deliverables

### 1. The type modules

Create one file per concept. All exports re-exported from `src/lib/runtime/types/index.ts`.

```
src/lib/runtime/types/
├── index.ts
├── schema.ts          // PageSchemaV1, RuntimeDeclaration, AccessPolicy, SchemaMetadata
├── namespace.ts       // NamespaceDef (api | local | inline), DerivedDef
├── widget.ts          // WidgetNode, WidgetDefinition, WidgetSchemaContract, PropContract, EventContract
├── binding.ts         // BindExpr ($bind | $value | $expr | $t), ConditionExpr, TransformExpr
├── action.ts          // ActionPipeline, ActionStep (union of 10 step variants), FailureMode, ErrorContext
├── workflow.ts        // WorkflowDefinition, WorkflowStateDefinition, WorkflowTransition, WorkflowStep
├── requestPolicy.ts   // RequestPolicyDefinition, ApiError
├── graph.ts           // RuntimeGraph (interface only — Track 2 implements), GraphSnapshot, GraphPath
├── version.ts         // validateSchemaVersion, SUPPORTED_MAJORS
└── testHarness.ts     // MockGraphProvider, createTestSnapshot, executeActionForTest (interface only)
```

### 2. Exact top-level shapes

```ts
// schema.ts
export interface PageSchemaV1 {
  schemaId: string;            // e.g. "mph.policies.detail"
  version: `1.${number}.${number}`;
  metadata?: SchemaMetadata;
  runtime: RuntimeDeclaration;
  access?: AccessPolicy;
  requestPolicies?: Record<string, RequestPolicyDefinition>;
  workflows?: Record<string, WorkflowDefinition>;
  actions?: Record<string, ActionPipeline>;
  widgetTree: WidgetNode;
}

export interface RuntimeDeclaration {
  scopes?: {
    app?: { persistProvider?: "localStorage"; clearOn?: ClearTrigger[] };
    page?: Record<string, never>;
    flow?: Record<string, never>;
  };
  namespaces: Record<string, NamespaceDef>;
  derived?: Record<string, DerivedDef>;
}

export type ClearTrigger = "logout" | "roleChange" | "orgChange" | "schemaVersionChange";

export interface AccessPolicy {
  // role → list of action ids permitted
  [role: string]: string[];
}
```

```ts
// binding.ts
export type BindExpr =
  | { $bind: string }                       // graph path, e.g. "page.policy.policy_no" or "insured.name" (relative)
  | { $value: string | number | boolean | null }
  | { $expr: JSONLogicExpr }                // JSONLogic, evaluated against snapshot
  | { $t: string; count?: number };         // translation key (locale from system.locale)

export type ConditionExpr = JSONLogicExpr;  // top-level boolean expression

export type TransformOperator =
  | "map" | "filter" | "pick" | "pluck" | "join" | "coalesce"
  | "formatDate" | "formatCurrency" | "switch" | "groupBy" | "count";

export interface TransformExpr {
  op: TransformOperator;
  input: BindExpr | TransformExpr;
  args?: Record<string, unknown>;
}

export type JSONLogicExpr = unknown; // delegated to json-logic; do not over-type
```

```ts
// action.ts
export type FailureMode = "block" | "warn-only" | "continue" | "rollback-and-stop";

export type ActionStep =
  | { type: "setState"; path: string; value: BindExpr | TransformExpr }
  | { type: "patchState"; path: string; value: BindExpr | TransformExpr }
  | { type: "apiMutation"; policy: string; endpoint: string; body?: BindExpr; failureMode: FailureMode }
  | { type: "apiRead"; policy: string; endpoint: string; writeTo: string }
  | { type: "invalidateNamespace"; namespace: string }
  | { type: "navigate"; to: string }
  | { type: "emitEvent"; event: string; payload?: BindExpr }
  | { type: "guard"; when: ConditionExpr; then: ActionStep[]; else?: ActionStep[] }
  | { type: "confirm"; message: string; confirmLabel?: string; cancelLabel?: string }
  | { type: "resetNamespace"; namespace: string };

export interface ActionPipeline {
  id: string;
  allowedRoles?: string[];          // if absent, derived from PageSchemaV1.access
  steps: ActionStep[];
  onSuccess?: ActionStep[];
  onFailure?: ActionStep[];
}

export interface ErrorContext {
  actionId: string;
  stepIndex: number;
  message: string;
  validation?: { path: string; message: string }[];
  correlationId?: string;
  retryable: boolean;
}
```

```ts
// workflow.ts
export interface WorkflowDefinition {
  id: string;
  initialState: string;
  states: Record<string, WorkflowStateDefinition>;
  transitions: WorkflowTransition[];
  steps?: WorkflowStep[];           // optional multi-step form definition
}

export interface WorkflowStateDefinition {
  label: string;
  terminal?: boolean;
  entryActions?: string[];
  exitActions?: string[];
}

export interface WorkflowTransition {
  id: string;
  from: string | string[];
  to: string;
  trigger: string;
  when?: ConditionExpr;
  effects?: string[];                                // action ids
  reconciliation?: "optimistic";
}

export interface WorkflowStep {
  id: string;
  label: string;
  namespace: string;
  readyWhen?: ConditionExpr;
  visibleWhen?: ConditionExpr;
  reviewProjection?: string;
}
```

```ts
// requestPolicy.ts
export interface RequestPolicyDefinition {
  auth: "session" | "anonymous";
  includeHeaders?: string[];        // e.g. ["X-User-Role", "Idempotency-Key", "X-Correlation-Id"]
  retry?: { attempts: number; backoffMs: number };
  idempotent?: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  validation?: { path: string; message: string }[];
  correlationId?: string;
}
```

```ts
// graph.ts — interface only; Track 2 implements
export type GraphPath = string;            // e.g. "page.policy.policy_no"
export type GraphScope = "system" | "app" | "page" | "flow";

export interface GraphSnapshot {
  read<T = unknown>(path: GraphPath): T | undefined;
}

export interface RuntimeGraph {
  read<T = unknown>(path: GraphPath): T | undefined;
  snapshot(): GraphSnapshot;
  registerNamespace(namespace: string, ownedPaths: GraphPath[]): void;
  writePath(namespace: string, path: GraphPath, value: unknown): void;
  patchPath(namespace: string, path: GraphPath, value: object): void;
  subscribe(path: GraphPath, listener: (value: unknown) => void): () => void;
  clear(trigger: ClearTrigger): void;
}
```

```ts
// version.ts
export const SUPPORTED_MAJORS = [1] as const;
export type SupportedMajor = typeof SUPPORTED_MAJORS[number];

export function validateSchemaVersion(version: string):
  | { ok: true; major: SupportedMajor }
  | { ok: false; reason: string }
{
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return { ok: false, reason: `Invalid version format: ${version}` };
  const major = Number(match[1]);
  if (!SUPPORTED_MAJORS.includes(major as SupportedMajor)) {
    return { ok: false, reason: `Unsupported major version ${major}; runtime supports ${SUPPORTED_MAJORS.join(", ")}` };
  }
  return { ok: true, major: major as SupportedMajor };
}
```

```ts
// testHarness.ts — interfaces filled in by Tracks 2, 3, 6
export interface MockGraphProvider extends RuntimeGraph {
  seed(snapshot: Record<string, unknown>): void;
}
export interface CreateTestSnapshot {
  (seed: Record<string, unknown>): GraphSnapshot;
}
export interface ExecuteActionForTest {
  (pipelineId: string, payload?: unknown): Promise<{ ok: boolean; error?: ErrorContext }>;
}
```

### 3. The fixture

Replace `src/lib/runtime/__fixtures__/trivial.ts` with a valid `PageSchemaV1`. Minimal, no actions, no workflows. Used by Tracks 2, 5, 8, 10a.

```ts
import type { PageSchemaV1 } from "../types";

export const TRIVIAL_SCHEMA: PageSchemaV1 = {
  schemaId: "test.trivial",
  version: "1.0.0",
  runtime: {
    namespaces: {
      policy: {
        source: "inline",
        value: { policy_no: "POL-1", insured: { name: "Alice" } },
        writeTo: "page.policy",
      } as never, // Track 1 may not have NamespaceDef finalized; cast acceptable here
    },
  },
  widgetTree: { type: "Text", id: "title", props: { value: { $bind: "page.policy.policy_no" } } } as never,
};
```

(Track 5 will replace the cast once `NamespaceDef` is fully resolved; that is fine.)

### 4. The `zod` boundary schema

In `src/lib/runtime/types/schema.zod.ts`, export `pageSchemaV1Zod` that mirrors `PageSchemaV1` at the top level (`schemaId`, `version`, `runtime`, `widgetTree`). Used only at schema-load time. Use loose `z.unknown()` for nested fields you do not need to validate yet — `widgetTree`, deep namespace structure. The goal is "is this even a schema?" not full validation.

## Allowed Deps

- `zod` — add to `package.json` if not present. Run `yarn add zod` and commit lockfile changes.

## DoD

- `yarn typecheck` clean.
- `yarn test src/lib/runtime/types/` passes (one test file with cases for `validateSchemaVersion`: valid `1.2.3`, malformed string, unsupported major `2.0.0`).
- The fixture in `__fixtures__/trivial.ts` is importable and passes `pageSchemaV1Zod.parse(TRIVIAL_SCHEMA)`.

## Edge Cases

- `validateSchemaVersion` must reject `"1.0"` (missing patch), `"v1.0.0"` (leading char), and `"2.0.0"`.
- The `BindExpr` union must allow `$bind: "insured.name"` (relative path) — do not constrain the string format.
- `WidgetNode` should accept `children?: WidgetNode[] | Record<string, WidgetNode | WidgetNode[]>` — slots are named in some widgets.

## References

Line numbers are anchors at time of writing; if file edits shift them, grep for the heading text.

- [docs/archV1/01-SCHEMA-LANGUAGE.md:43](../01-SCHEMA-LANGUAGE.md#L43) — "Top-Level Schema Shape": the `PageSchemaV1` field list.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:188](../01-SCHEMA-LANGUAGE.md#L188) — "Binding Model" → L192 absolute, L198 relative, L206 inline, L212 `$expr`.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:226](../01-SCHEMA-LANGUAGE.md#L226) — "Condition Model": the 5 condition keys including `mountWhen`.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:264](../01-SCHEMA-LANGUAGE.md#L264) — "Derived Values And Transforms": L270 lists the 11 operators.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:446](../01-SCHEMA-LANGUAGE.md#L446) — "Internationalization": L450 `$t` shape, L466 locale-aware formatters.
- [docs/archV1/01-SCHEMA-LANGUAGE.md:501](../01-SCHEMA-LANGUAGE.md#L501) — "Access Policy": shape of the `access` block.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:22](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L22) — "Action Model": pipeline shape.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:47](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L47) — "Allowed Step Types": L49–L85 each step variant.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:181](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L181) — "Failure Handling": the 4 failure modes.
- [docs/archV1/03-ACTIONS-MUTATIONS-AND-EFFECTS.md:253](../03-ACTIONS-MUTATIONS-AND-EFFECTS.md#L253) — "Error context payload": the `ErrorContext` shape.
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:30](../04-WORKFLOWS-AND-STATE-MACHINES.md#L30) — "Workflow Definition Shape".
- [docs/archV1/04-WORKFLOWS-AND-STATE-MACHINES.md:94](../04-WORKFLOWS-AND-STATE-MACHINES.md#L94) — "Step Model": `WorkflowStep`.
- [docs/archV1/05-AUTH-API-AND-CONTRACT-BOUNDARY.md:66](../05-AUTH-API-AND-CONTRACT-BOUNDARY.md#L66) — "Recommended Browser Contract": L77 `RequestPolicyDefinition` shape.
- [docs/archV1/10-WIDGET-CONTRACT.md:9](../10-WIDGET-CONTRACT.md#L9) — "Widget Definition": `WidgetDefinition`.
- [docs/archV1/10-WIDGET-CONTRACT.md:25](../10-WIDGET-CONTRACT.md#L25) — "Schema Contract": `WidgetSchemaContract`, `PropContract`, `EventContract`.
- [docs/archV1/11-SCHEMA-VERSIONING.md:72](../11-SCHEMA-VERSIONING.md#L72) — "Runtime Compatibility Matrix": v1 runtime accepts current major only.
