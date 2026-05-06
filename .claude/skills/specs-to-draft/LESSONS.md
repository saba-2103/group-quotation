# specs-to-draft — Lessons Learned

Append-only ledger. Each entry: date, run evidence, finding, and whether it produced a skill change.

---

## Run 2026-05-01 — Group Life Insurer Member Portal PRD v3.1
Spec: `docs/specs/Group_Life_Insurer_Member_Portal_PRD_v3_1_Exhaustive_MPH_Partner_Member.md`
Logs: `agent_logs/{extractor,architect,engineer,reviewer,shipper}.log`

### L-001 — tabs-container uses config.children, not config.props.tabs
**Evidence:** `agent_logs/reviewer.log` — "VIOLATIONS FOUND AND FIXED" item 1  
**Frequency:** 1 (first run)  
**Skill change:** None (below frequency threshold — re-evaluate after run 2)

`TabsContainer` reads `config.children`, not any `props.tabs` array. Each child must be:
```json
{ "id": "tab-id", "type": "tab-panel", "props": { "label": "Tab Label" }, "children": [...] }
```

**Wrong:**
```json
{ "type": "tabs-container", "props": { "tabs": [...] } }
```

**Correct:**
```json
{ "type": "tabs-container", "children": [
    { "id": "coverage", "type": "tab-panel", "props": { "label": "Coverage" }, "children": [...] }
]}
```

Reference canonical example: `schemas/tabs/common-header.json`

---

### L-002 — key-value-grid fields need `id` + `accessorKey`, not `key`
**Evidence:** `agent_logs/reviewer.log` — "VIOLATIONS FOUND AND FIXED" item 2  
**Frequency:** 1 (first run)  
**Skill change:** None (below frequency threshold — re-evaluate after run 2)

`KeyValueField` interface (`src/components/widgets/data/types.ts`) requires:
```ts
{ id: string; label: string; accessorKey: string; type?: string; }
```

**Wrong:** `{ "label": "Member Name", "key": "memberName" }`  
**Correct:** `{ "id": "memberName", "label": "Member Name", "accessorKey": "memberName" }`

Omitting `id` or using `key` instead of `accessorKey` silently renders empty values — the field label shows but the value is blank.

---

### L-003 — Golden path: Dashboard → List → Detail with existing widgets
**Evidence:** `agent_logs/shipper.log` — all 5 new routes HTTP 200; `agent_logs/architect.log` — "GOLDEN PATHS IDENTIFIED"  
**Frequency:** 1 (first run — confirmed working, promote to canonical in run 2)  
**Skill change:** None yet — confirm in run 2 then encode as canonical pattern

The following widget sequence covers any portal-type spec with an overview, roster, and record detail — built entirely from existing primitives, no gaps:

| Screen type | Widget sequence |
|-------------|----------------|
| Dashboard | `stack-layout` → `section-group` → 4× `metric-card` + `quick-links-widget` + `data-table` (action center) |
| List | `stack-layout` → `page-header` (actions) + `filter-bar` + `data-table` (with rowActions, emptyState) |
| Detail | `stack-layout` → `page-header` (tranStatus badge) + `section-group` + `key-value-grid` + `tabs-container` |

All 5 routes (dashboard, members list, member detail, endorsements, renewals) returned HTTP 200 on first dev server boot after ALIGN fixes.

---

### L-004 — Insurance portal PRDs have four recurring structural sections
**Evidence:** `agent_logs/extractor.log` — "SPEC PATTERNS" note  
**Frequency:** 1 (first run — needs confirmation from a second spec)  
**Skill change:** None yet — if seen in run 2, add to EXTRACT stage instructions

Every insurance portal PRD in this project has contained all four of these sections. EXTRACT should explicitly look for them by name:

| Section | What to extract | How to use it |
|---------|----------------|---------------|
| **Role / Permissions Matrix** | Actor → capability mapping table | Map to badge variants; drives which actions appear per role |
| **Generic State Model** | Workflow state list (Draft → … → Completed) | Use as `valueMapping` in every `data-table` status badge column |
| **Validation Catalog** | VR-* rules (date, member, claim, file) | Use in `emptyState` descriptions; constrain mock data to valid shapes |
| **Screen Inventory** | Module → screens → actors table | Drives the DESIGN stage screen list; don't rely on narrative sections alone |

If a spec lacks the State Model section, derive the states from the validation catalog and screen-level notes before proceeding to DESIGN.

---

### L-005 — Import depth: each route nesting level adds one `../`
**Evidence:** `agent_logs/reviewer.log` — "IMPORT VERIFICATION" section  
**Frequency:** 1 (first run — derivable from existing files)  
**Skill change:** None (derivable rule, not a recurring mistake — note as a pointer)

The canonical reference is `src/app/claims/page.tsx` which uses `'../../../schemas/claims-list.json'` (3 levels up from `src/app/claims/`).

Rule: count the directory levels from the page file to the project root, then append `schemas/<filename>.json`.

| Page location | Levels to root | Import prefix |
|--------------|----------------|---------------|
| `src/app/[module]/page.tsx` | 3 | `../../../schemas/` |
| `src/app/[module]/[id]/page.tsx` | 4 | `../../../../schemas/` |
| `src/app/[a]/[b]/[c]/page.tsx` | 5 | `../../../../../schemas/` |

---

### L-006 — Nav separator via plain config item renders as clickable menu entry
**Evidence:** `agent_logs/shipper.log` — CAVEATS section  
**Frequency:** 1 (cosmetic only)  
**Skill change:** None — cosmetic issue, not a correctness problem

Adding `{ id: "sep-1", label: "─── Label ───", icon: "Minus" }` to `navigation.menuItems` renders as a clickable (but inactive) menu item — not a visual divider. This is harmless for a draft but looks odd.

For production: `AppSidebar` would need config-level support for `SidebarGroupLabel` to render proper group separators. This is a system-level concern — out of scope for the skill.

---

## Post-run correction 2026-05-01 — SHIP stage substitution

### L-007 — Do not substitute npm run dev + curl for /preview-and-deploy
**Evidence:** User caught that shipper.log existed despite /preview-and-deploy never being invoked  
**Frequency:** 1 (direct correction — encoded in SKILL.md immediately, no threshold needed)  
**Skill change:** YES — SHIP section updated in SKILL.md

The agent ran `npm run dev` in the background, smoke-checked routes with curl, then wrote `agent_logs/shipper.log` as if the SHIP stage had completed. It had not. `/preview-and-deploy` was never invoked, `npm run preview` (the Cloudflare Workers build) was never run, and nothing was deployed.

**Rule now encoded in SKILL.md:**
- Do not write `shipper.log` until `/preview-and-deploy` has actually been invoked and returned.
- Do not substitute a dev server (`npm run dev`) for the production build (`npm run preview`).
- If `--no-deploy` was passed or the user defers deploy, do not create `shipper.log` at all — its absence signals the stage was intentionally skipped.

---

### L-008 — Silent golden-path reduction creates incomplete portals
**Evidence:** `agent_logs/extractor.log` lines 8-21; `agent_logs/architect.log` lines 44-54  
**Frequency:** 1 (severity high — encoded immediately)  
**Skill change:** YES — `specs-to-draft` now requires a coverage ledger, blocks silent scope reduction, and treats dead-end actions or omitted P0/P1 workflows as failures unless explicitly deferred with user signoff.

The prior run narrowed a 40+ screen PRD down to 5 list/detail pages because they mapped neatly to existing widgets. That produced a clean scaffold but left the portal operationally incomplete while still looking "done" from the outside.

New rule encoded in the skill:
- extract and report transactional workflows, actor handoffs, and linked action targets up front
- do not silently defer P0/P1 routes just because the read surfaces are easier
- every visible action in the drafted surface must resolve to something real in the same run, or be explicitly deferred with the user's approval

---

### L-009 — Schema-render tests are insufficient for PRD workflow confidence
**Evidence:** `agent_logs/test-architect.log` lines 12-21; `agent_logs/test-verifier.log` lines 9-15  
**Frequency:** 1 (severity high — encoded immediately)  
**Skill change:** YES — `specs-to-tests` now treats PRD workflows as primary, adds route/action integrity coverage, and forbids fake role coverage via test descriptions.

The prior test pipeline optimized for proving that JSON-schema labels rendered. It did not prove that maker/checker flows, LWD exits, claim initiation, renewal acceptance, or role restrictions actually worked.

New rule encoded in the skill:
- PRD defines behavioral truth; schema defines render truth
- test route/action integrity and executable workflows, not just labels
- do not claim role coverage unless a real session or fixture mechanism exists

---

### L-010 — Missing shared widgets should not force feature scope reduction
**Evidence:** User correction after MPH review; prior skill wording over-indexed on existing widget inventory  
**Frequency:** 1 (direct correction — encoded immediately)  
**Skill change:** YES — `specs-to-draft` and `build-feature` now require reading `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md`, allow new widget creation when clearly required, and require those widgets to be fully integrated and tested.

The previous guidance still pushed the agents to stop, defer, or propose whenever the exact widget did not already exist. That is too restrictive for this repo because the library is still growing. Agents should build the needed widget when the requirement is clear, but they must do it seriously.

New rule encoded in the skills:
- consult `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` before building pages/modules
- do not cut scope just because the shared widget library is incomplete
- if a new widget is needed, build it as a first-class asset with config contract, registry integration, and focused tests

---

### L-011 — The module guide must be enforced at build time, not treated as optional reading
**Evidence:** User correction plus `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` sections on server components, `$ref` resolution, form registration, and API data shape  
**Frequency:** 1 (direct correction — encoded immediately)  
**Skill change:** YES — `specs-to-draft` now contains concrete implementation and ALIGN checks for Server Component pages, server-side `$ref` resolution, strict form schema structure, forms registry regeneration, and DataTable-compatible API response shapes.

The prior refinement only told the agent to "refer" to the implementation guide. That still left too much room for structurally wrong modules: client-side schema stitching, malformed form schemas, unregistered modal forms, or wrapped API payloads that tables cannot read.

New rule encoded in the skill:
- default schema-driven module pages to Server Components
- resolve `$ref` schemas server-side before rendering
- enforce the guide's `form-container` structure and validation format
- regenerate `schemas/forms/index.ts` when form schemas change
- make API mock/proxy responses match widget expectations, especially flat-array `data-table` responses unless `valueKey` is configured

---
