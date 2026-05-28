# Group PAS V1 — Demo Script: "Day in the Life"

*Duration: ~7 minutes live + 30 second proxy-mode coda*
*Setup: Mock mode (default — `.env.local` either absent or has `GROUP_PAS_BACKEND_URL` commented out). Browser at `http://localhost:3000`. Role switcher in the top app shell.*

---

## Before You Start

- Stop the dev server, ensure `.env.local` does **not** set `GROUP_PAS_BACKEND_URL` (or comment it out), then `npm run dev`.
- Open the browser to `http://localhost:3000`. You should land on the dashboard with three module cards (Quotation, Issuance, Policy Admin). If you see a UUID-shaped client column on any list, you're in proxy mode — fix `.env.local` and refresh.
- Resize to laptop width (≥ 1280px). The action bars wrap below ~1100px.
- Active role: **Maker — Sales** (top-right role-switcher). The demo flips between Maker and Checker; Ops and Viewer get a brief mention.
- *Optional reset between dry-runs:* `curl -X POST http://localhost:3000/api/dev/reset` re-clones the fixtures so the in-memory state is clean.

**The narrative you're telling:** *Schema-driven, role-adaptive UI on a real backend contract, honest about the gaps that are still being wired.* Three words to anchor: **Clean, Confident, Context-Aware.**

---

## ACT 1: Workspace Orientation (Dashboard)

**~30 seconds**

### What to do

1. Land on the **Dashboard** at `/`.
2. Point at the three module cards: **Quotation**, **Issuance**, **Policy Admin**. Mention the metric tile underneath ("Pending quotes") and the quick action ("New quote").
3. Point at the sidebar: same three modules + a placeholder **Member Quotes (GCL)**.
4. Point at the role switcher in the top-right. Click it open — show the four roles (Maker / Checker / Ops / Viewer) with one-line descriptions. Close it.
5. Confirm active role is **Maker — Sales**.

### What to say

> "Three modules. Quotation, where Sales builds an offer. Issuance, where the deal becomes a contract. Policy Admin, where members get enrolled and run for the year. That's the Group PAS lifecycle, end to end."
>
> *[Point at role switcher]*
>
> "And up here — the active role. We have four: Maker, who builds. Checker, who reviews. Ops, who repairs and keeps the line moving. Viewer, who sees but doesn't act. Watch what each role can do as we go — that's the structural adaptation we'll come back to."

### What to point out

- Same workspace for every role; structure differs per role.
- "Member Quotes (GCL)" is in the sidebar but tagged as a placeholder — V1 ships GTL only.
- **No login screen.** V1 demo runs open per scope-lock; auth lands when Keycloak ships.

---

## ACT 2: Maker Builds a Quote

**~90 seconds**

### What to do

1. Click **Quotation** in the sidebar.
2. You land on the quote list. Point out the columns — Quote ID, Client, Policy Type, Status, Headcount, Premium. Ten rows spanning every status (DRAFT, SUBMITTED, SENT_TO_CLIENT, ACCEPTED, FINALIZED, REJECTED, WITHDRAWN, EXPIRED). Filter dropdowns at the top.
3. Click **New quote** (top-right or via the dashboard quick action).
4. Modal opens — three fields: **Client**, **Policy type**, optional **Headcount**. Pick `Acme Industries Pvt Ltd`, `GTL`, leave headcount blank. Click **Create**.
5. You land on the new quote's detail page. State badge says **Draft**. Tabs underneath: **Key data**, **Plans**, **Census**, **Mapping**, **Pricing**, **Member Quotes (GCL)**.
6. Click into **Plans**. Empty state — "No plans configured." Mention that on a real-backend run we'd attach `PLAN-GTL-001` (rate card, cover formula, free-cover limit, products). For the demo, click into the **Key data** tab to show the fields — premium type, effective dates, age rule, line of business — already populated by the create form's defaults.

### What to say

> *[Click Quotation]*
>
> "The quote list. State badges are plain English, color-coded — no internal codes to memorize. Filters across the top. Same patterns we'll see on every list in this product."
>
> *[Click New quote, fill form, Create]*
>
> "Sales builds a new quote. Three fields up front — pick the client, pick the product line, optional headcount. Defaults handle the rest."
>
> *[Land on detail]*
>
> "And here's the quote shell. Six tabs — plans, census, member-mapping, pricing, GCL placeholder. The shell is schema-driven; the tabs adapt to what the quote needs. As Sales fills in plans, census, and mapping, the quote becomes pricable."

### What to point out

- State badge variants come from a single `state-map` so list cells, headers, and detail badges stay in sync.
- Tabs are config — adding a new tab is a one-line schema change, not a code change.
- Quote ID format `QTE-2026-NNNN` from fixtures (proxy mode would show a UUID — flag this when we get to the coda).

---

## ACT 3: The Pricing Beat (Honest About Backend Gaps)

**~45 seconds**

### What to do

1. Click the **Pricing** tab.
2. The premium fields show ₹0 / INR. Read the tab description aloud — it explains backend isn't wired yet.
3. Hover over the **Request price** button at the bottom of the tab. The button is rendered visible-but-disabled. Tooltip appears: *"Pricing engine not yet wired on backend — request fires-and-forgets to no listener. Button enabled once Rule Engine ships."*
4. Pause for a beat. Move on — back to the quote list (or sidebar Quotation).

### What to say

> "Now — pricing. This is where I want to call out something deliberate."
>
> *[Hover the disabled button, let the tooltip render]*
>
> "The pricing engine isn't wired on the backend yet. Sales clicks 'Request price' on a real installation, the Rule Engine computes, premium populates. We don't have that listener wired today."
>
> "We could fake it in mock mode — pre-compute a number, animate a polling spinner. We chose not to. The button is disabled, the tooltip explains exactly what's missing, and when backend ships the engine, this button lights up automatically. **Honest now, accurate later.** That's the rule across this product."

### What to point out

- This is the design principle: *don't simulate behavior real backend can't deliver.*
- Same treatment for the Maker → Checker approval handoff (we'll see in a moment).
- Tooltip text is schema-set, no code change to update the message when backend ships.

---

## ACT 4: Walking the Lifecycle (Maker → Checker)

**~90 seconds**

### What to do

1. Back on the quote list, click into **QTE-2026-0002** (status **Draft**, headcount 120, premium ₹43.2 lakh). It already has plans, census, mapping, and policy-detail filled in — and a premium baked in from the fixture. *Why this one: it's not pre-linked to any existing Proposal, so the auto-create on finalize will produce a fresh one in front of the audience.*
2. State badge: **Draft**. Action bar (still as Maker) shows: **Edit**, **Submit**, **Send for approval** (visible-but-disabled with the backend-gap tooltip), **Withdraw**.
3. Hover the **Send for approval** button — read the tooltip aloud: *"Quote-level approval workflow not yet wired on backend. The Maker → Checker handoff arrives when backend extends the PAM approval pattern to Quote..."*. Same honesty as pricing.
4. As Maker, click **Submit**. State → **Submitted**. The action bar updates — Submit is gone, no further Maker action available on a SUBMITTED quote.
5. Switch the role to **Checker — Approver** in the top-right. Pause for a beat. The action bar restructures — Maker-only actions vanish entirely (Edit, Send for approval — gone, not greyed). Checker now sees **Send to client** + **Withdraw** on the SUBMITTED state.
6. Click **Send to client**. State → **Sent to client**. Action bar updates: **Mark accepted**, **Reject**, **Withdraw**.
7. Click **Mark accepted**. State → **Accepted**. Action bar updates: **Finalize**, **Withdraw**.
8. Click **Finalize**. Toast: "Quote finalized; Proposal created in Issuance." State → **Finalized**. The mock returns the new `proposalId` synchronously in the response.

### What to say

> *[Click into QTE-2026-0002]*
>
> "Sales has built this one — plans attached, census uploaded, member-mapping configured, premium computed. It's ready to move."
>
> *[Hover Send for approval — show the tooltip]*
>
> "Same honesty rule we just saw on pricing. Quote-level approval doesn't exist on backend yet. Button visible, disabled, tooltip explains what's coming. PAM Member already has approval — backend will port the pattern to Quote."
>
> *[Click Submit. State → SUBMITTED.]*
>
> "Submit. Sales has done their part — the quote is locked from edits and waiting for whoever takes it forward."
>
> *[Switch to Checker. Pause.]*
>
> "Now I'm the Checker. Watch the action bar. Maker actions — gone. Not greyed, not hidden behind an admin menu — the structure changed. Checker sees what Checker does."
>
> *[Click Send to client → Mark accepted → Finalize, narrating each]*
>
> "Send to client. Mark accepted. Finalize. Three states, three clicks, all role-gated. And finalize triggers the handoff — backend creates the Proposal in Issuance synchronously. No polling, no spinner, no async fiction. Real backend does this in one transaction; mock matches."

### What to point out

- **Role-adaptive action bar** is the headline UX feature. Same screen, different role, different toolbar.
- Toast message tells the user what just happened in plain English.
- `disabledTooltip` on schema actions surfaces backend gaps consistently — same mechanism, two uses today (pricing, approval).
- Each transition is one click; state-gating + role-gating drive what the toolbar offers without the user having to remember the workflow.

---

## ACT 5: Issuance — Proposal to Policy

**~75 seconds**

### What to do

1. Click **Issuance** in the sidebar. List shows existing Proposals (from fixtures) plus the one we just created. Find the new one — top of the list, state DRAFT, source quote `QTE-2026-0002`. Click in.
2. Proposal detail. State summary header: **Draft**, source quote, client name (Brightline Technologies), "Created policy: —" (empty).
3. Action bar (still as Checker): **Submit proposal** active, **Cancel proposal** active. Click **Submit proposal**. State → **Submitted**. Action bar updates: **Finalize → create policy** is now enabled.
4. Click **Finalize → create policy**. Toast: "Proposal finalized; Policy will appear in Policy Admin shortly." State immediately flips to **Finalized**, but the **Created policy** field is still empty for ~4 seconds — backend's PAM creates the master Policy on a short workflow delay (mock simulates the same).
5. Wait a beat (4-6 seconds). The state badge updates to **Policy created** and the `POL-…` id appears in the header.
6. Click the **Members** tab. Empty state ("No members on this policy yet — add the first one"). Skip adding here; the next act uses a fixture-rich policy that's been running.

### What to say

> *[Click Issuance]*
>
> "Issuance. Same list pattern, same filters, same badge language. Find the proposal we just created from the quote."
>
> *[Click submit, then finalize]*
>
> "Submit. Finalize. Two clicks. The backend's PAM workflow creates the master Policy on a short delay — Temporal-driven on production, mock simulates the same timing."
>
> *[Wait a beat, header refreshes with the policy id]*
>
> "And there's the Policy id. The Proposal goes to Policy Created state, links to the new master policy. That's the Issuance team's handoff to Policy Admin."
>
> *[Show the empty Members tab]*
>
> "Empty members tab — this policy is brand-new. To show enrolment we'll switch to a richer one that's been running for a while."

### What to point out

- The Issuance module uses the same schema patterns as Quotation — no per-module reinvention.
- The 4-second policy-creation delay is *real* — backend genuinely runs that in a workflow. Mock honors the timing rather than faking instantaneous; if the demo viewer is sceptical, that's where you can pivot to "and that's exactly what production does."
- Proposal → Policy is the second auto-cascade in the lifecycle.

---

## ACT 6: Policy Admin — Members, Repair Narrative, and the PAM Handoff

**~120 seconds**

> **Demo authoring note:** the mock layer doesn't auto-cascade `repair → classify → approve` — backend does that via Temporal workflow, but it's a multi-command path the mock doesn't simulate. So we *show* the repair beat (read-only point-out on a REPAIR_PENDING member to make the Ops narrative real), then *do* the send-for-issuance beat on a member already in APPROVED.

### What to do

1. Navigate to **Policy Admin → Policies** (sidebar). Or navigate via the new policy's `POL-…` id in Issuance — same destination.
2. Click into **POL-2026-0001** — the fixture-rich policy with 20 members in flight. State summary: client (Evergreen Foods), product GTL, 20 members.
3. **Pending breakdown card.** Point at it. Reasons grouped by count — *Awaiting float reservation*, *Awaiting policy activation*, etc. Frontend derives this from the same `MemberSummaryDto.pendingReason` field on the Members list — no extra backend endpoint.
4. Click the **Members** tab. Twenty rows, two badge columns — state and pending reason. State badges span every PolicyMember state in the DSL (CREATED, PRICED, MAF_PENDING, MAF_CONFIRMED, CLASSIFYING, APPROVED, REPAIR_PENDING, REFERRED_TO_UW, REJECTED, SENT_FOR_ISSUANCE, ADDED, ARCHIVED).

#### Beat 1 — The Repair Narrative (read-only)

5. Click into **PMB-0007** (*Karan Joshi*, REPAIR_PENDING). State summary shows the reason banner — *"Salary must be greater than zero"* + *"Sum insured must be derivable from salary × multiplier"*. Point at the classification errors card lower on the page.
6. Switch role to **Ops** in the top-right. Pause for a beat. Action bar restructures — **Repair member**, **Reject** appear. Maker/Checker-only actions vanish.
7. **Don't click Repair.** Verbally describe what would happen: *"Ops fixes the data, backend re-runs the classification workflow on a Temporal worker, member walks back through CLASSIFYING → APPROVED, ready for the next step. The full classification cascade is a backend workflow we'll see in proxy mode once the worker is running on dev."*
8. Navigate back to the **Members** tab.

#### Beat 2 — Send for Issuance (live, on an APPROVED member)

9. Click into **PMB-0006** (*Ishita Rao*, APPROVED). State summary: clean, classification lane STP, premium populated, no errors. As Ops you can see this member is ready to enrol.
10. Action bar (still as Ops): **Send for issuance** active.
11. Click **Send for issuance**. Toast: "Member sent for issuance; PAM record will appear shortly." State immediately → **SENT_FOR_ISSUANCE**.
12. Wait ~5 seconds (mock simulates the Temporal MemberEnrolmentFlow timing). Refresh the page. State → **ADDED**.
13. Click the **PAM Member** deep-link cell in the member's detail (or navigate to `/policy-admin/members/by-policy-member/PMB-0006`). The PAM Member shell appears — state **PENDING**, pending reason **PENDING_FLOAT_RESERVATION**.

### What to say

> *[Click into POL-2026-0001]*
>
> "An active policy. Twenty members in flight at different stages — some awaiting float reservation, some awaiting policy activation, a few in repair."
>
> *[Show pending-breakdown card]*
>
> "Pending breakdown — derived from the same member list, no extra endpoint. Operations sees at a glance what's blocking what."
>
> *[Filter or sort to REPAIR_PENDING, click into Karan Joshi]*
>
> "Here's a member in repair. The classification engine flagged two errors — salary missing, sum insured can't be derived. Reason banner makes it explicit so Ops doesn't have to read raw JSON."
>
> *[Switch to Ops role. Pause.]*
>
> "Ops role. Different action set — repair, reject. Maker built the data; Ops fixes it; Checker approved the policy in the first place. Three roles, three views, one screen."
>
> *[Don't click repair — verbal walkthrough]*
>
> "When Ops clicks Repair, they amend the salary, save, and backend's Temporal workflow re-runs classification — the member walks back through CLASSIFYING and lands at APPROVED. We'll see that loop close in proxy mode once the activation worker is running on dev."
>
> *[Navigate to Members tab, click into Ishita Rao (PMB-0006, APPROVED)]*
>
> "Here's a member that's already past that loop — fully approved, premium computed, ready to enrol."
>
> *[Click Send for issuance, wait ~5s, refresh]*
>
> "Send for issuance. The MemberEnrolmentFlow runs on Temporal — float reservation, then PAM Member created. That's the workflow timing on the real backend, mock matches it."
>
> *[Click into PAM Member deep-link]*
>
> "And there she is in Policy Admin. PAM Member, state Pending, pending reason 'awaiting float reservation' — exactly what backend's float-management stub would say. The cross-module deep link gets you straight to the linked record."

### What to point out

- **Three roles touch the same lifecycle** — the role-adaptive UI is the through-line.
- The repair narrative is the *what would happen*; the send-for-issuance beat is the *does happen*. We're explicit that the full classification re-run is a backend-workflow story.
- PAM Member deep-link in the cell — cross-module navigation works without bespoke route handlers.
- Reason banner + state badge + action bar all driven from the same `state-map` config.
- The 4-5s SENT_FOR_ISSUANCE → ADDED transition is the same Temporal cadence backend uses; in proxy mode (post-fix #2) it's the real worker doing the work.

---

## ACT 7: Wrap-Up

**~30 seconds**

### What to say

> "Three modules, four roles, one schema-driven shell."
>
> "**Clean** — same patterns on every list, same badge language, same filter shape. Nothing to relearn between modules."
>
> "**Confident** — the action bar tells you what you can do; the tooltips tell you what's not yet wired and why. There's no surprising 'oops, that didn't work.'"
>
> "**Context-Aware** — the policy chip follows you, the role you pick reshapes the UI structurally, and every state transition is reflected immediately."
>
> "Group PAS V1, Maker to Ops, quote to active member."

---

## Coda: Proxy-Mode Proof of Integration

**~30 seconds**

### What to do

1. *(Off-camera setup before the demo: have a second terminal open with `npm run dev` running against the real backend — `GROUP_PAS_BACKEND_URL=https://group-pas-dev.anairacloud.com` set in `.env.local`. Or have a second browser tab on `http://localhost:3000` running in the proxy-mode dev server.)*
2. Switch tabs/windows to the proxy-mode browser. Navigate to **Quotation**.
3. Show the same list rendering, but with backend-issued UUID quote ids and (post-fix #6) real client names. Premium values populated for the seeded quotes (post-fix #1).
4. Click into a seeded quote. Same UI, same shell. Open the **Pricing** tab and (post-fix) show the populated premium.
5. Switch to **Policy Admin**, point to a member that activated when the threshold cleared (post-fix #2 Temporal worker).

### What to say

> "And just to prove this isn't all fixtures —"
>
> *[Switch tabs]*
>
> "Same UI, hitting `group-pas-dev.anairacloud.com`. Real backend, real database. The list pages, detail pages, action bars — all the same code, all reading from the deployed Group PAS backend."
>
> "Where the pricing engine is wired, premiums populate. Where the activation workflow is running, members move from PENDING to ACTIVE. Where backend hasn't wired something yet — the same disabled-with-tooltip we saw in mock mode shows up in proxy mode too."
>
> "Mock mode is the demo posture. Proxy mode is the proof. Same code path, same UX."

### What to point out

- The seed script (`npm run seed:backend`) is what populates proxy mode — log lives at `/tmp/keystone-seed/<timestamp>/`.
- Quote IDs become UUIDs in proxy mode (backend uses UUIDs as primary keys; the human-readable `QTE-…` form is mock-only).
- Premiums in DRAFT quotes are zero **until backend ships fix #1** — at that point our seed re-runs with explicit premiums and the pricing tab populates.
- Threshold-driven activation cascades fire only **once backend starts the Temporal worker on dev** (fix #2).

---

## Quick Reference — Mock Mode Demo Path

| Step | Entity | State before → after |
|---|---|---|
| 2 | New quote (created in form) | (created) → DRAFT |
| 4 | QTE-2026-0002 | DRAFT → SUBMITTED → SENT_TO_CLIENT → ACCEPTED → FINALIZED (auto-creates Proposal) |
| 5 | New proposal (auto-id `PRO-…`) | DRAFT → SUBMITTED → FINALIZED → POLICY_CREATED *(POLICY_CREATED lags by ~4s — wait for badge to update)* |
| 6 — beat 1 | PMB-0007 (Karan Joshi) | REPAIR_PENDING (read-only — Ops narrative, no click) |
| 6 — beat 2 | PMB-0006 (Ishita Rao) | APPROVED → SENT_FOR_ISSUANCE → ADDED *(ADDED lags by ~5s; PAM Member appears at the same cadence)* |

### Why these specific entities

- **QTE-2026-0002**: only DRAFT-state fixture quote with premium pre-populated *and* not pre-linked to an existing Proposal. Walks the full Maker → Checker lifecycle without the auto-create returning a stale proposal.
- **PMB-0006**: APPROVED state, classification clean, premium populated. Send-for-issuance enabled.
- **PMB-0007**: REPAIR_PENDING with two classification errors that surface in the reason banner. Read-only narrative — repair → re-classify is a multi-step backend workflow the mock doesn't auto-cascade.

## Quick Reference — Roles

| Role | Owns | Demo highlight |
|---|---|---|
| **Maker — Sales** | Builds quotes, edits drafts | Acts 1–4 (build a quote, walk it to ACCEPTED) |
| **Checker — Approver** | Reviews and finalizes | Acts 4–5 (finalize quote → finalize proposal) |
| **Ops** | Repairs members, sends for issuance | Act 6 (repair Karan Joshi, send for issuance) |
| **Viewer** | Read-only | (briefly mentioned in Act 1) |

## Backend Gaps Surfaced in the Demo (the "honesty" beat)

| Action | UI treatment | Backend status |
|---|---|---|
| Quote → Request price | Disabled button + tooltip | Kafka emits with no Rule Engine listener — pre-demo fix #1 promised |
| Quote → Send for approval | Disabled button + tooltip | DSL has no Quote-level approval; PAM pattern needs porting |
| File uploads (rate cards, census, DMN) | No UI surfaced | `FileUrlCommands` throws; deferred to D-backlog |
| Float reservation premium populating | Members show ₹0 in proxy mode | `FloatManagementClient` is a stub |
| Activation cascade in proxy mode | Members stay PENDING | Temporal worker not running on dev — pre-demo fix #2 promised |

## If Something Breaks Mid-Demo

- **Quote list looks wrong / states drifted:** the mock store accumulates state across actions. `curl -X POST http://localhost:3000/api/dev/reset` re-clones the fixtures back to seed state without restarting the dev server. Refresh the page.
- **Action bar shows nothing on a quote:** check the role switcher — Viewer hides every action. Or the quote may be in a terminal state (REJECTED / WITHDRAWN / EXPIRED) where no actions are allowed.
- **Finalize doesn't enable:** check the quote state (must be ACCEPTED for the Quote.finalize button) and the role (Maker can't finalize, Checker can).
- **Proposal stays in FINALIZED, never reaches POLICY_CREATED:** wait at least 5 seconds and refresh — the policy-creation simulator runs on a 4-second timer.
- **PAM Member doesn't appear after Send for issuance:** wait 5 seconds and refresh the Members tab — same Temporal-cadence simulator.
- **You accidentally clicked Repair on PMB-0007 and the state went to CREATED:** dev/reset re-clones it. Or just navigate to PMB-0006 and continue with beat 2 of Act 6.
- **Proxy-mode coda shows UUIDs everywhere:** that's expected pre-fix #6 (`clientName` enrichment on summary DTOs); call it out as "the seed populated, backend just doesn't surface client names on the summary endpoint yet — five-minute backend change."

## Mock Behavior Verified Against the Live Server (2026-05-08)

A dry-run was performed before the demo; these timings/transitions are observed, not guessed:

- `quote/finalize` returns `{proposalId}` synchronously and creates the Proposal in DRAFT state — same call.
- `proposal/finalize` returns immediately with state `FINALIZED`. Policy auto-creation completes ~4s later, at which point the proposal flips to `POLICY_CREATED` and `policyId/policyNumber` populate.
- `policy-member/send-for-issuance` returns immediately with state `SENT_FOR_ISSUANCE`. PAM Member appears at `/api/policy-admin/members/by-policy-member/<id>` ~4s later, with state `PENDING` and `pendingReason: PENDING_FLOAT_RESERVATION`. The PolicyMember itself flips to `ADDED` at the same cadence.
- `policy-member` PUT (the "repair" action) updates the data and resets state to `CREATED`. **It does not auto-cascade through PRICED → CLASSIFYING → APPROVED in mock mode.** That's a backend-workflow path; mock keeps it explicit. Hence the read-only Ops narrative for the REPAIR_PENDING beat.

---

*Total live time: 7 minutes + 30 seconds coda. Pace: deliberate. Don't rush the role-switch or the disabled-tooltip beats — they're the headline narrative.*
