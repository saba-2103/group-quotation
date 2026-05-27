---
name: git-safe
description: Pre-flight check before executing a destructive git command. Required reading before any agent runs `git stash drop/pop/clear`, `git reset --hard`, `git clean -f*`, `git push --force`, `git branch -D`, `git checkout/restore --`, `git rebase`, `git filter-branch/filter-repo`, `git gc/prune`, or `git update-ref -d`. Returns GO or STOP with a one-line rationale. Triggered automatically by the agent before invoking any such command; invokable manually with `/git-safe <command>` to walk the checklist for a planned operation.
---

# git-safe — pre-flight for destructive git commands

This skill enforces a checklist before any destructive git operation runs. It exists because a session on 2026-05-18 lost a stash by chaining a wrongly-assumed `git stash push` with a later `git stash drop`. The full incident is in [`context/SESSION_LOG.md`](../../../context/SESSION_LOG.md); the rationale and recovery patterns are in [`context/GIT_SAFETY.md`](../../../context/GIT_SAFETY.md).

## When to invoke

**Automatic (preferred).** Any AI agent in this repo, before executing a Bash call containing one of the commands in the destructive set, invokes this skill and uses its decision.

**Manual.** The user can run `/git-safe <command>` to get a structured walk-through for a specific planned command. Useful when the user is unsure whether a command they're about to run is safe.

## The destructive set

Pre-flight is required for any of:

- `git stash drop`, `git stash pop`, `git stash clear`
- `git reset --hard`
- `git clean -f*` (any force flag)
- `git push --force`, `git push --force-with-lease`
- `git branch -D`
- `git checkout -- <path>`, `git checkout <commit> -- <path>`
- `git restore --` (with or without `--source`)
- `git rebase` (any form)
- `git filter-branch`, `git filter-repo`
- `git gc --prune=now`, `git prune`, `git reflog expire`
- `git update-ref -d`
- `git worktree remove --force`

Non-destructive (no pre-flight needed): `git status`, `git log`, `git diff`, `git show`, `git stash list`, `git stash show`, `git branch -d` (lowercase, refuses unmerged), `git reset --soft`, `git reset --mixed` (default), `git clean -n`/`-fdn` (dry-run), `git checkout <branch>` (switching branches with clean tree), `git push` (non-force), `git fetch`, `git pull`.

## Checklist

The agent walks these steps in order. Each step's output is either internalized or surfaced to the user as one-line text.

### 1. State the goal in one sentence

What is the user actually trying to achieve? Examples:

- "Recover a session stash that was accidentally dropped."
- "Reset the working tree to drop conflict markers from a failed stash pop."
- "Force-push a rebase that landed cleanly locally."

If the goal can't be stated, **STOP** — the command shouldn't run.

### 2. Inspect state with read-only commands

Run as a **separate** Bash call (not chained with the destructive operation):

- `git status --short` — current uncommitted/unmerged state.
- `git branch --show-current` — confirm the branch.
- `git stash list` — when touching stashes (always, when running `pop`/`drop`/`apply`/`clear`).
- `git reflog -5` — when resetting/rebasing.
- `git log <ref> -1 --oneline` — when targeting a specific ref.

Output the state in one or two summary lines, e.g.:

> Branch: chore/v0-uplift. Status: clean. Stash list has 4 entries; stash@{0} = "WIP: archV1 docs..." (the one I plan to drop).

### 3. Plain-English the command

State in the user-visible response what the command does and what's lost if it's the wrong target. Examples:

- `git stash drop stash@{0}` → "drops stash@{0} from the stash list; the underlying commit stays in the git object store for ~14 days and can be recovered via `git stash store <sha>`."
- `git reset --hard HEAD` → "discards every uncommitted change in the working tree and index; if there are unmerged paths from a failed merge/pop, those conflict-marker contents are unrecoverable."
- `git clean -fd` → "removes every untracked file and directory; the deletion bypasses the trash and is unrecoverable except via filesystem snapshots."
- `git push --force origin <branch>` → "overwrites origin/<branch> with local <branch>; any commit reachable only from origin/<branch> is gone for anyone who hasn't already fetched it."

### 4. Verify the target

If the command takes a ref, SHA, or path, confirm it contains what you expect:

- `stash@{N}`: `git stash show -p stash@{N} | head -20` — preview the diff.
- A SHA: `git show --stat <sha> | head -10` — confirm the commit subject and stats.
- A branch ref: `git log <ref> -1 --oneline` — confirm tip commit.
- A path: `git diff HEAD -- <path> | head -20` — see what would be discarded.

### 5. Prefer the less destructive alternative

| Planned | Less destructive |
|---|---|
| `git stash pop` | `git stash apply`, verify with `git status`, then `git stash drop` as a separate step. |
| `git reset --hard` | `git stash push` first (saves to-be-discarded work), then reset; if reset was wrong, `git stash pop`. |
| `git checkout -- <path>` | `git restore --source=HEAD -- <path>` — same effect, clearer semantics. |
| `git clean -fd` | `git clean -fdn` (dry-run) → review output → `git clean -fd`. |
| `git push --force` | `git push --force-with-lease` — rejects if origin moved unexpectedly. |
| `git branch -D <name>` | `git branch -d <name>` — refuses if unmerged; upgrade to `-D` only after checking `git log <name>..main`. |
| `git reflog expire --expire=now --all` + `git gc --prune=now` | usually unnecessary — only run for actual GC needs, never as part of "cleanup." |

If the alternative achieves the same goal, use it instead. State why you're not using the alternative if you're sticking with the destructive form.

### 6. Decide GO or STOP

**GO** if:
- The goal is clear and stated.
- State check matched expectations.
- Target verified to contain what was expected.
- No less-destructive alternative would do.
- The command will run as a **standalone Bash call**, not chained.

**STOP** if:
- State check revealed something unexpected (extra stashes, unmerged paths, dirty tree, wrong branch).
- Target verification mismatched (stash@{0} contains something different from expected; SHA points to a different commit).
- A less-destructive alternative achieves the same goal — use that instead.
- The user's intent is ambiguous — surface and ask.

### 7. Execute as a standalone Bash call

The destructive command runs in its own Bash invocation. **Do not** `&&` it after a state-check command, a `cd`, a `checkout`, or any other operation. Each destructive step gets its own call.

### 8. Verify outcome

After running, a separate read-only Bash call confirms the world is in the expected state:
- After `stash drop`: `git stash list` to confirm count decreased.
- After `reset --hard`: `git status` to confirm clean tree.
- After `clean -fd`: `git status` and `ls <dir>` to confirm removal.
- After `push --force`: `git log origin/<branch> -3 --oneline` to confirm the new tip.

### 9. Log the decision

Append one line to [`context/SESSION_LOG.md`](../../../context/SESSION_LOG.md) under the current date's "Actions taken" entry:

```
git-safe: GO — `git stash drop stash@{0}` — preview matched WIP archV1 stash, no longer needed
```

or

```
git-safe: STOP — `git stash pop` — stash@{0} preview doesn't match what user described; surfacing to user
```

## Anti-patterns this skill catches

- **Chained destructive ops**: `git stash push && git checkout main && git stash pop` — destructive ops must be standalone.
- **Stash push without verifying creation**: a stash push when the tree is clean returns "No local changes to save" and creates nothing; subsequent operations against `stash@{0}` hit whatever was there before.
- **Stash drop without preview**: never `git stash drop stash@{N}` without `git stash show -p stash@{N} | head -20` first.
- **Reset --hard with unmerged paths**: discards the index slots, losing content that was only ever in the conflict markers. If the conflicts came from a stash pop, the stash is already gone — content is unrecoverable.
- **`checkout -- path` with unstaged edits**: overwrites local edits silently. Use `git restore --source=HEAD -- path` for clarity.
- **Force-push to shared branch**: clobbers teammates' work. Use `--force-with-lease`, and prefer `revert` over force-push when on a shared ref.

## Examples

### Example: dropping a stash safely

```
goal: drop stash@{2} — the duplicate "auto-stash before reset" from 2026-05-14.

state: 4 stashes on the list. branch is feat/new-buisiness, clean tree.

planned: `git stash drop stash@{2}`
consequence: removes from list; commit stays in object store ~14 days.

verify: git stash show -p stash@{2} | head -20
  → diff matches "auto-stash" content (a single tsconfig revert).
  → not load-bearing.

alternative: keep it (free, but clutters list). Not blocking, but harmless to drop.

decision: GO

execute (separate call): git stash drop stash@{2}

verify outcome (separate call): git stash list   → 3 stashes remain.

log: git-safe: GO — drop stash@{2} — duplicate auto-stash, content trivial
```

### Example: reset --hard during a conflicted state

```
goal: drop the conflict markers from a failed stash pop so I can push.

state: 6 unmerged paths from the pop. stash list is empty (the pop dropped the stash already).

planned: `git reset --hard HEAD`
consequence: discards every conflict marker AND every unmerged-index slot. The content
  in those slots is ONLY in the original stash commit, which was dropped. If the stash
  commit is no longer in the reflog, this is unrecoverable.

verify: git fsck --unreachable | grep commit
  → finds the dropped stash commit SHA 0f486b52...
  → recoverable via git stash store before the reset.

alternative: git stash store -m "RECOVERED" 0f486b52 FIRST, then reset.

decision: STOP — surface to user that the stash is recoverable and ask whether to
  restore it before resetting.

log: git-safe: STOP — reset --hard with reachable dropped stash commit, asked user
```

### Example: clean -fd

```
goal: remove untracked playwright-report/ and test-results/ dirs.

state: tree has 8 untracked entries. 2 are the target dirs; 6 are committed source.

planned: `git clean -fd`
consequence: deletes ALL 8 untracked entries, including any uncommitted new files.

verify: git clean -fdn   (dry-run)
  → output includes "Would remove src/components/widgets/forms/PlanForm.tsx"
  → that's a source file in progress! Not the target.

decision: STOP — the dry-run revealed an uncommitted source file would be deleted.
  Surface to user; suggest `git clean -fd playwright-report/ test-results/` to scope.

log: git-safe: STOP — clean -fd would delete uncommitted PlanForm.tsx
```

## Bypass

If the user explicitly authorizes a fast path for a specific case ("just run it, I've verified"), the agent can skip pre-flight for that case but **logs it** in SESSION_LOG.md with the bypass reason. The bypass applies to that one command, not to a session-wide exemption.

## Related

- [`context/GIT_SAFETY.md`](../../../context/GIT_SAFETY.md) — the full reference: traps, recovery patterns, command alternatives.
- [`context/HANDOFF.md`](../../../context/HANDOFF.md) — resume protocol.
- [`context/SESSION_LOG.md`](../../../context/SESSION_LOG.md) — incident history.
- AI auto-memory `feedback_git_safety.md` — the cross-session memory of why this skill exists.
