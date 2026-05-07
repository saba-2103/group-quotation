---
name: propose
description: File a structured change proposal in `proposals/` so it can be reviewed and (if approved) executed via PR. Use when the user says "propose X", "file a proposal for…", "open a ticket to add Y", or when another skill detects a recurring problem worth fixing at the system level (missing component, repeated reviewer fix, spec-pattern not handled). Agents should use this instead of silently logging gaps.
---

# Propose

Create a new proposal under `proposals/` following the template. One concrete change per proposal.

## Inputs
- `$ARGUMENTS` — free-text description of the change. May include file paths, log references, or a category hint.
- If invoked by another agent, the calling skill should pass enough context that a cold reader can understand the problem (no "see above").

## Steps

1. **Read** `context/HANDOFF.md` if it exists, then `context/CORE_MEMORY.md`, `proposals/README.md`, and `proposals/TEMPLATE.md` to ground on conventions.
2. **Pick the next id**: `ls proposals/PROP-*.md`, take the highest NNNN, add 1, zero-pad to 4.
3. **Pick the slug**: kebab-case, ≤6 words, derived from the title.
4. **Draft the proposal**:
   - Fill `Problem`, `Proposed change`, `Alternatives considered`. Keep each under ~10 lines.
   - When repeated downstream rework is likely, bias the proposal toward the foundational or reusable change instead of the narrowest local patch.
   - Set `proposer:` — `agent:<skill-name>` if filed by an agent, `human:<name>` otherwise.
   - Set `category` and best-guess `impact` / `effort`.
   - Populate `evidence:` with concrete refs (log file + line range, run id, file paths).
   - Leave the reviewer/executor sections empty — those get filled later.
5. **Write** to `proposals/PROP-NNNN-<slug>.md`.
6. **Append** to `proposals/_index.md` if it exists; otherwise note that `/review-proposals --reindex` will pick it up.
7. **Report** back: id, path, one-sentence summary, and the suggested next step (`/review-proposals` to triage).

## Operational constraints
- **One change per proposal.** If the idea bundles multiple changes, ask whether to split or pick the most pressing one.
- **Don't pre-fill the reviewer sections.** Pros/cons/recommendation are the reviewer's job and pre-filling biases them.
- **Dedupe.** Before writing, grep open proposals (`status: draft|under-review|approved|in-progress`) for the same topic. If a near-duplicate exists, link via `related:` and consider whether a new proposal is even warranted.
- **No proposals to fix tiny things.** Trivial fixes (typo, one-line bug, dead import) — just do them. Reserve proposals for changes that benefit from review.
- **Stay terse.** A good proposal is ~30–60 lines. Long proposals usually mean the change isn't scoped tightly enough.
