# 06 — Forms

This document covers `form-container` in depth — field types, validations, conditional visibility, dynamic dropdowns, submit lifecycle, overlaid forms, and the forms registry.

Forms are the second-most-used widget after `data-table`. Get this right and you'll ship most user-input UIs without writing React.

---

## The four hard rules of `form-container`

Forms have a strict shape. Get these wrong and the form silently fails to render.

1. **`type` MUST be `"form-container"`** — not `"form"`, not `"input-form"`.
2. **`fields` and `actions` MUST live under `props`** — never at the root, never under `children`.
3. **Validations are an array** — `[{ rule: "required", message: "..." }]`. Not `props.required: true`.
4. **`type: "date"`** for date fields. Not `"date-picker"`. Not `"calendar"`.

Memorise these. The most common failure mode for new schemas is one of these four.

---

## Minimum viable form

```json
{
  "id": "register-claim-form",
  "type": "form-container",
  "props": {
    "title": "Register Claim",
    "fields": [
      {
        "id": "claim_no",
        "name": "claim_no",
        "label": "Claim Number",
        "type": "text",
        "validations": [{ "rule": "required", "message": "Claim number is required" }]
      }
    ],
    "actions": [
      {
        "id": "submit",
        "label": "Submit",
        "type": "api-mutation",
        "submitAction": true,
        "api": { "endpoint": "/api/v1/claims", "method": "POST" },
        "successMessage": "Claim registered"
      }
    ]
  }
}
```

Reading top to bottom:
- One field, named `claim_no`, required.
- One submit action that POSTs the form values to `/api/v1/claims`.

When the user submits, the form values become `api.body` automatically — you don't need to wire it.

---

## Field types

The runtime resolves the `type` string through two maps in [`FieldRenderer.tsx`](../../src/components/widgets/forms/formContainer/FieldRenderer.tsx):

| `type` | Renders | Value type | Notes |
|--------|---------|------------|-------|
| `text` (default) | text input | string | Fallback when `type` is missing or unknown |
| `number` | number input | number | `min`/`max` validations apply to numeric value |
| `email` | email input | string | HTML5 `type=email` browser validation only |
| `password` | password input | string | Masked input |
| `tel` | tel input | string | HTML5 `type=tel` |
| `url` | url input | string | HTML5 `type=url` browser validation only |
| `textarea` | textarea | string | Multi-line |
| `date` | date picker | ISO date string | Single-date only |
| `select` | dropdown | string (value) | Requires `options` or `dataSource` |
| `radio` | radio group | string (value) | Requires `options` |
| `checkbox` | checkbox | boolean | |
| `api-dropdown` | searchable dropdown | string | Options fetched from API; uses the shared Dropdown control |
| `api-dropdown-transactional` | searchable dropdown | string | Variant of `api-dropdown` for transactional lookups |

⚠️ **No `file` field type today.** It's a common ask but not implemented — passing `type: "file"` falls through to a plain text input. File uploads need to be implemented as a custom field type or via a separate widget; see the proposal flow.

⚠️ For date *ranges*, use two `date` fields (`startDate` and `endDate`) — there's no built-in range type.

---

## Common field props

```ts
interface FormFieldConfig {
  id: string;                          // For React keys / referencing in visibleWhen
  name: string;                        // The key in the form payload
  label: string;                       // Display label
  type: string;                        // See above
  placeholder?: string;
  disabled?: boolean;
  defaultValue?: string | number | boolean;
  validations?: ValidationRule[];      // See below
  options?: Array<{ value, label }>;   // For select/radio
  dataSource?: DataSourceConfig;       // Dynamic options
  optionLabel?: string;                // Map response items to options
  optionValue?: string;
  visibleWhen?: VisibilityCondition;   // JSONLogic
  span?: number;                       // Grid column span (1-N where N = columns)
  helpText?: string;                   // Tooltip on the label
  size?: "sm" | "md" | "lg";
  displayStyle?: string;               // For view mode rendering
}
```

`id` and `name` are usually the same; `name` is the payload key, `id` is just for React. Set both.

---

## Validations

The `validations` array attaches rules to a field. Each rule has a `rule` name, optional `value` (the constraint), and a `message`:

```json
"validations": [
  { "rule": "required", "message": "Email is required" },
  { "rule": "min", "value": 5, "message": "Too short" }
]
```

Supported rules (the only entries in [`VALIDATION_APPLIERS`](../../src/components/widgets/forms/formContainer/utils.ts)):

| `rule` | `value` | What it checks |
|--------|---------|----------------|
| `required` | — | String field is non-empty |
| `min` | number | Minimum value (numbers) or length (strings) |
| `max` | number | Maximum value or length |

⚠️ **`pattern`, `email`, `url` are NOT enforced as validation rules** on `main`. The `email` / `url` *field types* trigger HTML5 browser validation (which the user can bypass), but a `validations: [{ rule: "email" }]` entry silently no-ops. If you need regex / format checks today, file a proposal to extend `VALIDATION_APPLIERS` — don't put them in the schema expecting them to fire.

⚠️ **`required` on a `number` field also no-ops** — the implementation guards on `isStringType`. For numeric `required`, set `min: 1` (or a domain-appropriate floor) instead.

Rules are converted to a Zod schema at runtime via `buildFormSchema` in [`src/components/widgets/forms/formContainer/utils.ts`](../../src/components/widgets/forms/formContainer/utils.ts).

---

## Conditional visibility — `visibleWhen`

Show or hide a field based on other field values, using JSONLogic:

```json
{
  "id": "policy_type",
  "name": "policy_type",
  "label": "Policy Type",
  "type": "select",
  "options": [
    { "value": "MOTOR", "label": "Motor" },
    { "value": "HEALTH", "label": "Health" }
  ]
},
{
  "id": "vehicle_make",
  "name": "vehicle_make",
  "label": "Vehicle Make",
  "type": "text",
  "visibleWhen": { "==": [{ "var": "policy_type" }, "MOTOR"] }
}
```

The `vehicle_make` field only renders when `policy_type` is `MOTOR`. Hidden fields are **excluded from the submit payload** — so you don't get stray values from previously-shown fields.

💡 Use `visibleWhen` for branching forms instead of building multi-step wizards. A single form with conditional fields is usually cleaner than three forms.

See [07-state-and-conditions.md](07-state-and-conditions.md) for the full JSONLogic syntax.

---

## Dynamic dropdown options — field-level `dataSource`

Instead of hardcoding options, fetch them:

```json
{
  "id": "insurer",
  "name": "insurer_code",
  "label": "Insurer",
  "type": "select",
  "dataSource": {
    "api": { "endpoint": "/api/v1/insurers", "method": "GET" }
  },
  "optionLabel": "name",
  "optionValue": "code"
}
```

The runtime fetches `/api/v1/insurers`, expects an array of objects, and maps each `{ name, code, ... }` into `{ label: <item>.name, value: <item>.code }`.

If `optionLabel`/`optionValue` are omitted, the response items must already be `{ label, value }` objects.

⚠️ Field-level `dataSource` adds a fetch per form render. For static lookups (LOB types, country codes), prefer hardcoded `options`. For genuinely dynamic data (insurers, products), the fetch is justified.

---

## Layout — columns and `span`

`form-container.props.columns` (default 3) sets the grid layout. Fields default to spanning 1 column. Use `span` to widen:

```json
{
  "id": "address",
  "name": "address",
  "label": "Address",
  "type": "textarea",
  "span": 3
}
```

In a 3-column form, this field stretches across all three columns. In a 2-column form (`columns: 2`), `span: 3` clips to 2.

For full-width single-column forms, set `columns: 1`.

---

## Form actions

The action bar at the bottom of the form. Set `submitAction: true` on the action that should fire on form-submit (Enter key, or button click):

```json
"actions": [
  {
    "id": "submit",
    "label": "Submit",
    "type": "api-mutation",
    "submitAction": true,
    "variant": "default",
    "api": { "endpoint": "/api/v1/claims", "method": "POST" },
    "successMessage": "Claim created",
    "refreshKey": "/api/v1/claims",
    "onSuccess": [
      { "type": "trigger-event", "target": "register-claim-form" }
    ]
  },
  {
    "id": "cancel",
    "label": "Cancel",
    "type": "trigger-event",
    "target": "register-claim-form",
    "variant": "ghost"
  }
]
```

On submit:
1. `useFormContainer` validates (Zod).
2. If invalid → show field-level errors, don't dispatch.
3. If valid → take the action with `submitAction: true`, inject the form values as `api.body`, dispatch via `useActionHandler`.

The `trigger-event` cancel action with `target` equal to the form id closes the overlay (when the form is overlaid). For inline forms, cancel can navigate, or be `update-widget-state` to reset.

⚠️ Only **one** action should have `submitAction: true`. If multiple, the first found is used and the others render but don't tie into Enter-key submission.

---

## Overlaid forms

To open a form in a modal/sheet from elsewhere (e.g., a row action), use `open-modal` / `open-sheet` with the form id as `target`:

```json
{ "type": "open-modal", "target": "register-claim-form" }
```

The runtime:
1. `useActionHandler` calls `useOverlayStore.open("register-claim-form", "modal", rowData)`.
2. `OverlayProvider` (mounted in `layout.tsx`) renders `<OverlaidForm formId="register-claim-form" />` inside a Dialog.
3. `OverlaidForm` looks up the form schema in `forms_registry`.
4. The `rowData` payload becomes the form's default values — useful for "Edit" flows where row data prefills.
5. Form submission goes through the same `api-mutation` action, then `onSuccess` closes the modal via `trigger-event`.

💡 **Edit forms reuse the create form schema.** Same fields, different `defaultValue`s injected from row data, different submit endpoint via `:id` substitution. Don't duplicate the schema; use the same one for both.

---

## The forms registry

`schemas/forms/index.ts` is **auto-generated** by `scripts/generate_form_index.mjs`. It reads every JSON file in `schemas/forms/` and emits an inlined registry:

```ts
export const forms_registry: Record<string, any> = {
  'register-claim-form': { /* inlined JSON */ },
  'edit-policy-form':    { /* inlined JSON */ },
  // ...
};
```

The registry is bundled at build time — forms don't load from disk at runtime, they're already in the JS bundle.

**Regenerate after editing any form file:**

```bash
npm run predev
# or:
node scripts/generate_form_index.mjs
```

⚠️ `predev` runs automatically on `npm run dev`, but if you're hot-reloading and didn't kill the server, your form changes won't appear. Either restart dev, or run the script manually.

---

## Backend errors

When a submit returns 4xx with a field-level error envelope:

```json
{
  "backendErrors": [
    { "variable_code": "claim_no", "error_code": "DUPLICATE", "error_desc": "Claim number already exists" }
  ]
}
```

`useFormContainer` maps `variable_code` to field `name`, attaches the `error_desc` as the field error. The user sees the message next to the input.

For top-level errors (`{ "message": "..." }`), the user sees a toast.

⚠️ The `backendErrors` shape is legacy. The standard V1 shape is the Spring envelope (`{ message, error, status, ... }`) — see [04-data-sources.md → Error responses](04-data-sources.md#error-responses). New endpoints should return both for compat.

---

## View mode (read-only)

Set `mode: "view"` to render the form read-only:

```json
{ "type": "form-container", "props": { "mode": "view", ... } }
```

Each field renders its current value via the matching `displayStyle` (text, badge, date formatted, etc.). Submit/Cancel actions are hidden in view mode.

💡 The same form schema serves create / edit / view by toggling `mode`. Wire your detail page to render the form in `mode: "view"` and let an "Edit" button open the same form in edit mode (in an overlay).

---

## A complete worked example

A full create-claim flow:

**`schemas/forms/register-claim-form.json`:**

```json
{
  "id": "register-claim-form",
  "type": "form-container",
  "props": {
    "title": "Register Claim",
    "description": "Submit a new motor claim",
    "columns": 2,
    "fields": [
      {
        "id": "policy_no",
        "name": "policy_no",
        "label": "Policy Number",
        "type": "text",
        "validations": [{ "rule": "required", "message": "Policy number is required" }]
      },
      {
        "id": "incident_date",
        "name": "incident_date",
        "label": "Date of Incident",
        "type": "date",
        "validations": [{ "rule": "required", "message": "Incident date is required" }]
      },
      {
        "id": "loss_type",
        "name": "loss_type",
        "label": "Loss Type",
        "type": "select",
        "options": [
          { "value": "ACCIDENT", "label": "Accident" },
          { "value": "THEFT", "label": "Theft" },
          { "value": "NATURAL", "label": "Natural Disaster" }
        ],
        "validations": [{ "rule": "required", "message": "Required" }]
      },
      {
        "id": "vehicle_make",
        "name": "vehicle_make",
        "label": "Vehicle Make",
        "type": "text",
        "visibleWhen": { "in": [{ "var": "loss_type" }, ["ACCIDENT", "THEFT"]] }
      },
      {
        "id": "claimed_amount",
        "name": "claimed_amount",
        "label": "Claimed Amount",
        "type": "number",
        "validations": [
          { "rule": "min", "value": 1, "message": "Amount must be greater than 0" }
        ]
      },
      {
        "id": "description",
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "span": 2
      }
    ],
    "actions": [
      {
        "id": "submit",
        "label": "Submit",
        "type": "api-mutation",
        "submitAction": true,
        "api": { "endpoint": "/api/v1/claims", "method": "POST" },
        "successMessage": "Claim registered",
        "refreshKey": "/api/v1/claims",
        "onSuccess": [
          { "type": "trigger-event", "target": "register-claim-form" }
        ]
      },
      {
        "id": "cancel",
        "label": "Cancel",
        "type": "trigger-event",
        "target": "register-claim-form",
        "variant": "ghost"
      }
    ]
  }
}
```

**Triggering from a list page:**

```json
{
  "id": "claims-list",
  "type": "data-table",
  "dataSource": { "api": { "endpoint": "/api/v1/claims", "method": "GET" } },
  "props": {
    "headerActions": [
      {
        "id": "new-claim",
        "label": "Register Claim",
        "icon": "Plus",
        "type": "open-modal",
        "target": "register-claim-form"
      }
    ],
    "columns": [ ... ]
  }
}
```

User clicks "Register Claim" → modal opens with the empty form → fills it in → submits → backend creates claim → modal closes via `onSuccess` → table refetches via `refreshKey` → new row appears.

That's a full feature in ~70 lines of JSON.

---

## Common mistakes

1. **Field name vs id mismatch.** `name` is what ends up in the payload; `id` is for React/visibleWhen. If you write `"name": "claim_no"` but reference `{ "var": "claimNo" }` in `visibleWhen`, the condition never matches.

2. **Hidden fields leaking to backend.** Hidden fields *are* excluded from the payload — but only if `visibleWhen` is false at submit time. If you toggle `visibleWhen` based on state that's not in the form, behaviour can be surprising. Test the boundary cases.

3. **Multiple `submitAction: true`.** Only one wins. Pick one.

4. **Missing `successMessage`.** Silent submit = user thinks nothing happened, clicks submit twice, creates duplicates.

5. **Putting `validations` outside the array form.** `"validations": { "required": true }` is wrong. Always an array of rule objects.

6. **Forgetting to regenerate `forms/index.ts`.** Edit a form schema, don't see changes. Run `npm run predev`.

7. **Reusing field names across hidden branches.** If two `visibleWhen`-controlled fields both have `name: "amount"` but mean different things, the payload key collides. Use distinct names.

---

**Next:** [07-state-and-conditions.md](07-state-and-conditions.md) — `useWidgetState`, roles, and JSONLogic.
