---
name: execute-proposal
description: Take an approved proposal from `proposals/`, implement it on a fresh branch, verify, and push a PR linked back to the proposal. Use when the user says "execute PROP-NNNN", "ship the approved proposal", or "pick up the next ticket". Updates proposal status to `in-progress` while working and `done` after the PR is open.
---

# Execute proposal

The shipping end of the proposal pipeline. Picks up `status: approved` proposals and turns them into PRs.

## Inputs
- `$ARGUMENTS`:
  - `PROP-NNNN` — execute that specific proposal.
  - `--next` — pick the highest-impact `approved` proposal not yet started.
  - `--dry-run` — produce the plan and the diff but don't push or open a PR.

## Preconditions (verify before any work)
- Read `context/HANDOFF.md` if it exists.
- Read `context/CORE_MEMORY.md` before planning so execution honors the repo's standing build preference.
- Working tree is clean (`git status` is empty). If not, stop and tell the user.
- The proposal exists, `status: approved`, and isn't already `in-progress` (someone else may be on it).
- No open PR already references this proposal id.

## Framework references to consult during PLAN
- Quickstart: `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md`.
- **Comprehensive framework reference** (canonical, per [#73](https://github.com/Anaira-AI/keystone-ui/pull/73)): `docs/schema-design-reference/` — read the relevant sections (widget catalog, schemas, actions, forms, troubleshooting) before writing schema/widget code for a non-trivial proposal.
- Framework primitives newly on main via [#72](https://github.com/Anaira-AI/keystone-ui/pull/72): typed API client, `DetailPageSkeleton`, `visibleRoles`, overlay `size`, `schemas/tables/` + `schemas/views/` `$refs`, array GET params, `dataPath`/`parseJson`, cross-array joins. Use them rather than re-rolling equivalents.

## Pipeline

### 1. CLAIM
- Set `status: in-progress` in the proposal frontmatter and commit nothing yet.
- Create a branch: `proposal/PROP-NNNN-<slug>` off `main` (pull latest first).
- **Backend Handoff:** If the proposal is strictly for a backend implementation, hand off the execution to the `/build-backend` skill instead of continuing in this pipeline.

### 2. PLAN
- Re-read the proposal end-to-end, including the reviewer's analysis.
- Read CLAUDE.md, the surrounding code for the area being changed, and any related proposals.
- Write a short plan as TODOs (use the harness's TODO mechanism, not a file). Include verification steps appropriate to the change (typecheck, dev server smoke, targeted tests).
- If the proposal is UI-facing, do a quick design-preview check before implementation: confirm the intended composition, mobile/desktop behavior, and that the plan is using the right widget/layout layer instead of overloading an unrelated component.
- If the implementation is knowingly temporary pending a future architecture, document the interim contract and migration note in repo context before coding.

### 3. IMPLEMENT
- Make the smallest change that satisfies the proposal. No drive-by refactors. No new top-level deps unless the proposal explicitly approved one.
- If the approved proposal or design leaves room for implementation choice, prefer the future-compatible path that reduces expected downstream rework. If that materially expands the approved scope, stop and surface it instead of freelancing.
- Match existing patterns — read sibling files first.
- If reality diverges from the proposal (e.g. an assumption turns out wrong), **stop and update the proposal's `Implementation notes` section** describing the divergence. Decide:
  - Minor: continue and document.
  - Major: revert, set proposal back to `under-review` with a note, surface to the user.

### 4. VERIFY
- Run `npm run lint`, `tsc --noEmit`, and the relevant test suite directly. Fix what you broke.
- For UI-touching proposals, also boot `npm run dev` and spot-check the affected routes — or rely on the per-PR EKS preview that ships post-push (see SHIP below) to verify the visual outcome.
- Don't claim success on the strength of a passing typecheck alone for UI work.
- Per [#71](https://github.com/Anaira-AI/keystone-ui/pull/71), CI also runs the full lint+test gate on push, so the local pass is a fast precheck — the CI run is authoritative.

### 5. COMMIT & PUSH
- One commit per logical step (don't squash everything into "implement PROP-NNNN").
- Each commit message references the proposal: `PROP-NNNN: <what changed>`.
- Push the branch.

### 6. PR
- Open via `gh pr create`. Title: `PROP-NNNN: <proposal title>`.
- Body must include:
  - Link to the proposal file.
  - One-paragraph summary lifted from the proposal's `Proposed change`.
  - **Test plan** — what you verified, what's still manual.
  - **Deviations** — anything that diverged from the proposal (link to the `Implementation notes` section).
- Capture the PR URL.

### 7. CLOSE OUT
- Update the proposal: `status: done`, `pr: <url>`, finalize `Implementation notes` (branch name, files touched, follow-ups).
- Commit the proposal update on the PR branch (so the audit trail ships with the change).
- Push. Report the PR URL to the user.

## Operational constraints
- **Never force-push, reset --hard, or skip hooks** unless the user explicitly says so.
- **Never push to main.** Always work on `proposal/PROP-NNNN-<slug>`.
- **Don't merge.** Opening the PR is the end of this skill. Merging is the user's call.
- **One proposal per run.** Don't bundle multiple proposals into one PR — defeats the audit trail.
- **If blocked, stop and ask.** A blocker means the proposal was under-specified or wrong. Better to revert status and surface it than to ship something off-spec.
- **Spawn follow-ups, don't sneak them in.** If you spot something out of scope, file a new proposal via `/propose` rather than expanding this PR.
