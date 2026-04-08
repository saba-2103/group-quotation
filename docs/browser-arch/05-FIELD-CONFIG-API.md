# Layer 5: Field Config API

**Layer:** 5 of 5 in the Keystone UI browser architecture  
**Scope:** How the browser fetches and evaluates backend-owned business rules that control field-level behaviour within forms.

---

## What the Field Config API Is For

The Field Config API (`POST /v1/field-config/batch`) delivers **business rules** that govern how individual form fields behave for a given user. These rules are owned and maintained by the backend team — they encode business logic that the UI team should not need to understand or hard-code.

Rules cover five types of field behaviour:

| Rule type | Controls |
|---|---|
| `visibility` | Whether the field is rendered at all |
| `editability` | Whether the field accepts user input |
| `required` | Whether the field must be filled before the form can submit |
| `options` | The available choices in a dropdown or radio group |
| `validation` | Additional constraints on the field's value (beyond basic type checks) |

Each rule is a JSONLogic expression. The browser evaluates rules locally against the current form state on every form value change — no server round-trip per keystroke.

---

## What the Field Config API Is NOT For

### Display labels and translations: use the Config System

The Field Config API does not carry field labels, placeholder text, help text, or translations. Those come from the Config System's resolved schema (Layer 2). The split is intentional:

- **Config System** = display configuration. The UI team owns it. Labels can be updated without a backend deploy.
- **Field Config API** = business rules. The backend team owns it. Rules can change based on regulatory requirements, product changes, or tenant configuration without a frontend deploy.

Never put a field label in a JSONLogic rule. Never put a business rule in the resolved schema.

### Action capabilities: use the workflow contract

The Field Config API does not control whether the user can approve a quotation, issue a policy, or perform any other workflow action. Those capabilities (`canApprove`, `canIssue`, `canEndorse`, etc.) come from the **workflow contract** — a separate part of the API surface that reflects the quotation or policy's current lifecycle state.

Do not use JSONLogic rules to gate buttons or actions. If you find yourself writing a JSONLogic rule like `"if the user is an underwriter, show the approve button"`, you are using the wrong mechanism. The workflow contract's action capabilities are the correct check.

See [05b — JSONLogic Patterns § Anti-pattern: gating actions](./05b-JSONLOGIC-PATTERNS.md#anti-pattern-using-jsonlogic-to-gate-business-critical-actions) for detail.

---

## How `useFieldConfig` Works

The `useFieldConfig(formId, fieldIds)` React hook is the primary consumer of the Field Config API.

### On form mount

When a form component mounts, `useFieldConfig` fires a single `POST /v1/field-config/batch` request:

```typescript
const { rules, evaluate } = useFieldConfig("quotation-form", [
  "vehicleReg",
  "vehicleMake",
  "sumInsured",
  "hasDependents",
  "dependentDOB",
]);
```

React Query caches the response for **5 minutes** (`staleTime: 5 * 60 * 1000`). If the same `formId` + `fieldIds` combination is already cached, no network request is made. The cache key includes `formId` and the sorted list of `fieldIds`.

The request context (`tenantId`, `role`, `lob`, `locale`) is populated from the JWT claims. The browser sends it in the request body but the values come from the token store, not from form state.

### On every form value change

Rules are evaluated **locally in the browser** on every form value change. The `evaluate(fieldId, formValues)` function returned by the hook runs the JSONLogic rule for a given field against the current `formValues` and the immutable `$context` object.

```typescript
// Inside a form component:
const isVisible = evaluate("dependentDOB", formValues); // returns boolean
const isRequired = evaluate("sumInsured", formValues);  // returns boolean
const options = evaluate("productType", formValues);    // returns string[]
```

No network request is made on each keystroke. The rules fetched on mount are sufficient for the lifetime of the form session (5-minute cache matches typical form completion time).

### The `$context` namespace

The `$context` object available inside every JSONLogic rule is populated from the decoded JWT claims:

```typescript
const $context = {
  role: jwtClaims.role,         // e.g., "underwriter", "agent"
  tenantId: jwtClaims.tenantId, // e.g., "acme"
  lob: jwtClaims.lob,           // e.g., "motor", "health"
  locale: jwtClaims.locale,     // e.g., "en-IN"
};
```

This object is assembled by the framework and passed as a read-only input to the JSONLogic evaluator. It is not derived from form state. A user cannot manipulate `$context` values by changing form inputs — the JWT is server-signed.

The framework-level rule evaluation call:

```typescript
import jsonLogic from "json-logic-js";

const data = {
  formValues: currentFormValues,
  $context: contextFromJwt,
};

const result = jsonLogic.apply(rule, data);
```

---

## Child Documents

| Document | Contents |
|---|---|
| [05a — API Specification](./05a-API-SPECIFICATION.md) | `POST /v1/field-config/batch` request/response types, Zod schema, HTTP caching, error responses, batch limits, example payload |
| [05b — JSONLogic Patterns](./05b-JSONLOGIC-PATTERNS.md) | Rule patterns with examples, `$context` usage, anti-patterns, performance notes, testing approach |

---

## Separation of Concerns Summary

```
┌──────────────────────────────────────────────────────────────────────┐
│  What controls what in a form field                                  │
│                                                                      │
│  "What label does this field show?"                                  │
│      → Config System / resolved schema (Layer 2)                     │
│                                                                      │
│  "Is this field visible / required / editable?"                      │
│      → Field Config API (Layer 5) — JSONLogic rules                  │
│                                                                      │
│  "What are the valid options for this dropdown?"                     │
│      → Field Config API (Layer 5) — options JSONLogic rule           │
│                                                                      │
│  "Can this user approve the quotation?"                              │
│      → Workflow contract — action capabilities (canApprove, etc.)    │
└──────────────────────────────────────────────────────────────────────┘
```
