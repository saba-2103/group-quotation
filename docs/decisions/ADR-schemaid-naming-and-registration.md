# ADR: `schemaId` Naming And Registration

**Status:** Accepted  
**Owner:** Frontend Platform Schema Contract Owner  
**Date:** 2026-04-29

**Related Docs:**

- [`../archV1/01-SCHEMA-LANGUAGE.md`](../archV1/01-SCHEMA-LANGUAGE.md)
- [`../archV1/06-AUTHORING-LINT-AND-REVIEW.md`](../archV1/06-AUTHORING-LINT-AND-REVIEW.md)
- [`../archV1/08-MIGRATION-PLAN.md`](../archV1/08-MIGRATION-PLAN.md)

---

## Decision

All `schemaId`s in `archV1` must use lowercase kebab-case semantic page-family names.

Canonical examples:

- `quotations-list`
- `quotation-details`
- `claims-list`

Variants, when justified, must use their own explicit kebab-case `schemaId`s.

Example:

- `claim-details-lite`

The frontend/platform schema contract owner is the approver for new `schemaId` registrations.

---

## Why This Decision Exists

In `archV1`, `schemaId` is not just a schema label.

It is part of:

- route manifest entries
- resolved artifact filenames
- CDN and storage paths
- publication and rollback procedures
- logs, telemetry, and operational runbooks
- variant selection

Allowing multiple naming styles would create drift across all of those places and make later cleanup expensive.

This is cheap to standardize now and expensive to change once real pages are published.

---

## Canonical Convention

Use:

- lowercase letters
- hyphen separators
- semantic page-family names

Recommended pattern:

- `<domain>-<page-kind>`

Examples:

- `quotations-list`
- `quotation-details`
- `claims-list`
- `claim-details`
- `admin-user-list`

The name should describe the user-facing page contract, not the file layout or implementation history.

---

## Forbidden Patterns

The following patterns are not allowed.

### 1. Environment-encoded IDs

Do not encode environment or deployment state into `schemaId`.

Bad:

- `prod-quotations-list`
- `staging-claims-list`
- `uat-quotation-details`

Why disallowed:

- environment belongs in deployment configuration, not the schema identity

### 2. File-path-style IDs

Do not make `schemaId` look like a filesystem path.

Bad:

- `quotations/list`
- `claims/detail`
- `admin/users/list`

Why disallowed:

- file layout can change without changing page identity

### 3. Dotted IDs

Do not use dotted namespace-style IDs.

Bad:

- `keystone.quotations.list`
- `claims.detail`

Why disallowed:

- the architecture has already standardized on kebab-case and should not mix naming systems

### 4. Mixed naming systems

Do not mix kebab-case, dotted, and path-like forms in the same repo.

Bad set:

- `quotations-list`
- `claims.detail`
- `admin/users/list`

Why disallowed:

- operational tooling, validation, and review become inconsistent immediately

### 5. Temporary or implementation-detail names

Do not use placeholder or internal implementation names.

Bad:

- `page1`
- `newLayoutTest`
- `quotationsTableFinal`
- `claims-page-vnext`

Why disallowed:

- these names do not describe the stable page contract

---

## Variant Naming

Variants are allowed only when justified by the architecture rules.

If a variant exists:

- it gets its own `schemaId`
- it still follows lowercase kebab-case
- its name should remain semantic

Good:

- `claim-details-lite`
- `admin-user-list-compact`

Bad:

- `claimDetailsLite`
- `claims/detail-lite`
- `admin.user.list.compact`

The variant name should reflect a meaningful page-family difference, not a temporary implementation branch.

---

## Registration And Approval Process

### Who proposes a new `schemaId`

- module engineers
- frontend/platform engineers
- engineers introducing an approved variant

### Who approves a new `schemaId`

- frontend/platform schema contract owner

### Minimum approval checks

Before approving a new `schemaId`, the reviewer should confirm:

1. the ID is lowercase kebab-case
2. the name is semantic and stable
3. the ID does not collide with an existing page family or variant
4. the ID does not encode environment, file layout, or temporary implementation detail
5. if it is a variant, the variant justification already exists

### Where approval happens

The default approval path is normal PR review.

The PR adding a new `schemaId` should include:

- the route manifest entry if applicable
- the page schema using the ID
- any variant rationale if applicable

No separate registry system is required in early v1 as long as PR review ownership is explicit.

---

## Consequences

### Benefits

- keeps schema identity readable and operationally simple
- keeps route manifests, artifact paths, and logs aligned
- avoids naming drift early in adoption
- makes schema review and tooling easier

### Costs

- requires central review for new IDs
- blocks ad hoc naming freedom

This trade is worth it because `schemaId` is part of the deployment and runtime contract, not just authoring convenience.

---

## Acceptance Criteria

This decision is complete when all of the following are true:

- this decision record is committed
- the canonical convention is documented with examples
- forbidden patterns are explicitly listed with examples
- the approval owner for new `schemaId`s is named
- `docs/archV1/08-MIGRATION-PLAN.md` Phase 1 deliverables reference this decision
