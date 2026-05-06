---
name: specs-to-draft
description: Autonomous multi-agent pipeline that turns Markdown specs in `docs/specs/` into a working React/TS first draft built on the keystone-ui design system. Use when the user wants to scaffold screens/views from a spec doc (PRD, feature brief, requirements). Trigger with "/specs-to-draft", "draft from specs", "scaffold from PRD", or when pointed at a file under `docs/specs/`.
---

# Specs-to-Draft Orchestrator

Run a verb-driven, multi-stage pipeline that converts one or more specs in `docs/specs/*.md` into a working first-draft UI using the repo's existing design system and feature-local composition where needed. A draft is only acceptable if the scoped routes, actions, and linked pages actually exist; dead-end buttons and silently deferred P0 workflows do not count as success.

## Inputs
- `$ARGUMENTS` — optional. May be:
  - a specific spec path (e.g. `docs/specs/Foo_PRD.md`) — pipeline runs on that file only.
  - a feature/screen name to focus on (e.g. `member dashboard`) — narrow extraction to that area.
  - `--no-deploy` — skip the SHIP stage; produce the draft and stop.
  - empty — process every `*.md` under `docs/specs/`, then SHIP.

## Source-of-truth locations (verify before using)
- Handoff entry point: `context/HANDOFF.md`
- Core memory: `context/CORE_MEMORY.md`
- Specs: `docs/specs/*.md`
- Implementation guide: `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md`
- Existing schemas: `schemas/*.json`
- Primitives: `src/components/ui/*.tsx` (button, card, dialog, form, input, table, tabs, sidebar, …)
- Composed widgets: `src/components/widgets/{container,controls,data,forms,items,layout}/`
- App shell: `src/components/AppSidebar.tsx`, `src/components/providers.tsx`
- Existing routes/pages: `src/app/**/page.tsx`
- Existing tests: `tests/e2e/*.spec.ts`, `src/tests/**/*.test.tsx`
- Logs (create if missing): `agent_logs/`
- Plan: `context/plan.md` (create the `context/` dir if missing)

Before drafting, read `context/HANDOFF.md` if it exists, then `context/CORE_MEMORY.md` and `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md`, then run `ls src/components/ui` and `ls -R src/components/widgets` so the component inventory and implementation approach are grounded in reality, not memory.

## Pipeline (run sequentially; log after every stage)

### 1. EXTRACT — parse specs into a use-case map
- Strongly prefer executing or reading from the `extract-usecase` skill (i.e., `agent_logs/usecases.json` and `agent_logs/usecases.md`) to get a pre-validated, domain-accurate business use case map of the PRD.
- If `usecases.json` is missing, read each target spec in full and extract the actors, roles, jobs-to-be-done, screens, key data, validations, and state machines using the SaaS AI Insurance Product Leader persona.
- Build a coverage ledger for the scoped module(s): for each screen, list its read surface, transactional actions, actor handoffs, and required downstream pages/endpoints.
- Treat the PRD's workflow and the extracted use cases as the primary contract. Do not reduce scope to the easiest renderable screens without making that reduction explicit.
- Emit `agent_logs/extractor.json` (the structured map) and `agent_logs/extractor.log` (the reasoning trace).
- Log entry must include: `input_files`, `input_hash` (sha256 of concatenated specs), `reasoning`, `strategy_used`, `output_paths`.

### 2. DESIGN — map use-cases to existing components
- For each screen/view in the extractor map, pick concrete components from `src/components/ui` and `src/components/widgets`.
- Treat schemas as a composition layer. Prefer combining existing widgets/layouts over teaching a domain widget to become a generic container. If a missing composition primitive is the real gap, design a new layout/widget in the right layer instead of overloading the consumer widget.
- If a child widget must influence workflow readiness, design a schema-friendly event/state contract rather than a runtime callback API.
- For every header action, row action, quick link, and task link, map the destination route/page or endpoint that will make that action real in this run.
- Plan the schema file layout explicitly:
  - root page schema under `schemas/`
  - tab/section schemas split into `schemas/tabs/...` or equivalent when the page is large
  - form schemas under `schemas/forms/` when opened via modal/sheet/dialog actions
- If the page is schema-heavy, prefer `$ref`-split schemas over one giant inline file.
- Prefer composition over declaring a blocking gap. Examples:
  - multi-step flow: compose from existing form, buttons, sections, local step state, and page-local wrappers
  - timeline/history: compose from cards, lists, or tables if a dedicated timeline widget does not exist
  - file upload: use existing form controls plus native file input handling if a shared upload widget does not exist yet
- If the target workflow still cannot be expressed cleanly, you MAY design and build a new widget. Do this when the requirement is clear and recurring inside the scoped feature, not as a shortcut.
- When choosing between a narrow first draft and modest upfront foundational work, bias toward the option that reduces later rework, surfaces integration risks earlier, and leaves dependent workflows with fewer follow-on retrofits.
- A new widget plan must include: purpose, config shape, registry integration, accessibility expectations, supported states, and how it will be tested.
- Only record a blocking gap after proving the behavior cannot be safely composed from existing primitives and native HTML controls.
- Output a coverage matrix with one row per screen/action: `implemented_now`, `blocked_by_gap`, or `explicitly_deferred_with_user_signoff`.
- Output: `agent_logs/architect.json` (screen → component plan) + `agent_logs/architect.log`.

### 3. PLAN — implementation graph
- Write `context/plan.md` as an ordered, dependency-aware checklist: routes/pages to add, widgets to compose, data shape stubs, actor fixtures, route/endpoint dependencies, and which gaps require user decisions before implementation.
- For UI-heavy work, include a design-preview checkpoint in the plan before implementation begins: expected composition, screen structure, and desktop/mobile notes that the user can sanity-check.
- When building ahead of a future architecture, record the interim contract and the expected convergence point so later cleanup is deliberate rather than accidental.
- Include the coverage ledger from EXTRACT/DESIGN so it is obvious which PRD use cases are being built now and which are not.
- Stop and surface the gap list to the user if any P0/P1 workflow, linked action target, or approval handoff is blocked. Do not silently narrow the build to list/detail pages just because they are easier.

### 4. IMPLEMENT — generate the draft
- Add routes/pages and compose widgets using existing primitives first, then feature-local composition if needed.
- Use the project's existing patterns (look at sibling files before writing new ones).
- Follow `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` for schema structure, server-component page setup, `$ref` resolution, form registration, API response shape, and navigation updates.
- Default to a Server Component page for schema-driven module routes. Resolve schema references on the server before rendering; do not defer `$ref` stitching to client `useEffect` logic.
- When a page schema uses `$ref`, wire server-side schema resolution through the project's resolver helpers so the rendered page receives a fully resolved schema object.
- When defining forms, follow the guide's strict rules exactly:
  - use `type: "form-container"`
  - keep `fields` and `actions` inside `props`
  - use the documented validation array format
  - prefer supported field types from the guide
- Stub data with typed mocks that preserve role, state, and workflow semantics from the spec. Do not use unrelated domain data or generic placeholder schemas when the PRD is domain-specific.
- Match API response shape to widget expectations. In particular, `data-table` expects a flat array unless the schema explicitly sets `dataSource.valueKey`; do not return wrapped payloads accidentally.
- When creating mock/proxy API routes, cover every path the drafted schemas call. A schema action or table data source pointing at an unhandled sub-path is an implementation failure, not an acceptable stub.
- Build the linked action targets for the scoped surface. If a page exposes `Add Member`, `Remove via LWD`, `Accept Quote`, or similar actions, those routes must exist or the action must be intentionally removed with the user's approval.
- Dynamic detail pages must consume route params and render route-specific data; they cannot return the same static record for every id.
- If a new widget is clearly required, build it properly:
  - place it in the appropriate widget/ui directory
  - register it in the widget registry
  - define or extend the config/type contract
  - support loading, empty, error, and interaction states required by the target workflow
  - add focused tests and at least one real route/schema usage
  - avoid placeholder widgets that only satisfy the immediate screen visually
- If you create or modify form schemas under `schemas/forms/`, run the form registry generation step required by the guide.
- After adding or changing forms under `schemas/forms/`, run the registry generation step before claiming the modal/sheet flow works. Treat skipped form registration as a real implementation bug.
- Keep diffs minimal and idiomatic — no speculative abstraction.
- Log to `agent_logs/engineer.log` with `files_changed`, `components_used`, `mocks_introduced`.

### 5. ALIGN — self-review against the design system
- Re-read each new file. Verify every imported component exists and is used with valid props (cross-check against the component's source).
- Check: a11y basics (labels, button semantics), loading/empty/error states present where the extractor identified them, no hardcoded colors/spacing that bypass tokens.
- Check route and action integrity: every `navigate` target resolves to a real page, every referenced API endpoint exists or is implemented in this run, every dynamic page reads its params, and no screen contains dead-end actions.
- Check PRD fidelity: the built page uses the right business domain, states, validations, and actor model; a generic unrelated schema is not acceptable just because it renders.
- Check implementation-guide compliance:
  - page routes use the correct server/client boundary for schema rendering
  - `$ref` schemas resolve server-side
  - form schemas follow `form-container` structure exactly
  - `schemas/forms/index.ts` generation step was run when needed
  - API responses match the consuming widget's expected shape
- Log to `agent_logs/reviewer.log`. Any violations → fix in place, then re-log.

### 6. VERIFY — prove the scoped workflows are actually covered
- Generate or update tests for the scoped routes. Prefer `/specs-to-tests` if the new or changed routes do not already have meaningful workflow coverage.
- Run the relevant test suite(s). Do not treat schema-render tests alone as sufficient for pages that include transactional actions, approvals, uploads, or state transitions.
- Fail the stage if the build only proves rendering while leaving the scoped workflow untested.

### 7. SHIP — preview, verify, deploy (shareable demo)
- Invoke the `/preview-and-deploy` skill. Pass `--routes=` listing every new route this run added so they get smoke-checked.
- That skill runs lint + tests, builds with `npm run preview`, asks the user to confirm, then runs `npm run deploy` and returns a shareable Cloudflare URL.
- **Do NOT substitute `npm run dev` or raw curl checks for this stage.** A dev-server smoke-check is not a build. Do not write `agent_logs/shipper.log` until `/preview-and-deploy` has actually been invoked and returned an outcome.
- Only write `agent_logs/shipper.log` after `/preview-and-deploy` completes. Record its pass/fail gates, the deployed URL (or failure reason), and any caveats.
- This stage is **skippable** if the user passed `--no-deploy` to `specs-to-draft`. If skipped, do not create a shipper.log — absence of the file signals the stage was intentionally omitted.

## Operational constraints
- **No hallucinated shared components.** If `src/components/ui/foo.tsx` doesn't exist, you can't import `Foo`. But you may build a real new widget when the workflow clearly requires it and the implementation is brought up to repo quality.
- **Logs are the handoff.** Each stage's log is the source of truth for the next stage. Don't rely on conversation memory across stages.
- **No silent scope reduction.** If the PRD's golden path includes transactional pages, approvals, uploads, or linked detail pages, you must either build them, explicitly mark them deferred with user signoff, or stop on a blocker.
- **Honor the repo's front-loading preference.** Prefer reusable foundational work over the narrowest throwaway slice when the extra upfront effort is still tractable within the scoped draft.
- **Stop on blocking gaps.** If a P0/P1 workflow truly cannot be composed safely, stop after PLAN and ask the user how to proceed.
- **No dead-end UI.** A drafted page is incomplete if its visible actions navigate to nonexistent routes or call nonexistent endpoints.
- **Domain fidelity matters.** Never satisfy a group-life screen with an unrelated generic claims or demo dataset just because the widgets render.
- **Build new widgets deliberately.** A new widget is acceptable only if its config contract is explicit, its behavior is tested, and it is integrated like a first-class primitive rather than a one-off hack.
- **File proposals for broader system work.** Use `/propose` when the issue is a larger architecture/design-system decision, not just because a missing widget exists.
- **No new top-level deps** without asking. Prefer what's already in `package.json`.
- **Workflow verification is required.** If the scoped surface contains approvals, uploads, state transitions, or role-specific actions, add or update tests that execute those behaviors rather than only checking labels.

## Kickoff
1. Create `agent_logs/` and `context/` if missing.
2. Read `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md`, then list `docs/specs/` and the component directories to ground the run.
3. Begin EXTRACT. Proceed through the pipeline, logging after each stage.
4. End with a short report: spec(s) processed, coverage ledger, screens/routes drafted, workflow actions implemented, components used, gaps surfaced, files changed, and how to run/view the draft.
