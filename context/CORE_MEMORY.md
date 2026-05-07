# Core Memory

Standing execution preferences for this repo. Subordinate only to explicit user overrides, hard blockers, or repo safety constraints.

## Resume / handoff

- [context/HANDOFF.md](HANDOFF.md) is the single entry point another AI should read first when resuming work.
- [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md) records interim patterns that are acceptable now but expected to simplify once a future architecture lands.
- Keep `context/` docs and `agent_logs/` current as work progresses so another AI can resume mid-stream after rate limits, handoffs, or interruptions.

## Mandatory logging protocol

Before starting any non-trivial task, add a dated entry to [context/SESSION_LOG.md](SESSION_LOG.md) stating what is about to be done. After completing, update the entry with:
- results,
- tests passed,
- files changed,
- next steps.

If the task changes the status of a phase, workstream, or proposal, also update [context/HANDOFF.md](HANDOFF.md) Active Workstreams and the relevant `proposals/PROP-*.md` frontmatter in the same commit.

This is not optional — stale context causes other AIs to redo or contradict completed work.

## Build approach

- Front-load foundational work when it meaningfully reduces downstream rework.
- Favor future-compatible shared primitives and workflow-complete building blocks over the narrowest possible first slice.
- Accept moderate early scope expansion when it improves long-term execution speed, surfaces integration issues earlier, and gives later proposals a cleaner base.
- Do not silently trim a feature back to a smaller demo if that creates likely follow-on churn; surface the tradeoff and bias toward the more reusable path.
- Every UI build should include a design preview checkpoint before implementation begins.

## Schema & widget architecture

- This repo is schema-driven. Read [docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md](../docs/NEW_MODULE_IMPLEMENTATION_GUIDE.md) before adding pages, modules, schemas, widgets, forms, or API surfaces.
- Schemas are composable. Prefer composing with existing widgets/layout primitives instead of teaching workflow components to become generic layout engines. If composition truly falls short, add or propose a new layout/component in the right layer rather than reinventing the wheel inside a feature widget.
- When async child widgets inside workflows need to affect completion, prefer a documented widget-state / eventing contract over schema callbacks. Record the interim rule and the future-architecture convergence note in [context/ARCH_TRANSITION.md](ARCH_TRANSITION.md).

## Branch hygiene

- Do NOT create new branches for every change or feature build unless explicitly requested by the user. Stay on the current branch and use sequential commits to save builds and context to avoid excessive branch proliferation.
- Exception: skills like `/build-feature` and `/execute-proposal` may create a feature branch when the working tree is dirty or when the user is on `main`/`master`. Their branch-hygiene checks are authoritative.

## Group PAS V1 — scope locks

These are decisions baked into [docs/group-pas-v1-plan.md](../docs/group-pas-v1-plan.md); change them only with explicit user sign-off:

- **Arch:** stay on existing keystone-ui schema-driven arch. Do not port to the PDF spec's `frontendProjection` pattern. State-aware actions handled via per-schema `stateActions` map + `ActionBar` widget.
- **Out of V1:** auth/roles, GCL MemberQuote (placeholder IA only), maker-checker, PII/Cerbos UI gating, endorsement/renewal/claims, PDF's UW/RI review states.
- **Existing `/quotations` module:** delete and rebuild from scratch against new backend. Do not preserve.
- **Demo target:** internal demo by end of current week. Optimize plan ordering for that.
