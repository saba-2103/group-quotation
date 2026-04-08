# 05b — JSONLogic Patterns

**Parent:** [Layer 5 — Field Config API](./05-FIELD-CONFIG-API.md)  
**Type:** Leaf document — implementation reference

---

## JSONLogic Primer

JSONLogic is a JSON-based rule language where every rule is a JSON object of the form `{ "operator": [arg1, arg2, ...] }`. Rules are evaluated against a data object using the `json-logic-js` library.

```json
{ "==":  [{ "var": "formValues.status" }, "DRAFT"] }
{ "and": [{ ">": [{ "var": "formValues.age" }, 18] }, { "<": [{ "var": "formValues.age" }, 65] }] }
{ "if":  [{ "var": "$context.lob" }, "motor", ["comprehensive", "third-party"], []] }
```

The full operator reference is at [jsonlogic.com](https://jsonlogic.com/).

In Keystone UI, rules are always evaluated against a data object shaped as:

```typescript
{
  formValues: Record<string, unknown>,  // current React form state
  $context: {
    role: string,       // from JWT
    tenantId: string,   // from JWT
    lob: string,        // from JWT
    locale: string,     // from JWT
  }
}
```

`formValues` changes as the user types. `$context` is immutable for the life of the session — it is populated from the decoded JWT and cannot be changed by form input.

---

## The Data Object

```typescript
// This is the exact object passed as the second argument to jsonLogic.apply()
const data = {
  formValues: {
    hasDependents: true,
    dependentDOB: "",
    sumInsured: 50000,
    vehicleReg: "MH01AB1234",
    // ... all current form field values
  },
  $context: {
    role: "agent",         // from jwtClaims.role
    tenantId: "acme",      // from jwtClaims.tenantId
    lob: "health",         // from jwtClaims.lob
    locale: "en-IN",       // from jwtClaims.locale
  },
};

const isVisible = jsonLogic.apply(rule, data);
```

### Accessing values in rules

- `{ "var": "formValues.hasDependents" }` — reads the `hasDependents` field from the current form state
- `{ "var": "$context.lob" }` — reads the `lob` value from the JWT context
- `{ "var": "$context.role" }` — reads the user's role

The `$` prefix on `$context` is a naming convention (not special syntax) that clearly signals "this comes from the JWT, not the form" when reading a rule.

---

## Pattern 1: Field Visibility Based on Another Field's Value

**Use case:** Show `dependentDOB` only when `hasDependents` is `true`.

```json
{
  "visibility": {
    "==": [{ "var": "formValues.hasDependents" }, true]
  }
}
```

When `hasDependents` is `false` or `undefined`, the rule evaluates to `false` and the field is hidden. When it becomes `true`, the rule evaluates to `true` and the field renders.

**More complex example:** Show `additionalDriver` only when `vehicleType` is `"car"` AND the user is not an `"admin"`:

```json
{
  "visibility": {
    "and": [
      { "==": [{ "var": "formValues.vehicleType" }, "car"] },
      { "!=": [{ "var": "$context.role" }, "admin"] }
    ]
  }
}
```

**In the browser:**

```typescript
const isVisible = evaluateVisibility("dependentDOB", formValues);
// Returns true/false. The form component conditionally renders the field.
if (!isVisible) return null;
```

---

## Pattern 2: Field Required Based on Context

**Use case:** `medicalHistory` is required only for health line of business.

```json
{
  "required": {
    "==": [{ "var": "$context.lob" }, "health"]
  }
}
```

Because `$context.lob` comes from the JWT, this rule is always computed from the user's actual session context — the user cannot make themselves appear to be on a different LOB by manipulating form inputs.

**More complex example:** `nomineeName` is required if `sumInsured` exceeds 500,000 OR the LOB is `"life"`:

```json
{
  "required": {
    "or": [
      { ">": [{ "var": "formValues.sumInsured" }, 500000] },
      { "==": [{ "var": "$context.lob" }, "life"] }
    ]
  }
}
```

**In the browser:**

```typescript
const isRequired = evaluateRequired("medicalHistory", formValues);
// Pass to the form field's `required` prop / HTML attribute.
```

---

## Pattern 3: Dynamic Options Based on Context

**Use case:** The available `productType` options differ by tenant.

```json
{
  "options": {
    "if": [
      { "==": [{ "var": "$context.tenantId" }, "acme"] },
      ["comprehensive", "third-party", "fire-theft"],
      { "==": [{ "var": "$context.tenantId" }, "hdfc-ergo"] },
      ["comprehensive", "zero-dep", "third-party"],
      ["comprehensive", "third-party"]
    ]
  }
}
```

JSONLogic's `"if"` operator takes pairs of `[condition, value]` arguments and a final default. The rule returns the matching array of option strings for the user's tenant.

**In the browser:**

```typescript
const dynamicOptions = evaluateOptions("productType", formValues);
// null means "use static options from the Config System"
// string[] means "replace static options with these values"
const finalOptions = dynamicOptions ?? staticOptionsFromConfigSystem;
```

**Note:** Options returned by JSONLogic are **option values** (machine-readable identifiers like `"comprehensive"`), not display labels. Display labels for those values come from the Config System's resolved schema.

---

## Pattern 4: Validation Rule

**Use case:** `sumInsured` must be at least 100,000 for motor policies.

```json
{
  "validation": [
    {
      "or": [
        { "!=": [{ "var": "$context.lob" }, "motor"] },
        { ">=": [{ "var": "formValues.sumInsured" }, 100000] }
      ]
    }
  ],
  "validationMessages": [
    "Sum insured must be at least ₹1,00,000 for motor policies"
  ]
}
```

The rule reads: "pass if NOT motor, OR if sumInsured >= 100,000". This is the standard way to write an "if X then Y must hold" constraint in JSONLogic: negate the condition and OR it with the requirement.

**Multiple validation rules** — each rule is independent; all must pass for the field to be valid:

```json
{
  "validation": [
    { ">=": [{ "var": "formValues.sumInsured" }, 100000] },
    { "<=": [{ "var": "formValues.sumInsured" }, 50000000] }
  ],
  "validationMessages": [
    "Sum insured must be at least ₹1,00,000",
    "Sum insured cannot exceed ₹5,00,00,000"
  ]
}
```

**In the browser:**

```typescript
const { valid, messages } = evaluateValidation("sumInsured", formValues);
if (!valid) {
  // messages is string[] — render below the field
}
```

---

## Pattern 5: Editability Based on Workflow Stage

**Use case:** `sumInsured` becomes read-only once the quotation is submitted.

The key constraint: JSONLogic rules can reference `$context` values, but they **cannot directly query the workflow contract**. The workflow contract is a separate API concern. If editability depends on the quotation's workflow state, the backend must encode that state as a value in the user's session context and include it in `$context`.

**Approach:** The backend adds a `workflowStage` claim to the JWT (or includes it in the `context` enrichment that the Field Config API uses). The rule references `$context.workflowStage`:

```json
{
  "editability": {
    "==": [{ "var": "$context.workflowStage" }, "DRAFT"]
  }
}
```

This rule returns `true` (editable) only when the user's context indicates the quotation is in `DRAFT` stage. When it moves to `SUBMITTED`, the field becomes read-only.

**What NOT to do:** Do not pass the quotation status as a form value and reference it as `formValues.quotationStatus`. Form values are user-controlled. A user could fabricate a `quotationStatus` field in the form state. Use `$context` for values that must not be spoofed.

---

## Anti-Pattern: Using JSONLogic to Gate Business-Critical Actions

**Do not do this:**

```json
{
  "visibility": {
    "==": [{ "var": "$context.role" }, "underwriter"]
  }
}
```

... applied to an "Approve" button.

**Why this is wrong:**

1. JSONLogic field rules govern form fields (inputs, labels, selects). An "Approve" button is a workflow action, not a form field.
2. The approve capability (`canApprove`) is part of the workflow contract — it is computed by the backend based on the quotation's full state (stage, underwriting flags, SLA state, etc.). JSONLogic rules do not have access to that information.
3. Hiding a button via a visibility rule is a UI-layer gate, not a server-side authorization check. Even if the button is hidden, the underlying API endpoint must enforce authorization. Putting the gate only in a JSONLogic rule creates a false sense of security.

**What to do instead:**

```typescript
// In the quotation detail component:
const { data: workflowActions } = useWorkflowActions(quotationId);

// workflowActions.canApprove comes from the workflow contract API response
return workflowActions.canApprove ? <ApproveButton /> : null;
```

The `canApprove` flag is returned by the backend's workflow state machine. It reflects the full business logic for who can approve what, when. The UI renders the button only when `canApprove` is `true`. The backend endpoint also enforces the same check — so even if someone finds a way to render the button, the API rejects the request.

---

## Performance Note

JSONLogic rules are evaluated on every form value change — potentially hundreds of times per form session. Keep rules O(1):

- Avoid deeply nested `"if"` chains with many branches. Prefer flat `"or"` / `"and"` logic.
- Do not include large data arrays in the rule itself. If options for a dropdown have hundreds of entries, return them from a dedicated options API endpoint rather than embedding them in a JSONLogic `"if"` tree.
- The `"merge"` operator (which concatenates arrays) is safe. The `"reduce"` operator on large arrays is not — avoid it.
- Rules are pure functions of their inputs. No network calls, no async operations. If you find yourself thinking "I need to fetch data inside a rule", the rule is doing too much — use a separate API call.

Benchmark target: all field rules for a single form should evaluate in under 1 ms total. If `performance.now()` measurements in dev tools show otherwise, the rules need to be simplified.

---

## Testing JSONLogic Rules

### Manual testing in the playground

The `jsonlogic.com` playground at [https://jsonlogic.com/play.html](https://jsonlogic.com/play.html) allows you to paste a rule and a data object and see the result immediately. Use this to prototype and verify rules before sending them to the frontend.

### Unit tests in the repository

Write unit tests for complex rules in `src/field-config/rules.test.ts`. This file can be run without a browser (pure Node.js via Vitest):

```typescript
// src/field-config/rules.test.ts
import { describe, it, expect } from "vitest";
import jsonLogic from "json-logic-js";

const dependentDOBVisibilityRule = {
  "==": [{ "var": "formValues.hasDependents" }, true],
};

const sumInsuredValidationRule = {
  ">=": [{ "var": "formValues.sumInsured" }, 100000],
};

const productTypeOptionsRule = {
  "if": [
    { "==": [{ "var": "$context.tenantId" }, "acme"] },
    ["comprehensive", "third-party", "fire-theft"],
    ["comprehensive", "third-party"],
  ],
};

describe("dependentDOB visibility rule", () => {
  it("is visible when hasDependents is true", () => {
    const data = { formValues: { hasDependents: true }, $context: {} };
    expect(jsonLogic.apply(dependentDOBVisibilityRule, data)).toBe(true);
  });

  it("is hidden when hasDependents is false", () => {
    const data = { formValues: { hasDependents: false }, $context: {} };
    expect(jsonLogic.apply(dependentDOBVisibilityRule, data)).toBe(false);
  });

  it("is hidden when hasDependents is undefined (field not yet set)", () => {
    const data = { formValues: {}, $context: {} };
    expect(jsonLogic.apply(dependentDOBVisibilityRule, data)).toBe(false);
  });
});

describe("sumInsured validation rule", () => {
  it("passes when sumInsured is exactly 100000", () => {
    const data = { formValues: { sumInsured: 100000 }, $context: {} };
    expect(jsonLogic.apply(sumInsuredValidationRule, data)).toBe(true);
  });

  it("fails when sumInsured is below 100000", () => {
    const data = { formValues: { sumInsured: 99999 }, $context: {} };
    expect(jsonLogic.apply(sumInsuredValidationRule, data)).toBe(false);
  });
});

describe("productType options rule", () => {
  it("returns acme-specific options for acme tenant", () => {
    const data = { formValues: {}, $context: { tenantId: "acme" } };
    const result = jsonLogic.apply(productTypeOptionsRule, data);
    expect(result).toEqual(["comprehensive", "third-party", "fire-theft"]);
  });

  it("returns default options for unknown tenant", () => {
    const data = { formValues: {}, $context: { tenantId: "unknown-tenant" } };
    const result = jsonLogic.apply(productTypeOptionsRule, data);
    expect(result).toEqual(["comprehensive", "third-party"]);
  });
});
```

Run with:

```bash
npx vitest src/field-config/rules.test.ts
```

### Integration test approach

For integration tests that verify the full `useFieldConfig` hook, use React Testing Library with a mocked `POST /v1/field-config/batch` response. The MSW (Mock Service Worker) handler for this endpoint lives in `src/mocks/handlers/fieldConfig.ts`.

---

## Quick Reference: JSONLogic Operators Used in Keystone UI

| Operator | Usage | Example |
|---|---|---|
| `"=="` | Equality | `{ "==": [{ "var": "formValues.x" }, "value"] }` |
| `"!="` | Inequality | `{ "!=": [{ "var": "$context.role" }, "admin"] }` |
| `">"`, `">="`, `"<"`, `"<="` | Numeric comparison | `{ ">=": [{ "var": "formValues.sumInsured" }, 100000] }` |
| `"and"` | All conditions true | `{ "and": [rule1, rule2] }` |
| `"or"` | Any condition true | `{ "or": [rule1, rule2] }` |
| `"!"` | Negation | `{ "!": [{ "var": "formValues.hasDependents" }] }` |
| `"if"` | Conditional (ternary / multi-branch) | `{ "if": [condition, trueVal, falseVal] }` |
| `"var"` | Variable access | `{ "var": "formValues.fieldName" }` |
| `"in"` | Value in array | `{ "in": [{ "var": "$context.lob" }, ["motor", "health"]] }` |
| `"merge"` | Concatenate arrays | `{ "merge": [array1, array2] }` |
