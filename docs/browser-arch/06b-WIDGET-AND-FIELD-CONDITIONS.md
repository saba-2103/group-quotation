# Layer 6b — Widget and Field Conditions

**Keystone UI Architecture | Browser-Based, No BFF**

Parent: [06 — Client Runtime](./06-CLIENT-RUNTIME.md)

This document defines the condition system: how widget visibility is controlled at the layout level (`WidgetCondition`), how row-level action buttons are controlled (`RowCondition`), and how field-level rules connect form rendering to runtime context (`useFieldConfig`). It includes TypeScript interfaces, evaluation logic, five concrete examples, and performance guidance.

---

## Table of Contents

1. [WidgetCondition Interface](#widgetcondition-interface)
2. [How WidgetRenderer Evaluates Conditions](#how-widgetrenderer-evaluates-conditions)
3. [RowCondition Interface](#rowcondition-interface)
4. [useFieldConfig — Bridge from Layer 5 to Layer 6](#usefieldconfig--bridge-from-layer-5-to-layer-6)
5. [Five Concrete Examples](#five-concrete-examples)
6. [Performance Rules](#performance-rules)

---

## WidgetCondition Interface

`WidgetCondition` is a discriminated union. Each variant specifies the data source it reads from. Conditions can be composed with `and` / `or` compound types.

```typescript
// src/runtime/conditionTypes.ts

// --- Leaf condition types ---

/**
 * Reads a value from the React Query cache.
 * Evaluated synchronously against the in-memory cache — no network call.
 * If the cache entry is absent, evaluates to false.
 */
export interface ServerStateCondition {
  type: 'serverState';
  queryKey: unknown[];         // must match the exact query key used by useSmartQuery
  path: string;                // lodash-style path, e.g. 'data.status' or 'data.items[0].id'
  operator: ComparisonOperator;
  value?: unknown;             // not required for 'exists' / 'notExists'
}

/**
 * Reads a field from AppContext (identity / JWT claims).
 * Cheapest condition type — no store access.
 */
export interface IdentityCondition {
  type: 'identity';
  field: 'role' | 'tenantId' | 'lob' | 'locale' | 'portalType';
  operator: 'eq' | 'neq' | 'in' | 'notIn';
  value: string | string[];
}

/**
 * Reads a value from the Zustand page store.
 * storeKey must match the name passed to createPageStore().
 */
export interface InteractionStateCondition {
  type: 'interactionState';
  storeKey: string;            // e.g. 'quotation-queue'
  path: string;                // lodash-style path into the store state
  operator: ComparisonOperator;
  value?: unknown;
}

// --- Compound condition types ---

export interface AndCondition {
  type: 'and';
  conditions: WidgetCondition[];  // minimum 2
}

export interface OrCondition {
  type: 'or';
  conditions: WidgetCondition[];  // minimum 2
}

// --- Discriminated union ---

export type WidgetCondition =
  | ServerStateCondition
  | IdentityCondition
  | InteractionStateCondition
  | AndCondition
  | OrCondition;

// --- Operators ---

export type ComparisonOperator =
  | 'eq'          // strict equality
  | 'neq'         // strict inequality
  | 'gt'          // greater than (numeric)
  | 'lt'          // less than (numeric)
  | 'gte'         // greater than or equal (numeric)
  | 'lte'         // less than or equal (numeric)
  | 'in'          // value is in array
  | 'notIn'       // value is not in array
  | 'exists'      // value is not null and not undefined
  | 'notExists';  // value is null or undefined
```

**Where conditions live in the schema:**

Conditions are authored as part of the view schema (Layer 1 metadata), not in component code. They are plain JSON, versioned with the schema, and have no runtime dependencies beyond the stores they reference.

```json
{
  "widgetId": "pricing-breakup-panel",
  "type": "PricingBreakupPanel",
  "condition": {
    "type": "and",
    "conditions": [
      { "type": "identity", "field": "role", "operator": "in", "value": ["underwriter", "underwriting_manager"] },
      { "type": "serverState", "queryKey": ["quotations", { "id": "{{entityId}}" }], "path": "data.status", "operator": "in", "value": ["DRAFT", "PRICING_IN_PROGRESS", "PENDING_APPROVAL"] }
    ]
  }
}
```

---

## How WidgetRenderer Evaluates Conditions

`WidgetRenderer` is a React component that renders a single widget slot from the view schema. It receives the widget descriptor (from `useViewMetadata`) and is responsible for:

1. Evaluating the widget's condition (if any)
2. Fetching widget data via `useSmartQuery` (if `dataSource` is present)
3. Resolving the component from `WidgetRegistry`
4. Rendering the component or returning `null`

```typescript
// src/runtime/WidgetRenderer.tsx

import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { evaluateCondition } from './conditionEvaluator';
import { WidgetRegistry } from './WidgetRegistry';
import { useSmartQuery } from '../hooks/useSmartQuery';
import { WidgetDescriptor } from '../types/schema';

interface WidgetRendererProps {
  widget: WidgetDescriptor;
  storeKey: string;
  interpolatedParams?: Record<string, string>;
}

export function WidgetRenderer({ widget, storeKey, interpolatedParams }: WidgetRendererProps) {
  const identity = useAppContext();

  // Retrieve the Zustand store for this page context.
  // getStore() resolves by storeKey — returns the store's current state snapshot.
  const store = getPageStoreSnapshot(storeKey);

  // --- Step 1: Evaluate condition ---
  // If the widget has no condition, it always renders.
  const conditionMet = widget.condition
    ? evaluateCondition(widget.condition, { identity, store, interpolatedParams })
    : true;

  // Short-circuit: do not fetch data or resolve component if condition is not met.
  if (!conditionMet) return null;

  // --- Step 2: Resolve component ---
  const Component = WidgetRegistry.resolve(widget.type);
  if (!Component) {
    console.error(`[WidgetRenderer] Unknown widget type: "${widget.type}". Skipping render.`);
    return null;
  }

  // --- Step 3: Render ---
  // Data fetching is handled inside the component via useSmartQuery,
  // or pre-hydrated from the workbench bootstrap payload.
  return (
    <Component
      key={widget.widgetId}
      widgetId={widget.widgetId}
      config={widget.config}
      storeKey={storeKey}
    />
  );
}
```

### Evaluation Order and Short-Circuit

For compound conditions:

- `and` — evaluates left to right; returns `false` as soon as any sub-condition is `false`. Remaining sub-conditions are not evaluated.
- `or` — evaluates left to right; returns `true` as soon as any sub-condition is `true`. Remaining sub-conditions are not evaluated.

**Ordering recommendation for `and` conditions:** Put `identity` conditions before `serverState` conditions. Identity checks are O(1) field lookups. If the role check fails immediately, the cache lookup is skipped entirely.

```json
{
  "type": "and",
  "conditions": [
    { "type": "identity", "field": "role", "operator": "eq", "value": "underwriter" },
    { "type": "serverState", ... }
  ]
}
```

### What Happens When a Widget Has No Condition

A missing `condition` field means: always render. The `WidgetRenderer` skips evaluation and proceeds directly to component resolution.

### Condition Evaluation is Not Async

Condition evaluation is always synchronous. The evaluator reads from the React Query memory cache, the Zustand store snapshot, and the AppContext object — all synchronous data structures. It never awaits a promise, never triggers a network call, and never causes a side effect.

---

## RowCondition Interface

`RowCondition` controls visibility of action buttons within a `DataTable` row. It uses the same type structure as `WidgetCondition` but is evaluated against the row's own data, not the global stores.

```typescript
// src/runtime/conditionTypes.ts (continued)

/**
 * Reads a field directly from the row's data object.
 * The path is relative to the row record — e.g. 'status', 'assignedTo', 'items[0].type'.
 */
export interface RowDataCondition {
  type: 'rowData';
  path: string;
  operator: ComparisonOperator;
  value?: unknown;
}

export interface RowAndCondition {
  type: 'and';
  conditions: RowCondition[];
}

export interface RowOrCondition {
  type: 'or';
  conditions: RowCondition[];
}

export type RowCondition =
  | RowDataCondition
  | RowAndCondition
  | RowOrCondition;
```

`RowCondition` does **not** support `serverState` or `interactionState` variants. Row actions are evaluated purely against the row record. This is intentional: evaluating store conditions per-row in a 100-row table would run the condition evaluator 100 times per render, and any store mutation would re-evaluate all rows.

### How DataTable Evaluates RowConditions

```typescript
// Inside DataTable component (simplified)

function renderRowActions(row: RowData, actionDefs: RowActionDefinition[]) {
  return actionDefs
    .filter((action) => {
      if (!action.condition) return true;
      return evaluateRowCondition(action.condition, row);
    })
    .map((action) => (
      <ActionButton key={action.key} onClick={() => action.handler(row)} label={action.label} />
    ));
}

function evaluateRowCondition(condition: RowCondition, row: RowData): boolean {
  switch (condition.type) {
    case 'rowData': {
      const value = get(row, condition.path);
      return applyOperator(value, condition.operator, condition.value);
    }
    case 'and':
      return condition.conditions.every((c) => evaluateRowCondition(c, row));
    case 'or':
      return condition.conditions.some((c) => evaluateRowCondition(c, row));
    default:
      return true;
  }
}
```

Row conditions in the schema look like this:

```json
{
  "widgetId": "quotation-table",
  "type": "DataTable",
  "config": {
    "rowActions": [
      {
        "key": "review",
        "label": "Review",
        "condition": {
          "type": "rowData",
          "path": "status",
          "operator": "eq",
          "value": "PENDING_APPROVAL"
        }
      },
      {
        "key": "withdraw",
        "label": "Withdraw",
        "condition": {
          "type": "and",
          "conditions": [
            { "type": "rowData", "path": "status", "operator": "in", "value": ["DRAFT", "SUBMITTED"] },
            { "type": "rowData", "path": "isOwner", "operator": "eq", "value": true }
          ]
        }
      }
    ]
  }
}
```

---

## useFieldConfig — Bridge from Layer 5 to Layer 6

`useFieldConfig` is the runtime bridge between the field logic layer (Layer 5 — JSONLogic rules authored in field schemas) and the rendering layer (Layer 6 — React form components).

Layer 5 defines **what** a field's behaviour rules are (e.g., "field X is required when field Y has a value"). Layer 6, via `useFieldConfig`, evaluates those rules at runtime against the current form state and identity context, returning a plain object that the form component uses directly.

### What useFieldConfig Returns

```typescript
// src/hooks/useFieldConfig.ts

export interface FieldConfig {
  visible: boolean;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  label?: string;       // optional override from schema (for dynamic labels)
  options?: Option[];   // optional dynamic options list
}

export interface Option {
  value: string;
  label: string;
}
```

### Hook Implementation

```typescript
// src/hooks/useFieldConfig.ts

import { useMemo } from 'react';
import jsonLogic from 'json-logic-js';
import { useAppContext } from './useAppContext';
import { FieldSchema } from '../types/schema';
import { FieldConfig } from './useFieldConfig.types';

/**
 * Evaluates field-level visibility, required, disabled, and readOnly rules
 * against current form state and AppContext.
 *
 * @param fieldSchema  - The field's schema definition from the view metadata
 * @param formState    - Current values of the entire form (not just this field)
 * @returns FieldConfig - The resolved field configuration for this render
 */
export function useFieldConfig(
  fieldSchema: FieldSchema,
  formState: Record<string, unknown>,
): FieldConfig {
  const { role, tenantId, lob, locale } = useAppContext();

  // $context is the identity object injected into every JSONLogic rule evaluation.
  // It is stable for the session; only formState changes drive re-evaluation.
  const $context = useMemo(
    () => ({ role, tenantId, lob, locale }),
    [role, tenantId, lob, locale],
  );

  return useMemo(() => {
    const data = { formState, $context };

    const visible  = fieldSchema.visibleWhen  ? !!jsonLogic.apply(fieldSchema.visibleWhen,  data) : true;
    const required = fieldSchema.requiredWhen ? !!jsonLogic.apply(fieldSchema.requiredWhen, data) : false;
    const disabled = fieldSchema.disabledWhen ? !!jsonLogic.apply(fieldSchema.disabledWhen, data) : false;
    const readOnly = fieldSchema.readOnlyWhen ? !!jsonLogic.apply(fieldSchema.readOnlyWhen, data) : false;

    return { visible, required, disabled, readOnly };
  }, [fieldSchema, formState, $context]);
}
```

### FieldSchema JSONLogic Shape

```typescript
// src/types/schema.ts (excerpt)

export interface FieldSchema {
  fieldId: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea' | 'file';
  label: string;
  placeholder?: string;

  // JSONLogic rules — each is a plain JSON object
  // Data context available: { formState, $context: { role, tenantId, lob, locale } }
  visibleWhen?:  JsonLogicRule;
  requiredWhen?: JsonLogicRule;
  disabledWhen?: JsonLogicRule;
  readOnlyWhen?: JsonLogicRule;
}

export type JsonLogicRule = Record<string, unknown>; // json-logic-js accepts any plain object
```

### Usage in a Form Component

```typescript
// src/widgets/FormContainer/FieldRenderer.tsx

import { useFieldConfig } from '../../hooks/useFieldConfig';
import { FieldSchema } from '../../types/schema';

interface FieldRendererProps {
  fieldSchema: FieldSchema;
  formState: Record<string, unknown>;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldRenderer({ fieldSchema, formState, value, onChange }: FieldRendererProps) {
  const config = useFieldConfig(fieldSchema, formState);

  if (!config.visible) return null;

  return (
    <div className="field-wrapper">
      <label htmlFor={fieldSchema.fieldId}>
        {fieldSchema.label}
        {config.required && <span aria-label="required"> *</span>}
      </label>
      <input
        id={fieldSchema.fieldId}
        type={fieldSchema.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={config.disabled}
        readOnly={config.readOnly}
        required={config.required}
      />
    </div>
  );
}
```

---

## Five Concrete Examples

### Example 1: Hide a widget when a filter is empty

**Scenario:** A "Filtered Results Summary" widget should only appear once the user has applied at least one filter.

**Condition in schema:**

```json
{
  "type": "interactionState",
  "storeKey": "quotation-queue",
  "path": "activeFilters",
  "operator": "exists"
}
```

This uses the `exists` operator on the `activeFilters` object from the Zustand store. However, `exists` checks for non-null/non-undefined — an empty object `{}` is truthy. For "at least one filter set", use a more specific path or a custom operator. Better approach:

```json
{
  "type": "interactionState",
  "storeKey": "quotation-queue",
  "path": "isDirty",
  "operator": "eq",
  "value": true
}
```

The `isDirty` flag in the filter slice is `true` when the user has changed filter values since the last apply. This is the correct signal.

---

### Example 2: Show a widget only for role = underwriter

**Scenario:** The "Underwriting Decision Panel" must be invisible to brokers and policyholders.

```json
{
  "type": "identity",
  "field": "role",
  "operator": "in",
  "value": ["underwriter", "underwriting_manager"]
}
```

Using `in` rather than `eq` allows both the reviewer and their manager to see the panel without two separate conditions.

---

### Example 3: Show a row action only when row.status = "PENDING_APPROVAL"

**Scenario:** A "Review" action button in a quotation table should appear only on rows that are awaiting approval.

```json
{
  "key": "review",
  "label": "Review",
  "condition": {
    "type": "rowData",
    "path": "status",
    "operator": "eq",
    "value": "PENDING_APPROVAL"
  }
}
```

This is a `RowCondition` evaluated per row. The `DataTable` component evaluates this condition for every row before rendering the action buttons. No store access is involved.

---

### Example 4: Disable a form field when lob = motor

**Scenario:** The "Fleet Discount" field is not applicable to the motor line. It should appear grayed-out (disabled) for motor submissions so users know it exists but cannot interact with it.

**Field schema (JSONLogic):**

```json
{
  "fieldId": "fleetDiscount",
  "label": "Fleet Discount (%)",
  "type": "number",
  "disabledWhen": {
    "==": [{ "var": "$context.lob" }, "motor"]
  }
}
```

The `$context.lob` reads from the AppContext injected by `useFieldConfig`. For motor users, `disabledWhen` evaluates to `true` and the field renders as disabled.

If the intent is to hide the field entirely (not just disable it), use `visibleWhen` with the opposite logic:

```json
{
  "visibleWhen": {
    "!=": [{ "var": "$context.lob" }, "motor"]
  }
}
```

Use `disabled` when you want users to see that the field exists but does not apply. Use `visible: false` when its existence would cause confusion.

---

### Example 5: Make a field required only when another field has a value

**Scenario:** A "Referral Reason" text field is optional normally, but becomes required when the user selects "Refer to Manager" in the "Decision" dropdown.

**Field schema (JSONLogic):**

```json
{
  "fieldId": "referralReason",
  "label": "Referral Reason",
  "type": "textarea",
  "visibleWhen": {
    "==": [{ "var": "formState.decision" }, "REFER_TO_MANAGER"]
  },
  "requiredWhen": {
    "==": [{ "var": "formState.decision" }, "REFER_TO_MANAGER"]
  }
}
```

Both `visibleWhen` and `requiredWhen` use `formState.decision`. When the decision is anything other than `REFER_TO_MANAGER`, the field is hidden. When the user selects `REFER_TO_MANAGER`, the field appears and becomes required simultaneously.

**Important:** The `required` flag returned by `useFieldConfig` drives the `required` HTML attribute and the form validation logic. Form submission should re-validate `required` fields at submit time, not just at field-blur time, because `required` can change based on other field interactions.

---

## Performance Rules

Conditions are evaluated on every render of `WidgetRenderer` and on every render of the `DataTable` component (once per row, per row action). Keep these rules in mind.

### Rule 1: No async operations inside condition evaluation

The condition evaluator is synchronous. Any condition that requires an async lookup (e.g., fetching data not already in cache) cannot be expressed as a condition — it must be pre-loaded into the React Query cache via a query that runs before the condition is evaluated. If the data is not in cache, the condition returns `false` (hidden) until the cache warms up.

### Rule 2: No side effects inside condition evaluation

The evaluator must be a pure function given its inputs. Do not call `store.setXxx()`, dispatch events, or write to any store inside an evaluator. Conditions are evaluated during React's render phase — side effects during render cause issues.

### Rule 3: Keep JSONLogic rules shallow

Deep `{ "var": "formState.a.b.c.d.e" }` lookups are fine. Complex nested logic trees with many branches are not — they execute on every keystroke in a form. If a rule exceeds ~10 operations, extract it into a derived value in the Zustand store or a React `useMemo`.

### Rule 4: Prefer identity conditions first in `and` chains

`identity` conditions are the cheapest (O(1) field access on a plain object). Put them first in `and` chains so they can short-circuit before any store lookups occur.

### Rule 5: RowConditions evaluate N times

A `DataTable` with 100 rows and 3 row actions evaluates row conditions 300 times per render. Keep row conditions to a single `rowData` check or a two-term `and`. Do not use server state conditions in row conditions (the `rowData` type is the only leaf type allowed in `RowCondition` for this reason).

---

*Last updated: 2026-04-08 | Architecture branch*
