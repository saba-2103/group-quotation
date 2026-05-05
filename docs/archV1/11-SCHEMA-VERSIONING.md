# Schema Versioning And Compatibility v1

## Purpose

This document defines how schema versions are managed across the lifecycle of an archV1 application — from authoring through publication, runtime resolution, and deprecation.

Without explicit versioning rules, a long-running application accumulates persisted state, runtime expectations, and schema drift that quietly break each other. The discipline must be set early.

## Version Format

Schema versions use semantic versioning with three components:

```
<major>.<minor>.<patch>
```

The semantics are:

- **Major** — breaking change to the schema contract or the runtime's compatibility requirements
- **Minor** — additive change that older runtimes can ignore safely
- **Patch** — non-functional change such as metadata, comments, or internal restructuring

Every published schema declares its version explicitly:

```json
{
  "schemaId": "mph.policies.detail",
  "version": "2.3.1"
}
```

## What Constitutes Each Change Type

### Major version bump

A major bump is required when:

- a namespace is removed or renamed
- a required field is added to a runtime declaration
- a widget type is removed or its contract changes incompatibly
- an action step type changes its signature
- a workflow state is removed
- a persisted `app.*` namespace's storage key changes
- the schema relies on a runtime feature not present in the previous compatibility range

Any change that breaks runtime backwards compatibility with a previously-published schema is a major bump.

### Minor version bump

A minor bump is required when:

- a new namespace is added
- a new optional field is added to a runtime declaration
- a new action is declared
- a new workflow state is added (without removing existing ones)
- a new widget binding is added
- a new optional condition is added

Any additive change that older runtimes can safely ignore is a minor bump.

### Patch version bump

A patch bump is used for:

- metadata changes (title, description, ownership tags)
- comment additions or removals
- reordering of declarations where order does not affect runtime semantics
- documentation-only updates

Patch bumps must not change runtime behavior in any observable way.

## Runtime Compatibility Matrix

The runtime declares the schema versions it supports:

```ts
interface RuntimeCompatibility {
  supports: {
    minMajor: number;
    maxMajor: number;
  };
}
```

A runtime with `minMajor: 1, maxMajor: 2` accepts any v1.x.x or v2.x.x schema. It rejects v3.x.x schemas with a clear contract error at resolution time, before any rendering attempt.

### Forward compatibility within a major version

Within a supported major version, the runtime is forward-compatible with minor and patch increments. A v1.2 runtime can render a v1.5 schema by ignoring the additive features it does not understand. This matters for staged rollouts where the schema is updated before the runtime.

The runtime logs a development-mode warning when it encounters minor-version features it does not recognize, so authors are aware of the gap.

### Backward incompatibility across major versions

The runtime does not render schemas outside its declared `minMajor`–`maxMajor` range. A runtime configured with only v2 support (i.e. `minMajor: 2, maxMajor: 2`) cannot render a v1 schema. Cross-major backward compatibility requires explicitly lowering `minMajor` — it is never implicit. Major version bumps therefore require a coordinated runtime update, even when multi-major support is declared.

## Persisted State Versioning

Persisted `app.*` state is tagged with the schema version that wrote it. When a namespace declares `clearOn: ["schemaVersionChange"]`, the runtime compares the persisted version against the current schema version on read.

The comparison uses the major version only. Minor and patch differences do not invalidate persisted state — only major bumps do.

This means a v1.5 schema can read state written by a v1.2 schema, but a v2.0 schema clears all state written by any v1.x schema (unless a migration definition is provided — see below).

## Deprecation Path

When a field, namespace, action, or operator is going away, the deprecation follows a three-step path:

### 1. Mark deprecated in the next minor version

The field continues to work. The lint rule emits a warning when it is used. The schema's `metadata.deprecations` array lists what is deprecated and points to the replacement:

```json
{
  "metadata": {
    "deprecations": [
      {
        "path": "page.legacyFilters",
        "since": "1.4.0",
        "removeIn": "2.0.0",
        "replacement": "page.filters"
      }
    ]
  }
}
```

### 2. Maintain through subsequent minor versions

Deprecated features must continue to work for at least two minor releases after the deprecation announcement, giving consumers time to migrate. Removing a feature in the same minor version it was deprecated in is not permitted.

### 3. Remove in the next major version

The deprecated feature is removed at the major version specified in `removeIn`. This is a breaking change and requires the major bump.

A field cannot be removed in a minor version, even if no consumer uses it. The major version is the only contractually permitted point for removal.

## Publication Validation

Schema publication runs an automated version check:

1. The new schema's version is compared against the most recent published version of the same `schemaId`.
2. The validator infers the required version bump type by diffing the schemas (added namespaces, removed fields, changed types).
3. If the declared version bump is smaller than the inferred required bump, publication is blocked.
4. The author must either reduce the change to fit the declared bump, or bump the version higher.

This prevents minor-version bumps that secretly break compatibility.

## Migration Tooling

When a major version is published, the runtime requires a migration definition that handles persisted state from the previous major version:

```ts
interface SchemaMigration {
  fromMajor: number;
  toMajor: number;
  migrations: NamespaceMigration[];
}

interface NamespaceMigration {
  namespace: string;
  strategy: "transform" | "discard";
  transform?: (oldValue: unknown) => unknown;
}
```

Each migration entry describes how persisted state from the old version is transformed (or discarded) to fit the new version. Migrations run once per user when their persisted state is first encountered by the new schema.

A major version published without a migration definition is a publication error — even if the discard strategy is chosen, it must be declared explicitly so reviewers can confirm the data loss is intentional.

## Runtime Version Negotiation

When a host app loads a schema that exceeds its runtime's compatibility range, the runtime emits a `version-mismatch` event before failing. The host app can intercept this to:

- show a "please refresh" message if the runtime bundle is stale
- redirect to a maintenance page during a coordinated cutover
- log the mismatch to telemetry for investigation

The default behavior, if the host app does not handle the event, is a clean error boundary explaining that the schema requires a newer runtime.

## Final Position

Schema versioning is not bureaucratic — it is the only mechanism by which a long-lived application can evolve its declarative contract without silently breaking persisted state or surprising clients. The discipline must be enforced at publication time, not left to author judgment.

Every major version, every deprecation, and every migration must be discoverable through the schema metadata itself. Reviewers should never need to consult external documentation to understand what changed and why.
