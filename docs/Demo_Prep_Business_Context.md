# Demo Prep — Business Context, Flows, and Honest Q&A

**Audience:** the developer demoing this to insurance business users.
**Assumed knowledge:** consumer-side insurance only. No prior commercial / group insurance background.
**Use:** read sections 1–5 once before the demo; keep sections 6–8 open during it.

---

## Reading order

If you have **15 minutes** before the demo: read §1 (insurance 101), §3 (the workflow in plain English), §4 (maker-checker), and skim §7 (the demo script).

If you have **45 minutes**: read everything.

If you have **5 minutes**: read §3 and §8 (Q&A pre-bank).

---

## 1. Insurance 101 for developers

### 1.1 Individual vs Group insurance

You probably have **individual insurance** — you bought a policy, you pay a premium, the insurer pays a claim if something happens. One person, one policy, one contract.

**Group insurance** is sold to an organization (the "client") that covers many people (the "members") under a single master policy. Examples:
- Your employer's life insurance benefit (everyone in the company is covered automatically).
- A bank's loan-protection insurance bundled with every home loan they issue.
- A union's group health plan for its members.

The **insurer** sells one policy to the **client** (the organization). The client typically pays the premium (or splits it with members). When a member suffers a covered event, the insurer pays out.

Why this matters for software: the lifecycle of a group policy is fundamentally different from an individual one. You're tracking thousands of members under a single policy, members come and go (employees join and leave the company), the premium is a function of the entire member roster, and the policy itself has a lifecycle separate from any individual member.

### 1.2 Group Term Life (GTL) — what we're demoing

Three group products are mentioned in the codebase:

| Code | Name | What it covers |
|---|---|---|
| **GTL** | Group Term Life | Pays a sum if a covered employee dies during the policy term. The flagship product; what V1 ships. |
| **GCL** | Group Credit Life | Pays off a borrower's outstanding loan if they die. Sold by banks alongside loans. (Out of V1.) |
| **GH** | Group Health | Hospital and medical expense coverage for employees. (Out of V1 demo.) |

All our demo data is GTL. When a business user asks "where's GCL?" — see the GCL placeholder tab on a Quote detail; the answer is "GCL workflow lights up post-V1; the data model already supports it (see `MemberQuote` in the spec) but the screens come later."

### 1.3 What is a Policy Administration System (PAS)?

A PAS is the back-office system insurers use to:
- **Quote** — price up a potential policy ("how much would coverage for this employer cost?")
- **Issue** — turn an accepted quote into a real binding policy
- **Maintain** — add/remove members, handle renewals, process changes (called "endorsements")
- **Service** — handle claims, refunds, lapses, cancellations

Different vendors split these differently. Our system splits them into three modules that mirror the lifecycle:

| Module | Owns | URL prefix |
|---|---|---|
| **Quotation** | Pre-sale: building and pricing a quote, getting client acceptance | `/quotation` |
| **Issuance** | Conversion: accepted quote → proposal → master policy + member enrollment | `/issuance` |
| **Policy Admin (PAM)** | Live policy: active members, premium tracking, cancellations | `/policy-admin` |

A single GTL deal flows **left to right**: starts in Quotation, finalizes into Issuance, lives forever in Policy Admin.

### 1.4 The actors (roles)

| Role | Real-world job | What they do in our app |
|---|---|---|
| **Maker** | Sales / broker / account exec | Builds and configures quotes, gathers client info, enters members |
| **Checker** | Approver / underwriting manager | Reviews what the Maker prepared, approves submissions, sends to client, finalizes deals |
| **Ops** | Operations team | Fixes data problems flagged by the workflow (REPAIR queue), archives stuck records |
| **Viewer** | Read-only stakeholder (compliance, audit, exec dashboards) | Looks but doesn't touch |

The role you're acting as in the demo is set by the **role switcher dropdown in the top-right corner** ("Maker — Sales", "Checker — Approver", etc). Switching roles changes which buttons you see — that's the maker-checker UX adapting to who's logged in.

---

## 2. Glossary — every jargon word you'll hear

Read this once; come back to it during the demo if a term confuses you.

| Term | Plain English |
|---|---|
| **Aggregate census** | A summary count: "this employer has 120 members; 90 on Plan A, 30 on Plan B." Used for pricing before individual member data is collected. |
| **Annual premium** | The money the client pays to the insurer per year for the coverage. Our currency throughout the demo is INR (₹). |
| **Awaiting approval** | UI overlay state: Maker has prepared a quote and clicked "Send for approval"; the Checker now needs to review and approve before the workflow continues. **This is UI-only in V1** — the backend doesn't enforce maker-checker. |
| **Broker** | A licensed intermediary who sells insurance on behalf of one or more insurers. In our demo, the Maker is the broker side. |
| **Census** | The list of people to be covered. A "census file" is typically an Excel or CSV from the client's HR system. |
| **Census file format** | The schema saying which columns the census file has (name / DOB / salary etc) and what type each is. We accept JSON-described format — DSL-defined as a "Frictionless Table Schema". V1 stores it as opaque JSON; UI shows a Configured/Not-configured chip. |
| **Checker** | The Approver role. See §1.4. |
| **Classification (lane)** | When a member is added, the Rule Engine classifies them into one of four lanes: **STP** (straight-through processing — auto-approve), **REPAIR** (data is broken, needs fixing), **REVIEW** (needs underwriter judgment), **REJECT** (auto-reject, e.g. age out of bounds). |
| **Client** | The organization that buys the group policy. Examples in our fixtures: "Acme Industries Pvt Ltd", "Brightline Technologies Ltd". Not the insurance industry's other meaning of "client" (= end customer of the insurer). |
| **DMN** | Decision Model and Notation — an industry-standard way to express business rules as decision tables. We use it for "given this member's attributes, which plan should they go on?" V1 stores the DMN reference as an opaque file ref; authoring is post-V1 (deferred D3). |
| **Endorsement** | A formal change to a policy mid-term (e.g. employer increases sum-insured, or adds a new sub-product). Out of V1. |
| **Finalize** | Verb. Quote.finalize() means "Sales has done all the paperwork; turn this Accepted quote into a Proposal so we can issue the actual policy." Proposal.finalize() means "Ops has reviewed; create the master Policy and start enrolling members." |
| **Float reservation** | Insurers carry a reserve of money for paying claims. When a new member is added, a small amount is "reserved" against that float to cover their potential claims. If the float doesn't have room (`FLOAT_UNAVAILABLE`), the member can't be enrolled. |
| **Free cover limit (FCL)** | The maximum sum-assured an insurer will offer to a member without medical underwriting. Anyone wanting more has to fill a Member Application Form. Captured per plan. |
| **GCL** | Group Credit Life — out of V1 demo. |
| **GH** | Group Health — out of V1 demo. |
| **GTL** | Group Term Life — what we're demoing. |
| **HR ref / employee number** | The internal identifier the client uses for an employee. We accept this when adding a member so cross-system reconciliation works (the client's HR system speaks employee IDs, not our internal member IDs). |
| **Lane** | See "Classification". |
| **Lapse** | When a policy ends because the client stops paying premium. Out of V1. |
| **Line of business (LOB)** | High-level product category — "GROUP" in our case. Different LOBs typically have different regulatory requirements. |
| **MAF** | Member Application Form. The medical-history questionnaire a member fills when they want coverage above the Free Cover Limit. The PolicyMember state `MAF_PENDING` means "we're waiting on this form." V1 mocks the workflow but doesn't render an actual form. |
| **Maker** | The Sales / broker role. See §1.4. |
| **Maker-checker** | A control pattern from financial services: one person prepares ("makes") a transaction, a different person reviews and approves ("checks"). Used to prevent fraud and catch mistakes. **In our V1: UI-only overlay** — the backend isn't enforcing it yet. |
| **Master policy** | The single binding contract between insurer and client. All members are enrolled "under" this master policy. |
| **Member** | An individual person covered by the group policy. Has an HR ref (the client's employee ID) and a `policyMemberId` (our internal ID). |
| **Member-to-Plan mapping** | The decision rules that determine which plan a given member goes on, based on their attributes (e.g. salary > 1.5M → premium plan). Expressed as a DMN decision table. V1 stores reference only. |
| **Ops** | Operations role. See §1.4. |
| **PAS** | Policy Administration System — what we're building. See §1.3. |
| **Plan** | A configurable bundle of coverage (sum assured formula + free cover limit + benefits + exclusions + rate card). A single quote can have multiple plans (e.g. Standard and Enhanced). |
| **Policy** | The master contract. State lifecycle: CREATED → PENDING → ACTIVE → CANCELLED. Activation requires hitting an `activationThreshold` (a minimum number of enrolled members). |
| **PolicyMember** | The Issuance-side workflow record for a single person being enrolled. Carries lifecycle state (PRICED, CLASSIFYING, REPAIR_PENDING, APPROVED, etc). When fully enrolled (state ADDED), a corresponding **PAM Member** comes into existence on the policy. |
| **Premium type** | Annual (paid yearly) or Single (paid once upfront for the whole term). Choice is set on the Quote. |
| **Proposal** | Mid-stage document between Quote and Policy. Created automatically when a Quote is finalized; carries plan/census/premium snapshot from the quote so the deal can't change underneath the conversion process. |
| **Proposer** | The legal entity formally proposing the insurance contract — typically the same as the client (employer). |
| **Quote** | The pre-sale pricing document. Sales builds it, Checker approves it, Client accepts it. State lifecycle: DRAFT → SUBMITTED → SENT_TO_CLIENT → ACCEPTED → FINALIZED. |
| **Rate card** | The pricing table the actuaries publish per plan. We accept it as an uploaded file ref. |
| **Renewal** | When a policy term ends and the client agrees to extend. Out of V1. |
| **REPAIR** | Classification lane meaning "this member's data has problems; Ops needs to fix it before we can proceed." |
| **REVIEW** | Classification lane meaning "this case needs an underwriter's judgment." Routes to an external UW Workbench (separate app — our system signals to it but doesn't render it). |
| **STP** | Straight-Through Processing — the happy path where no human intervention is needed. The Rule Engine classified the member as STP, the workflow auto-approves. |
| **Sum insured** / **Sum assured** | The amount of money the insurer will pay if the covered event happens. Often called sum-assured for life products, sum-insured for health. Used interchangeably in the spec. |
| **Term** | The duration of coverage (typically 1 year for GTL, renewed annually). |
| **Underwriting (UW)** | The risk-assessment process: deciding whether to cover a person, on what terms, at what price. For STP cases the Rule Engine does this automatically; for REVIEW cases a human underwriter reviews the case in the UW Workbench. |
| **UW Workbench** | A separate application where underwriters review REVIEW-lane cases. Our PAS sends cases to it and receives back approve/reject decisions. We don't ship the workbench itself in V1. |
| **VIP client** | A client flagged for white-glove service / priority handling. Visible in the client list; no V1 logic differentiates VIP-vs-standard handling yet. |

---

## 3. The workflow in plain English

This is what happens in the real world, and how our app maps to it.

### 3.1 Stage 1 — Quote (Quotation module)

**Real world:** A salesperson at the insurer talks to an employer's HR head. The HR head says "I want to cover all 120 of my employees with life insurance." Sales gathers requirements (how much coverage per person? for how long? what add-ons?), prices it up, hands the client a printed/PDF quote.

**Our app:**
1. Maker creates a quote with the basic facts (client, policy type GTL).
2. Maker fills in **policy detail** (term dates, premium type, age rule, etc).
3. Maker adds one or more **plans** (the bundles of coverage being offered).
4. Maker uploads or pastes the **census format** (what columns the future member file will have) and an **aggregate census** (rough headcount per plan).
5. Maker uploads the **member-to-plan mapping** (DMN file — the rules for who goes on which plan).
6. Maker clicks **Request price** — the Rule Engine computes the total premium. This is asynchronous (takes a few seconds in real life, mocked at 4s in our demo).
7. Maker clicks **Send for approval** (UI-only maker-checker overlay).
8. Checker switches to the Checker role, sees the pending quote, reviews, clicks **Approve** (which calls the real backend `submit` endpoint behind the scenes).
9. Checker clicks **Send to client** — the printed/PDF version goes to the client (we don't render the PDF; just flip the state).
10. Client says yes. Checker clicks **Accept**.
11. Checker clicks **Finalize**. Done — Quote is locked.

When the Quote finalizes, **the Issuance module automatically creates a Proposal** for it. That's the workflow handover (called "W2" in the spec).

**What's deferred (D-items in the plan):**
- Editing forms for plans, census, mapping (D1/D2/D3) — for the demo, the fixtures already have these populated.
- Real upload widget for files (D7) — the mock route accepts any POST as success.

### 3.2 Stage 2 — Proposal (Issuance module)

**Real world:** Once a quote is accepted, the insurer's operations team takes over. They formally create a "proposal" (a regulatory term — the offer-to-bind document), do internal QC, then trigger creation of the actual master policy in the policy admin system.

**Our app:**
1. Maker (or anyone) navigates to the auto-created Proposal in `/issuance/proposals`.
2. Proposal starts in DRAFT — Maker can edit the carried-over data.
3. Maker clicks **Submit** — locks the proposal.
4. Checker clicks **Finalize** — this triggers Policy creation.
5. ~4s later, a **Policy** appears in `/policy-admin/policies` (state PENDING).
6. The Proposal flips to **POLICY_CREATED** state and shows the policy number.

This stage is **mostly read-only in V1**. The demo shows the auto-creation; the full proposal-editing flow is out of demo scope.

### 3.3 Stage 3 — Policy Activation + Member Enrollment (Issuance ↔ PAM)

**Real world:** A group policy doesn't "go live" the second it's created. It typically waits until a minimum number of members have been successfully enrolled (the **activation threshold** — say 30 members for a GTL policy). Each member individually goes through a workflow:
1. We collect their data (name, DOB, salary).
2. We price their portion of the premium.
3. If they want coverage above the free cover limit, they fill a Member Application Form (MAF).
4. We classify them — most cases auto-approve (STP); some need data fixes (REPAIR); some go to a human underwriter (REVIEW).
5. Once approved, we reserve their portion of the float.
6. We add them to the master policy.
7. Once enough members are added, the policy itself activates.

**Our app:**
1. From the Proposal members tab, Maker clicks **Add member** → fills the single-step form → submits.
2. A **PolicyMember** appears in CREATED state.
3. (In a real flow) the workflow runs: PRICED → CLASSIFYING → APPROVED.
4. Demo shortcut: PMB-0007 (a fixture) is already in **REPAIR_PENDING** — the Rule Engine flagged its salary as zero.
5. Ops switches role, opens PMB-0007, clicks **Edit & re-classify**, fixes the salary, saves. Member resets to CREATED → re-prices → re-classifies.
6. Once a member reaches APPROVED, Checker switches role, clicks **Send for issuance**.
7. ~4s later, a **PAM Member** materializes on the master policy. The PolicyMember flips to ADDED state.
8. Click "Open in Policy Admin" — deep-links to the PAM Member detail.
9. Eventually, when enough members are ADDED, the policy itself transitions to ACTIVE. **This auto-activation simulator isn't built in V1** — the demo can't show it. The fixture POL-2026-0001 is pre-seeded as ACTIVE.

**What's deferred:**
- Bulk census upload (D4) — the fastest way to enroll 120 employees in one go. Demo only shows single-add.
- Policy auto-activation simulator — explained as "happens in production once threshold is hit."

### 3.4 Stage 4 — Live Policy (Policy Admin module)

**Real world:** Throughout the policy term, members come and go (employees join and leave the company), claims are filed, premiums are tracked. At the end of the term, the policy renews (or lapses or is cancelled). When a member leaves the company or dies, their PAM Member transitions to VOID or CANCELLED.

**Our app:**
- `/policy-admin/clients` — client list. (Client detail page is deferred per D9.)
- `/policy-admin/policies` — policy list with state filters.
- `/policy-admin/policies/[id]` — policy detail with two tabs:
  - **Overview** — the carried-over plan structure + an "activation watch" card showing how many members are PENDING / ACTIVE / VOID, broken down by reason.
  - **Members** — the member list under this policy, with state filters.
- `/policy-admin/members/[id]` — individual member detail with the canonical reason banner (PENDING / VOID / CANCELLED).

**Out of V1 entirely:** Endorsements, renewals, claims, lapse handling. PAS is a multi-year product roadmap; V1 is the foundation.

---

## 4. Maker-Checker — the financial-services dance

### 4.1 Why it matters

Insurance is a regulated financial-services industry. **No single person should be able to commit the company to a binding contract single-handedly.** Maker-Checker is the universal pattern for this:

- The **Maker** prepares a transaction (in our case, a quote or a member enrollment).
- The **Checker** independently reviews and either approves or rejects it.
- Only when the Checker approves does the action actually take effect.

This catches honest mistakes (typo on a sum-assured) and prevents fraud (Maker can't pay themselves a kickback).

### 4.2 How it shows up in our demo

V1 is **UI-only** maker-checker. The backend doesn't enforce it; the UX overlay is a sophisticated facade we built so the demo tells the right story.

The flow:
1. **Maker** prepares a quote (in DRAFT). They click **"Send for approval"** — this sets a UI-only flag (`awaitingApproval: true`) on the quote record. The Maker's editing actions (Edit, Send for approval) become locked with the tooltip "Awaiting checker approval".
2. The user **switches role** via the top-right dropdown (Maker → Checker).
3. **Checker** sees the same quote. Now an "Approve & submit" button is visible (it was hidden for the Maker). Clicking it actually calls the real backend `submit` endpoint (not a mock action) — moving the quote from DRAFT to SUBMITTED. The same Checker can then "Send to client", "Accept", and "Finalize" in sequence.

**For the demo:** the role switcher in the top-right is a stand-in for a real Single Sign-On (SSO) login. In production this would be Keycloak (the spec calls it out) and your role would be determined by your SSO claims, not a dropdown. We made the dropdown so the demo can show Maker → Checker hand-off without two browser windows.

### 4.3 Why backend isn't enforcing it yet

Backend was simplified for V1 to deliver the data model and core workflows first. The frontend overlay lets us tell the maker-checker story now; the backend will harden enforcement post-V1 (per the spec).

---

## 5. What this demo proves (and what it doesn't)

### 5.1 What the deck claims

From the design principles deck v2 you have:
1. **Clean / Confident / Context-Aware** — the visual system.
2. **Role-adaptive UI** — "A Maker sees Create and Edit. They never see an Approve button."
3. **Policy context always visible** — we show this via the always-on side nav.
4. **Data protection** — sensitive fields can be masked. (UI placeholders only in V1; Cerbos-based enforcement is post-V1.)
5. **Guided workflows** — wizards, save-as-draft, review-before-submit. (Quote.Send-for-approval IS the review-before-submit gate.)

### 5.2 What the demo can back up

| Claim | Evidence in demo | Honest limitation |
|---|---|---|
| Role-adaptive UI | Switch role in top-right; action bar buttons appear/disappear | Backend doesn't enforce — anyone could call the API directly |
| Schema-driven adaptation | Mention every page is rendered from JSON schemas under `schemas/` | Not relevant to business buyers — keep it brief if asked |
| Workflow-aware screens | PolicyMember detail (PMB-0007) — different actions appear in REPAIR_PENDING vs APPROVED | The `state-driven section toggling` is action-bar-level; full per-state form UIs come post-V1 |
| Async backend computations | Quote pricing simulator: click "Request price", watch the page poll until the premium lands | Backend is mocked; real Rule Engine integration is post-V1 |
| Cross-module hand-off | Quote.Finalize → ~4s later a Proposal appears in Issuance | The poll cadence, error handling, and idempotency are sketched not battle-tested |
| Activation watch | Policy POL-2026-0002 has the "Activation watch" card showing pending members by reason | The grouping is computed from the in-memory store; in production this would be a backend-enriched response |
| Reason banners | PAM Member detail (any in PENDING / VOID / CANCELLED state) shows the canonical reason | All reason copy lives in `state-map.ts`; easy to extend |

### 5.3 What's deferred ("D backlog" in the plan)

| # | What | Why deferred |
|---|---|---|
| D1 | Plans tab editing (add/edit/remove plans on a Quote) | Demo path doesn't need to touch the plans; fixtures are pre-configured |
| D2 | Census file format upload + per-plan headcount editing | Same as above |
| D3 | DMN mapping replace flow | Same |
| D4 | Bulk census upload (CSV/Excel of 120 members at once) | Single-member-add covers the demo storyline |
| D5 | Operational queue index (single landing page for "my work") | Saved-view chips on each list cover it for V1 |
| D6 | Critical-path test suite | Engineering quality, not visible in demo |
| D7 | Real presigned-URL file uploader widget | Mock route accepts any POST as success for demo |
| D8 | `useEnum` hook (live enum values from backend) | Inline-hardcoded enum options for demo |
| D9 | Client detail page | List-only is enough for the demo |
| D10 | UW review queue surface (the REVIEW lane) | UW Workbench is a separate app entirely |
| D11 | Polished WITHDRAWN / EXPIRED / REJECTED Quote screens | No special copy yet — they render with the standard state badge |
| D12 | Saved-view chip variants on lists ("Pending approval (mine)" etc) | Status filter dropdown covers demo |

### 5.4 What's out of V1 entirely (post-V1 product roadmap)

- Real auth (Keycloak SSO)
- Backend-enforced maker-checker
- Cerbos-based PII masking
- Multi-tenancy (one PAS instance serving multiple insurers)
- Endorsements (mid-term policy changes)
- Renewals
- Claims
- Lapse handling
- GCL (Group Credit Life) and GH (Group Health) screens (data model is there; UI tabs are placeholders)
- Member self-service portal
- Mobile experience (deck is explicit: laptop-first)
- Audit trail UI (events are persisted; query/display is post-V1)
- Reports / BI dashboards (the home dashboard you see is mock data only)

---

## 6. Demo data — what's in the fixtures

Useful to know which records to use during the demo.

### 6.1 Quotes (`/quotation`)

| ID | Status | Notes — best for |
|---|---|---|
| **QTE-2026-0001** | DRAFT (no premium) | Step 1 — Request price live demo |
| **QTE-2026-0002** | DRAFT, **awaitingApproval=true** | Quick start of the maker-checker dance |
| QTE-2026-0003 | SUBMITTED | Show what a submitted quote looks like |
| QTE-2026-0004 | SENT_TO_CLIENT | "Sent" state |
| QTE-2026-0005 | ACCEPTED | Ready to be Finalized |
| QTE-2026-0006 | **FINALIZED** | Has a real Proposal (PRO-2026-0001) attached + Policy (POL-2026-0001) — the canonical end-to-end example |
| QTE-2026-0007 | REJECTED | Terminal-rejected example |
| QTE-2026-0008 | WITHDRAWN | Terminal-withdrawn |
| QTE-2026-0009 | EXPIRED | Terminal-expired |
| QTE-2026-0010 | DRAFT (empty) | A blank quote — show what an unconfigured one looks like |

### 6.2 Proposals (`/issuance/proposals`)

| ID | State | Notes |
|---|---|---|
| **PRO-2026-0001** | POLICY_CREATED | The canonical end-to-end. Has 20 PolicyMembers under it. Use for member-flow demos. |
| PRO-2026-0002 | FINALIZED | Pre-policy-creation state (rare to be parked here) |
| PRO-2026-0003 | SUBMITTED | Awaiting Checker finalize |
| PRO-2026-0004 | DRAFT | New auto-created from a finalized quote |
| PRO-2026-0005 | CANCELLED | Terminal |

### 6.3 Policies (`/policy-admin/policies`)

| ID | State | Pending reason | Notes |
|---|---|---|---|
| **POL-2026-0001** | ACTIVE | — | The "running" policy. Has Members, Activation Watch breakdown. |
| **POL-2026-0002** | PENDING | AWAITING_MIN_MEMBERS | Best for showing the Activation Watch with all 3 pending reasons populated |
| POL-2026-0003 | PENDING | AWAITING_COMPLIANCE | Other pending reason |
| POL-2026-0004 | CREATED | — | Just-created |
| POL-2026-0005 | CANCELLED | — | Terminal |

### 6.4 PolicyMembers (`/issuance/proposals/PRO-2026-0001/members/[id]`)

| ID | State | Best for showing |
|---|---|---|
| **PMB-0007** | REPAIR_PENDING (with classification errors) | The Repair flow. Switch to Ops, click "Edit & re-classify". |
| **PMB-0011** | ADDED | Successful end-state. Click "Open in Policy Admin" → deep link to MEM-0005 in PAM. |
| PMB-0008 | REFERRED_TO_UW | The "needs underwriter" lane. Read-only banner; UW Workbench not rendered. |
| PMB-0006, PMB-0018 | APPROVED | Ready for Checker to "Send for issuance" |
| PMB-0010, PMB-0019 | SENT_FOR_ISSUANCE | Mid-handoff — PAM Member appears ~4s later |
| PMB-0009 | REJECTED | Terminal-reject case |
| PMB-0020 | REPAIR_PENDING | Second repair example |

### 6.5 PAM Members (`/policy-admin/members/[id]`)

| ID | State | Reason | Best for showing |
|---|---|---|---|
| MEM-0001 | PENDING | PENDING_FLOAT_RESERVATION | Reason banner — "Awaiting float reservation" with pulsing icon |
| MEM-0002 | PENDING | PENDING_APPROVAL | "Awaiting approval" reason |
| MEM-0003 | PENDING | PENDING_POLICY_ACTIVATION | "Awaiting policy activation" |
| MEM-0005 | ACTIVE | — | The successful end-state. Linked from PMB-0011's "Open in Policy Admin" action. |
| MEM-0009 | VOID | FLOAT_UNAVAILABLE | Void reason banner |
| MEM-0010 | VOID | APPROVAL_REJECTED | |
| MEM-0011 | VOID | POLICY_CANCELLED | |
| MEM-0012 | VOID | WITHDRAWN_BY_PROPOSER | |
| **MEM-0013** | **CANCELLED** | "Member resigned from Acme Industries…" | The free-text cancellation reason — the demo's only example of a CANCELLED member |

### 6.6 Reset to clean state

If the demo gets messy (you ran "Request price" three times, "Finalized" something accidentally, etc), reset the in-memory store:

```bash
curl -X POST http://localhost:3000/api/dev/reset
```

Returns `200 {"ok":true}`. Refresh any page and you're back to fixtures.

---

## 7. Demo flows — the script

Five flows. Pick the ones that match the audience. F1 + F4 + F5 is the core 5-minute story; the others are depth on demand.

### F1 — The maker-checker hand-off (canonical 3-minute story)

**Story:** "Sales prepares a quote, sends it for internal approval, the approver picks it up, runs it through to finalization."

**Reset first.** Then:

1. Open `/quotation` (or click Quotation card on the dashboard). Show the list — point out:
   - "These are all the quotes in flight. Different statuses, mix of clients."
   - "Notice the awaiting-approval pulse on QTE-2026-0002 — that's a quote the Maker has flagged for Checker review."

2. Click **QTE-2026-0001** (DRAFT, no premium yet). Point out:
   - The status badge, client name, headcount.
   - The 6 tabs covering every facet of a quote.
   - The action bar: "Edit / Send for approval / Withdraw — these are exactly the actions a Maker can take on a draft quote."

3. Click the **Pricing tab**. Click **Request price**. Wait 4 seconds.
   - "The Rule Engine computes the premium — in production this involves the rate cards, member data, plan configurations. Here we mock it. Notice the page polls automatically — 2 seconds for the first 10, then backs off to 5. When the premium lands, polling stops."
   - The premium populates: ₹4,320,000.

4. Click **Send for approval** (top of the page in the action bar).
   - "I've now flagged this for my Approver. Watch the action bar."
   - Refresh — the Edit button is now disabled with the tooltip "Awaiting checker approval". The Send for approval is also locked.
   - Withdraw is still available — Maker can always pull a quote back.

5. **Switch role to Checker** (top-right dropdown).
   - Refresh.
   - "Now I'm the Approver. The Maker's actions are gone — I never see the Edit button. What I do see is..."
   - The action bar now shows: **Approve & submit / Clear approval / Withdraw**. Highlight the pulsing "Awaiting approval" reason.

6. Click **Approve & submit**. State flips to **SUBMITTED**.
   - Action bar updates: now shows **Send to client / Withdraw**.

7. Click **Send to client**. State → **SENT_TO_CLIENT**. Action bar updates.

8. Click **Mark accepted**. State → **ACCEPTED**.

9. Click **Finalize**. State → **FINALIZED**.
   - "The quote is now locked. Behind the scenes, the Issuance module is creating a Proposal."
   - Wait 4 seconds. New action: **Open created proposal**.

10. Click it. Land on `/issuance/proposals` — the new Proposal is at the top of the list.

**Total time: 3 minutes if you pre-reset.**

### F2 — The activation watch (Policy Admin demo)

**Story:** "A policy doesn't go live until enough members enroll. Operations needs to see at a glance which policies are stuck waiting and on what."

1. Open `/policy-admin/policies`. Show the list with state filters.
   - "Different policies in different states — some Pending, some Active, some Cancelled."

2. Filter by **PENDING**. Click **POL-2026-0002**.

3. On the Overview tab, point at the **Activation watch** card.
   - "Total members: 4. Pending breakdown: 1 Awaiting float reservation, 1 Awaiting approval, 2 Awaiting policy activation."
   - "This breakdown is computed live from the underlying members list. In a multi-policy book of business, this is how Ops triages where to focus."

4. Click the **Members** tab. Show the per-state filter.
   - Filter to PENDING — see the four members with their reasons.

5. Click on **MEM-0013** (or any link).
   - "PAM Member detail. The reason banner is canonical — same copy whether on a list cell, a detail header, or an alert."
   - For MEM-0013 specifically: "Free-text cancellation reason: 'Member resigned from Acme Industries...'"

### F3 — The state-driven member workflow (Issuance / Ops demo)

**Story:** "A new member's data has problems. Ops fixes it, the workflow re-runs, the member gets approved."

1. Reset first (or just demo on existing fixture state).

2. Navigate `/issuance/proposals/PRO-2026-0001/members/PMB-0007`.
   - Status: **Repair pending** (warning chip).
   - Reason: classification flagged the salary as zero.
   - Action bar: **Edit & re-classify / Reject / Archive** (Maker actions for a REPAIR_PENDING member).

3. Click **Edit & re-classify**. A modal opens with the form pre-filled with the broken data.
   - "This is the Repair form — Ops fixes the broken fields and re-submits."
   - Update the salary to e.g. 1500000 and sumInsured to 36000000. Click **Save & re-classify**.

4. Page refreshes. State → **Created**. The workflow re-runs.
   - In production, this would trigger the Rule Engine again, then re-classify.
   - In demo, we don't auto-progress past CREATED — but you can manually click Price, then it goes to PRICED.

5. Switch to Checker (or use a fixture in APPROVED state — PMB-0006).

6. Open PMB-0006 (APPROVED). Action bar: **Send for issuance**.

7. Click it. State → **SENT_FOR_ISSUANCE**, then 4 seconds later → **ADDED**.

8. Now visible: **Open in Policy Admin** action.

9. Click it. You land on the corresponding **PAM Member** detail (e.g. MEM-0005). State: ACTIVE.

### F4 — The cross-module deep linking story

**Story:** "Each module owns its data, but follow-the-thread navigation between them just works."

This is best done as quick interleaved navigation:

1. Quote QTE-2026-0006 (FINALIZED) → click "Open created proposal" → land in Issuance.
2. PRO-2026-0001 → policyNumber field shows GTL-POL-2026-0001 → navigate to `/policy-admin/policies/POL-2026-0001`.
3. POL-2026-0001 → Members tab → click any member → PAM Member detail.
4. From any PolicyMember in ADDED state (PMB-0011) → "Open in Policy Admin" → PAM Member detail.

Talk track: "Each link is a deep navigate. The IDs are stable across modules. The architecture is event-driven on the backend — when a Quote finalizes, an event fires, the Issuance module subscribes and creates the Proposal. The frontend polls for the new entity using the standard backoff cadence."

### F5 — The role-adaptive UI proof

**Story:** "The UI structurally adapts to who's logged in. Same data, different view per role."

Quickest way to show this:

1. On any quote detail (e.g. QTE-2026-0001), look at the action bar in the **Maker** role.
2. Switch to **Checker**. Refresh. The action bar is different — submit-style actions only.
3. Switch to **Ops**. Refresh. Even fewer buttons (Ops doesn't act on quotes).
4. Switch to **Viewer**. Refresh. Action bar is empty.

"This isn't cosmetic — these actions don't exist for the wrong role. A Viewer literally cannot click Approve. In V1 this is enforced at the UI layer; post-V1 it'll be enforced at the API layer via Cerbos and at the SSO layer via Keycloak."

---

## 8. Q&A pre-bank — anticipated questions, honest answers

Group by likely questioner. Use the actual phrasing where it helps.

### 8.1 From the operational user (a Sales / Ops person)

**Q: Where do I edit the plans on a quote?**
A: Plan editing is in our Pass-1 backlog (deferred item D1). Today the demo uses pre-configured fixtures. The data model (`Plan`, `PlanProduct`, `PlanBenefit`, `AmountFormula`) is fully defined in the spec — only the editing UI is deferred. Add/edit/remove will be the first post-demo build.

**Q: I have a 500-employee census file in Excel. How do I import it?**
A: Bulk census upload is deferred (D4). For demo we show single-member-add. The backend command (`InitiateCensusSubmissionCommand`, `IngestCensusFileCommand`, `SubmitCensusSubmissionCommand`) and the data model (`CensusSubmission`, `CensusSubmissionRow`) are all defined; the UI flow comes post-demo. We will support CSV and Excel via a presigned-URL upload pattern.

**Q: What if a row in my census file has bad data?**
A: That's the REPAIR lane — the Rule Engine flags the row, it lands in the REPAIR queue, Ops fixes the data and re-submits. We can demo the single-member version of this with PMB-0007.

**Q: How does the system know who needs medical underwriting?**
A: Each plan has a Free Cover Limit. Members wanting coverage above that need a Member Application Form (MAF) and a UW review. The Rule Engine classifies them — if the lane is REVIEW, the case routes to the UW Workbench (a separate application). We don't ship the workbench in V1; this PAS just sends cases to it and receives back decisions.

**Q: Can I see all the quotes I'm working on?**
A: That's the "Operational Queue Index" feature, deferred per D5. For now use the status filter on the Quotation list. Post-V1 there'll be a single landing page with "My drafts / Awaiting my approval / In repair / Out for client review" chips.

**Q: I closed my browser mid-edit. Did I lose my work?**
A: Today we don't have save-as-draft for in-flight forms — only the persisted backend state survives. The Quote itself is auto-saved as you mutate it (each field change is a separate API call). The principle of "save as draft" the deck mentions is real for the Quote object; we don't have it for the small inline forms yet.

### 8.2 From the technical user (a CTO / IT manager)

**Q: Is this multi-tenant? Can I run this for multiple insurers?**
A: Out of V1. The architecture supports it (the spec mentions tenant headers; the database layer is namespaced). UI doesn't surface tenant switching yet.

**Q: How does authentication work?**
A: Out of V1 — the API is open in this build. Production will use Keycloak SSO. The role switcher in the top-right is a UI-only stand-in for the demo; in production your role comes from your SSO claims.

**Q: PII handling? Data masking?**
A: Sensitive fields (mobile, email, government ID, financial details) are flagged in the data model (`MemberEnrollmentData` has them tagged "PII — repo-encryption + Cerbos (post-MVP)"). V1 doesn't yet mask them in the UI — that lands post-V1 with Cerbos-based authorization rules.

**Q: How fast is it?**
A: Backend isn't deployed for this build — everything you see is mocked in-memory. Real backend benchmarks come once integration starts. The frontend itself is Next.js 16 with React 19 + TanStack Query for caching; list pages render with virtualization off (acceptable for typical group sizes); we have a backoff polling pattern for async backend computations to avoid hammering the server.

**Q: What's the deployment story?**
A: Frontend is a Next.js app deployable to Cloudflare Workers (we have a `npm run deploy` path). Backend is FastAPI — separate service. They communicate over REST. Real auth lands when both are deployed together.

**Q: Audit trail?**
A: The data model is event-sourced — every state transition emits a domain event (we have ~40 of them defined in the spec across the three modules). Persisting them is in scope; surfacing them in the UI is post-V1.

**Q: Can it handle 100k members under one policy?**
A: Untested at that scale. The data model supports it; the polling cadence and pagination are designed around typical 100–10,000 member groups. Performance tuning is post-V1.

### 8.3 From the business buyer (a CIO / Head of Insurance Tech)

**Q: How is this different from what we have today?**
A: Three things:
1. **Role-adaptive UI** — your operations team doesn't waste training time learning buttons they'll never click.
2. **Schema-driven** — adding a new field, screen, or workflow doesn't require a frontend release. We push a JSON schema change and the engine renders it.
3. **Workflow-first** — the data model is designed around the lifecycle (Quote → Proposal → Policy → Members), not around screens. You inherit consistent state machines across modules.

**Q: How long to onboard a new business user?**
A: The role-adaptive UI cuts training time significantly — users only see what's relevant to them. Guided wizards (where they exist) make complex flows self-explanatory. We don't have hard numbers yet (no production users).

**Q: Is this WCAG compliant / accessible?**
A: Targeting WCAG 2.1 AA. Color contrast, keyboard navigation, screen-reader semantics, multi-signal status indicators (icons + colour + text). Not yet audited end-to-end — that's post-V1.

**Q: What's the roadmap after V1?**
A: Three buckets:
1. **Cleanups** (D1–D12 in the plan): plan editing, census upload, client detail, etc — 1-2 weeks of work.
2. **Hardening**: real auth (Keycloak), backend-enforced maker-checker, Cerbos PII gating, audit-trail UI — 4-6 weeks.
3. **New modules**: Endorsements, renewals, claims — 6+ months.

**Q: Can we white-label it?**
A: The design system is token-driven (`globals.css` defines all colours, radii, typography). Swapping the palette is a config change. The component library is ours — fully customisable.

**Q: Does it have a mobile app?**
A: Laptop-first by design. Mobile is supported for status checks and member self-service flows (post-V1). The deck is explicit: "We didn't compromise the desktop experience to force-fit a phone."

**Q: How do we get our existing data into it?**
A: That's the migration conversation — we'd typically build a one-time import scripted against your current PAS's export format. Backend has bulk-import endpoints in the data model.

**Q: What about reports / dashboards / BI?**
A: The home page dashboard is mock data only — placeholder for the real reporting layer. Post-V1 we'd integrate a BI tool (Metabase, Superset, your existing stack) reading from the read-side projections.

### 8.4 Defensive plays — when something goes wrong mid-demo

**Q: "Why is this Plans tab so empty?"** (D1 deferred)
A: "The plan structure is configured upstream — for V1 demo we use pre-configured fixtures. Plan editing UI lands in Pass-1 post-demo. The data model is fully defined; only the editing screens are deferred."

**Q: "Why does this DMN field show 'Configured'?"** (D3 deferred)
A: "DMN authoring is a complex sub-product — typically a vendor like Camunda. V1 stores the file reference; replacing it via UI is post-V1. Today we'd upload a new DMN file via the file-storage endpoint."

**Q: "I clicked Withdraw and nothing happened."** (action triggered, page didn't update visibly)
A: "The action fires immediately — the page may take a beat to re-poll. Refresh and you'll see the state change. In production this would have a toast notification confirming the action; that polish is in our P2 backlog."

**Q: "This pricing seems instant — surely real pricing takes longer?"**
A: "Production pricing involves the Rule Engine — that's an external service. We've designed the UI for it: 2-second polls for the first 10 seconds, then backs off to 5 seconds, max 60 seconds. Today we mock the Rule Engine returning in 4 seconds so the demo flows naturally."

**Q: "Where's the GCL screen?"**
A: "GCL Member Quotes is a separate workflow — point them at the placeholder tab on a Quote detail. The data model is defined (`MemberQuote` entity in the spec); the UI lights up post-V1 once the GCL backend workflow is wired."

**Q: "Can I see who clicked Approve and when?"**
A: "Every state transition emits a domain event with the actor + timestamp on the backend. UI to query and display that audit trail is in our post-V1 hardening phase. The data model supports it today; the surfacing is the work."

**Q: "What happens if two Checkers approve the same quote at the same time?"**
A: "Backend enforces optimistic concurrency — the second one would fail with a version mismatch. UI doesn't yet surface that error nicely; today it'd show a generic 'Failed to load' banner. Post-V1 we'd render a 'Refreshed by another user' message with a one-click reload."

---

## 9. Final pre-demo checklist

Five minutes before going live:

1. ✅ Reset the mock store: `curl -X POST http://localhost:3000/api/dev/reset`.
2. ✅ Open three tabs: `/test-dashboard`, `/quotation/QTE-2026-0001`, `/policy-admin/policies/POL-2026-0002`.
3. ✅ Confirm the role switcher in the top-right shows **Maker — Sales**.
4. ✅ Have this document open in another window — bookmark §8 (Q&A) for fast lookup.
5. ✅ Have the Design Principles deck open as backup if you need to defend a UX choice.

**If the dev server crashes mid-demo:** restart it (`npm run dev`), wait 10 seconds for it to boot, refresh the browser. The mock store will reset automatically (it's in-memory only).

**If a state transition seems stuck:** the simulator is on a 4-second delay. Wait 5 seconds and the page will pick it up via polling. If still stuck, refresh.

Good luck.
