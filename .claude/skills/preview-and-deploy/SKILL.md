---
name: preview-and-deploy
description: Verify a branch is healthy (lint, tests, local preview via `npm run preview`) and then deploy it to Cloudflare via `npm run deploy` so the user gets a shareable demo URL. Use when the user says "ship a preview", "deploy this branch", "give me a demo link", or as the final stage of `/specs-to-draft`. Stops before deploy by default and asks for confirmation — deploys are visible to others and warrant a checkpoint.
---

# Preview and deploy

Take the current branch, prove it works, then ship it to Cloudflare for a shareable URL.

## Inputs
- `$ARGUMENTS`:
  - `--auto-deploy` — skip the confirmation step before `npm run deploy`. Only honor if the user explicitly passed it on this invocation.
  - `--no-deploy` — run preview + tests only, never deploy. Useful for a sanity check.
  - `--routes=/foo,/bar` — extra routes to spot-check after preview comes up. Always include the routes the current branch added.

## Preconditions (verify before any work)
- Read `context/HANDOFF.md` if it exists, then follow its linked context before deciding what should be previewed or deployed.
- `git status` is clean OR all uncommitted work has been intentionally staged. If dirty and unintentional, stop and ask.
- Current branch is **not** `main`. Refuse to deploy from `main` directly.
- The branch is pushed (or about to be) — a deploy from a never-pushed branch loses the audit trail.

## Pipeline

### 1. STATIC CHECKS (fast, fail loud)
Run in parallel:
- `npm run lint`
- `npm run format:check`
- `npm run test` (or `npm run test:unit` if the full suite is slow and the change is UI-only — use judgment)

Any failure → stop, summarize, do not proceed. Do not "fix" failing tests by skipping or weakening assertions; either fix the root cause or surface it.

### 2. BUILD + LOCAL PREVIEW
- Run `npm run preview` in the background. This runs `opennextjs-cloudflare build && opennextjs-cloudflare preview --ip 0.0.0.0 --port 8787`.
- Watch the output: wait for the server to indicate it's listening on `:8787`. If the build fails, stop with the build error.
- Once up, smoke-test:
  - The home / known-good route loads.
  - Each route from `--routes` (or routes detected from this branch's diff) returns 200 and renders without console errors.
  - Spot-check at least one interactive flow if the branch added one.
- If you can't run a real browser check, say so and describe what you verified from server logs / curl / response codes — don't claim visual correctness on faith.
- Stop the preview process when done.

### 3. DECIDE
Summarize what passed and what's still manual. Default behavior: **stop here and ask the user to confirm before deploying.** Print:
- Branch name, last commit, what changed.
- What you verified.
- What's still unverified (be specific).
- The deploy command that will run next.

Skip this confirmation only if `--auto-deploy` was passed on this invocation. Never assume prior approval carries over.

### 4. DEPLOY
- Run `npm run deploy` (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`).
- Capture stdout — Cloudflare prints the deployed URL. Extract it.
- If deploy fails partway, report the failure clearly. Do not retry silently — investigate first.

### 5. REPORT
Return to the user:
- Deployed URL (the shareable demo link).
- Branch + commit it was deployed from.
- One-line summary of what's live.
- Any caveats (stubbed data, mocked endpoints, untested flows).

## Operational constraints
- **Honor repo memory.** If `context/CORE_MEMORY.md` or `context/HANDOFF.md` records known caveats, active workstreams, or verification expectations, incorporate them into the preview summary rather than treating the branch as isolated.
- **Deploy is visible to others.** Always confirm unless `--auto-deploy` is explicit. Approval doesn't carry across invocations.
- **Never deploy from `main`.** Feature branches only.
- **Never skip hooks** (`--no-verify`) or weaken tests to make a deploy go through. If something's broken, fix it or surface it.
- **Don't push code as part of this skill.** Code-pushing is the user's call (or the executor skill's) — this skill is about verifying and deploying what's already there.
- **Single deploy per invocation.** If the user wants to redeploy after fixes, run the skill again.
- **Capture the URL.** A deploy without a returned URL is a failure mode worth flagging — don't assume it worked.
