# Session Log — Group PAS V1 Frontend

This file is the running record of plans, decisions, and actions for the Group PAS V1 frontend build.
Update it before stopping work so any AI tool (or human) can pick up where we left off.

## How to use this log

- Before starting any non-trivial task, append a dated entry stating what you are about to do.
- After completing it, edit the entry with results, tests run, files touched, and next steps.
- If a task spans multiple sessions, add a continuation note rather than overwriting.
- When status of a phase or proposal changes, update [context/HANDOFF.md](HANDOFF.md) Active Workstreams in the same commit.

---

## Context

**Repo:** keystone-ui
**Branch:** feat/design-system-pass-a (current; all V1 work happens on this branch unless explicitly branched)
**Product:** Group PAS — Quotation, Issuance (Proposal + PolicyMember + Census), Policy Admin (Client/Policy/Member)
**Backend specs:** `<group-pas-repo>/spec/` — see [HANDOFF.md → Local environment](HANDOFF.md#local-environment) for how to resolve `<group-pas-repo>` on your machine.
**Backend blueprint:** `<group-pas-repo>/plans/team_nb_blueprint_v3.md`
**V1 implementation plan:** [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md)

---

## Actions taken

### 2026-05-06 — Plan locked, process scaffolding transferred

- Backend specs and blueprint reviewed; plan written at [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md) with per-task context, outputs, and acceptance criteria.
- Architecture decision: stay on existing keystone-ui schema-driven arch for V1; defer the PDF spec's `frontendProjection` pattern. State-aware actions handled via per-schema `stateActions` map + new `ActionBar` widget.
- Process scaffolding transferred from `feature/2026-05-02-auth-module-2`:
  - `.claude/skills/` — full skill set copied as-is.
  - `proposals/TEMPLATE.md` and `proposals/README.md` copied; auth-specific PROP-NNNN files intentionally left out.
  - Fresh `context/HANDOFF.md`, `context/SESSION_LOG.md` (this file), `context/CORE_MEMORY.md`, `context/ARCH_TRANSITION.md` — process preserved, contents reset for group-pas V1.
- Next: kickoff Phase 0 (teardown of legacy quotations module).

### 2026-05-22 — Schema-driven framework reference docs

- **Branch:** `docs/schema-design-reference` (branched from `origin/main` at `37772c00`).
- **Trigger:** developers requested a comprehensive reference beyond `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` — something covering every widget, every hook, every action type, plus recipes and troubleshooting.
- **Work done:** wrote 14-file multi-page reference under `docs/schema-design-reference/`:
  - `README.md` (entry + ToC), `01-architecture.md`, `02-widget-catalog.md` (all 21 registered widgets), `03-schemas.md`, `04-data-sources.md`, `05-actions.md`, `06-forms.md`, `07-state-and-conditions.md`, `08-pages-and-routing.md`, `09-api-routes.md`, `10-design-system.md`, `11-cookbook.md` (15 recipes), `12-troubleshooting.md`, `13-glossary.md`.
  - ~5300 lines / ~190KB total. Grounded in real code — verified against `src/types/widget.ts`, `WidgetRenderer.tsx`, `WidgetRegistry.tsx`, `useSmartQuery`, `useActionHandler`, `schemaResolver.ts`, `endpointUtils.ts`, `conditions.ts` at branch HEAD.
- **Commit:** `7f54435c docs(schema-ref): add comprehensive schema-driven framework reference` — pushed to `origin/docs/schema-design-reference`.
- **Tests:** N/A (docs only). Verified file structure with `ls`, line counts with `wc -l`.
- **Files changed:** 14 new files under `docs/schema-design-reference/`. Nothing in `src/`.
- **Open PR:** https://github.com/Anaira-AI/keystone-ui/pull/new/docs/schema-design-reference
- **Earlier in session:** reviewed PRs #67, #68, #69, #70 (claims module / schema-arch implementation by another dev) — posted formal `gh pr review` comments per PR with cross-cutting concerns plus targeted inline comments on specific lines. Reviews are `COMMENT` (non-blocking), not `REQUEST_CHANGES`.
- **Next steps:**
  - Open the PR for the docs branch and merge.
  - Consider linking the new reference from `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` as the canonical follow-up.
  - Long-term: the page-level `{{id}}` walker pattern documented in `08-pages-and-routing.md` is fragile (called out explicitly in the docs). A proposal to move substitution into `useSmartQuery`/`useActionHandler` would close this gap — flagged in the PR #69 review as well.

### 2026-05-22 — DevOps platform CI/CD trial (skill-driven run on feat/cicd-skill-trial)

**Goal:** Re-run the devops-platform onboarding using the bundled `/cicd-onboarding` skill (vs. the earlier hand-built attempt on `feat/cicd-devops-platform`) to test whether the skill closes the gaps the hand-built run hit.

**Approach:** Fresh branch `feat/cicd-skill-trial` from `origin/main`. Invoked the skill with `Option 3 — Full scaffold`. Skill auto-detected Next.js + port 3000 + health `/`, generated the security-hardened helm chart from `devops-platform/.claude/skills/cicd-onboarding/templates/helm/`, generated pre-commit + sonar config, and ran Step 7 — repo variables auto-set via `gh variable set`.

**Repo variables set this run** (not present during the first trial): `SONAR_PROJECT_KEY=keystone-ui`, `SONAR_HOST_URL=https://sonar.anairacloud.com`, `EKS_CLUSTER_NAME_DEV=anaira-dev`, `DEV_APP_URL=https://keystone-ui-dev.anairacloud.com`, `DEV_NAMESPACE=dev`.

**Run:** [run 26271846417](https://github.com/Anaira-AI/keystone-ui/actions/runs/26271846417). Overall conclusion **failure** but materially better than the hand-built run.

**What flipped from ❌ → ✅:**
- **Helm Lint** — chart now renders cleanly without `--set image.repository`. Skill's template uses `{{ .Values.image.tag | default .Chart.AppVersion }}` instead of `required` validators.
- **SonarQube** — `QUALITY GATE STATUS: PASSED`. Failure on the first run was due to missing `SONAR_HOST_URL`/`SONAR_PROJECT_KEY` vars; Step 7 fixed it.
- **Checkov k8s findings** — `Passed: 89, Failed: 0` on the helm chart (vs many failures on the bespoke chart). Security context, networkPolicy, serviceaccount, runAsNonRoot/65534, readOnlyRootFilesystem, capabilities drop ALL, seccompProfile RuntimeDefault all baked into the skill's templates. The only remaining Checkov finding is a single Dockerfile check (informational).

**What still failed (unchanged from first run — these are repo-side, not platform/skill-side):**
- `Unit Tests` — pre-existing testing-library failures in `FormContainer`, `DataTable`, `QuotationListTable`. Still blocks `image-build` → `publish` → `Trivy` → `deploy-dev` (correct by design).
- `SAST (CodeQL)` — repo needs GitHub Advanced Security enabled (org admin setting).
- `OWASP DC` — high-CVSS findings in `node_modules`. `continue-on-error: true`.
- `pre-commit` — trailing whitespace + EOF newlines across the repo (auto-fixable).

**Files generated by the skill (vs hand-built run):**
- `.github/workflows/ci-cd.yml` — from `javascript-ci-cd.yml` template (node bumped 20→24 to match Dockerfile; trial branch added to push trigger).
- `.pre-commit-config.yaml`, `sonar-project.properties` — from skill templates.
- `helm/keystone-ui/` — **entire chart replaced** with skill templates: Chart.yaml, values.yaml, values-dev.yaml, _helpers.tpl, deployment.yaml, service.yaml, ingress.yaml, serviceaccount.yaml, networkpolicy.yaml, configmap.yaml, external-secret.yaml, secret-store.yaml. ESO templates conditionally rendered; disabled because no DB detected.
- 5 repo variables set via `gh variable set` (would have eliminated the Sonar failure in the first trial too).

**Verdict:** The skill is materially more effective than reading SKILL.md and hand-building. Three of the four meaningful failure classes from the first run closed automatically (helm lint, Sonar, Checkov). The remaining failures are repo bugs (broken tests) or org settings (GHAS) that no scaffolding skill can fix.

**Architectural gap unchanged:** `03-deploy-dev` still assumes EKS+IRSA, keystone-ui dev cluster is still K3s. Existing per-PR preview deploy still has no platform equivalent. Both flagged in the earlier session entry.

### 2026-05-22 — Resolve remaining CI failures on feat/cicd-skill-trial (worktree)

**Goal:** Fix unit-test failures at the root, clear pre-commit findings, port per-PR preview deploy (Option A), prove the pipeline goes green end-to-end now that GHAS is enabled and AWS_CI_ROLE_ARN/SONAR_TOKEN org secrets exist.

**Worktree:** All changes done in `~/dev_anaira/sandbox/keystone-ui-cicd-trial` (git worktree on `feat/cicd-skill-trial`) so the other active session on `docs/schema-design-reference` was not disturbed.

**Run:** [run 26282145180](https://github.com/Anaira-AI/keystone-ui/actions/runs/26282145180) — **overall conclusion `success`**. First green pipeline; image is pushed to ECR with cosign signature.

**Test failure investigation — every "test bug" was a real component bug.** 92 failing tests → 220/220 passing, no skips. Root causes fixed:

1. **FormControl Slot couldn't reach the input.** `FormControl` (Radix Slot) tried to merge `id={formItemId}` into `<FieldRenderer>`, but FieldRenderer is a plain function component that didn't forward the prop, so `<FormLabel htmlFor={formItemId}>` always pointed at a non-existent id. Fixed FieldRenderer (and each variant — Input, Textarea, Select, Radio, Checkbox, Date, api-dropdown) to read `formItemId`/`formDescriptionId`/`formMessageId`/`error` from `useFormField()` and apply them to the focusable element.
2. **Submit button stayed disabled while form was invalid.** `disabled={!isValid || isSubmitting}` meant users on an empty required form couldn't even click submit, so they never saw validation errors. Now `disabled={isSubmitting}`.
3. **Cancel/non-submit action buttons triggered form submission.** `<Button>` defaults to `type="submit"` inside a `<form>`. Added `type="button"` on all `ActionButton` render paths.
4. **DataTable rendered both mobile and desktop views.** Tailwind `hidden md:block` only hides via CSS media queries — jsdom doesn't apply them, so testing-library saw both copies. Also doubled production DOM weight. Switched to `useIsMobile()` conditional rendering; added `window.matchMedia` polyfill to `setupTests.ts`.
5. **TablePagination always rendered nav buttons** even with 1 page. Hidden when `pageCount <= 1`.
6. **ViewField didn't auto-detect yes/no selects.** Selects with exactly `{yes, no}` options now render as `<Badge>`. Same for checkboxes (boolean semantics).
7. **FormContainer used inline `gridTemplateColumns` style** instead of Tailwind `md:grid-cols-N`, breaking responsive layout. Now uses literal `md:grid-cols-{1..4}` classes (Tailwind JIT-detectable) with inline-style fallback for N>4. Same pattern for `col-span-N`.
8. **Form submit was silent when no submitAction was configured.** Now logs payload via `console.log('Form Submitted (No Endpoint configured):', payload)` so schema authors can see what would be sent.

**Test rewrites (architecture moved, not skips):**
- `FilterBar.unit.test.tsx` — component was refactored from URL params (`router.push`) to widget-state actions via `useActionHandler` + `useWidgetState`. Rewrote the 7 affected tests to mock the new abstractions and assert on `update-widget-state` dispatches.
- `CreateQuotationForm.test.tsx` — `CalendarDatePicker` is popover-based, so `user.type()` can't drive it. Added `makeConfigWithDateDefaults()` helper that injects `defaultValue` on date fields for submission-flow tests. Picker UX is covered in dedicated CalendarDatePicker tests.
- DataTable date test updated to assert tenant-formatted `15/06/2024` instead of raw ISO `2024-06-15`.

**Pre-commit findings:** Cleared via sed-driven trailing-whitespace + EOF-newline pass across ~100 source/config files. No semantic changes. CI's pre-commit still reports 1 finding from a file my sed pass missed; non-blocking (`continue-on-error: true`).

**Per-PR preview deploy ported (Option A):** Added `deploy-preview` job to the new caller `ci-cd.yml` as a sibling to platform `deploy-dev`. Uses the EKS auth path (`AWS_DEPLOY_ROLE_ARN_DEV` + `aws eks update-kubeconfig`) since the cluster is migrating off K3s. Migrated `preview-cleanup.yml` to the same EKS pattern. Decision recorded: promote to platform `04-deploy-preview.yml` only when a second service asks for the pattern.

**Final state — pipeline jobs:**

| Job | Conclusion | Notes |
|---|---|---|
| pre-commit | ❌ (informational) | 1 trailing-whitespace finding my sed missed |
| Build | ✅ | |
| Unit Tests | ✅ | **220/220 passing** |
| SAST (CodeQL) | ✅ | GHAS now enabled |
| Gitleaks | ✅ | |
| Helm Lint | ✅ | |
| SonarQube | ❌ (informational) | Quality gate failed — needs review of issues on dashboard |
| Checkov | ❌ (informational) | 1 Dockerfile finding remains, 89/89 k8s checks pass |
| OWASP DC | ❌ (informational) | High-CVSS deps in node_modules |
| Image Build | ✅ | First time it actually built |
| Container Scan (Trivy) | ❌ (informational) | HIGH/CRITICAL CVEs in base image |
| **Publish (ECR + cosign)** | ✅ | **First cosign-signed image pushed** |
| deploy-preview | ⏭ skipped | Push event, not PR |
| deploy-dev | ⏭ skipped | Not on dev/develop branch |

**Open items (next session):**
1. Trivy HIGH/CRITICAL CVEs — likely from `node:24-alpine` base image. Either bump to a fresher tag or accept the risk per policy.
2. SonarQube quality gate — open dashboard, triage findings.
3. OWASP DC — `npm audit fix` pass, or document accepted CVEs.
4. Pre-commit remainder — actually run `pre-commit run --all-files` locally with `pre-commit` installed; one file slipped through the sed pass.
5. Open a PR from `feat/cicd-skill-trial` to `main` to verify `deploy-preview` actually deploys to EKS.

### 2026-05-22 — Address PR #71 review comments (Copilot, 8 inline)

**Goal:** Address each of 8 inline Copilot review comments on PR #71 with a focused commit per theme, then reply inline on each thread linking to the addressing SHA (per the new `feedback_pr_review_replies.md` memory). Resolve threads after replies post.

**PR:** [#71](https://github.com/Anaira-AI/keystone-ui/pull/71). All 8 threads now resolved.

**Commits (each addresses one thematic group of comments):**

| SHA | Subject | Comments addressed |
|---|---|---|
| `e9db8394` | `fix(helm): scope fullname by .Release.Name and guard empty ConfigMap data` | 1, 2 |
| `cca08e9e` | `fix(forms): tighten a11y wiring on FieldRenderer (no dangling aria refs)` | 3, 4, 5 |
| `2effc927` | `fix(use-mobile): read viewport synchronously to avoid initial-paint flicker` | 6 |
| `02dc0303` | `fix: gate submit-warning to dev (names only) + drop trial branch trigger` | 7, 8 |

**Critical correctness fixes (would have caused production bugs):**

1. **`keystone-ui.fullname` ignored `.Release.Name`** — every per-PR preview release (`keystone-ui-pr-71`, `…-72`, etc.) deployed into the same namespace would have produced identical Deployment / Service / ConfigMap names, so the second PR would fail with `release already exists` errors. Restored the canonical Helm pattern (`{Release.Name}` if it contains chart name, else `{Release.Name}-{Chart.Name}`).

2. **`configmap.yaml data:` rendered as `null` when env was empty** — Kubernetes API rejects null data on ConfigMap. Added explicit `data: {}` fallback so the ConfigMap always validates.

**A11y fixes (would have failed any accessibility audit):**

3. **`aria-describedby` pointed at dangling `formMessageId`** — `FieldErrors` didn't carry that id, so screen readers got "element not found" warnings. Added `id={formMessageId}` to FieldErrors wrapper + made `useFieldA11yProps` only include the description/message ids when the target elements actually render.
4. **Radio group had no `aria-labelledby`** — `<FormLabel htmlFor={formItemId}>` doesn't label a `<div role="radiogroup">` (htmlFor only labels real form controls). Added `formLabelId` to `useFormField()`, set `id={formLabelId}` on `FormLabel`, and wired `aria-labelledby={formLabelId}` on the radiogroup. Now the FormLabel is the group's accessible name.
5. **Checkbox had two labels** (outer FormLabel + inner inline label) — assistive tech would announce the name twice. Removed the inner label since `{...a11y}` already wires `FormLabel htmlFor` to the checkbox.

**Hydration / UX fixes:**

6. **`useIsMobile` flashed desktop view on mobile devices.** State was initialised to `undefined`, so first paint was always desktop, then an effect re-rendered as mobile. Switched to a lazy initialiser that reads `window.innerWidth` synchronously when `window` exists.
7. **`console.log` of full submit payload could leak PII** in production. Wrapped in `NODE_ENV !== 'production'`, switched to `console.warn`, and now logs only `Object.keys()` (field names, never values). Test updated.

**Workflow cleanup:**

8. **`feat/cicd-skill-trial` was in the workflow's push trigger.** Removed — the PR fires via `pull_request: [main]`, so we don't need the orphan branch trigger living forever after merge.

**Verification:** 220/220 unit tests still pass after each commit. New PR pipeline running ([run 26284578581](https://github.com/Anaira-AI/keystone-ui/actions/runs/26284578581)) to confirm no regression.

**Memory:** Recorded `feedback_pr_review_replies.md` — always reply inline on PR review comment threads with the addressing commit SHA + one-line rationale, then resolve the thread. Never push a fixup commit silently and assume the reviewer will reconnect the dots.
### 2026-05-22 — Cherry-pick core-arch from feat/new-buisiness to main

- **Branch:** `chore/cherry-pick-core-arch` (off `origin/main` @ `37772c00`).
- **Trigger:** the schema-design-reference docs (PR for `docs/schema-design-reference`) document widgets/hooks/utilities that exist on `feat/new-buisiness` but not on `main`. User asked for a cherry-pick PR to bring the framework-level (non-domain) infrastructure forward.
- **Multi-agent pipeline:**
  - **Survey** agent identified 32 candidate commits touching core-arch files (excluding domain widgets + mock backend).
  - **Code review** agent flagged 15+ items including: `useSmartQuery` queryKey missing `pollSchedule`/`stopWhen`, `useActionHandler` recursive dispatch with no cycle guard, `WidgetRenderer` fetching for hidden widgets, `lib/api/client.ts` Bearer token no CR/LF validation, `useDataTable.getNested` vulnerable to prototype pollution, etc.
  - **Feasibility** agent (in an isolated worktree) discovered that **many of the surveyed commits had already been forward-ported to main with subsequent refinements** — cherry-picking by SHA would have regressed main (e.g. main's `useSmartQuery.ts` has a `pollResetSignal` block that the branch lacks).
- **Strategy change:** abandon cherry-pick by SHA, do a file-level port of genuinely-new primitives with the code-review polish baked in.
- **Files brought over** (with polish): `src/lib/api/{client,error-mapper,index}.ts` (new), `src/components/layout/DetailPageSkeleton.tsx` (new), overlay `size` plumbing across `useOverlayStore`/`OverlayProvider`/`useActionHandler`/`types/widget.ts`, `WidgetRenderer` `visibleRoles` gate (before `useSmartQuery`), `schemaResolver` `tables/`/`views/` `$ref` prefixes with path-traversal validation, `useSmartQuery` array-valued params (preserving main's `pollResetSignal`), `useDataTable` `parseJson`/`dataPath` + cross-array join with `Map` index + prototype-pollution defence, type additions on `WidgetConfig`/`DataSourceConfig`/`ActionConfig`/`ColumnConfig`.
- **Deliberately NOT brought** (with reasons inline in PR body): `useRole.ts` changes (main is better — throws on missing context), navigation files (main current), `layout.tsx` (domain-coupled), `WidgetRegistry.tsx` additions (domain widgets), per-role menu key in `AppContextProvider`, domain API modules, mock backend, domain pages, 9 domain widgets.
- **Polish applied during port** (from code review):
  - Bearer token validated against JWT charset (CR/LF header-injection defence)
  - Response `JSON.parse` wrapped in try/catch — non-JSON responses become `ApiError`, not `SyntaxError`
  - `delete` REST verb instead of `del`
  - Empty-string query params preserved (only `undefined`/`null` skipped)
  - Cross-array join uses `Map` index (O(siblings) once) instead of `.find` per row
  - `getNested` uses `hasOwnProperty.call` and rejects `__proto__`/`constructor`/`prototype`
  - `$ref` filename validated against `/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.json$/` (rejects `..` and absolute paths; allows `subdir/file.json`)
  - `useOverlayStore.OverlayOptions` typed against shared `OverlaySize` union
  - `visibleRoles` evaluated before `useSmartQuery` so hidden widgets don't fetch
- **Verification:**
  - `npx tsc --noEmit` — clean
  - `npx eslint` — same 15 errors as main baseline (pre-existing `any` usage; zero regressions)
  - `npm run build` — `✓ Compiled successfully`
  - `npm test` — 5 failed suites / 92 failed tests, identical to main's pre-change baseline
- **Commit:** `4c065f87 chore(core-arch): port framework-level changes from feat/new-buisiness` (517 +, 32 −, 17 files)
- **PR:** https://github.com/Anaira-AI/keystone-ui/pull/72
- **Follow-ups:**
  - Cross-cutting consolidations flagged by code review (two error-envelope parsers, two query-param serializers, two `getNested` walkers in `useDataTable` and `KeyValueGrid`) — out of scope here; worth a follow-up cleanup PR.
  - The 13 domain widgets (`info-card`/`accordion-group`/`card-grid`/`plan-card`/`editable-table`/etc.) remain on their feature branches by design; bring them across module-scoped when needed on main.
- **Same-day related:** also pushed `50a519a6` on `docs/schema-design-reference` (the docs PR) which references feat/new-buisiness widgets and lib/api with paths so developers know where to find them until they land on main.

### 2026-05-22 — Consolidate PR #65 into PR #72 (round 2 on chore/cherry-pick-core-arch)

- **Trigger:** noticed PR #65 (`chore/v0-uplift-from-new-buisiness`) was doing substantially the same work — older, broader scope (also includes `CardGrid` + `PollingBanner` + type extensions + GIT_SAFETY docs), and had received 21 Copilot bot inline review comments. After comparing scope file-by-file, decided to consolidate on PR #72 rather than blind-close one in favour of the other.
- **Why #72 not #65:** my code-review pipeline had already excluded three regressions that Copilot independently flagged on #65 — silent `useRole` fallback, `useActionHandler` re-throw after toast, removed `useSmartQuery.pollResetSignal`. Plus #72 had polish #65 lacked: CR/LF token validation, JSON.parse try/catch on success, `delete` verb, empty-string-preserving query params, path-traversal regex on `$ref`, `WidgetRenderer.visibleRoles` evaluated before `useSmartQuery`, Map-indexed cross-array joins, prototype-pollution defence in `getNested`.
- **Round-2 commit** `51ba9be0 chore(core-arch): polish + broader scope from PR #65 — consolidate` (10 files, 368+, 30−):
  - **New files:**
    - `src/lib/objectPath.ts` — shared `getNested` with prototype-pollution defence (eliminates the duplication Copilot flagged on #65 — four near-identical copies).
    - `src/components/widgets/data/CardGrid.tsx` — ported with Copilot fix: looks up `WidgetRegistry[cardWidgetType]` once and emits a single "unknown card widget type" notice instead of N "Unknown Widget" fallbacks.
    - `src/components/widgets/state/PollingBanner.tsx` — ported with two Copilot fixes: `isMissing(0)` now returns false (zero is a present value, not pending); `pendingWhenMissing` memoized against a JSON-stable signature so the effect doesn't churn.
  - **Polish on round-1 files:**
    - `useDataTable.ts` — drop local `getNested`, import from `@/lib/objectPath`. Stabilise memo deps to scalar derivations so the resolver doesn't re-run every render when callers pass fresh inline `dataSource`/`columns`.
    - `lib/api/error-mapper.ts` — `parseSpringError` guards against non-object JSON bodies before reading `.message`.
    - `lib/api/client.ts` — `buildUrl` repeats keys for arrays (`?state=A&state=B`) matching `useSmartQuery`'s convention.
    - `DataTable/index.tsx` — consumes `dataError` so `dataPath`/`parseJson` resolver failures render the error state.
    - `WidgetRegistry.tsx` — registers `card-grid` and `polling-banner`.
  - **Type extensions:** `KeyValueField.fallbackKey` (data/types.ts); `FormFieldValue | File | null` + `FormFieldConfig.accept` (formContainer/types.ts).
- **Deliberately NOT brought from #65** (would regress main; Copilot also flagged these): silent `useRole` fallback, `useActionHandler` re-throw, removal of `pollResetSignal`, role-keyed `AppContextProvider` query (server doesn't read role + no encodeURIComponent), personal-history `GIT_SAFETY.md`/`SESSION_LOG.md` noise.
- **Verification:** `tsc --noEmit` clean; `npm run build` ✓; `npm test` 5 failed / 92 failed — identical to main's pre-change baseline. Zero new regressions.
- **Next:** close PR #65 with link to #72 as the consolidated path.

### 2026-05-25 — PR #72 review round (Copilot inline + multi-agent deep review)

- **Trigger:** user asked for review of Copilot feedback on PR #72, then for an `/ultrareview`-equivalent in-depth review.
- **Round 1 — Copilot inline comments (commit `d6fddd3b`):** three valid inline review comments addressed:
  - `src/lib/api/error-mapper.ts:3` — dropped personal `/Users/...` filesystem path from header comment.
  - `src/hooks/useDataTable.ts:175` — select-filter option derivation switched from `row[col.accessorKey]` to `getNested(row, col.accessorKey)` so dotted accessorKeys produce the same options the cells render.
  - `src/hooks/useDataTable.ts:112` — join enrichment switched from flat `enriched[accessorKey] = …` to a new `setNested` helper in `src/lib/objectPath.ts`, so dotted accessorKeys round-trip with the `accessorFn + getNested` read path. Replied inline on each thread with the commit SHA per the PR-review-replies feedback in memory.
- **Round 2 — in-depth multi-agent review (commit `42294325`):** spawned three parallel reviewers (correctness, security, architecture) against `origin/main...HEAD`. No blockers found. Landed the five high-leverage items the reviewers converged on:
  1. **`setNested` scalar-collision defence** — refuses to overwrite a non-null non-object intermediate (e.g. row `{ amount: 42 }` with join target `amount.label`). Dev-mode `console.warn` + skip preserves the original field. Return type changed `void → boolean` so callers can detect skipped writes.
  2. **`useDataTable` empty-accessorKey guard** in the join loop — defensive, since `getNested("")` returns the row but `setNested("")` is a no-op (asymmetric).
  3. **`visibleRoles` doc + dev warning** — JSDoc now explicitly states "NOT a security boundary, RBAC must be enforced server-side" and documents that `[]` means "no role can see it" (inverts the codebase's usual "empty = no constraint" convention). `WidgetRenderer` logs a dev warning when it sees an empty array — catches the "composed `[...someList]` came up empty" footgun.
  4. **`_placeholder.json` documentation** — added a paragraph to `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` explaining the Webpack dynamic `$ref`-import template needs at least one matching `.json` at build time in each `schemas/<dir>/` referenced from a `$ref` — and "do not delete the placeholder when cleaning up empty folders" (would silently break prod).
  5. **`src/tests/unit/lib/objectPath.unit.test.tsx`** — 17 unit tests for `getNested` + `setNested` covering flat/dotted round-trip, scalar-intermediate refusal, prototype-pollution rejection, empty-path handling, inherited-property safety. All passing. First tests for these primitives.
- **Verification:** `tsc --noEmit` clean; 17/17 new tests pass; full suite shows pre-existing branch failures (92 fail) unchanged by my edits — confirmed by stash-and-compare.
- **Follow-ups deliberately not committed** (worth filing as proposals if/when they bite):
  - Three parallel fetch paths (`useSmartQuery`, `useActionHandler.mutateAsync`, `lib/api/client`) need to converge on a single transport with shared auth-header handling before Keycloak lands.
  - Virtual-column model for cross-array joins (read straight from the index, no row mutation).
  - `KeyValueGrid` still has its own `getNested` — flip to `@/lib/objectPath`.
  - `useActionHandler.mutateAsync` reimplements `parseSpringError` inline.
  - `PollingBanner` stale-data flash on re-trigger (TanStack cache returns previous response for one render).
- **Commits:** `d6fddd3b` (Copilot fixes), `42294325` (multi-agent review fixes). Both pushed to `chore/cherry-pick-core-arch`. PR #72 still open.

### 2026-05-25 — Page-envelope pattern: `dataSource.select` + `fromParent`

- **Trigger:** conversation explaining the backend's CQRS model (the `group-pas` spec layout — `.command` / `.query` / `.event` / `.projection` files; `PolicySummaryDto` flattens `clientName`/`clientNumber` from the Client aggregate). User then asked for an architectural eval of `docs/schema-design-reference/` against a CQRS backend, then drilled in on recommendation #1 (page-envelope: one root fetch, children slice).
- **Eval verdict in chat:** the schema-driven framework is **structurally well-aligned** with CQRS — `dataSource` vs `ActionConfig` mirrors the backend's `query-set` vs `command-set` split, polling primitives already address read-after-write lag, `frontendProjection` evolution is already planned in [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md). Real seams (per-widget fetching encouraging N+1, URL-shaped `refreshKey` vs aggregate-shaped invalidation, `stateActions` duplicating backend authorization, manual `{{id}}` substitution, no event-stream primitive) are evolution targets, not deal-breakers.
- **Drill-in:** the recommended **page-envelope** pattern was *not* a docs-only change — `WidgetRenderer` pipes fetched data only to the widget that *owns* the `dataSource`; descendants get no inherited data path. `dataPath` today is widget-local (drills into the widget's own response), not parent-relative. Required real framework code.
- **Design eval — TanStack Query dedup vs React Context:**
  - Naive Context is *slower* than TanStack dedup unless you (a) memoise the Provider value and (b) ship `use-context-selector` for fine-grained subscription.
  - TanStack dedup loses on **silent N+1 risk** (a typo in `params` breaks dedup with no warning) and **explicitness** (no schema marker saying "I consume the ancestor envelope").
  - Picked the **hybrid**: small Context carrying only the parent's `queryKey`; children with `fromParent: true` subscribe to the same cache entry via their own `useQuery`. Loading/error granularity stays per-widget; refresh-key invalidation, polling, `stopWhen` all continue to work because it's the same cache entry.
- **Commit** `45c972f4 feat(core-arch): page-envelope pattern — dataSource.select + fromParent` (5 files, 467+, 78−):
  - **New** [src/contexts/ParentDataSourceContext.tsx](../src/contexts/ParentDataSourceContext.tsx) — `createContext<readonly unknown[] | null>(null)`. JSDoc explains the page-envelope contract.
  - **Modified** [src/types/widget.ts](../src/types/widget.ts) — `select?: string` (dotted path, applied via TanStack's `select`, memoised so structural sharing keeps unchanged slices referentially equal → no re-render on unrelated envelope updates) and `fromParent?: boolean` (subscribe to nearest ancestor's cache; documents the ignored-fields list: `api`, `valueKey`, polling, `stateDependencies`).
  - **Modified** [src/hooks/useSmartQuery.ts](../src/hooks/useSmartQuery.ts) — single `useQuery` call with branched config (queryFn throws on `fromParent` as a safety net, never reached because `enabled: false` gates it); `selectFn` memoised against the `select` string; effective queryKey returned to the renderer; dev-mode `console.warn`s for orphan `fromParent` and ignored-fields misconfigurations. Trade-off documented inline: spreading `useQuery`'s result to attach `queryKey` defeats TanStack's tracked-queries optimisation — at most one extra re-render per polling tick at page-detail scale; acceptable, revisit if a hot widget profiles badly.
  - **Modified** [src/components/registry/WidgetRenderer.tsx](../src/components/registry/WidgetRenderer.tsx) — wraps the rendered component in `ParentDataSourceContext.Provider` only when this widget owns its fetch (`api && !fromParent`); `fromParent` widgets are transparent so the context naturally falls through to the real ancestor → implicit "nearest ancestor with a dataSource" semantics with no extra plumbing.
  - **New tests** [src/tests/unit/lib/useSmartQuery.parentEnvelope.unit.test.tsx](../src/tests/unit/lib/useSmartQuery.parentEnvelope.unit.test.tsx) — 8 tests: full payload when select omitted, dotted-path slice extraction, undefined for unresolved paths, fromParent does not call fetch (global.fetch spy), orphan warning, ignored-fields warning, queryKey exposure for both fromParent and own-fetch widgets.
- **Verification:** `tsc --noEmit` clean (one fix during dev: cast `select`'s return back to `any` so `data` doesn't narrow from `any` to `unknown` and break string-indexed access at every existing call site — `getNested` returns `unknown` and TanStack infers TData from select's return); full `npm test` shows 145 → 153 passing (+8 new), 92 → 92 failing (pre-existing branch state unchanged; verified by stash-and-compare); ESLint on changed files clean for code I introduced (8 pre-existing `any` errors in untouched lines).
- **Schema example unlocked:** one root `dataSource` on a `stack-layout`, children declare `dataSource: { fromParent: true, select: "<slice>" }`. One HTTP fetch, N slice-scoped subscribers, per-subscriber re-renders only when their slice's reference changes.
- **Status:** committed locally on `chore/cherry-pick-core-arch` (1 ahead of origin, **not pushed**). User did not ask for a push.
- **Follow-ups worth filing as proposals if they come up:**
  - Promote the page-envelope pattern to default story in [docs/schema-design-reference/04-data-sources.md](../docs/schema-design-reference/04-data-sources.md) — it's currently undocumented post-commit. Lives on the `docs/schema-design-reference` branch, not here.
  - Aggregate-shaped `refreshAggregates` alongside the URL-shaped `refreshKey` so a mutation can invalidate "the Policy aggregate" without listing every projection URL.
  - Pushing `{{id}}` substitution into `useSmartQuery` (already mentioned in the data-sources doc as proposed) — removes the per-page walker and aligns with how `fromParent` works (framework-resolved, not page-resolved).
### 2026-05-22 — PR #72 docs refresh + multi-agent review

- **Branch:** `docs/schema-design-reference`.
- Updated docs to reflect PR #72 (cherry-pick-core-arch) reality: framework primitives now on `main` (typed API client, DetailPageSkeleton, `visibleRoles` gate, overlay `size`, `schemas/tables/`+`schemas/views/` `$ref`, `dataPath`/`parseJson`, array-valued params, cross-array join). Domain code (9 widgets, mock backend, Group PAS schemas/pages) still on `feat/new-buisiness`.
- **Multi-agent review** (correctness / hallucination / readability) ran in parallel against the updated docs.
- **Findings + fixes:**
  - `TabsContainer.visibleWhen` is NOT on main post-PR-#72 — the consumer ships only on `feat/new-buisiness`. Corrected docs in 03, 07, 13.
  - `JSON.stringify(undefined)` rationale in 09 was wrong (it returns JS undefined, not the string "undefined"). Dropped the rationale; kept the behaviour claim.
  - `disabledTooltip` is only honoured by `action-bar`, not framework-wide. Softened 05.
  - `parseSpringError` vs `useActionHandler` envelope parsers DIVERGE (the former reads message→error; the latter adds errorCode). Flagged as known consolidation TODO.
  - `useSmartQuery`/`useActionHandler` on `main` post-PR-#72 do NOT inject auth headers; only the typed `api` client does. Corrected 09's claim that auth lives in two places.
  - Nested accessors existed pre-PR-#72; PR #72 hardened the walker. Walked back the attribution in 02.
  - `useDataTable.dataError` is hook-level; the default consumer doesn't render it distinctly. Removed the misleading "renders same way as fetch failure" claim from 02/04.
  - Glossary refreshed: stale field-type and validation-rule entries fixed (`file` removed; `pattern`/`email`/`url` flagged as no-op). Added `visibleRoles`, `OverlaySize`, `dataPath`, `parseJson`, typed API client entries. `visibleWhen` entry rewritten. `$ref` entry updated to mention all four prefixes.
  - 12-troubleshooting role-gating fix replaced — now recommends `visibleRoles` instead of the unimplemented `layout.visibleWhen`.
  - Overlay size section in 05 gained a `size`→`max-w-*`→approx-width table.
  - Error-envelope content consolidated: 04 now links to 09's canonical reference instead of duplicating.
- **Commit:** `25e7cdb6 docs(schema-ref): refresh for PR #72 reality + multi-agent review fixes` (213 +, 73 −, 10 files).
- **Branch state:** `docs/schema-design-reference` is now PR-#72-aware. Will land alongside or after PR #72 merges to main.
