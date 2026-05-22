# Git safety — pre-flight for destructive commands

This document is a project-level safety reference for anyone (human or AI) running git commands in this repo. It exists because on 2026-05-18 a session lost a stash by chaining a wrongly-assumed `git stash push` with a later `git stash drop`. See [SESSION_LOG.md](SESSION_LOG.md) entry of that date for the incident.

The rule: **destructive git operations require a pre-flight check, run as a standalone command, with target verification.**

## The destructive set

Any of these commands must trigger pre-flight:

- `git stash drop`, `git stash pop`, `git stash clear`
- `git reset --hard`
- `git clean -f*` (`-fd`, `-fdx`, any force flag)
- `git push --force` / `--force-with-lease`
- `git branch -D`
- `git checkout -- <path>`, `git checkout <commit> -- <path>`
- `git restore --` (with or without `--source`)
- `git rebase` (any form, including `-i`, `--onto`, `--abort` mid-state)
- `git filter-branch`, `git filter-repo`
- `git gc --prune=now`, `git prune`, `git reflog expire`
- `git update-ref -d`
- `git worktree remove --force`

## Pre-flight checklist

Before running anything in the destructive set:

1. **State the goal in one sentence.** What is the user actually trying to achieve? If you can't state it, you shouldn't run the command.

2. **Inspect state with read-only commands.** Run as a separate Bash call:
   - `git status --short` — uncommitted changes, conflict markers
   - `git branch --show-current` — current branch
   - `git stash list` — when touching stashes
   - `git reflog -5` — when resetting or rebasing
   - `git log <ref> -1 --oneline` — when targeting a ref/SHA

3. **Plain-English the command.** Write out what it actually does in human terms, and what's lost if it's the wrong target. Surface this in user-visible text before running.

4. **Verify the target.** If the command takes a ref or SHA:
   - For `stash@{N}`: `git stash show -p stash@{N} | head -20` — confirm contents match expectation.
   - For a SHA: `git show --stat <sha> | head -10` — confirm the commit matches.
   - For a branch ref: `git log <ref> -1 --oneline` — confirm the commit at the tip.

5. **Prefer the less destructive alternative.**

   | Instead of | Use |
   |---|---|
   | `git stash pop` | `git stash apply`, verify, then `git stash drop` separately. |
   | `git reset --hard` | `git stash` first; then reset only after the work is safe. |
   | `git checkout -- <path>` | `git restore --source=HEAD -- <path>` (same effect, less ambiguous). |
   | `git clean -fd` | `git clean -fdn` (dry-run) first, review output, then `-fd`. |
   | `git push --force` | `git push --force-with-lease` at minimum. |
   | `git branch -D` | `git branch -d` first (refuses if unmerged); upgrade to `-D` only after verifying with `git log <branch>..main`. |

6. **Run the destructive command as a standalone Bash call.** Never `&&` it after another command. Never include it in a multi-step pipeline. Each destructive step gets its own invocation so failure cannot cascade silently.

7. **After running, verify the outcome.** A separate read-only Bash call to confirm the world is in the state you expected.

## Common traps

### Trap: stash push when working tree is clean

`git stash push` returns "No local changes to save" and exits 0 if the working tree has nothing to stash. **No new stash is created.** Subsequent `stash pop` or `stash drop` will act on whatever was previously at `stash@{0}`.

**Defense:** before any stash operation, run `git stash list` and verify the count and the top-of-stack matches expectations.

### Trap: pop with conflicts leaves files mid-merge

`git stash pop` that hits conflicts leaves the working tree with `U`/`DU`/`UU` paths in the index. A subsequent `git reset --hard HEAD` resets these — but the stash content that conflicted is **only** in the dropped stash commit, not in any committed history. Run `git status` after a pop; if there are conflicts, prefer `git stash apply` (re-applicable) over `pop` (irrecoverable from the stash list).

### Trap: chained destructive operations

`git stash push && git checkout main && git stash pop` looks atomic but isn't. If the push silently does nothing (clean tree), the pop runs against a different stash than you assumed. Always:

```bash
git stash push -u -m "<reason>"
# separate Bash call:
git stash list   # verify the new stash exists at {0}
# separate Bash call:
git checkout main
```

### Trap: bare `checkout <ref> -- <path>`

`git checkout feat/new-buisiness -- some/path` overwrites the local file with the version from that branch — **without warning if there were unstaged edits**. Prefer `git restore --source=feat/new-buisiness -- some/path` which makes the intent explicit and behaves more predictably across git versions.

### Trap: `reset --hard` while unmerged paths exist

`git reset --hard HEAD` while in a conflicted state discards the conflict markers — and the only place the conflicting content existed (the index slots). If the conflict came from a `stash pop`, that stash was already dropped. The content is **gone** from anywhere except the original stash commit (if recoverable from object store).

**Defense:** before `reset --hard` during a conflicted state, run `git stash list` to confirm whether a stash is the right home for the in-flight work, or `git ls-files -u` to see the unmerged slots.

## Recovery patterns

### Dropped stash

If you ran `git stash drop` on the wrong stash, the commit object survives for `gc.reflogExpire` (default 90 days for reachable, 14 days for unreachable). Recover with:

```bash
# Find candidates
git fsck --unreachable | grep commit

# Inspect a candidate
git show --stat <sha>
git stash show -p <sha>   # if it looks like a stash

# Re-attach to stash list
git stash store -m "RECOVERED: <description>" <sha>
```

### Reset --hard discarded uncommitted work

The lost work was never in a commit. Recovery is limited to:
- Editor undo history (if files still open)
- IDE's local history (IntelliJ, VS Code's Timeline)
- macOS Time Machine
- Filesystem snapshot (APFS, ZFS, etc.)

git itself cannot help — there is no commit to recover.

### Force-pushed over a teammate's work

The pushed-over commit is on origin's reflog (server-side) for some retention window, often 30-90 days. The commits are also still on the teammate's local clone until they `git fetch --prune`. Contact the teammate first; if their clone is clean, they can `git push origin <sha>:refs/heads/<branch>` to restore.

## When to consult this doc

Anyone running git in this repo. AI agents working in this repo are required to consult [the git-safe skill](../.claude/skills/git-safe/SKILL.md) before any destructive command — that skill operationalizes this checklist.

## Related

- [.claude/skills/git-safe/SKILL.md](../.claude/skills/git-safe/SKILL.md) — invokable pre-flight skill.
- [SESSION_LOG.md](SESSION_LOG.md) entry 2026-05-18 — the incident this doc was written against.
- Project-wide CLAUDE/AGENTS.md instructions on destructive operations.
