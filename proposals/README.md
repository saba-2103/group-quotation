# Proposals

Lightweight system for capturing change ideas — from humans or agents — running them through a review, and shipping the approved ones via PR.

## Lifecycle

```
draft  →  under-review  →  approved   →  in-progress  →  done
                       ↘  rejected
                       ↘  deferred
```

State is tracked in each proposal's frontmatter `status` field. No moving files between folders — the index regenerates from frontmatter.

## Files

- `TEMPLATE.md` — copy this when filing a new proposal.
- `PROP-NNNN-<slug>.md` — one file per proposal. NNNN is zero-padded, monotonically increasing.
- `_index.md` — auto-maintained table of all proposals (regenerate via `/review-proposals --reindex`).

## Skills

- **`/propose`** — file a new proposal (humans or agents).
- **`/review-proposals`** — triage drafts, write pros/cons grounded in project context, decide or escalate to the user.
- **`/execute-proposal PROP-NNNN`** — pick up an approved proposal, implement on a branch, push a PR, link back.

## Conventions

- One concrete change per proposal. Bundle nothing.
- Anyone (or any agent) can move `draft` → `under-review` by running `/review-proposals`. Only humans (or `--auto` mode under explicit threshold) can move to `approved` / `rejected`.
- The reviewer fills in **Project-context fit**, **Pros**, **Cons**, **Recommendation**. The proposer should not pre-fill these.
- Once `done`, link the PR in frontmatter and leave the file in place — it's the audit trail.
