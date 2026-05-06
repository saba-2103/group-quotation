---
name: specs-to-tests
description: Autonomous pipeline that turns Markdown specs into executable functional and workflow tests. The PRD is the ABSOLUTE source of truth for journeys, roles, validations, state transitions, and expected UI renders. When tests fail, failures are classified as test-bugs vs implementation-bugs; implementation-bugs auto-trigger /build-feature for remediation. Trigger with "/specs-to-tests", "write tests for specs", or "create functional tests".
---

# Specs-to-Tests Orchestrator

Run a verb-driven, multi-stage pipeline that reads product specs (or `usecases.json` from `extract-usecase`), the implemented route surface, and generates functional tests that ensure the app matches the business requirements.

## Core Principle: PRD = Contract

- The PRD (and the extracted use cases) is the single source of truth for actors, workflows, validations, state transitions, and all UI acceptance criteria (labels, actions, tabs, table columns).
- The JSON schemas are mere implementation details. If the schema is missing a field the PRD requires, that is an implementation bug, not a spec issue.
- A green suite is only meaningful if it proves the implemented workflow exactly matches the business requirements.

## Inputs
- `$ARGUMENTS` — optional. May be:
  - a specific spec path (e.g. `docs/specs/Foo_PRD.md`)
  - a feature/screen name to focus on
  - empty — process every `*.md` under `docs/specs/`

## Source-of-truth locations (verify before using)
- Handoff entry point: `context/HANDOFF.md`
- Core memory: `context/CORE_MEMORY.md`
- Specs (PRD): `docs/specs/*.md`
- Schemas (widget JSON): `schemas/*.json`
- Test Directory: `tests/e2e/` (create if missing)
- App Routes: `src/app/`
- Route/action implementations: `src/app/api/`
- Logs: `agent_logs/`
- Existing skills: `.claude/skills/*/SKILL.md`

## Pipeline (run sequentially; log after every stage)

### 1. EXTRACT — parse specs into workflows
- Read `context/HANDOFF.md` if it exists, then `context/CORE_MEMORY.md`, before extracting so the test plan inherits the repo's current priorities and active workstreams.
- Strongly prefer executing or reading from the `extract-usecase` skill (i.e. `agent_logs/usecases.json`) to get a highly structured, domain-accurate representation of the PRD.
- If `usecases.json` is missing, read the target specs and extract complete workflows, roles, validations, action permissions, and state transitions using the SaaS AI Insurance persona.
- Read the implemented route surface under `src/app/` to map routes against the expected business actions.
- Do not extract expectations from the JSON schemas; instead, derive every required field, table column, title, and action from the PRD/Use Cases.
- Map out both **happy path** and **error paths** for these workflows.
- Identify workflow-critical assertions: role switching, approval handoff, blocked self-approval, LWD guards, claim eligibility, renewal lock/acceptance guards, secure downloads, upload states, and missing-route failures.
- Emit `agent_logs/test-extractor.json` (structured workflow map) and `agent_logs/test-extractor.log`.

### 2. DESIGN — map workflows to test cases
- Generate three layers of tests:
  - **Render contract tests** derived from the PRD/Use Cases
  - **Route/action integrity tests** that prove visible actions resolve to real routes/endpoints
  - **Workflow tests** that execute multi-step business behavior from the PRD
- For each page, generate render-contract cases that assert:
  - **Structural:** Page header title/description matches schema `page-header.props.title`
  - **Action buttons:** Every action defined in `page-header.props.actions[].label` is visible
  - **Sections:** Every `section-group.props.title` is visible
  - **KPIs:** Every `metric-card.props.label` is visible
  - **Data table columns:** Every `data-table.props.columns[].header` is visible
  - **Filters:** Every `filter-bar.props.filters[].label` is visible
  - **Tabs:** Every `tabs-container.children[].props.label` is visible
  - **Quick actions:** Every `quick-links-widget.props.links[].label` is visible
  - **Breadcrumbs:** Every breadcrumb label is visible
  - **Empty states:** `emptyState.title` and `emptyState.description` exist in the schema
- For route/action integrity tests:
  - every visible `navigate` target resolves to a non-404 page
  - every visible API action resolves to an implemented endpoint or fails with an intentional, asserted application state
  - every dynamic detail page uses the route id rather than rendering the same static record for all ids
- For workflow tests:
  - navigation between pages via sidebar and in-page actions
  - tab switching on detail pages where relevant
  - role-switching and actor handoff where the PRD demands Maker/Checker or scoped visibility
  - negative guards for high-risk rules from the PRD
- If the product has no real auth or role fixture mechanism yet, do not fake role-switching with test descriptions. Instead, write a failing implementation-gap test or record the missing harness as an implementation bug.
- Log to `agent_logs/test-architect.json` and `agent_logs/test-architect.log`.

### 3. IMPLEMENT — write the test code
- Generate Playwright test files in `tests/e2e/`.
- **Hardcode expected values from the PRD directly** in test files to derive expected behaviors:
  ```ts
  // Derived from PRD/Usecases: Dashboard must show "Portfolio Summary"
  await expect(page.getByText('Portfolio Summary')).toBeVisible();
  ```
- Do NOT import JSON schemas as the source of truth, as the schema itself may contain bugs or drift from the spec.
- Add helpers/fixtures for route existence, action traversal, role/session setup, and seeded workflow execution where applicable.
- Use shared helpers from `tests/e2e/helpers.ts`, but extend them if they only support render smoke checks.
- Log to `agent_logs/test-engineer.log`.

### 4. VERIFY — execute and classify failures
- Run the test suite: `npx playwright test tests/e2e/`
- Capture failures. **Classify each failure:**
  - **Test-bug:** Wrong selector, import error, timing issue → fix in-place and re-run
  - **Implementation-bug:** PRD or schema says behavior X must exist, but the app cannot execute it, route to it, authorize it, or render it correctly → log as a bug for remediation
- Self-heal test-bugs (up to 3 rounds).
- Missing auth/role harness, missing routes, dead-end actions, static-detail misuse, schema/UI divergence, and absent workflow transitions are all implementation bugs, not reasons to weaken the suite.
- Log to `agent_logs/test-verifier.log`.

### 5. REPORT — present results and trigger remediation
- Produce a final report:
  - Workflows tested, roles simulated
  - Pass/Fail counts
  - **Bug Report:** List of implementation-bugs (schema contract violations)
- Call out what this skill did **not** prove when relevant: schema-green tests do not automatically guarantee visual quality such as equal card sizing, mobile table usability, or spacing/alignment polish in progress indicators.
- Separate the report into:
  - render-contract coverage
  - route/action integrity coverage
  - workflow/role coverage
- If implementation-bugs exist:
  - Generate a structured bug description for each
  - Ask the user: *"Found N implementation bugs. Run /build-feature to fix them?"*
  - If user approves, invoke `/build-feature` with the bug description as input
- Stop and present the report.

## Bug → Build-Feature Handoff Format

When handing off to `/build-feature`, format the input as:

```
BUG FIX: [page-name] — PRD/schema workflow contract violation

Schema: schemas/[name].json
Route: /mph/[route]
Test: tests/e2e/[file].spec.ts

Expected (from PRD/schema):
  - [workflow, route, role, or render expectation]
  - [other assertions]

Actual (from test run):
  - [missing route / dead action / wrong role behavior / wrong render output]
  - [other discrepancies]

Root cause hypothesis: [missing route | static detail page | absent workflow state handling | widget/render bug | authorization gap].
```

## Operational constraints
- **Honor repo memory.** If the repo context records a strategic preference such as front-loading foundational coverage or preserving handoff logs, reflect that in the test plan and reporting.
- **PRD defines everything.** Never weaken a workflow test or rendering test just because the current UI/schema is simpler than the spec. The spec is the contract.
- **Test complete workflows.** Not just isolated buttons or visible labels.
- **No fake role coverage.** If Maker/Checker or scoped roles matter, either execute them through a real harness or fail the implementation for lacking one.
- **Assert route integrity.** A visible action that points to a missing route or endpoint is a bug.
- **Autonomous through VERIFY.** Only stop at REPORT.
- **Self-Healing:** Fix test-bugs in-place. Do NOT fix implementation-bugs in tests — those flow to /build-feature.

## Kickoff
1. Create `agent_logs/` and `tests/e2e/` if missing.
2. Read the spec(s) AND all referenced schemas.
3. Proceed through EXTRACT → DESIGN → IMPLEMENT → VERIFY.
4. Deliver the final REPORT with bug classification.
