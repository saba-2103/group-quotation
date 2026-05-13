---
name: build-fleet
description: Synchronized multi-agent pipeline that builds a batch of approved proposals in parallel, gating across all agents at each phase, and resolving file-level dependencies into a parallel/sequential build DAG. Use when the user wants to ship several `proposals/PROP-NNNN-*.md` items as one coordinated push instead of running `/build-feature` serially. Trigger with "/build-fleet", "build fleet of …", "ship proposals X, Y, Z together", or "build everything approved".
---

# Build-Fleet Orchestrator

Run `build-feature` semantics across **N proposals at once**, with the orchestrator owning all cross-agent coordination. Each proposal gets its own short-lived agent per phase; the orchestrator gates at phase boundaries, computes a file-conflict DAG before BUILD, supervises wave-by-wave execution, and runs a **single** unified verify + push at the end.

Agents never talk to each other. The orchestrator is the only communication hub. Each agent gets a self-contained prompt with explicit instructions on which files to read when context is missing.

## Inputs

`$ARGUMENTS` — required. Forms:
- Comma-separated proposal ids: `PROP-0010,PROP-0011,PROP-0014`
- `--all-approved` — load every proposal in `proposals/_index.md` whose status is `approved`
- `--no-preview` — skip the local preview at SHIP; stop after VERIFY
- `--dry-run` — stop after DESIGN + DAG approval; do not BUILD
- `--max-parallel=N` — cap concurrent agents per wave (default: unlimited within a wave)

## Source-of-truth locations

- Proposals: `proposals/PROP-*.md`
- Proposal index: `proposals/_index.md`
- Handoff entry: `context/HANDOFF.md`
- Core memory: `context/CORE_MEMORY.md`
- Build-feature contract (the agents run a phased subset of this): `.claude/skills/build-feature/SKILL.md`
- Fleet logs (create per run): `agent_logs/build-fleet/<fleet-run-id>/`
- Fleet design dir: `context/build-fleet/<fleet-run-id>/`
- Per-agent logs: `agent_logs/build-fleet/<fleet-run-id>/<PROP-NNNN>/`

`fleet-run-id` format: `<YYYY-MM-DD>-fleet-<short-slug>` (slug derived from the proposal set or user-supplied hint).

## Pipeline overview

```
[input] → DISCOVER → CLARIFY ⏸  → DESIGN ⏸  → DAG ⏸  → BUILD (waves) → VERIFY → SHIP
            parallel   user gate  user gate   user gate  parallel/serial   single   single
```

⏸ = hard user gate. No silent advance. Orchestrator polls phase completion via `<phase>.done` marker files and pauses on any `<phase>.error`.

## Phase contracts (orchestrator-side)

### 0. RESOLVE

1. Parse `$ARGUMENTS`. Expand `--all-approved` by reading `proposals/_index.md` and selecting status=`approved`. Reject status=`done|rejected|deferred`. Allow status=`draft|under-review` only with explicit user confirmation per proposal.
2. Generate `fleet-run-id`. Create:
   - `agent_logs/build-fleet/<fleet-run-id>/orchestrator.log` (single source of truth for the fleet)
   - `agent_logs/build-fleet/<fleet-run-id>/<PROP-NNNN>/` per proposal
   - `context/build-fleet/<fleet-run-id>/` for fleet-level artifacts (DAG, execution plan)
3. Set each selected proposal's `status: in-progress` in frontmatter at fleet start.
4. **Branch hygiene check**: **default to staying on the current branch**. The active branch is usually the one that auto-deploys to dev / matters to the team — branching a sibling makes the fleet's work invisible to CI and to other humans, which defeats the point of shipping a batch. Only create `feature/<fleet-run-id>` when there's a concrete reason to isolate:
   - Current branch is `main` / `master` (never commit feature work directly to main).
   - Working tree has **modified tracked files** whose paths overlap the fleet's expected `files_touched[]` writes (untracked files alone don't conflict — they ride along).
   - User explicitly asks for a sibling branch (e.g. exploratory fleet that shouldn't reach the dev URL).
   Otherwise, build on the current branch. Every reference to `feature/<fleet-run-id>` later in this skill is a placeholder for "the fleet branch" — which may simply be the current branch. Log the choice in the orchestrator log.

### 1. DISCOVER — parallel

Spawn one agent per proposal in a single message (parallel). Each agent:
- Reads `context/HANDOFF.md`, `context/CORE_MEMORY.md`, its `proposals/PROP-NNNN-*.md`, `docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md` (when relevant).
- Surveys related code.
- Writes `<fleet-run-id>/<PROP-NNNN>/discover.log` with surveyed paths and the three lists: known / ambiguous / derivable.
- Writes `<fleet-run-id>/<PROP-NNNN>/discover.done` on success or `discover.error` with reason.

Orchestrator waits for every agent to terminate, then reads each `discover.log`. If any `.error`, pause and surface — do not proceed to CLARIFY with partial inputs.

### 2. CLARIFY — parallel, then user gate

Spawn one agent per proposal. Each agent:
- Reads its `discover.log` + proposal.
- Emits `<PROP-NNNN>/clarify.questions.json` (structured: `[{ id, question, options?, default? }]`). Empty array if proposal is fully scoped.
- Writes `clarify.done` on emit.

Orchestrator merges all agents' questions into a single batched user-facing prompt, **labelled by proposal**. Wait for user answers. Distribute answers back by re-spawning each agent for a "CLARIFY-FOLLOWUP" pass (each agent gets only its own questions + answers, not the whole fleet's), which updates its `clarify.log`. Repeat if any agent emits follow-up questions. Stable empty queue = phase done.

### 3. DESIGN — parallel, then user gate

Spawn one agent per proposal. Each agent:
- Reads its `discover.log` + `clarify.log` + proposal.
- Writes `context/build-feature/<fleet-run-id>-<PROP-NNNN>/design.md` per the `/build-feature` DESIGN contract (`.claude/skills/build-feature/SKILL.md` §3). The fleet **requires** the structured frontmatter defined there — `proposal`, `run_id`, `goal`, `golden_path`, `golden_path_route`, `files_touched[]`. The DAG phase reads `files_touched` directly; a missing or malformed block is a hard error and the agent is re-spawned with the contract emphasized.
- Writes `<PROP-NNNN>/design.done`.

Orchestrator gathers all designs, **then surfaces them to the user as a batch** (proposal id + 5-line summary each). Wait for explicit approval. If user requests revisions, re-spawn the affected agent(s) and re-confirm. Approval is per-fleet, not per-proposal — user signs off on the whole set or sends specific ones back.

### 4. DAG — orchestrator-only, then user gate

Orchestrator computes the **file-conflict DAG** from the design frontmatter:

1. Build an inverted index: `file → [proposals that write it]`.
2. Construct dependency edges: if proposal B reads a file written by proposal A, edge `A → B`. Two proposals writing the same file gets surfaced as a **conflict** (not a dependency) — these cannot run in the same wave; orchestrator picks a serial order (alphabetical PROP id) but flags it for user attention.
3. Toposort into **waves**: wave 0 = nodes with no incoming edges; wave N+1 = nodes whose dependencies are all in waves ≤ N.
4. Within a wave, all proposals are guaranteed file-disjoint and run in parallel.
5. Across waves, builds are serial — wave N+1 starts after every agent in wave N has merged.

Write `context/build-fleet/<fleet-run-id>/dag.md` containing:
- Adjacency list of dependencies (with reason: "Y reads file X writes")
- Conflict list (with reason: "X and Y both write file Z")
- Wave plan (wave N: [PROP-A, PROP-B, …])
- Commit-order plan (within a wave, alphabetical for determinism)

Show the DAG + wave plan to the user. Wait for explicit approval. If `--dry-run`, stop here.

### 5. BUILD — wave-by-wave

For each wave in order:

1. **Snapshot wave start.** Record current HEAD of `feature/<fleet-run-id>` as `wave_start_sha`. Log it.
2. **Spawn parallel build agents for the wave.** Each agent is launched with `isolation: "worktree"` so it works in its own git worktree branched from current HEAD. Per-agent prompt is self-contained and includes:
   - The proposal id + full path
   - Their `design.md` path (must read first thing)
   - `wave_start_sha` (so they can sanity-check their starting point)
   - Required outputs: incremental commits in their worktree with messages of form `<scope>(PROP-NNNN): <subject>`, a `<PROP-NNNN>/build.log`, and a `<PROP-NNNN>/build.done` marker on success
   - Hard rule: **do not push, do not merge, do not switch branches in the worktree**. Just commit.
   - Hard rule: **do not run preview**. The fleet runs a single shared preview in VERIFY.
   - Hard rule: **stay within `files_touched` from your design**. If new files are needed, write a note in `build.log` and continue — orchestrator post-checks that no out-of-wave files were modified.
3. **Wait for all agents in the wave.** Orchestrator polls `build.done` / `build.error`. On any `.error`, halt the wave at completion, surface failures, ask user (retry, skip, abort).
4. **Merge back into the fleet branch, in commit-order.** For each successful agent, in deterministic order:
   - Run `git cherry-pick <agent-branch>` against `feature/<fleet-run-id>`, OR `git merge --ff-only` when possible.
   - Conflicts at this step indicate a DAG analysis miss — pause and surface to user (do not auto-resolve).
   - Append the merged shas to `agent_logs/build-fleet/<fleet-run-id>/build-merge.log` keyed by PROP id.
5. **Cleanup.** Worktrees are auto-cleaned by the harness; verify with `git worktree list` and prune stale entries if any remain.

After the final wave, the fleet branch contains one logical commit (or commit chunk) per proposal, in DAG-respecting order.

### 6. VERIFY — single, orchestrator-driven

No agents in this phase. The orchestrator runs:

1. `npm run lint` and `tsc --noEmit` on the merged branch. Log results.
2. `npm test` (or the relevant subset). Log results.
3. **Live preview**: start one preview server via `preview_start`. For each proposal, navigate to its `golden_path_route` and exercise the golden path described in its design. Use `preview_snapshot` + `preview_console_logs` + `preview_network` per the standing verification workflow. Capture a `preview_screenshot` per proposal.
4. Write `agent_logs/build-fleet/<fleet-run-id>/verify.log` with per-proposal pass/fail + screenshots.
5. On any failure: do **not** auto-fix from the orchestrator. Surface to user with the failing proposal id; user decides whether to re-spawn a build agent for that proposal or to skip + revert.

### 7. SHIP — single push, single status update

1. `git push -u origin feature/<fleet-run-id>`.
2. Update each merged proposal's frontmatter: `status: done`, `pr: <to be filled by user or follow-up gh pr create>`.
3. Final report to user:
   - Branch + push URL
   - One-line summary per proposal: ✅ or ⚠️
   - Preview URL still running (with reminder to `/preview-and-deploy` for a public link)
   - Any open carry-over items (e.g. an agent that was skipped)

If `--no-preview` was passed, VERIFY skips step 3 (live preview) and SHIP still pushes.

## Per-agent prompt template

When the orchestrator spawns an agent for any phase, the prompt MUST contain the following sections so the agent can act cold (no shared memory with the orchestrator):

```
You are running phase <PHASE> of a build-fleet for proposal <PROP-NNNN> as
part of fleet-run-id <fleet-run-id>. You are one of N parallel agents; the
orchestrator coordinates between agents — do not attempt to reach them.

# Required reads (do these first, in order)
1. proposals/<PROP-NNNN>-<slug>.md (your proposal)
2. context/HANDOFF.md
3. context/CORE_MEMORY.md
4. <prior phase logs at agent_logs/build-fleet/<fleet-run-id>/<PROP-NNNN>/*.log>
5. <other phase-specific files the orchestrator names explicitly>

# Other proposals in this fleet (for awareness only — do not modify their files)
- PROP-AAAA — <title>
- PROP-BBBB — <title>

# Your task
<phase-specific instructions; see build-feature SKILL.md for the underlying
contract>

# Required outputs
- <log file path>
- <done marker path>: write only after successful completion
- On failure: write <error marker path> with a reason, do not write the done marker

# If you find yourself missing context
Do NOT ask the user. List the gap as a question in clarify.questions.json
(CLARIFY phase) or as an Open Question section in design.md (DESIGN phase)
or in build.log (BUILD phase). The orchestrator will route it.

# If you need to read a file you didn't expect to need
Just read it. Log what you read in your phase log so the orchestrator can
audit context-gathering after the fact.
```

## Failure handling

| Failure | Orchestrator behavior |
|---|---|
| Agent times out / returns error in DISCOVER, CLARIFY, DESIGN | Pause at phase boundary, surface, ask user (retry / drop proposal / abort fleet) |
| DAG analysis surfaces a same-file write conflict | Highlight in `dag.md`; user picks which proposal wins or de-scopes |
| Build agent fails in its worktree | Wave completes (other agents still merge); failed proposal surfaced; user picks retry / skip / abort |
| Cherry-pick conflict at merge-back | Stop. Surface as DAG-analysis bug. Manual intervention only; do not auto-resolve |
| Lint / type / test fails in VERIFY | Surface per failing proposal id; user decides per-proposal retry or revert |
| Preview golden-path check fails | Same as test failure |

No partial-fleet auto-rollback. The orchestrator commits each proposal separately on the shared branch so the user can `git revert <sha>` a single proposal without unwinding the rest.

## Operational constraints

- **Orchestrator is single-source-of-truth for state.** Agents read their own phase logs; only the orchestrator reads across agents. No agent-to-agent reads.
- **Phase-by-phase, not long-lived agents.** Each agent invocation is one phase, one proposal. Stateless from the orchestrator's POV. (Reconsider if Claude Code's harness gains better long-lived agent ergonomics.)
- **One branch, many commits.** All proposals' commits land on `feature/<fleet-run-id>`, in DAG-respecting order, each agent committing its own work in its own worktree.
- **One verify, one push.** Suppress per-agent preview / push. The fleet ships once.
- **Hard gates are hard.** CLARIFY, DESIGN, DAG approval require explicit user signal. No silent advance.
- **Files-touched contract.** A design without `files_touched:` is rejected and the agent is re-spawned with that contract emphasized — the DAG cannot be built without it.
- **No agent talks to another agent.** Cross-proposal questions go through orchestrator. This is what makes the failure model tractable.
- **No new top-level deps without user consent.** Inherited from build-feature.
- **Update proposal status atomically.** `in-progress` at fleet start, `done` after successful SHIP for that specific proposal. A skipped/aborted proposal stays `approved`.

## Reporting

After SHIP (or earlier termination), write `agent_logs/build-fleet/<fleet-run-id>/summary.md` with:
- Fleet input + resolved proposal list
- DAG (waves + dependency edges)
- Per-proposal outcome (done / skipped / failed)
- Per-proposal commit shas
- VERIFY results
- Total wall-clock time per phase
- Open follow-ups

## Relationship to other skills

- **vs `/build-feature`**: single proposal, full user-in-the-loop pipeline. Use when one proposal needs design exploration.
- **vs `/execute-proposal`**: single proposal, fully-locked design, mechanical execution. Use when the design is already nailed.
- **vs `/build-fleet`**: N proposals in one synchronized pass with cross-proposal conflict resolution. Use when you have a batch of approved proposals and want to ship them together rather than serially.

`/build-fleet` does **not** replace `/build-feature` for design-heavy work. If a proposal in the fleet shows up at DESIGN with significant unknowns that the batch context can't resolve, surface it and recommend the user run `/build-feature PROP-NNNN` solo for that one and re-fleet the rest.
