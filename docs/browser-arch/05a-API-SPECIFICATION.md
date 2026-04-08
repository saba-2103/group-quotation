# 05a — Field Config API Specification

**Parent:** [Layer 5 — Field Config API](./05-FIELD-CONFIG-API.md)  
**Type:** Leaf document — API reference

---

## Endpoint

```
POST /v1/field-config/batch
```

**Authentication:** Bearer JWT required (same token used for all Keystone UI API calls)  
**Content-Type:** `application/json`

---

## Request

### TypeScript interface

```typescript
interface FieldConfigBatchRequest {
  /** The logical form identifier. Determines which rule set the backend returns. */
  formId: string;
  /**
   * The field IDs to fetch rules for.
   * Maximum 50 field IDs per request.
   * The backend silently ignores unknown field IDs (returns no entry for them).
   */
  fieldIds: string[];
  /** Contextual values from the user's JWT claims, sent for backend routing/caching. */
  context: FieldConfigContext;
}

interface FieldConfigContext {
  /** Tenant identifier. E.g. "acme", "hdfc-ergo". */
  tenantId: string;
  /** User's role. E.g. "agent", "underwriter", "admin". */
  role: string;
  /** Line of business. E.g. "motor", "health", "property". */
  lob: string;
  /** User's locale. E.g. "en-IN", "hi-IN". */
  locale: string;
}
```

### Batch limit

**Maximum 50 `fieldIds` per request.** If a form has more than 50 fields, split them into multiple requests. The `useFieldConfig` hook handles this automatically — it batches field IDs into groups of 50 and merges the responses before caching.

---

## Response

### TypeScript interface

```typescript
/**
 * The response is a map from fieldId to that field's rule set.
 * Fields not present in the request, or fields with no rules configured,
 * will not appear in the response map.
 */
type FieldConfigBatchResponse = Record<string, FieldRuleSet>;

interface FieldRuleSet {
  /**
   * JSONLogic rule that evaluates to boolean.
   * true  = field is visible.
   * false = field is hidden (not rendered).
   * If absent, the field is always visible.
   */
  visibility?: JsonLogicRule;

  /**
   * JSONLogic rule that evaluates to boolean.
   * true  = field is editable.
   * false = field is read-only (rendered but not interactive).
   * If absent, the field is always editable.
   */
  editability?: JsonLogicRule;

  /**
   * JSONLogic rule that evaluates to boolean.
   * true  = field is required (must have a non-empty value to submit).
   * If absent, the field is optional.
   */
  required?: JsonLogicRule;

  /**
   * JSONLogic rule that evaluates to string[].
   * Returns the list of valid option values for select/radio fields.
   * If absent, the field's static options (from the Config System) are used.
   */
  options?: JsonLogicRule;

  /**
   * Array of validation rules. Each rule evaluates to boolean.
   * true  = validation passes.
   * false = validation fails; the corresponding validationMessages entry is shown.
   * If absent or empty, only built-in type validation applies.
   */
  validation?: JsonLogicRule[];

  /**
   * Human-readable validation failure messages, parallel to the validation array.
   * validationMessages[i] is shown when validation[i] evaluates to false.
   * Must have the same length as validation if both are present.
   */
  validationMessages?: string[];
}

/** A JSONLogic rule is any valid JSON value that json-logic-js can evaluate. */
type JsonLogicRule = Record<string, unknown>;
```

---

## HTTP Caching

```
Cache-Control: private, max-age=300
```

The response is marked **`private`** because field rules can differ per role and tenant. A response for an `underwriter` at tenant `acme` must not be served from a shared cache to an `agent` at tenant `hdfc-ergo`. CDN or reverse-proxy caches must not store this response.

The `max-age=300` (5 minutes) aligns with the React Query `staleTime` of 5 minutes configured in `useFieldConfig`. After 5 minutes, React Query re-fetches and the browser makes a fresh request to the backend.

---

## Error Responses

| Status | Condition | Response body |
|---|---|---|
| `400 Bad Request` | `formId` is unknown or not registered with this tenant | `{ "error": "UNKNOWN_FORM_ID", "message": "Form 'xyz' is not registered for tenant 'acme'" }` |
| `400 Bad Request` | More than 50 `fieldIds` in a single request | `{ "error": "BATCH_LIMIT_EXCEEDED", "message": "Maximum 50 fieldIds per request. Got 73." }` |
| `400 Bad Request` | Request body is malformed JSON or missing required fields | `{ "error": "INVALID_REQUEST", "message": "fieldIds must be an array of strings" }` |
| `401 Unauthorized` | JWT missing, expired, or invalid | `{ "error": "UNAUTHORIZED" }` |
| `403 Forbidden` | JWT valid but the user's role/tenant cannot access this form | `{ "error": "FORBIDDEN", "message": "Role 'agent' cannot access form 'underwriter-review-form'" }` |
| `404 Not Found` | All provided `fieldIds` are unknown (backend returns empty map if some are unknown, 404 only if the form itself doesn't exist — this duplicates 400 for UNKNOWN_FORM_ID; in practice the backend returns 404 for an entirely unknown form and 400 if the form exists but fieldIds are invalid) | `{ "error": "NOT_FOUND" }` |
| `429 Too Many Requests` | Rate limit exceeded | Standard Keystone rate-limit headers (`Retry-After`) |

Note: if some `fieldIds` are valid and some are not recognised, the backend returns rules for the valid ones and silently omits the unrecognised ones. No error is returned for partial matches.

---

## Zod Schema

Use with `createApiClient` to validate the response. Lives at `src/api/schemas/FieldConfigResponseSchema.ts`.

```typescript
// src/api/schemas/FieldConfigResponseSchema.ts
import { z } from "zod";

// JSONLogic rules are arbitrary JSON objects — we validate their existence
// and structural integrity (must be an object), not their logical content.
const JsonLogicRuleSchema = z.record(z.unknown());

const FieldRuleSetSchema = z.object({
  visibility: JsonLogicRuleSchema.optional(),
  editability: JsonLogicRuleSchema.optional(),
  required: JsonLogicRuleSchema.optional(),
  options: JsonLogicRuleSchema.optional(),
  validation: z.array(JsonLogicRuleSchema).optional(),
  validationMessages: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // validation and validationMessages must have the same length if both present
    if (data.validation && data.validationMessages) {
      return data.validation.length === data.validationMessages.length;
    }
    return true;
  },
  {
    message: "validation and validationMessages arrays must have the same length",
    path: ["validationMessages"],
  }
);

export const FieldConfigResponseSchema = z
  .record(z.string(), FieldRuleSetSchema)
  .describe("FieldConfigResponseSchema");

export type FieldConfigResponse = z.infer<typeof FieldConfigResponseSchema>;
export type FieldRuleSet = z.infer<typeof FieldRuleSetSchema>;
```

Usage in the `useFieldConfig` hook:

```typescript
import { createApiClient } from "@/api/createApiClient";
import { FieldConfigResponseSchema } from "@/api/schemas/FieldConfigResponseSchema";

const fetchFieldConfig = createApiClient({
  baseUrl: process.env.VITE_API_BASE_URL!,
  schema: FieldConfigResponseSchema,
});
```

---

## Example Request and Response

The example covers a simplified quotation form with three fields: `hasDependents` (a boolean toggle), `dependentDOB` (a date field shown only when `hasDependents` is true), and `sumInsured` (a numeric field with a business-rule minimum).

### Request

```json
POST /v1/field-config/batch
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json

{
  "formId": "new-quotation-form",
  "fieldIds": ["hasDependents", "dependentDOB", "sumInsured"],
  "context": {
    "tenantId": "acme",
    "role": "agent",
    "lob": "health",
    "locale": "en-IN"
  }
}
```

### Response

```json
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: private, max-age=300

{
  "hasDependents": {
    "visibility": { "==": [1, 1] }
  },
  "dependentDOB": {
    "visibility": {
      "==": [{ "var": "formValues.hasDependents" }, true]
    },
    "required": {
      "==": [{ "var": "formValues.hasDependents" }, true]
    }
  },
  "sumInsured": {
    "visibility": { "==": [1, 1] },
    "required": { "==": [1, 1] },
    "validation": [
      {
        ">=": [{ "var": "formValues.sumInsured" }, 100000]
      }
    ],
    "validationMessages": [
      "Sum insured must be at least ₹1,00,000 for health policies"
    ]
  }
}
```

### Annotated response notes

- `hasDependents` has a `visibility` rule of `{ "==": [1, 1] }` — always `true`. This is the backend's way of saying "always visible, no dynamic rule needed" while still returning an explicit entry.
- `dependentDOB` visibility and required both check `formValues.hasDependents`. This rule is evaluated locally in the browser each time `hasDependents` changes.
- `sumInsured` has a `validation` array with one rule. The `validationMessages` array has one corresponding entry. The UI renders the message below the field when the rule evaluates to `false`.
- Fields not present in the response (`productType`, etc.) have no rules — the UI defaults to visible, editable, optional.

---

## Implementation Reference: `useFieldConfig`

```typescript
// src/field-config/useFieldConfig.ts
import { useQuery } from "@tanstack/react-query";
import jsonLogic from "json-logic-js";
import { createApiClient } from "@/api/createApiClient";
import { FieldConfigResponseSchema, FieldConfigResponse } from "@/api/schemas/FieldConfigResponseSchema";
import { useTokenStore } from "@/auth/tokenStore";

const fetchFieldConfig = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  schema: FieldConfigResponseSchema,
});

export function useFieldConfig(formId: string, fieldIds: string[]) {
  const claims = useTokenStore((s) => s.claims);

  const context = {
    tenantId: claims.tenantId,
    role: claims.role,
    lob: claims.lob,
    locale: claims.locale,
  };

  const { data: rules = {} } = useQuery<FieldConfigResponse>({
    queryKey: ["fieldConfig", formId, [...fieldIds].sort(), context],
    queryFn: () =>
      fetchFieldConfig("/v1/field-config/batch", {
        method: "POST",
        body: JSON.stringify({ formId, fieldIds, context }),
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes — matches Cache-Control max-age
  });

  function evaluate(
    fieldId: string,
    formValues: Record<string, unknown>
  ): unknown {
    // $context is populated from JWT claims — not from formValues.
    // This ensures it cannot be spoofed by user input.
    const data = { formValues, $context: context };
    const ruleSet = rules[fieldId];
    if (!ruleSet) return undefined;
    return ruleSet;  // return the full ruleSet; callers pick the rule type they need
  }

  function evaluateVisibility(fieldId: string, formValues: Record<string, unknown>): boolean {
    const ruleSet = rules[fieldId];
    if (!ruleSet?.visibility) return true; // default: visible
    return Boolean(jsonLogic.apply(ruleSet.visibility, { formValues, $context: context }));
  }

  function evaluateRequired(fieldId: string, formValues: Record<string, unknown>): boolean {
    const ruleSet = rules[fieldId];
    if (!ruleSet?.required) return false; // default: optional
    return Boolean(jsonLogic.apply(ruleSet.required, { formValues, $context: context }));
  }

  function evaluateEditability(fieldId: string, formValues: Record<string, unknown>): boolean {
    const ruleSet = rules[fieldId];
    if (!ruleSet?.editability) return true; // default: editable
    return Boolean(jsonLogic.apply(ruleSet.editability, { formValues, $context: context }));
  }

  function evaluateOptions(fieldId: string, formValues: Record<string, unknown>): string[] | null {
    const ruleSet = rules[fieldId];
    if (!ruleSet?.options) return null; // null = use static options from Config System
    const result = jsonLogic.apply(ruleSet.options, { formValues, $context: context });
    return Array.isArray(result) ? result : null;
  }

  function evaluateValidation(
    fieldId: string,
    formValues: Record<string, unknown>
  ): { valid: boolean; messages: string[] } {
    const ruleSet = rules[fieldId];
    if (!ruleSet?.validation?.length) return { valid: true, messages: [] };

    const messages: string[] = [];
    ruleSet.validation.forEach((rule, i) => {
      const passes = Boolean(jsonLogic.apply(rule, { formValues, $context: context }));
      if (!passes) {
        messages.push(ruleSet.validationMessages?.[i] ?? "Validation failed");
      }
    });

    return { valid: messages.length === 0, messages };
  }

  return {
    evaluateVisibility,
    evaluateRequired,
    evaluateEditability,
    evaluateOptions,
    evaluateValidation,
  };
}
```
