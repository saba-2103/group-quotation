# Track Briefings — archV1 Layer 1

This directory contains the **execution-ready briefings** for each track of the archV1 Layer 1 implementation. Each file is designed to be handed to a single AI coding agent as its entire context for that track.

The high-level plan and dependency graph live in [`../14-IMPLEMENTATION-EXECUTION-PLAN.md`](../14-IMPLEMENTATION-EXECUTION-PLAN.md).

## How to Use

1. Pick the next unblocked track from the dependency graph in [`../14-IMPLEMENTATION-EXECUTION-PLAN.md:99`](../14-IMPLEMENTATION-EXECUTION-PLAN.md#L99).
2. Open the [Agent Kickoff Template](./AGENT-KICKOFF-TEMPLATE.md), fill in the placeholders for this track, and use that as the prompt you hand to the AI agent.
3. Give the agent read access to the whole repo and write access to its owned directory only (listed in the briefing).
4. When the agent reports the DoD met, run `yarn lint && yarn typecheck && yarn test` and the track's own test command before merging.

## Track Index

| # | Track | Briefing | Status |
|---|---|---|---|
| 0 | Workspace Scaffold | [00-workspace-scaffold.md](./00-workspace-scaffold.md) | ready |
| 1 | Schema Types & Version Validator | [01-schema-types.md](./01-schema-types.md) | ready |
| 2 | Runtime Graph Provider | [02-runtime-graph.md](./02-runtime-graph.md) | ready |
| 3 | Conditions, Transforms & i18n | [03-conditions-transforms-i18n.md](./03-conditions-transforms-i18n.md) | ready |
| 4 | API Client & Request Policies | [04-api-policy-client.md](./04-api-policy-client.md) | ready |
| 5 | Namespace Hydrator | [05-namespace-hydrator.md](./05-namespace-hydrator.md) | ready |
| 6 | Action Engine + Access Enforcement | [06-action-engine.md](./06-action-engine.md) | ready |
| 7 | Workflow Engine | [07-workflow-engine.md](./07-workflow-engine.md) | ready |
| 8 | Widget Registry & Renderer | [08-widget-registry-renderer.md](./08-widget-registry-renderer.md) | ready |
| 9 | Error Surfaces & Validation Mapping | [09-error-surfaces.md](./09-error-surfaces.md) | ready |
| 10a | Read-Only Pilot | [10a-readonly-pilot.md](./10a-readonly-pilot.md) | ready |
| 10b | Full Workflow Pilot | [10b-workflow-pilot.md](./10b-workflow-pilot.md) | ready |

## Conventions Every Track Must Follow

- **Owned directory only.** Never edit files outside your track's owned directory or the explicit list of files in your briefing.
- **No `any`.** All exported APIs are fully typed. Internal helpers can use `unknown` where needed but never `any`.
- **No new dependencies** without listing them in your briefing's "Allowed deps" section.
- **Tests live next to source** as `*.test.ts(x)` inside your owned directory.
- **Reference docs by file + heading**, never just by file. E.g., `04-WORKFLOWS-AND-STATE-MACHINES.md` § "Reconciliation Rules".
- **Reuse before you write.** If your briefing names an existing file to wrap or extend, do not reimplement.
- **Structured logs at boundaries.** Use `console.debug('[runtime:trackName] …', payload)` so a future inspector can hook in.
- **Update `MEMORY.md`-style notes are out of scope.** Do not write to `CLAUDE.md`, `MEMORY.md`, or session logs.
