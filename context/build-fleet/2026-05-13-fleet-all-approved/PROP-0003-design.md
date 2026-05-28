---
proposal: PROP-0003
run_id: 2026-05-13-fleet-all-approved
goal: Add an "Add member" action to the live Policy detail screen so ops can add members mid-policy, with PENDING→ACTIVE polling on the new row.
golden_path: From `/policy-admin/policies/<live-active-id>` → switch role to `ops` → see "Add member" button in the members section header → click → form opens → fill identity (name/dob/gender/salary/occupation), PII (mobile/email/govId), planNo (from policy's available plans), sumInsured, premium → submit → POST /api/policy-admin/policies/{id}/members succeeds → form closes → members table refreshes → new row appears at status PENDING → polling resolves PENDING → ACTIVE within 30s (or surfaces timeout banner).
golden_path_route: /policy-admin/policies/[id]
files_touched:
  - schemas/forms/add-policy-admin-member-form.json                           # new form: mirrors AddMemberRequest shape from src/lib/api/policy-admin.ts:150–167; POSTs to /api/policy-admin/policies/{policyId}/members; onSuccess closes form + invalidates members query; submitted member id stored for the polling badge
  - schemas/tabs/policy/members.json                                          # add headerActions with "Add member" button gated by stateActions: PENDING|ACTIVE + roleActions: ops; navigates to the form modal
out_of_scope:
  - Backend wrapper (already exists at src/lib/api/policy-admin.ts:173–211, including structured MemberPremium and optional MemberUwDecision)
  - Cancel/edit member affordances (out of scope; this proposal only adds the add path)
  - Audit trail UI for the add
  - Mock-mode work
---

# PROP-0003 — Post-issuance AddMember UI

## Decisions made by orchestrator (in lieu of CLARIFY)

1. **Role gating**: `ops` only. Per blueprint §6.6, `MemberEnrollmentFlow` is the runtime; the *ops* role owns mid-policy lifecycle work. MPH/sales paths go through proposal flow.
2. **State gating**: PENDING + ACTIVE both, per proposal text. Members can be added to a policy that's been provisioned (PENDING) or live (ACTIVE).
3. **Polling**: use `STANDARD_POLL_SCHEDULE` from [src/lib/polling.ts:14–19](src/lib/polling.ts). The form's `onSuccess[]` invalidates the members query; the table row's polling is driven by `useSmartQuery`'s existing `pollSchedule` with `stopWhen` that resolves when `state !== 'PENDING'`. The list query already covers this once invalidation refreshes the row.
4. **Form layout**: two-column, matching the existing `add-policy-member-form` (proposal-stage form). Fields include the structured `premium` and optional `uwDecision` per the request type.
5. **No new mock work.**

## Reuse anchors

- Wrapper + types: [src/lib/api/policy-admin.ts:150–177](src/lib/api/policy-admin.ts) — `AddMemberRequest` includes `premium: MemberPremium` and `uwDecision?: MemberUwDecision`.
- Tab pattern with `headerActions`: [schemas/tabs/proposal/members.json](schemas/tabs/proposal/members.json) — copy onto policy/members.json.
- Role gating precedent: PROP-0009's `visibleRoles` + the existing `roleActions` block on [schemas/policy-detail.json:50–78](schemas/policy-detail.json).
