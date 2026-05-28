# Group PAS V1 — Roles & End-to-End Demo Scripts

Maps the roles described in [`docs/planning/GTL Quotation Module (3).md`](planning/GTL%20Quotation%20Module%20(3).md) to what the current build supports, and gives a runnable script per role that can be executed today against the deployed backend (`https://group-pas-dev.anairacloud.com`) via the keystone-ui frontend.

Auth isn't built; use the role-switcher widget (top-right of the app shell) to mock identity. Every script has been verified against the live mock + dev backend in proxy mode.

---

## Part 1 — Roles defined in the spec vs roles built today

The spec calls out the following operator / workbench actors. Two cases (A–D) and the UW Handoff section are the canonical lists:

| Spec role | Where in spec | What they do |
|---|---|---|
| **Sales** | §10–12 (CASE A/B), §11 takeover flow ("Ops / Sales / Broker must…") | Initiates quotes, builds plan/census/mapping, fixes data gaps, re-runs evaluation, sends-to-client |
| **Broker** | Same sections as Sales | Same surface as Sales for distribution-driven quotes; routing differs (broker portal context) |
| **Operations (Ops Reviewer)** | §6 "Quotation workbench: assign to UW, actuarial reviewer, **ops reviewer**, approver" | Operates the data-correction / document-collection queue (DOC_COLLECTION), repair lane, ops escalation |
| **Underwriter (UW)** | §7 UW Handoff, §9 Workbench, §3.B UW case | Reviews `REFER_TO_UW` cases the system pre-processes (FCL breach, evidence required); accept-as-is, increase loading, reduce SA, reject members, apply exclusions, override decisions |
| **Actuarial Reviewer** | §6 ("assign to UW, actuarial reviewer, ops reviewer, approver"), §1 sample reconciliation | Reviews pricing-heavy referrals, sample reconciliation |
| **Approver / Checker** | §6 ("approver"), §6 separation-of-duties section | Final approval before binding; SoD ensures author ≠ approver on the same case |
| **Reinsurance (RI) Reviewer** | §3.C / §5 RI_REVIEW state | Handles `REFER_TO_REINSURER` cases (RI loading, RI capacity, retro arrangements) |
| **Manager** | Implicit in escalation patterns; explicit in `docs/planning/SAMPLE-WORKFLOW.md` | Escalation point, terminal approval on high-value cases |
| **Admin** | Platform layer (catalog management, role registry) | Configures catalogs, role registry, feature flags. Not a quote/policy operator |
| **Viewer** | Resource-pattern catalog / general | Read-only across all modules |

### Currently in the frontend

[`src/components/widgets/role/RoleSwitcher.tsx`](../src/components/widgets/role/RoleSwitcher.tsx) ships **four**:

| Code role | Maps to spec role(s) | Notes |
|---|---|---|
| `maker` | Sales (+ Broker via routing context not yet modeled) | Author surface — creates quotes, edits drafts, submits |
| `checker` | Approver | Send-to-client → mark accepted → finalize |
| `ops` | Ops Reviewer | Repair members, send for issuance, archive |
| `viewer` | Viewer | Read-only |

### Gaps vs spec

| Spec role | Why it's missing today | Cost to add |
|---|---|---|
| **Underwriter** | PolicyMember has a `REFERRED_TO_UW` state with `uw/approve` + `uw/reject` actions on backend, but the current `roleActions` map lumps those under `ops`. | ~30 min: add `underwriter` to `Role` type, role-switcher entry, `roleActions` per schema |
| **Actuarial Reviewer** | No backend state distinguishes pricing-referral from UW-referral in V1. | Defer — needs spec lock first |
| **RI Reviewer** | RI_REVIEW workflow not implemented in backend V1. | Defer |
| **Manager (escalation)** | Out of V1 per CORE_MEMORY scope-locks (no manager-approval). | Defer |
| **Admin** | Catalog management isn't a V1 surface. | Defer |
| **Broker** | Routing-context concept not modeled. | Defer; collapse into Sales for now |

### Recommendation for tomorrow's demo

**Ship 5 roles** (one new — Underwriter):

```
Maker (Sales) | Underwriter | Checker (Approver) | Ops | Viewer
```

This matches the spec's primary workbench actors AND maps cleanly to backend's actual state machine. The other roles (Actuarial / RI / Manager / Broker / Admin) get a one-line "future role" mention in the role-switcher dropdown — visible but not selectable — so the demo viewer sees the road map.

If you want me to wire Underwriter as a distinct role + the future-role placeholders, that's a single targeted change ([Track J] in the changelog) — flag and I'll do it.

---

## Part 2 — End-to-end demo scripts

Each script is run via the keystone-ui frontend (mock-mode primary, proxy-mode for the integration coda). Mock-mode walks the full happy path; proxy-mode runs against `https://group-pas-dev.anairacloud.com` with the seed data (`npm run seed:backend`).

Switch role in the top-right widget. The application shell, action bars, and tab availability adapt automatically — that's the "structural adaptation" deck pitch.

### Setup checklist (do once before demo)

1. `.env.local` — comment out `GROUP_PAS_BACKEND_URL` for mock mode; uncomment for proxy.
2. `npm run dev` — server on `:3000`.
3. **Mock-mode reset**: `curl -X POST http://localhost:3000/api/dev/reset` between dry-runs.
4. **Proxy-mode seed**: `npm run seed:backend` once. (Reseed if dev DB is wiped.)
5. Visit `http://localhost:3000/` — confirm dashboard with Pending Quotes / Quotes Finalized / Active Policies / Members in Flight tiles. Numbers should be non-zero.

---

### Script 1 — Sales builds a clean quote (CASE A: STP)

**Spec reference:** §10 CASE A — Clean STP. Quote → Compute → Orchestrator → READY_TO_BIND → PAS.

**Role:** **Maker (Sales)**.

**Goal:** end-to-end Quote creation with valid data, walk through the full Maker authoring surface.

**Time:** ~3 minutes.

**Steps:**
1. Land on dashboard. Click **Quotation** card → quote list.
2. Click **New quote** (top-right button). Modal opens with two fields.
3. Pick a client from the dropdown (dynamic list — dropdown was previously broken; fixed in `483f93b`). Pick `GTL`. Click **Create quote**. Toast: *"Quote created"*.
4. Land on quote detail. State: **Draft**. Six tabs.
5. Click **Pricing** tab. Read the disabled "Request price" tooltip (backend Rule Engine not yet wired — `bfc292c` honesty rule). Move on.
6. Walk **Plans / Census / Member-mapping** tabs — fields populated for seeded quotes, "—" for fresh ones (legitimately empty until backend exposes Plan CRUD per D1).
7. Click **Edit** in the action bar. Edit-quote-policy-detail modal opens with current values pre-filled — change effectiveDate or premiumType. Click **Save changes**. Toast: *"Quote details saved"*.
8. (Optional, mock-mode only) Walk a quote that has premium baked in (`QTE-2026-0002`) through **Submit**. Toast confirms transition.

**Verifies:**
- Maker authoring surface works
- Form prefill, error toasts, success toasts all surface
- Pricing gap is honest (disabled-tooltip not faked)

**Backend gap surfaced in this script:** Rule Engine not wired (fix #1), so DRAFT quotes can't be submitted on real backend.

---

### Script 2 — Sales hits a data issue, Ops repairs (CASE B: Missing salary)

**Spec reference:** §10 CASE B — Missing salary. State `DATA_GATHERING`, queue `DOC_COLLECTION`, route to ops.

**Roles:** **Maker (Sales)** → **Ops**.

**Goal:** show the ops repair lane on a PolicyMember.

**Time:** ~2 minutes.

**Steps:**
1. As **Maker**, navigate to **Policy Admin → Policies**. Click into `POL-2026-0001` (mock) or any seeded policy in proxy mode.
2. **Members tab** — sort/filter to surface a row in **REPAIR_PENDING** state (mock-fixture `PMB-0007 Karan Joshi` has classification errors — salary missing, sum insured underivable).
3. Click into the member. Reason banner shows the classification error JSON parsed inline.
4. Switch role to **Ops**. Action bar restructures — Maker actions vanish, Ops sees Repair / Reject.
5. Verbal narrative only (mock doesn't auto-cascade repair → reclassify → APPROVED): *"Ops fixes the salary, backend's classification workflow re-runs, member walks back to APPROVED."*
6. To show the actual cascade in motion, navigate to a member already in **APPROVED** state (`PMB-0006 Ishita Rao`). Click **Send for issuance**. Wait ~5 seconds. State → **ADDED**, PAM Member appears.

**Verifies:**
- Role-adaptive UI on the same screen (Maker → Ops swap)
- State badges, reason banner rendering parsed JSON
- send-for-issuance → PAM Member async appearance (Temporal cadence in proxy mode, mock simulator in mock mode)

**Backend gap:** activation Temporal worker on dev (fix #2) — without it, the policy never auto-activates.

---

### Script 3 — Underwriter handles a UW referral (CASE C)

**Spec reference:** §10 CASE C — UW referral. State `UNDER_UW_REVIEW`, queue `UW_REVIEW`, actions `[VIEW_UW_CASE, APPLY_DECISION]`.

**Roles:** **Maker (Sales)** → **Underwriter** (currently absent from the role-switcher; see "Recommendation" above).

**Goal:** show what the UW operator workbench looks like for a member crossing free-cover limit.

**Time:** ~2.5 minutes.

**Steps:**
1. As **Maker**, navigate to a Policy with a high-SA member in `REFERRED_TO_UW` state (mock-fixture `PMB-0008 Meera Gupta`, salary ₹48L, SA ₹11.5Cr).
2. Click into the member. Show the classification result `{lane: "REVIEW"}` and the risk signals from the API (parsed via the new KVG `parseJson` mechanism, `f1611f6`).
3. **Switch role to Underwriter** (placeholder until [Track J] ships). Action bar changes — UW sees `Approve UW`, `Reject UW`. Maker / Ops / Checker actions vanish.
4. Click **Approve UW**. Member transitions to **APPROVED**. Toast: *"Member approved."*
5. Switch back to **Ops** to send-for-issuance (script 2 step 6 path).

**Verifies:**
- UW-specific decision surface (separate from ops)
- Backend's `policy-members/:id/uw/approve` endpoint
- Multi-role handoff on a single member's lifecycle

**Backend gap:** Underwriter role not in DSL Cerbos (since auth is open in V1). Today's UI uses role gating; backend doesn't enforce.

---

### Script 4 — Maker → Checker SoD handoff on a Quote

**Spec reference:** §6 ("approver" + separation-of-duties resource pattern).

**Roles:** **Maker (Sales)** → **Checker (Approver)**.

**Goal:** demonstrate role-adaptive action bar across the Quote lifecycle.

**Time:** ~2 minutes.

**Steps:**
1. As **Maker**, navigate to `QTE-2026-0002` (mock-mode — DRAFT but premium baked-in, not pre-linked to any Proposal).
2. Action bar shows: Edit, Submit, Send for approval (visible-but-disabled with tooltip — backend approval workflow not yet wired, `bfc292c`), Withdraw.
3. Click **Submit**. State → SUBMITTED. Action bar updates — Maker now has only Withdraw.
4. **Switch role to Checker**. Action bar restructures. Checker sees: Send to client, Withdraw.
5. Click **Send to client** → SENT_TO_CLIENT.
6. Click **Mark accepted** → ACCEPTED.
7. Click **Finalize** → FINALIZED. Toast: *"Quote finalized; Proposal created in Issuance."*. The mock returns `{proposalId}` synchronously (`bfc292c` Q→P sync alignment).
8. Navigate to **Issuance** sidebar. Find the new proposal at the top. Walk submit → finalize (~4s policy creation delay simulated).

**Verifies:**
- State + role gating composes correctly (Edit DRAFT visible to Maker, Finalize ACCEPTED visible only to Checker)
- The honesty pattern: send-for-approval is a visible-disabled affordance, not a fake simulation
- Sync Q→P handoff matching backend reality

**Backend gap:** Quote-level approval workflow doesn't exist in DSL — disabled-with-tooltip surfaces this (fix already on backend's plate).

---

### Script 5 — Activation cascade demo

**Spec reference:** SAMPLE-WORKFLOW.md threshold-driven activation.

**Roles:** **Ops** + observer.

**Goal:** show the policy auto-activation cascade — threshold met → policy active → members fan-out to active.

**Time:** ~2 minutes.

**Mock mode:** simulator runs on a 4–5s timer.
**Proxy mode:** requires backend Temporal worker running on dev (fix #2). Without that, members stay PENDING.

**Steps:**
1. As **Ops**, navigate to a low-threshold policy. In mock mode use `POL-2026-0001` (threshold 30; pre-loaded with members near the line). In proxy mode, use the seeded `pol-evergreen-active` (threshold 1).
2. Show the **Pending breakdown** card on policy detail (derived client-side from members list, `f1611f6` rendering the parsed JSON values inline).
3. Click into a PolicyMember in `APPROVED`. Send for issuance.
4. Wait ~5s. Refresh. PolicyMember → ADDED. PAM Member appears at `/policy-admin/members/by-policy-member/<id>` with `pendingReason: PENDING_FLOAT_RESERVATION`.
5. (Proxy-mode only, post-fix #2) Wait for activation cascade: policy → ACTIVE, member → ACTIVE.

**Verifies:**
- Cross-module deep-link (PolicyMember → PAM Member)
- Temporal-cadence simulator timing (mock matches backend)
- Pending-breakdown derived from live member list

---

### Script 6 — Cancellation cascade

**Spec reference:** §10 LD-13 cancellation pathway in the spec; `scenarios.sh` §5.7.

**Roles:** **Ops** (or Checker).

**Goal:** show that cancelling a Policy fans out and voids in-flight Members.

**Time:** ~90 seconds.

**Steps:**
1. As **Ops**, navigate to a Policy in PENDING with at least one in-flight member. Mock: `POL-2026-0002` or `POL-2026-0003`. Proxy: any seeded policy + 1 added member.
2. Action bar: **Cancel policy**. Confirm dialog (with reason input — P2.1 confirm-with-input is a remaining open polish item).
3. Submit. Toast confirms; state → CANCELLED.
4. Members tab — every in-flight member should transition to VOID (proxy-mode requires backend Temporal worker to fan out).

**Verifies:**
- Terminal-state cascade
- Reason capture on destructive actions

**Backend gap:** Float Management is a stub (`fix #4 in our list`), so void-due-to-float-unavailable specifically can't trigger; the more generic policy-cancellation cascade does work.

---

### Script 7 — GCL Member-Quote flow (per-member quoting)

**Spec reference:** Out of V1 scope per CORE_MEMORY, but the GCL endpoints are real on backend (verified via `MemberQuoteAPI.java`). Built into the frontend in commit `3f30dca` for proxy-mode parity.

**Roles:** **Maker (Sales)** → **Checker**.

**Goal:** show the per-member quoting path that's separate from the aggregate GTL flow.

**Time:** ~90 seconds.

**Steps:**
1. As **Maker**, sidebar → **Member Quotes (GCL)**.
2. Click **New member quote**. Pick a policy + plan. Submit.
3. Quote in DRAFT. Click **Set premium** — opens the small inline form. Enter amount, save.
4. Click **Submit**. State → SUBMITTED.
5. **Switch to Checker**. Click **Finalize**. Member-quote → FINALIZED, creates a PolicyMember on the parent policy.

**Verifies:**
- Parallel module surface using the same schema patterns
- Set-premium widget (the one feature where V1 backend DOES expose a manual premium endpoint — for member-quote only)

---

### Script 8 — Read-only dashboard tour (Viewer)

**Roles:** **Viewer**.

**Goal:** confirm there's nothing the Viewer can accidentally click that would mutate.

**Time:** ~30 seconds.

**Steps:**
1. Switch to **Viewer**.
2. Walk Dashboard → Quotation list → quote detail → Issuance → Policy Admin.
3. Every action bar should be empty (or render nothing — the action-bar widget returns null when no actions match the role).
4. Lists, tabs, and detail readouts work normally — read-only is preserved everywhere.

**Verifies:**
- The role-hide rule is applied uniformly (zero-noise principle from the design deck)

---

## Part 3 — Mocking auth in the V1 demo

Auth is open in V1 per `CORE_MEMORY` scope-locks. Real auth (Keycloak / OIDC) lands later. For the demo, **the role-switcher widget is the auth substitute**. It pins a role into a React context (`useRole()`), persisted in `localStorage`, and every schema's `roleActions` map gates the action bar accordingly.

This is honest about the gap: the deck explicitly markets "structural adaptation per role"; the role switcher makes that visible. Backend doesn't enforce — but the UI consistently does.

When backend ships Cerbos / Keycloak:
- `useRole()` reads from the auth context's user role instead of the local state
- The role-switcher is removed (or kept as a dev tool)
- `roleActions` either disappears (because backend's `frontendProjection.allowedActions[]` arrives per role) or stays as a typed mirror of Cerbos rules

See [context/ARCH_TRANSITION.md](../context/ARCH_TRANSITION.md) → "Maker-checker — role-adaptive UI only".

---

## Part 4 — What I'd ship next (priority for the post-demo backlog)

1. **Add Underwriter role** + uw-specific actions on PolicyMember schema (~30 min). Currently the demo collapses UW into Ops, which contradicts the spec's distinction.
2. **`useClientNames()` resolver** — proxy-mode list pages show UUIDs because backend's summary DTOs lack `clientName` (fix #6 in the backend ask). Frontend hook can compensate in ~2h.
3. **P2.1 confirm-with-input dialog** — destructive actions today use a hardcoded reason. The cancel/reject/archive flow needs a free-text input on confirm.
4. **D1 / D2 / D3** — Plans CRUD, Census authoring, DMN replace flow. Currently read-only; once backend ships file-URL endpoints (fix #3), we can wire the upload surfaces.
5. **Future-role placeholders** in the role-switcher — Actuarial / RI / Manager / Broker as visible-disabled rows showing the road map.

---

*This doc co-evolves with the build. Roles defined in subsequent spec passes (e.g. broker portal context, multi-tenant admin) get added to Part 1; corresponding scripts get added to Part 2.*
