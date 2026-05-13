# Design — PROP-0004: Plans tab card grid with structured plan editor

run-id: 2026-05-13-plans-cards-grid
proposal: [proposals/PROP-0004-quote-detail-plans-cards.md](../../../proposals/PROP-0004-quote-detail-plans-cards.md)
clarify-log: [agent_logs/build-feature/2026-05-13-plans-cards-grid/clarify.log](../../../agent_logs/build-feature/2026-05-13-plans-cards-grid/clarify.log)

## Goal

Replace the Plans tab's list-of-lists with a card grid that renders one card per plan showing full plan composition (products → benefits → exclusions, cover/FCL formulas, rate card file). Wire Add / Edit / Delete with a structured, schema-driven form that reflects the DSL Plan / PlanProduct / AmountFormula shapes — not raw JSON.

## In scope

1. **`card-grid` widget** — generic, registered. Iterates a configured array from the page's `dataSource` and renders a configurable `cardSchema` per item. Used by the Plans tab.
2. **`plans-tab` view** — rewrite `schemas/tabs/quote/plans.json` to compose `card-grid` + per-card content + Add Plan action + empty state + DRAFT-gated affordances.
3. **`plan-form` widget** (bespoke for this lane) — registered as widget type `plan-form`. Handles the nested array shape that `FormContainer` cannot today: `products[]` repeater containing `benefits[]` / `exclusions[]` sub-repeaters, plus an `AmountFormula` discriminated-union sub-form for `coverAmountFormula` / `freeCoverLimitFormula`. Submit emits a fully-formed `PlanRequest` body and POSTs/PUTs it.
4. **OverlaidForm pre-fill plumbing** — extend `OverlaidForm` to pass `rowData` (from `open-modal` action) through to the underlying widget as `initialValues`. `plan-form` consumes this for Edit; existing `FormContainer` consumers gain pre-fill as a side benefit (cf. PROP-0002 / 0003 flows that today don't pre-fill).
5. **`hasCensusFileFormat` gating** — Add Plan button + per-card Edit are disabled with tooltip "Census file format must be set before editing plans" when `censusFileFormatJson` is null. Mirrors the existing Pricing tab `disabledTooltip` pattern. (Source: DSL precondition on `addPlan` / `updatePlan`.)

## Out of scope

- **Generic recursive FormContainer** (a form system that handles `list<T>` and nested objects). Surfaces in **Architecture Transition Note** below. `plan-form` is a deliberately-bespoke widget; once a generic repeater field type exists (proposed as a future PROP-0009), `plan-form` collapses into a schema-driven form.
- **File upload widget for `rateCardFile`** — V1 accepts the file ref as a text input. Tracked separately (future PROP-0011, mentioned in the parent plan's Out-of-scope section).
- **DMN-table authoring** — formula `type: DMN_TABLE` accepts a string file ref only; no rule editor.
- **Real-time premium recalc on plan edits** — recalc is the user's responsibility via the Pricing tab's `Request price` action.

## Architecture Transition Note

The form-container types at `src/components/widgets/forms/formContainer/types.ts:8` lock `FormFieldValue = string | number | boolean` and `FieldSchema` to Zod scalars. Extending this to recursive `FormFieldValue | FormFieldValue[] | Record<string, FormFieldValue>` is a real refactor (touches `FormContainer`, `useFormContainer`, `FieldRenderer`, `FieldErrors`, `ViewField`, Zod validation, controller paths in react-hook-form).

**Interim:** `plan-form` is a self-contained widget that manages its own react-hook-form state with a non-scalar shape, builds its own validation, and reuses leaf primitives (`Input`, `Select`, `Textarea`, `Button`) for the actual rendering. It does NOT route through `FieldRenderer` for the repeater rows; the discriminated-union AmountFormula sub-form does route through inline `Input` / `Select` primitives directly.

**Convergence:** when the generic recursive form lands (a future PROP-0009 — *"Generalize FormContainer to handle nested arrays and discriminated-union sub-forms"*), `plan-form` can be retired and the same UX delivered via `form-container` + a new `repeater` field type. The bespoke widget pattern here is exactly the "ship structured UX now, generalize later" tradeoff CORE_MEMORY blesses for front-loading.

Logged to [context/ARCH_TRANSITION.md](../../../context/ARCH_TRANSITION.md) as part of this build (BUILD stage will append the entry).

## Data shapes (DSL canonical — `docs/spec/common/CommonData.data`)

```
Plan {
  planNo: string
  planName?: string
  products: list<PlanProduct>
  rateCardFile: string
  coverAmountFormula: AmountFormula
  freeCoverLimitFormula?: AmountFormula
}

PlanProduct {
  productCode: string
  productName?: string
  productType: string
  benefits: list<PlanBenefit>
  exclusions: list<PlanExclusion>
}

PlanBenefit { code: string, name?: string, mandatory: boolean }
PlanExclusion { code: string, name?: string }

AmountFormula {
  type: AmountFormulaType                  // MULTIPLE_OF_MEMBER_ATTRIBUTE | LOOKUP_ON_MEMBER_ATTRIBUTE | FIXED | DMN_TABLE
  multiplicationFactor?: double            // shown when type=MULTIPLE_OF_MEMBER_ATTRIBUTE
  memberAttributeName?: string             // shown when type ∈ {MULTIPLE_OF_..., LOOKUP_ON_...}
  lookupTableJson?: string                 // shown when type=LOOKUP_ON_MEMBER_ATTRIBUTE
  fixedAmount?: double                     // shown when type=FIXED
  dmnTableFile?: string                    // shown when type=DMN_TABLE
}
```

The OpenAPI flattens `products` / `coverAmountFormula` / `freeCoverLimitFormula` into stringified-JSON fields on the wire (`productsJson`, `coverAmountFormulaJson`, `freeCoverLimitFormulaJson`). The card-side reader will `JSON.parse` these strings; the edit-side writer will `JSON.stringify` before PUT/POST. Confirm shape against a live response during BUILD.

## API surface (already proxied, no new endpoints)

- `GET /api/quotation/quotes/{id}` — drives the page; `plans[]` is the iteration source
- `POST /api/quotation/quotes/{id}/plans` — Add (body: `PlanRequest`)
- `PUT /api/quotation/quotes/{id}/plans/{planNo}` — Edit (body: `PlanRequest`, full replace)
- `DELETE /api/quotation/quotes/{id}/plans/{planNo}` — Delete

## Components / files

### New

- `src/components/widgets/data/CardGrid.tsx` — replaces the stub. Resolves `dataSource`, iterates `arrayPath`, renders `cardSchema` for each item with `{{item.field}}` template binding. Responsive grid via Tailwind (`grid-cols-1 lg:grid-cols-2`). Loading skeleton + empty-state slot.
- `src/components/widgets/data/PlanCard.tsx` — composed card used by the Plans tab. Reads a parsed `Plan` and renders header (planNo · planName) + Edit/Delete buttons (DRAFT, maker) + Products section with nested benefits/exclusions chips + cover formula summary + FCL formula summary (if present) + rate card link.
- `src/components/widgets/forms/PlanForm.tsx` — the structured plan editor widget. Registered as widget type `plan-form` so `open-modal` can target it via `target: "schemas/forms/plan-edit-form.json"`. Internal structure:
  - Header fields: `planNo` (number, disabled in edit mode), `planName` (text), `rateCardFile` (text)
  - `products[]` repeater (Add Product / Remove Product per row). Each product row:
    - Fields: `productCode`, `productName`, `productType`
    - Nested `benefits[]` repeater (Add Benefit / Remove): `code`, `name`, `mandatory` (checkbox)
    - Nested `exclusions[]` repeater (Add Exclusion / Remove): `code`, `name`
  - `coverAmountFormula` (required) and `freeCoverLimitFormula` (optional) — each is an `AmountFormulaField` subcomponent (below)
  - Submit / Cancel buttons; submit-action prop drives POST or PUT
- `src/components/widgets/forms/AmountFormulaField.tsx` — discriminated-union field. `type` select + conditional sub-fields by selection. Reused for `coverAmountFormula` and `freeCoverLimitFormula`. (Free-cover gets a leading "Configure?" checkbox; unchecked = formula omitted from payload.)
- `schemas/forms/plan-edit-form.json` — thin schema declaring widget type `plan-form` with shared props (label, submit-action mode). Plan-form is mostly code-driven; schema is the registration surface for `open-modal`.

### Modified

- `schemas/tabs/quote/plans.json` — rewrite to use `card-grid` + header action `[+ Add plan]` (DRAFT-gated) + empty state. Cards reference `PlanCard` as the per-item component via a `cardWidgetType: "plan-card"` prop on `card-grid` (so PlanCard registers as widget type `plan-card`).
- `src/components/widgets/forms/OverlaidForm.tsx` — pass `rowData` from the action context as `initialValues` prop on the rendered form widget. Today rowData is reachable but not forwarded to scalar `FormContainer`. Add the pass-through; both `FormContainer` and `plan-form` accept `initialValues`.
- `src/components/widgets/forms/formContainer/useFormContainer.ts` — accept an `initialValues` prop and seed react-hook-form's `defaultValues`. Scalar-only, no recursive plumbing. Pre-existing forms ignore `initialValues` if not provided.
- `src/components/registry/WidgetRegistry.tsx` — add `"plan-card": PlanCard` and `"plan-form": PlanForm`. `card-grid` and `editable-table` are already registered.
- `context/ARCH_TRANSITION.md` — append the convergence note (plan-form → generic repeater field).

### Read-only references (used, not edited)

- `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/textarea.tsx`
- `src/components/widgets/forms/ConfirmationDialog.tsx` (used for Delete confirm)
- `src/hooks/useSmartQuery.ts` (cards read via `dataSource`; widget calls this)
- `src/lib/api/quotation.ts` (existing client; new wrappers added if missing)

## Design Preview — Plans tab composition

```
Plans                                                  [+ Add plan] (DRAFT, hasCensusFileFormat)
─────────────────────────────────────────────────────────────────────────────────
[card-grid columns=2]
┌─ Plan 01 · Executive ──────────────────────[Edit] [Delete]─┐  ┌─ Plan 02 · Standard ─────────[Edit] [Delete]─┐
│ Products                                                    │  │ Products                                       │
│  • LIFE — Group Term Life · TERM                             │  │  • LIFE — Group Term Life · TERM               │
│    Benefits: [DEATH ★] [TPD ★] [CRITICAL]                    │  │    Benefits: [DEATH ★]                         │
│    Exclusions: [WAR] [SUICIDE-12M]                           │  │  • ADD — Accidental Death · TERM               │
│                                                              │  │    Benefits: [ADD ★]                           │
│ Cover formula                                                │  │ Cover formula                                  │
│  3 × salary  (MULTIPLE_OF_MEMBER_ATTRIBUTE)                  │  │  Fixed: ₹ 2,500,000                            │
│ Free cover limit                                             │  │ Free cover limit                               │
│  Lookup: salary-band-table.dmn                               │  │  (not configured)                              │
│ Rate card                                                    │  │ Rate card                                      │
│  [📎 ratecard-2026-exec.csv]                                 │  │  [📎 ratecard-2026-std.csv]                    │
└──────────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────┘
```

When `plans[]` is empty: empty-state card spanning full width with "No plans configured yet. Add a plan to start." + Add Plan CTA.

When `status !== DRAFT`: no Add button, no Edit/Delete buttons. Cards render as read-only.

When `censusFileFormatJson` is null/empty but `status === DRAFT`: Add Plan + Edit buttons render disabled with tooltip "Census file format must be set first (Census tab)".

## Design Preview — Plan form (Add / Edit modal)

```
┌─ Edit plan 01 ────────────────────────────────────────────── [×] ─┐
│ Plan #             [01    ] (disabled in edit mode)                │
│ Plan name          [Executive                          ]           │
│ Rate card file     [ratecard-2026-exec.csv             ]           │
│                                                                    │
│ Products                                       [+ Add product]     │
│ ┌─ Product 1 ────────────────────────────────────────[×]─┐         │
│ │ Code    [LIFE  ]   Name [Group Term Life]              │         │
│ │ Type    [TERM  ▼]                                       │         │
│ │ Benefits                              [+ Add benefit]   │         │
│ │ ┌ [DEATH    ] [Death cover         ] [✓] Mandatory [×]┐ │         │
│ │ ┌ [TPD      ] [Total permanent dis.] [ ] Mandatory [×]┐ │         │
│ │ Exclusions                          [+ Add exclusion]   │         │
│ │ ┌ [WAR      ] [War risk            ] [×]               ┐│         │
│ └─────────────────────────────────────────────────────────┘         │
│                                                                    │
│ Cover formula                                                      │
│ Type            [MULTIPLE_OF_MEMBER_ATTRIBUTE ▼]                   │
│ Member attribute [salary  ▼]                                       │
│ Multiplier      [3.0    ]                                          │
│                                                                    │
│ [ ] Configure free cover limit                                     │
│   (toggle reveals FCL formula sub-form with same shape)            │
│                                                                    │
│                                          [Cancel]  [Save plan]     │
└────────────────────────────────────────────────────────────────────┘
```

Form validation:
- planNo: required, non-empty
- planName: optional
- rateCardFile: required, non-empty
- ≥ 1 product
- per product: productCode required, productType required, ≥ 1 benefit
- per benefit: code required, mandatory boolean (default false)
- per exclusion: code required
- coverAmountFormula: required; sub-fields validated per `type` (MULTIPLE_OF requires both factor and attribute; FIXED requires fixedAmount > 0; LOOKUP requires attribute + lookup ref; DMN_TABLE requires dmnTableFile)
- freeCoverLimitFormula: optional; if "Configure" is checked, validated same as cover formula

## API surface details

`POST /api/quotation/quotes/{id}/plans` body shape (per backend OpenAPI; will confirm against live response during BUILD):
```jsonc
{
  "planNo": "01",
  "planName": "Executive",
  "products": [ { "productCode": "LIFE", ... "benefits": [...], "exclusions": [...] } ],
  "rateCardFile": "ratecard-2026-exec.csv",
  "coverAmountFormula": { "type": "MULTIPLE_OF_MEMBER_ATTRIBUTE", ... },
  "freeCoverLimitFormula": { ... }     // optional
}
```

Plan-form's `submit` builds this object from internal state, calls `POST` (Add) or `PUT /plans/{planNo}` (Edit), then closes the modal and dispatches `refreshKey: /api/quotation/quotes/{id}` per the existing `api-mutation` pattern.

## Edge cases

1. `productsJson` is a stringified JSON on the wire. PlanCard parses on read; PlanForm stringifies on submit. If parse fails (malformed), card renders fallback "(unable to parse products)" and Edit becomes disabled.
2. `freeCoverLimitFormulaJson` may be `null` / `""` — treat as "not configured". Toggle defaults to off in Edit mode if absent.
3. `coverAmountFormula.type = DMN_TABLE` — sub-form shows `dmnTableFile` text input only. No rule editor.
4. Quote in non-DRAFT status while user has Edit modal open — should not happen (button is gated), but server returns 412/precondition-failed → toast the message, leave modal open.
5. Add Plan while `censusFileFormatJson` is null — button disabled with tooltip. If user has stale state, server rejects with precondition error → toast it.
6. Delete the last plan — allowed by API; UI shows empty-state immediately.
7. Edit modal pre-fill — `rowData` always reflects the snapshot at modal-open time. If user edits twice in a row, the second open uses the freshest server data (refresh-key invalidates the page query).

## Test plan

Unit:
- `CardGrid` — iterates an array, renders N children with template binding, empty-state when array is empty, loading-state when dataSource is loading.
- `PlanCard` — renders header / products / benefits chips with mandatory star / exclusions / cover formula by type / FCL absence / rate card link. Edit/Delete buttons gated on DRAFT + maker.
- `PlanForm` — submit emits the canonical PlanRequest shape; products/benefits/exclusions repeaters add and remove correctly; AmountFormula sub-fields show/hide by `type`; FCL "Configure" toggle omits the formula when off.
- `AmountFormulaField` — switches sub-fields by `type` select; validation gates per type.
- `OverlaidForm` pre-fill — when opened with `rowData`, the underlying form receives `initialValues`. Regression check for existing scalar consumers (no pre-fill = no change).

Interaction (Playwright / equivalent — happy + 1 negative):
- Happy path: open quote detail in DRAFT → Plans tab → Add Plan → fill structured form (1 product, 2 benefits, 1 exclusion, cover formula type=FIXED amount=1000000) → Save → card appears → Edit → change planName → Save → card reflects new name → Delete → card disappears.
- Negative: open Add Plan when `censusFileFormatJson` is null → button is disabled with tooltip.

## Verification gates (BUILD → VERIFY)

- `npx tsc --noEmit`
- `npm run lint`
- `npm test` (relevant subset for forms/widgets)
- Browser smoke test on `npm run dev` (proxy mode active) — exercise the happy path against the live API at `https://group-pas-dev.anairacloud.com`.

## Commit plan (CORE_MEMORY split src vs context)

Single feature lands as **two commits**:
1. `feat(quote-detail): plans tab card grid with structured plan editor (PROP-0004)` — only `src/**` and `schemas/**` changes.
2. `docs(context): log PROP-0004 build + arch-transition entry` — `context/SESSION_LOG.md`, `context/HANDOFF.md` Active Workstreams, `context/ARCH_TRANSITION.md`, `agent_logs/**`, `context/build-feature/**`, proposal status → `in-progress` then `done`. All paths-ignore.

## Approval needed

This design widens the originally-specified PROP-0004 — additions:
- A new `plan-form` widget (bespoke; reused by future PROP-0009 retirement)
- `OverlaidForm` / `useFormContainer` pre-fill plumbing (small, broadly useful)
- ARCH_TRANSITION entry for the recursive-form deferral

Total touched files: ~9 (new + modified). Estimated time-to-VERIFY: ~1.5 days.

**Awaiting explicit approval to enter BUILD.** Hard gate.
