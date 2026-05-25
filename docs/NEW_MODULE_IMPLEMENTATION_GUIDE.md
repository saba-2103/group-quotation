# Keystone UI: New Module Implementation Guide

Welcome to the Keystone UI repository! This guide is designed to help new developers understand the architecture and quickly implement a new module or page from scratch. 

Keystone UI is heavily **schema-driven**. This means instead of writing hundreds of lines of React components for every page, we define the layout, forms, and data tables in JSON schemas. The React application acts as an engine that parses these schemas and renders the UI dynamically.

This guide will walk you through the end-to-end process of creating a new module (like an "Accounting" or "Claims" module).

---

## Table of Contents
1. [Understanding the Schema-Driven Architecture](#1-understanding-the-schema-driven-architecture)
2. [Step 1: Define the Main Page Schema](#step-1-define-the-main-page-schema)
3. [Step 2: Define Tab or Section Schemas](#step-2-define-tab-or-section-schemas)
4. [Step 3: Create Form Schemas (CRITICAL)](#step-3-create-form-schemas-critical)
5. [Step 4: Automate Form Registration](#step-4-automate-form-registration)
6. [Step 5: Implement API Routes (Proxies/Mocks)](#step-5-implement-api-routes-proxiesmocks)
7. [Step 6: Create the Next.js Page](#step-6-create-the-nextjs-page)
8. [Step 7: Add to Navigation Menu](#step-7-add-to-navigation-menu)
9. [Common Gotchas & Troubleshooting](#common-gotchas--troubleshooting)

---

## 1. Understanding the Schema-Driven Architecture

Before you write any code, you need to understand how the pieces fit together:

- **JSON Schemas (`/schemas`)**: The single source of truth for the UI layout. If you need a form, a data table, or a set of tabs, you define it here.
- **WidgetRenderer (`src/components/registry/WidgetRenderer.tsx`)**: The core engine. It takes a JSON object (a "WidgetConfig") and figures out which React component (`FormContainer`, `DataTable`, `TabsLayout`) to render.
- **Forms Registry (`schemas/forms/index.ts`)**: Because schemas are often loaded dynamically from APIs or files, we pre-bundle form schemas into a registry so they are instantly available when a modal opens.
- **Server Components**: We use Next.js Server Components to load and resolve schemas on the server before sending the HTML to the client. This avoids hydration errors and loading states.

---

## Step 2: Define the Main Page Schema

Let's assume we are building a "Claims Management" module.

1. Create a new file: `schemas/claims.json`.
2. Define the high-level layout. Often, this is a `tabs-layout` if the module has multiple sub-sections.

```json
{
    "id": "claims-page",
    "type": "page",
    "props": {
        "title": "Claims Management",
        "subtitle": "Manage claim registrations, assessments, and payouts"
    },
    "children": [
        {
            "id": "claims-tabs",
            "type": "tabs-layout",
            "props": {
                "defaultValue": "registrations"
            },
            "children": [
                { "$ref": "tabs/claims/registrations.json" },
                { "$ref": "tabs/claims/assessments.json" }
            ]
        }
    ]
}
```

**Key Learning**: Notice the `$ref` pointer. Instead of putting a massive 2000-line JSON object in one file, we split tabs into their own files. Our backend (or Next.js API) will dynamically resolve these pointers.

---

## Step 3: Define Tab or Section Schemas

Next, define the contents of the tabs you referenced above. Create `schemas/tabs/claims/registrations.json`.

Typically, a tab contains a `data-table` to list items, and `headerActions` (like a "Register Claim" button).

```json
{
    "id": "registrations-tab",
    "type": "tab-panel",
    "props": {
        "label": "Claim Registrations",
        "icon": "FileText"
    },
    "children": [
        {
            "id": "registrations-table",
            "type": "data-table",
            "dataSource": {
                "api": {
                    "endpoint": "/api/claims/registrations",
                    "method": "GET"
                }
            },
            "props": {
                "title": "Recent Registrations",
                "headerActions": [
                    {
                        "id": "register-claim-btn",
                        "label": "Register Claim",
                        "type": "open-modal",
                        "target": "register-claim-form", 
                        "variant": "primary"
                    }
                ],
                "columns": [
                    { "id": "claimNo", "label": "Claim No.", "type": "text" },
                    { "id": "status", "label": "Status", "type": "badge" }
                ],
                "rowActions": [
                    {
                        "id": "approve-claim",
                        "label": "Approve",
                        "type": "api-mutation",
                        "visible": { 
                            "field": "status", 
                            "operator": "eq", 
                            "value": "Pending" 
                        },
                        "api": { "endpoint": "/api/claims/:id/approve", "method": "POST" }
                    }
                ]
            }
        }
    ]
}
```

**Key Learnings:**
- `target: "register-claim-form"` tells the Action system to open a modal and look for a form schema with that exact ID.
- `rowActions.visible`: You can conditionally hide row actions based on the row's data.

### Schema directories and the `_placeholder.json` files (do not delete)

`src/lib/schemaResolver.ts` resolves `$ref` values via a Webpack dynamic-import template — `await import(\`../../schemas/<dir>/${filename}\`)`. Webpack's static analysis requires **at least one matching `.json` file to exist in each directory at build time**, otherwise the template resolves to `{}` and any `$ref` into that directory silently returns nothing in production (dev usually keeps working from cache).

For that reason, the `schemas/tables/` and `schemas/views/` directories each ship with:

- a `.gitkeep` (so git tracks the otherwise-empty folder), and
- a `_placeholder.json` (so Webpack's chunk manifest has a target).

**Do not delete `_placeholder.json` when "cleaning up empty folders."** Once a real schema lands in either directory, the placeholder can be removed in the same commit. Any new `schemas/<dir>/` directory you reference from `$ref` needs the same treatment.

---

## Step 4: Create Form Schemas (CRITICAL)

This is where most mistakes happen. Forms have a very specific structure required by the `FormContainer` component.

Create `schemas/forms/register-claim-form.json`.

### The STRICT Form Rules:
1. **Type**: MUST be `"form-container"`. Do not use `"form"`.
2. **Props**: `fields` and `actions` MUST live inside the `props` object, NOT at the root level or in `children`.
3. **Validations**: Use the array format `[{ rule: "required", message: "..." }]`. Do not use `props.required: true`.
4. **Dates**: Use `type: "date"`, not `date-picker` (unless explicitly supporting a very specific custom widget).

```json
{
    "id": "register-claim-form",
    "type": "form-container",
    "props": {
        "title": "Register New Claim",
        "fields": [
            {
                "id": "incidentDate",
                "name": "incidentDate",
                "label": "Date of Incident",
                "type": "date",
                "validations": [
                    {
                        "rule": "required",
                        "message": "Incident date is required"
                    }
                ]
            },
            {
                "id": "claimAmount",
                "name": "claimAmount",
                "label": "Claim Amount",
                "type": "number",
                "validations": [
                    {
                        "rule": "required",
                        "message": "Claim amount is required"
                    },
                    {
                        "rule": "min",
                        "value": 1,
                        "message": "Amount must be greater than 0"
                    }
                ]
            },
            {
                "id": "lob",
                "name": "lob",
                "label": "Line of Business",
                "type": "select",
                "options": [
                    { "label": "Motor", "value": "MOTOR" },
                    { "label": "Health", "value": "HEALTH" }
                ]
            }
        ],
        "actions": [
            {
                "id": "submit-claim",
                "label": "Submit Claim",
                "submitAction": true,
                "variant": "primary",
                "api": {
                    "endpoint": "/api/claims/registrations",
                    "method": "POST"
                }
            }
        ]
    }
}
```

---

## Step 5: Automate Form Registration

When a user clicks "Register Claim" and the modal opens, the UI needs to instantaneously load `register-claim-form`. To ensure no network latency disrupts opening a modal, we bundle these forms at build time.

**CRITICAL STEP**: Every time you create or modify a file in `schemas/forms/`, you MUST run:

```bash
npm run predev
```
*(Or `node scripts/generate_form_index.mjs`)*

This script reads all JSON files in the forms folder and generates `schemas/forms/index.ts`, making them available statically to the Edge Runtime. If you skip this, your modal will likely say "Failed to load schema" or fallback to a dummy form.

---

## Step 6: Implement API Routes (Proxies/Mocks)

The UI expects robust API endpoints. While developing, you often need to mock these.

Create `src/app/api/claims/[...path]/route.ts`. 

We use a "catch-all" route pattern combined with a proxy that falls back to mock data if the backend isn't available.

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join('/');
    
    // Example: Mock data for the Data Table
    if (path === 'registrations') {
        return NextResponse.json([
            { id: "CLM-001", claimNo: "CLM-001", status: "Pending", amount: 5000 },
            { id: "CLM-002", claimNo: "CLM-002", status: "Approved", amount: 12000 }
        ]);
    }

    return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    // Handle form submissions...
    return NextResponse.json({ success: true, message: "Operation completed" });
}
```

**Key Learning for DataTables:** The `DataTable` component expects a flat array of objects `[{}, {}]`. Do not wrap your response in an inner key like `{ data: [...] }` unless you have configured the schema's `dataSource.valueKey` to parse it.

---

## Step 7: Create the Next.js Page

Now tie the root schema to a verifiable URL route.

Create `src/app/claims/page.tsx`.

We make this a **Server Component** and use `resolveSchemaRefs` to stitch the main page schema and its tab `$ref`s together before it hits the client.

```tsx
import React from 'react';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
// Ensure you have a helper like this, or use the raw fs reads if needed.
import { resolveSchemaRefs } from '@/lib/schemaResolver'; 
import claimsSchema from '../../../schemas/claims.json';

export default async function ClaimsPage() {
    // 1. Resolve $ref pointers server-side
    const resolvedSchema = await resolveSchemaRefs(claimsSchema);

    // 2. Render the massive stitched schema using the Registry
    return (
        <div className="w-full h-full min-h-screen bg-background text-foreground">
            <WidgetRenderer config={resolvedSchema} />
        </div>
    );
}
```

---

## Step 8: Add to Navigation Menu

Finally, make sure users can reach your page. 
Update `src/mocks/original/group-insurance/config/app-config-mock.ts` (or wherever your sidebar fetches its navigation definitions).

```typescript
{
    title: "System Management",
    items: [
        {
            title: "Accounting",
            url: "/accounting",
            icon: "calculator",
            id: "accounting",
        },
        // ADD YOUR NEW MODULE HERE
        {
            title: "Claims Management",
            url: "/claims",
            icon: "file-text",
            id: "claims",
        }
    ]
}
```

---

## Common Gotchas & Troubleshooting

1. **"My form opens but it's completely blank!"**
   - Check if you used `type: "form"` instead of `type: "form-container"`.
   - Check if your fields are directly under `children` instead of `props.fields`.

2. **"I clicked an action button and nothing happened, or it says Failed to Fetch."**
   - Did you run `npm run predev`? The modal target form might not be registered in `schemas/forms/index.ts`.
   - Check the browser network tab. Is the API returning a 404 because your mock route doesn't handle the specific sub-path?

3. **"My DataTable is empty but the API returned data."**
   - The DataTable expects an array. If your API returned `{ "status": "success", "items": [...] }`, you need to either change the API to just return the array, or update the schema's `dataSource` to include a `valueKey: "items"`.

4. **"Validation isn't preventing the form from submitting."**
   - Make sure validations are formatted exactly like: `validations: [{ rule: "required", message: "Error text" }]` inside the field object. Forms will ignore malformed validation rules.

5. **"Hydration Error: Server rendered HTML does not match client."**
   - This usually happens when you try to resolve `$ref` pointers on the client `useEffect`. Always resolve schemas in a Server Component (`page.tsx`) and pass the fully resolved JSON down.
