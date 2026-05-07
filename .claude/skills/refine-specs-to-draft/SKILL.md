---
name: refine-specs-to-draft
description: Learn from `agent_logs/` produced by the `specs-to-draft` skill and propose targeted edits to `.claude/skills/specs-to-draft/SKILL.md` so future runs avoid past mistakes and lock in what worked. Use when the user says "refine specs-to-draft", "learn from the logs", "update the draft skill", or runs this on a schedule. Safe to run periodically — it only writes after the user approves the proposed diff.
---

# Refine specs-to-draft

A meta-skill that closes the loop on `specs-to-draft`: read the pipeline's logs, find patterns worth encoding, and evolve the skill file accordingly.

## Inputs
- `$ARGUMENTS` — optional. May be:
  - `--since=<git-ref|YYYY-MM-DD>` — only consider log entries newer than this (default: since the last refinement, tracked in `agent_logs/_refinements/last_run`).
  - `--auto-apply` — skip the approval step and write changes directly. Off by default. Only honor this flag if the user explicitly passes it.
  - empty — analyze everything since the last refinement (or all logs on first run).

## Source-of-truth locations
- Handoff entry point: `context/HANDOFF.md`
- Core memory: `context/CORE_MEMORY.md`
- Logs to learn from: `agent_logs/{extractor,architect,engineer,reviewer}.log` and `agent_logs/*.json`
- Skill being refined: `.claude/skills/specs-to-draft/SKILL.md`
- Refinement history (create if missing): `.claude/skills/specs-to-draft/CHANGELOG.md`
- Run tracker: `agent_logs/_refinements/last_run` (single line: ISO timestamp of last refinement)
- Persistent lessons (create if missing): `.claude/skills/specs-to-draft/LESSONS.md` — append-only ledger of distilled patterns with evidence

## Pipeline

### 1. INGEST
- Read `context/HANDOFF.md` if it exists, then `context/CORE_MEMORY.md`, before proposing refinements so changes stay aligned with the repo's standing preferences.
- Read `agent_logs/_refinements/last_run` to set the window. If absent, treat as first run.
- Collect all log entries newer than the window from each stage.
- Read the current `specs-to-draft/SKILL.md` and `LESSONS.md` so proposals don't re-litigate already-encoded rules.

### 2. ANALYZE — what to look for
Cluster findings into these buckets. Each finding needs **evidence** (log file + line range or run id) and **frequency** (how many runs exhibited it).

- **Recurring gaps** — components requested but missing from `src/components`. If the same gap appears ≥2 runs, it's a candidate for either:
  - a permanent note in the skill's component inventory section, or
  - a recommendation to the user to build that primitive.
- **Prop / API misuses caught in ALIGN** — patterns the reviewer keeps fixing (wrong prop names, missing required props, banned hardcoded tokens). Encode as preflight checks in the skill.
- **Hallucinated imports** — components imported that don't exist. Tighten the "verify before drafting" wording.
- **Successful golden paths** — sequences that worked first try (e.g. "list view → detail drawer using `Sheet` + `Table`"). Promote to canonical patterns.
- **Wasted exploration** — the agent spent time searching for something it should have known. Add a pointer.
- **Spec-level patterns** — recurring shapes in `docs/specs/` (e.g. every PRD has a "permissions matrix" section). Teach the EXTRACT stage to look for them.

Skip noise: one-off mistakes, stylistic variation, anything already covered in the current SKILL.md.

### 3. PROPOSE
Produce two artifacts in memory (don't write yet):
1. **Proposed diff** to `specs-to-draft/SKILL.md` — minimal, surgical edits. No wholesale rewrites. Each edit must trace to a finding.
2. **Proposed `LESSONS.md` appendix** — for findings that are useful context but don't belong in the skill body (e.g. "in run 2026-04-12, the `Sheet` widget was the right choice for Member detail; reused successfully in 3 later runs").

Show both to the user with:
- a one-line summary per change ("Tighten EXTRACT: require permissions-matrix detection — 4/6 specs had one"),
- the evidence (log refs),
- the proposed text change.

### 4. APPROVE
- Default: stop and ask the user to approve, reject, or edit each proposed change individually.
- If `--auto-apply` was passed, skip approval but still print the changes being made.
- Never silently rewrite the skill. The user must see what's changing.

### 5. APPLY
- Edit `specs-to-draft/SKILL.md` with the approved changes (use the Edit tool, preserve formatting and frontmatter).
- Append approved lessons to `LESSONS.md` with the date, evidence, and the resulting skill change (or "lesson only — no skill change").
- Append a one-line entry to `specs-to-draft/CHANGELOG.md`: `YYYY-MM-DD — <summary> (refined from <N> runs)`.
- Update `agent_logs/_refinements/last_run` to the current ISO timestamp.

## Operational constraints
- **Evidence-bound.** Every proposed edit cites at least one log location. No vibes-based refinements.
- **Frequency threshold.** A pattern needs ≥2 occurrences before it earns a skill edit. One-offs go to `LESSONS.md` at most.
- **Don't bloat the skill.** If a section grows past ~20 lines from accumulated rules, refactor inline rather than appending. Trim or reword existing rules instead of stacking new ones.
- **Escalate system-level findings.** If a finding is bigger than a skill edit (e.g. "we need a new `DataTable` widget", "the spec template is missing a permissions section"), file it via `/propose` instead of cramming it into the skill. The skill is for behavior tweaks; system changes go through the proposal pipeline.
- **Don't re-encode existing rules.** Diff against current `SKILL.md` before proposing.
- **Roll back is easy.** Because edits go through git, the user can revert. Don't make the skill self-modify in ways that would be hard to inspect in a diff.
- **Frontmatter is sacred.** Only edit `name`/`description` if the description's trigger phrases are demonstrably wrong. Otherwise leave it alone.

## Kickoff
1. Verify `agent_logs/` exists and has content. If empty, exit with a friendly note ("nothing to learn from yet — run `/specs-to-draft` first").
2. Set the analysis window from `--since` or `last_run`.
3. Run INGEST → ANALYZE → PROPOSE.
4. Present findings to the user; await approval unless `--auto-apply`.
5. APPLY approved changes; report what was written and what was deferred to `LESSONS.md`.

## Scheduling note
This skill is safe to invoke from `/schedule` or `/loop` (e.g. weekly). Default behavior keeps the user in the loop via the approval step, so a scheduled run will surface proposals as a notification rather than silently mutating the skill. If the user wants fully autonomous evolution, they can schedule it with `--auto-apply`.
