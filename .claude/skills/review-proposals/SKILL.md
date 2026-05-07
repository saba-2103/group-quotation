---
name: review-proposals
description: Triage proposals in `proposals/`, write pros/cons grounded in project context, and produce a recommendation (approve / reject / defer / escalate). Use when the user says "review proposals", "triage the backlog", "what should we do about open proposals", or when running on a schedule. Updates each proposal's `status` and analysis sections in place.
---

# Review proposals

Process every `status: draft` proposal in `proposals/`, do a context-grounded analysis, and either issue a recommendation for the user or — if `--auto` is set with a clear-cut case — apply the decision directly.

## Inputs
- `$ARGUMENTS`:
  - `--ids=PROP-0003,PROP-0007` — review only specific proposals.
  - `--auto` — apply the recommendation without waiting for the user, **only** when (a) `impact: low`, (b) recommendation is unambiguous, and (c) no open conflicts with existing proposals.
  - `--reindex` — regenerate `proposals/_index.md` and exit.
  - empty — review every `status: draft` proposal.

## Project context to gather (do this once per run, cache in working memory)

- `context/HANDOFF.md` — single repo resume entrypoint; follow its links before relying on chat context.
- `context/CORE_MEMORY.md` — standing execution preference for front-loading reusable work when it reduces churn.
- `CLAUDE.md` (root + nested) — coding conventions, architectural rules.
- `git log --oneline -50` and `git log --since=30.days` — recent direction.
- `package.json` — what's already a dependency.
- Repo structure: `src/components/{ui,widgets}` inventory, top-level dirs.
- Other proposals: any with `status` of `under-review` / `approved` / `in-progress` to spot conflicts.
- The two skills that produce evidence: `.claude/skills/specs-to-draft/SKILL.md`, `.claude/skills/refine-specs-to-draft/SKILL.md`, plus their `LESSONS.md` if present.

## Pipeline

### 1. INGEST
List all proposals. For each `status: draft`, read it fully. If `evidence:` cites log lines, open them and verify the citation actually supports the claim.

### 2. ANALYZE — fill the reviewer sections
For each draft, write into the proposal file:

- **Project-context fit** — concrete: which conventions it aligns with or breaks, which existing files it touches, conflicts with other open proposals. Cite paths.
- **Pros** — bulleted. Each pro should be testable or observable.
- **Cons** — bulleted. Include cost (effort, surface area, churn), risk (regressions, lock-in), and the "do nothing" case if it's viable.
- **Recommendation** — one of:
  - `approve` — clear win, low risk, fits the project.
  - `reject` — outweighed by cons, or solves a non-problem.
  - `defer` — good idea, wrong time. Include the trigger ("revisit when X").
  - `escalate to user` — judgment call that the user should make. State the specific question.

Keep each section tight — 3–6 lines. The reviewer's job is to compress, not expand.

Set `status: under-review` after writing the analysis.

### 3. DECIDE / PRESENT
- **No `--auto`**: present a summary table to the user (id, title, recommendation, one-line rationale) and stop. The user runs `/review-proposals --apply PROP-NNNN=approve` (or rejects, or asks for changes).
- **With `--auto`**: only auto-apply `approve` when impact is low and the recommendation is unambiguous; never auto-`reject` (rejection is the user's call). Set `status: approved` and report what was auto-decided.

### 4. APPLY (when the user gives the call, or `--auto` qualifies)
Update `status` to the chosen value. For `deferred`, add a one-line note to the proposal explaining the trigger condition. For `approved`, add `next_step: /execute-proposal PROP-NNNN` as a reminder.

### 5. REINDEX
Regenerate `proposals/_index.md` as a markdown table grouped by status: `in-progress`, `approved`, `under-review`, `draft`, `deferred`, `done`, `rejected`. Don't list `done`/`rejected` past 30 days.

## Operational constraints
- **Evidence over vibes.** Pros/cons must point at files, log lines, conventions. "Feels cleaner" is not a pro.
- **Consider rework reduction explicitly.** When two viable proposal shapes exist, favor the one that front-loads reusable infrastructure and reduces likely downstream churn, as long as the added upfront cost is justified by the evidence.
- **Conflict detection.** If two open proposals touch the same area in incompatible ways, recommend `escalate to user` on both with the conflict spelled out.
- **Don't expand scope.** If a proposal needs more work than it claims, recommend `reject` with a note to refile a tighter version — don't rewrite it for them.
- **Frontmatter is the source of truth.** All status changes happen in frontmatter; don't track state elsewhere.
- **Idempotent.** Running this twice should produce the same result if nothing else changed. Don't append duplicate analyses — overwrite the reviewer sections.
