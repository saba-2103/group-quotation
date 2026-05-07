# Demo Prep — Business Context, Flows, and Honest Q&A

**Audience:** the developer demoing this to insurance business users.
**Assumed knowledge:** consumer-side insurance only. No prior commercial / group insurance background.
**Use:** read sections 1–5 once before the demo; keep sections 6–8 open during it.

---

## Sections at a glance

1. Insurance 101 for developers
2. Glossary (every jargon word — keep open during the demo)
3. The workflow in plain English
4. Maker-Checker — the financial-services dance
5. What this demo proves (and what it doesn't)
6. Demo data — what's in the fixtures
7. Demo flows — the script
8. Q&A pre-bank
9. Final pre-demo checklist

## Reading order

If you have **15 minutes**: read §1, §2 (skim), §3, §4, then jump to §7 (the demo script).

If you have **45 minutes**: read everything.

If you have **5 minutes**: read §3 and §8 (Q&A pre-bank). §3 sends you to §2 for any term that lands cold.

---

## 1. Insurance 101 for developers

### 1.1 Individual vs Group insurance

You probably have **individual insurance** — you bought a policy, you pay a premium, the insurer pays a claim if something happens. One person, one policy, one contract.

**Group insurance** is sold to an organization (the "client") that covers many people (the "members") under a single master policy. Examples:
- Your employer's life insurance benefit (everyone in the company is covered automatically).
- A bank's loan-protection insurance bundled with every home loan they issue.
- A union's group health plan for its members.

The **insurer** sells one policy to the **client** (the organization). The client typically pays the premium (or splits it with members). When a member suffers a covered event, the insurer pays out.

Why this matters for software: the lifecycle of a group policy is fundamentally different from an individual one. You're tracking thousands of members under a single policy. Members come and go as employees join and leave the company. The premium is a function of the entire member roster, not any one person. And the policy itself has a lifecycle separate from any individual member.

### 1.2 Group Term Life (GTL) — what we're demoing

Three group products are mentioned in the codebase:

| Code | Name | What it covers |
|---|---|---|
| **GTL** | Group Term Life | Pays a fixed sum if a covered employee dies during the coverage period (typically 1 year, renewed annually). Sum-assured is set per member up-front. The flagship V1 product. |
| **GCL** | Group Credit Life | Pays off a borrower's outstanding loan balance if they die during the loan term. Sold by banks alongside loans. (Out of V1 demo — see slow read below.) |
| **GH** | Group Health | Hospital and medical expense coverage for employees. (Out of V1 demo.) |

All our demo data is GTL. When a business user asks "where's GCL?" — see the GCL placeholder tab on a Quote detail; the data model already supports it (see `MemberQuote` in the spec), the screens light up post-V1.

#### Slow read on GCL — for readers with no bancassurance background

GCL (Group Credit Life) sounds technical; it's actually a simple insurance product wrapped around a bank loan. Skip this if you already know GCL.

**The story:** You take a home loan from a bank — say ₹50 lakh, repaid over 20 years. The bank sells you a GCL policy at the same time. If you die during those 20 years, the GCL pays off whatever is still left on the loan, so your family doesn't inherit the debt. Bank protects itself (loan gets repaid no matter what); your family gets a clean exit.

**Two terms a banker will use that you need:**

- **Amortise** — when you repay an EMI (Equated Monthly Instalment — the fixed monthly loan payment) each month, part of it pays off the **principal** (the original amount you borrowed) and part is interest. So the principal balance you owe shrinks over time. That shrinking-as-you-pay process is amortisation. By the end of year 20, the loan balance is zero.
  | End of year | What you still owe |
  |---|---|
  | Year 0 (just took the loan) | ₹50 lakh |
  | Year 5 | ₹42 lakh |
  | Year 10 | ₹30 lakh |
  | Year 15 | ₹15 lakh |
  | Year 20 | ₹0 (paid off) |

- **Decreasing-term cover** — *Term* means the policy is for a fixed period (here: 20 years to match the loan). *Decreasing* means the **payout amount shrinks year by year**, instead of staying flat. The cover schedule mirrors the loan balance:
  | End of year | Loan balance | GCL cover that year |
  |---|---|---|
  | Year 0 | ₹50 lakh | ₹50 lakh |
  | Year 5 | ₹42 lakh | ₹42 lakh |
  | Year 10 | ₹30 lakh | ₹30 lakh |
  | Year 15 | ₹15 lakh | ₹15 lakh |
  | Year 20 | ₹0 | ₹0 |

  You die in year 12 owing ₹25 lakh → GCL pays the bank ₹25 lakh → loan closed, your family is clean. The insurer doesn't owe more than the outstanding balance because that's all the bank is at risk for.

  Contrast with **GTL** (the V1 demo product) — GTL pays a *flat* sum (say ₹1 crore) for the whole term regardless of when in the term you die. GCL's payout is wired to a specific debt that's shrinking; GTL's is a fixed benefit.

**Why this matters for our app:** every time the bank **disburses** a new loan (i.e. actually transfers the loan money to the borrower), a new GCL **MemberQuote** is created — sized to that disbursement, with a decreasing schedule baked in. A bank making 100 home loan disbursements a day generates 100 MemberQuotes a day. That's why GCL needs the per-member quote-then-issue flow (the `MemberQuote` entity in our spec). GTL is the opposite shape — one quote covers a fixed roster of 120 employees in one shot.

**One-sentence demo answer if a banker asks:**
> "GCL is per-loan, decreasing-cover term life — each loan disbursement creates a member quote sized to that loan and the cover amount shrinks as the loan amortises. Different from GTL where one quote covers a fixed employee roster with flat-sum cover."

If they push deeper than that — fall back to "GCL screens are post-V1; the `MemberQuote` data model is already in the spec."

### 1.3 What is a Policy Administration System (PAS)?

A PAS is the back-office system insurers use to:
- **Quote** — price up a potential policy ("how much would coverage for this employer cost?")
- **Issue** — turn an accepted quote into a real binding policy
- **Maintain** — add/remove members; handle renewals and mid-term changes (post-V1)
- **Service** — handle claims, refunds, lapses, cancellations (post-V1)

Think of it as the operational system-of-record for every policy the insurer sells, from quote to claim. Different vendors split these differently. Our system splits them into three modules that mirror the lifecycle:

| Module | Owns | URL prefix |
|---|---|---|
| **Quotation** | Pre-sale: building and pricing a quote, getting client acceptance | `/quotation` |
| **Issuance** | Conversion: accepted quote → proposal → master policy + member enrollment | `/issuance` |
| **Policy Admin Module (PAM)** | Live policy: active members, premium tracking, cancellations | `/policy-admin` |

A single GTL deal flows **left to right**: starts in Quotation, finalizes into Issuance, lives forever in PAM. The four lifecycle stages described in §3 map back to these three modules — Stages 2 (Proposal) and 3 (Activation + Member Enrollment) both live inside Issuance; Stage 4 (Live Policy) is PAM.

### 1.4 The actors (roles)

**Mnemonic:** Maker creates, Checker approves, Ops repairs, Viewer watches.

| Role | Real-world job | What they do in our app |
|---|---|---|
| **Maker** | Salesperson at the insurer or external broker | Builds and configures quotes, gathers client info, enters members |
| **Checker** | Approver / senior reviewer | Reviews what the Maker prepared, approves submissions, sends to client, finalizes deals |
| **Ops** | Operations team | Fixes data problems flagged by the workflow (REPAIR queue), archives stuck records |
| **Viewer** | Read-only stakeholder (compliance, audit, exec dashboards) | Looks but doesn't touch |

The role you're acting as in the demo is set by the **role switcher dropdown in the top-right corner** ("Maker — Sales", "Checker — Approver", etc). Switching roles changes which buttons you see — that's the maker-checker UX adapting to who's logged in.

---

## 2. Glossary — every jargon word you'll hear

Two parts: §2 main glossary covers insurance domain terms (everything in the workflow). §2.1 at the end is a separate cheatsheet for the finance / banking / Indian regulatory acronyms that the doc references but aren't insurance-specific. If you're a developer with no finance background, scan §2.1 once.

Read this once; come back to it during the demo if a term confuses you.

| Term | Plain English |
|---|---|
| **Aggregate census** | A summary count: "this employer has 120 members; 90 on Plan A, 30 on Plan B." Used for pricing before individual member data is collected. |
| **Amortise** | The process of paying off a loan through scheduled EMIs, where each payment reduces the outstanding principal. By the end of the loan term, the balance is zero. The "amortisation schedule" is the table of how the balance shrinks year-by-year. Relevant to GCL (see §1.2 slow read). |
| **Annual premium** | The money the client pays to the insurer per year for the coverage. Our currency throughout the demo is INR (₹). |
| **Awaiting approval** | UI overlay state: Maker has prepared a quote and clicked "Send for approval"; the Checker now needs to review and approve before the workflow continues. **This is UI-only in V1** — the backend doesn't enforce maker-checker. |
| **Broker** | A licensed intermediary who sells insurance on behalf of one or more insurers. In our demo, the Maker is the broker side. |
| **Census** | The list of people to be covered. A "census file" is typically an Excel or CSV from the client's HR system. |
| **Census file format** | The schema saying which columns the census file has (name / DOB / salary etc) and what type each is. We accept JSON-described format — DSL-defined as a "Frictionless Table Schema". V1 stores it as opaque JSON; UI shows a Configured/Not-configured chip. |
| **Checker** | The Approver role. See §1.4. |
| **Classification (lane)** | When a member is added, the Rule Engine classifies them into one of four lanes: **STP** (straight-through processing — auto-approve), **REPAIR** (data is broken, needs fixing), **REVIEW** (needs underwriter judgment), **REJECT** (auto-reject, e.g. age out of bounds). |
| **Client** | The organization that buys the group policy. Examples in our fixtures: "Acme Industries Pvt Ltd", "Brightline Technologies Ltd". Not the insurance industry's other meaning of "client" (= end customer of the insurer). |
| **Decreasing-term cover** | Life insurance for a fixed period (the "term") where the **payout amount shrinks year by year** instead of staying flat. Used for GCL: the cover schedule mirrors the loan amortisation, so the payout always equals (roughly) the outstanding loan balance. Contrast with **flat-sum** term cover (used in GTL) where the payout is the same throughout the term. See §1.2 slow read. |
| **DMN** | Decision Model and Notation — an industry-standard way to express business rules as decision tables. We use it for "given this member's attributes, which plan should they go on?" V1 stores the DMN reference as an opaque file ref; authoring is post-V1 (deferred D3). |
| **Endorsement** | A formal change to a policy mid-term (e.g. employer increases sum-insured, or adds a new sub-product). Out of V1. |
| **Finalize** | Verb. Quote.finalize() means "Sales has done all the paperwork; turn this Accepted quote into a Proposal so we can issue the actual policy." Proposal.finalize() means "Ops has reviewed; create the master Policy and start enrolling members." |
| **Float reservation** | An accounting reserve in the insurer's separate **Float Management** module. When a new member is added, the workflow asks Float Management to reserve their portion of the premium against the client's pre-funded float account. If Float Management returns `INSUFFICIENT`, enrollment parks at `PENDING_FLOAT_RESERVATION` until the client tops up. (This is **not** a claims reserve — that's a separate actuarial concept out of V1 scope.) |
| **Free cover limit (FCL)** | The maximum sum-assured an insurer will offer to a member without medical underwriting. Members at-or-below FCL are auto-eligible (STP lane). Members wanting cover **above** FCL fill a Member Application Form (MAF) and route to the REVIEW lane for a human underwriter. Captured per plan. |
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
| **Rate card** | The pricing table the actuaries publish per plan (typically: rate per ₹1000 of sum-assured, varying by age band and gender). We accept it as an uploaded file ref. Versioning + actuarial governance is a separate Product Configurator module (post-V1). |
| **Rule Engine** | The backend service that runs business rules for pricing and member classification. Distinct from the workflow engine. In V1 it's mocked: the request-price action returns `headcount × ₹36k` after a 4-second delay. Production integration is post-V1. |
| **Renewal** | When a policy term ends and the client agrees to extend. Out of V1. |
| **REPAIR** | Classification lane meaning "this member's data has problems; Ops needs to fix it before we can proceed." |
| **REVIEW** | Classification lane meaning "this case needs an underwriter's judgment." Routes to an external UW Workbench (separate app — our system signals to it but doesn't render it). |
| **STP** | Straight-Through Processing — the happy path where no human intervention is needed. The Rule Engine classified the member as STP, the workflow auto-approves. |
| **Sum insured** / **Sum assured** | The amount of money the insurer will pay if the covered event happens. **Sum-assured** is the technically correct term for life products (GTL/GCL — fixed payout); **sum-insured** is the indemnity term for health products. The spec uses both interchangeably; a domain audit pass would standardise to sum-assured for GTL/GCL — flag it if a reviewer notices. |
| **Term** | The duration of coverage (typically 1 year for GTL, renewed annually). |
| **Underwriting (UW)** | The risk-assessment process: deciding whether to cover a person, on what terms, at what price. For STP cases the Rule Engine does this automatically; for REVIEW cases a human underwriter reviews the case in the UW Workbench. |
| **UW Workbench** | A separate application where underwriters review REVIEW-lane cases. Our PAS sends cases to it and receives back approve/reject decisions. We don't ship the workbench itself in V1. |
| **VIP client** | A client flagged for white-glove service / priority handling. In V1 this is a list-filter chip only — no special routing or SLA logic; downstream queue prioritisation lands post-V1. |

### 2.1 Finance, banking & regulatory cheatsheet (for non-finance readers)

The doc references several finance, banking, and Indian-regulatory acronyms that aren't insurance-specific. If you're a developer with no finance background, this is the lookup table.

| Term | Plain English |
|---|---|
| **AML** | Anti-Money Laundering — the body of regulations + checks that try to stop illicit funds entering the financial system. Insurers must run AML screening on the proposer. |
| **Bancassurance** | Selling insurance through a bank's distribution network (loan officers, branches, banking apps). The bank acts as a corporate agent for the insurer. GCL is the canonical bancassurance product. |
| **Brokerage** / **broker commission** | The percentage of premium that goes to the broker as compensation for sourcing the deal. Typically a higher first-year rate, then a smaller "trailing" rate on each renewal. Out of V1 (no Commission entity yet). |
| **CFT** | Counter-Financing of Terrorism — twin regulation to AML, often paired as "AML/CFT." |
| **CIN** | Corporate Identification Number — the unique 21-character ID issued by India's Ministry of Corporate Affairs (MCA) to every registered company. Equivalent to a "company registration number" in other jurisdictions. |
| **Disbursement** | When a bank actually transfers loan money to the borrower's account. A loan can be approved without being disbursed (e.g. a home loan that disburses in stages as construction progresses). Each disbursement = a new GCL MemberQuote. |
| **EMI** | Equated Monthly Instalment — the fixed monthly amount a borrower pays toward a loan. Each EMI is part principal repayment, part interest. |
| **FATF** | Financial Action Task Force — the global body that sets AML/CFT standards. Countries it puts on its "grey list" or "black list" face heavy compliance scrutiny. |
| **Free-look period** | An IRDAI-mandated 15-day window after policy issue during which the proposer can cancel and get a full refund (minus minimal admin fees). Standard consumer protection. Out of V1. |
| **GST** | Goods and Services Tax — India's unified indirect tax. Insurance premium attracts 18% GST. Computing it on the premium and adding it to the invoice is post-V1. |
| **GSTIN** | GST Identification Number — the 15-character GST registration number issued to every business. Captured on the Client master in our system. |
| **HRIS** | Human Resource Information System — the employer's HR software (Workday, SAP SuccessFactors, BambooHR, Darwinbox etc) that holds the canonical employee roster. The PAS imports member rosters from HRIS systems. |
| **Indemnity** | An insurance contract that reimburses actual loss incurred (not a fixed sum). Health insurance is indemnity (you submit hospital bills, you get reimbursed up to the cover); life insurance is not (you get the fixed sum-assured no matter what). |
| **IRDAI** | Insurance Regulatory and Development Authority of India — the regulator that licenses insurers, approves products, sets rules. Every insurance discussion in India ends up at IRDAI. |
| **KYC** | Know Your Customer — mandatory identity-verification checks on the proposer. For a corporate client, KYC documents include CIN proof, GSTIN, PAN of authorised signatory, latest financials. Out of V1. |
| **MCA** | Ministry of Corporate Affairs — the Indian government department that registers and regulates companies. Source of truth for CIN. |
| **OFAC** | US Treasury's Office of Foreign Assets Control — maintains a sanctions list of individuals + entities US persons can't transact with. Indian insurers screen against OFAC + UN sanctions lists as part of AML. |
| **PAN** | Permanent Account Number — the 10-character alphanumeric ID issued by India's Income Tax department to every taxpayer (individual + entity). Mandatory for any high-value financial transaction. |
| **PEP** | Politically Exposed Person — a person holding (or recently holding) a prominent public position, like a minister, judge, or senior bureaucrat. PEPs trigger enhanced KYC scrutiny because they're a higher corruption-risk category. |
| **Principal** | The original amount borrowed in a loan, distinct from the interest. When you repay an EMI, part goes to principal, part to interest. The principal balance shrinks over time (amortisation). |
| **Reinsurance (RI)** | When an insurer offloads part of a risk it has taken on to another insurer (the "reinsurer"). Two flavours: **Treaty RI** is a pre-agreed standing deal — every policy meeting certain criteria automatically gets ceded. **Facultative RI** is case-by-case for individual large risks. **RI cession** is the act of passing the risk to the reinsurer. Out of V1 (placeholder gate in the workflow). |
| **Section 10(10D)** | Indian Income Tax Act clause that makes most life-insurance proceeds (death benefit, maturity benefit) tax-free in the recipient's hands. A policy meeting 10(10D) conditions is a tax-saving product. Generating the certificate that proves 10(10D)-compliance is a post-V1 regulatory output. |
| **Settlement** | When a claim is paid out to the beneficiary. Out of V1 (claims module is post-V1). |
| **TAT** | Turnaround Time — the SLA on how fast something gets done. IRDAI sets claims TAT at 15-30 days. Quote turnaround TAT is set by the insurer's own ops policy. |
| **Tranche** | A portion of a larger transaction released or disbursed in stages. A construction-linked home loan disburses in tranches as the building progresses; each tranche = a new GCL cover slice in our model. |
| **Treaty / facultative** | See Reinsurance. |

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
6. Maker clicks **Request price** — the **Rule Engine** (a backend service that runs business rules — see §2) computes the total premium. This is asynchronous (takes a few seconds in real life, mocked at 4s in our demo).
7. Maker clicks **Send for approval** (UI-only maker-checker overlay).
8. Checker switches to the Checker role, sees the pending quote, reviews, clicks **Approve & submit** (which calls the real backend `submit` endpoint behind the scenes).
9. Checker clicks **Send to client** — the printed/PDF version goes to the client (we don't render the PDF; just flip the state).
10. Client says yes. Checker clicks **Accept**.
11. Checker clicks **Finalize**. Done — Quote is locked.

When the Quote finalizes, **the Issuance module automatically creates a Proposal** for it. That's the workflow hand-over from sales to operations.

**What's deferred (D-items in the plan):**
- Editing forms for plans, census, mapping (D1/D2/D3) — for the demo, the fixtures already have these populated.
- Real upload widget for files (D7) — the mock route accepts any POST as success.

### 3.2 Stage 2 — Proposal (Issuance module)

**Real world:** Once a quote is accepted, the insurer's operations team takes over. They formally create a "proposal" (a regulatory term — the offer-to-bind document), do internal QC, then trigger creation of the actual master policy in the policy admin system.

**Our app:**
1. Maker (or anyone) navigates to the auto-created Proposal in `/issuance/proposals`.
2. Proposal starts in DRAFT — Maker can edit the carried-over data.
3. Maker clicks **Submit proposal** — locks the proposal.
4. Checker clicks **Finalize → create policy** — this triggers Policy creation.
5. ~4s later, a **Policy** appears in `/policy-admin/policies` (state PENDING).
6. The Proposal flips to **POLICY_CREATED** state and shows the policy number.

This stage is **mostly read-only in V1**. The demo shows the auto-creation; the full proposal-editing flow is out of demo scope.

### 3.3 Stage 3 — Policy Activation + Member Enrollment (Issuance ↔ PAM)

**Real world:** A group policy doesn't "go live" the second it's created. It typically waits until a minimum number of members have been successfully enrolled (the **activation threshold** — say 30 members for a GTL policy). Each member individually goes through a workflow:
1. We collect their data (name, DOB, salary).
2. We price their portion of the premium.
3. If they want coverage above the free cover limit (FCL), they fill a Member Application Form (MAF).
4. We classify them — most cases auto-approve (STP — Straight-Through Processing); some need data fixes (REPAIR); some go to a human underwriter (UW) for REVIEW; obvious-no's auto-REJECT.
5. Once approved, we reserve their portion of the float.
6. We add them to the master policy.
7. Once enough members are added, the policy itself activates.

**Our app:**
1. From the Proposal members tab, Maker clicks **Add member** → fills the single-step form → submits.
2. A **PolicyMember** appears in CREATED state.
3. (In a real flow) the workflow progresses: CREATED → PRICED (Rule Engine prices the member) → CLASSIFYING (Rule Engine assigns a lane) → APPROVED (STP) or REPAIR_PENDING / REFERRED_TO_UW (other lanes).
4. Demo shortcut: PMB-0007 (a pre-loaded demo record) is already in **REPAIR_PENDING** — the Rule Engine flagged its salary as zero.
5. Ops switches role, opens PMB-0007, clicks **Edit & re-classify**, fixes the salary, saves. Member resets to CREATED so the workflow can re-run.
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

V1 is **UI-only** maker-checker. The backend doesn't enforce it; the UX overlay is a UI-layer simulation built so the demo can show the maker-checker flow end-to-end.

The flow:
1. **Maker** prepares a quote (in DRAFT). They click **"Send for approval"** — this sets a UI-only flag (`awaitingApproval: true`) on the quote record. The Maker's editing actions (Edit, Send for approval) become locked with the tooltip "Awaiting checker approval". Withdraw stays available — Maker can always pull a quote back.
2. The user **switches role** via the top-right dropdown (Maker → Checker).
3. **Checker** sees the same quote. Now an **"Approve & submit"** button is visible (it was hidden for the Maker). Clicking it calls the real backend `submit` endpoint — moving the quote from DRAFT to SUBMITTED. The same Checker can then "Send to client", "Mark accepted", and "Finalize" in sequence.

**Important honesty disclosure** (memorise this — you'll be asked):
- The backend has no concept of Maker vs Checker. The `submit` endpoint accepts the call from anyone with API access. The role-specific button visibility is **entirely client-side**.
- "Approve" is just a UI label on the `submit` state transition. There is no separate Approval record persisted; the only audit artefact today is the `QuoteSubmitted` domain event (which records the actor and timestamp via the standard event envelope, but doesn't carry an explicit "approval" semantic).
- The role switcher in the top-right is a stand-in for SSO. In production this would be Keycloak (the spec calls it out) and your role would come from your SSO claims, not a dropdown.

### 4.3 Why backend isn't enforcing it yet

Backend was simplified for V1 to deliver the data model and core workflows first. The frontend overlay lets us tell the maker-checker story now; the backend will harden enforcement post-V1.

**This timeline appears in three places — the same authoritative answer:**
- §4.3 (here): backend enforcement is the next major hardening pass.
- §5.4: out-of-V1 list — "Backend-enforced maker-checker" is one entry.
- §8.3 commercial Q&A: roadmap bucket 2 (Hardening, ~4–6 weeks) covers this work alongside Cerbos PII gating, real Keycloak SSO, and audit-trail UI.

If a sceptic pushes — "so what's stopping me hitting the API directly to bypass approval?" — the honest answer today is "nothing in V1; the gate is in your SSO claims and Cerbos policies which land in Hardening pass." Don't bluff this one.

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
| Role-adaptive UI | Switch role in top-right; action bar buttons appear/disappear (F5 in §7) | Backend doesn't enforce — anyone with API access could call submit/finalize directly. Hardening pass adds Cerbos + Keycloak. |
| Workflow-aware screens | PolicyMember detail (PMB-0007) — different actions appear in REPAIR_PENDING vs APPROVED (F3 in §7) | State-driven toggling is action-bar-level; full per-state form UIs come post-V1. |
| Async backend computations | Quote pricing simulator: click "Request price", watch the page poll until the premium lands (F1 step 3 in §7) | Backend is mocked; real Rule Engine integration is post-V1. |
| Cross-module hand-off | Quote.Finalize → ~4s later a Proposal appears in Issuance (F1 step 9–10, F4 in §7) | The poll cadence, error handling, and idempotency are sketched not battle-tested. |
| Activation watch | Policy POL-2026-0002 has the "Activation watch" card showing pending members by reason (F2 in §7) | The grouping is computed from the in-memory store; in production this would be a backend-enriched response. |
| Reason banners | PAM Member detail (any in PENDING / VOID / CANCELLED state) shows the canonical reason (F2 step 5 in §7) | All reason copy lives in `state-map.ts`; easy to extend. |

**On "schema-driven" specifically** — every screen is rendered from JSON schemas under `schemas/`. This is the foundation for non-trivial role-adaptive UI (the same engine that gates buttons can also gate sections, fields, and PII masking — without per-page hardcoding). Most business buyers don't care about the implementation; cite it only if a CTO asks how this scales (covered in §8.2).

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
| D12 | Saved-view chip variants on lists ("Pending approval (mine)" etc) | Status filter dropdown covers demo. Subsumes D5 once both ship. |
| D13 | Auto-activation simulator (Policy PENDING → ACTIVE once member threshold hit) | The fixture POL-2026-0001 is pre-seeded ACTIVE; demo can't show the live transition. Honest answer if asked: "in production, once enough members reach ADDED, the policy auto-activates via PolicyActivationFlow." |

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

Note on which **policy** each member is on:
- MEM-0001..MEM-0004 sit on **POL-2026-0002** (PENDING) — perfect for demoing the activation watch (F2).
- MEM-0005..MEM-0008 sit on **POL-2026-0001** (ACTIVE).
- MEM-0009..MEM-0013 also sit on POL-2026-0001 (mix of VOID + CANCELLED + ACTIVE).

| ID | Policy | State | Reason | Best for showing |
|---|---|---|---|---|
| MEM-0001 | POL-2026-0002 | PENDING | PENDING_FLOAT_RESERVATION | Reason banner — "Awaiting float reservation" with pulsing icon |
| MEM-0002 | POL-2026-0002 | PENDING | PENDING_APPROVAL | "Awaiting approval" reason |
| MEM-0003 | POL-2026-0002 | PENDING | PENDING_POLICY_ACTIVATION | "Awaiting policy activation" |
| MEM-0004 | POL-2026-0002 | PENDING | PENDING_POLICY_ACTIVATION | Second example of same reason |
| MEM-0005 | POL-2026-0001 | ACTIVE | — | The successful end-state. Linked from PMB-0011's "Open in Policy Admin" action. |
| MEM-0009 | POL-2026-0001 | VOID | FLOAT_UNAVAILABLE | Void reason banner |
| MEM-0010 | POL-2026-0001 | VOID | APPROVAL_REJECTED | |
| MEM-0011 | POL-2026-0005 | VOID | POLICY_CANCELLED | (Note: POL-2026-0005 is itself CANCELLED) |
| MEM-0012 | POL-2026-0001 | VOID | WITHDRAWN_BY_PROPOSER | |
| **MEM-0013** | POL-2026-0001 | **CANCELLED** | "Member resigned from Acme Industries…" | The free-text cancellation reason — the demo's only example of a CANCELLED member. Reach it via /policy-admin/members/MEM-0013 directly, or via POL-2026-0001 → Members tab. |

### 6.6 Reset to clean state

If the demo gets messy (you ran "Request price" three times, "Finalized" something accidentally, etc), reset the in-memory store:

```bash
curl -X POST http://localhost:3000/api/dev/reset
```

Returns `200 {"ok":true,"message":"Group PAS mock store reset."}`. Refresh any page and you're back to fixtures. The route is disabled if `GROUP_PAS_BACKEND_URL` is set, so it's safe to leave in for the demo deploy.

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
   - The Edit and Send for approval buttons are now disabled with the tooltip "Awaiting checker approval". **Withdraw stays enabled** — Maker can always pull a quote back, even mid-approval.

5. **Switch role to Checker** (top-right dropdown).
   - Refresh.
   - "Now I'm the Approver. The Maker's actions are gone — I never see the Edit button. What I do see is..."
   - The action bar now shows: **Approve & submit / Clear approval / Withdraw**. Point to the pulsing "Awaiting approval" reason banner above the action bar.

6. Click **Approve & submit**. State flips to **SUBMITTED**.
   - Action bar updates: now shows **Send to client / Withdraw**.

7. Click **Send to client**. State → **SENT_TO_CLIENT**. Action bar updates to: **Mark accepted / Reject / Withdraw**.

8. Click **Mark accepted**. State → **ACCEPTED**. Action bar: **Finalize / Withdraw**.

9. Click **Finalize**. State → **FINALIZED**.
   - "The quote is now locked. Behind the scenes, the Issuance module is creating a Proposal."
   - Wait ~4 seconds. New action visible in FINALIZED state: **Open created proposal**.

10. Click it. Land on `/issuance/proposals` — the new Proposal is at the top of the list (sort by most recent if needed).

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

5. Click on **MEM-0001** (any of MEM-0001..MEM-0004 work — all four are PENDING members on POL-2026-0002).
   - "PAM Member detail. The reason banner is canonical — same copy whether on a list cell, a detail header, or an alert."
   - For the cancellation-reason demo, navigate separately to `/policy-admin/members/MEM-0013` (that one's on POL-2026-0001 not POL-2026-0002): "Free-text cancellation reason: 'Member resigned from Acme Industries...'"

### F3 — The state-driven member workflow (Issuance / Ops demo)

**Story:** "A new member's data has problems. Ops fixes it, the workflow re-runs, the member gets approved."

1. Reset first (or just demo on existing fixture state).

2. Navigate `/issuance/proposals/PRO-2026-0001/members/PMB-0007`.
   - Status: **Repair pending** (warning chip).
   - Reason: classification flagged the salary as zero.
   - Action bar shows **Edit & re-classify** (Maker, Ops). To also see **Reject** and **Archive** in the action bar, switch role to **Ops** first — those two actions are Ops-only by spec.

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

**Q: What's the SLA on a quote turnaround? How does the system enforce it?**
A: SLA targets aren't hardcoded — they're operational policy, configured per insurer / per channel. V1 surfaces the data needed to measure SLAs (every state transition emits a timestamped domain event); the dashboards reading that data are post-V1. Escalation paths (e.g. notify a manager if a quote sits in "Awaiting checker approval" for >24h) are also post-V1.

**Q: How is broker commission handled?**
A: Broker commission accounting isn't in V1 — there's no Commission entity in the spec yet. In a typical group GTL deal the broker earns a percentage of the first-year premium plus trailing renewal commissions. That's a separate Accounting/Commissions module; it'll consume the same domain events V1 emits. Plan for it post-V1.

**Q: How do members or the proposer get notified at each stage?**
A: Customer Communications Management (CCM) is hinted in the spec — for example, the MAF link is delivered "via CCM-served form link" — but actual integration with email/SMS/portal templates is post-V1.

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

**Q: How does the system integrate with our HRIS / payroll / banking stack?**
A: Three integration surfaces:
1. **Member onboarding from HRIS** (Workday/SAP/etc) — the bulk-census upload flow (D4) is the V1 mechanism: HR exports a CSV/XLSX, Ops uploads it, the workflow ingests row-by-row. Real-time HRIS connectors (e.g. Workday Studio) are post-V1.
2. **Premium remittance** (client paying the insurer) — out of V1. Banking-rail integration is its own module typically wired to Razorpay/M2P/HDFC for India.
3. **Member contribution payroll deduction** (employee-paid component) — also out of V1. Lives in payroll, not PAS.

**Q: How is rate-card governance handled? Who signs off on rate changes?**
A: Rate cards are uploaded as opaque file references in V1 (the actual file lives in object storage). Versioning, actuarial sign-off, and rate-card publication workflow live in a separate **Product Configurator** module — post-V1. The plan is rate cards are SCD-style versioned with effective-from / effective-to dates.

**Q: Reinsurance — how is treaty / facultative cession handled?**
A: Reinsurance is a placeholder gate in the spec (`WaitForReinsurerApproval` step in MemberEnrollmentFlow). V1 doesn't surface RI flows. Post-V1 the workflow will route members above an RI cession threshold through reinsurer review before approving for issuance.

**Q: Premium payment frequency — Annual / Single only?**
A: V1 spec has Annual and Single. Real GTL often supports Monthly / Quarterly / Half-Yearly. Adding them is a small enum extension on the backend + UI; not planned for V1, easy fast-follow.

**Q: Audit trail?**
A: The data model is event-sourced — every state transition emits a domain event (the spec defines ~40 events across the three modules). The events carry actor, timestamp, before/after state, and the command that triggered them. Persisting them is in scope; UI to query and display the audit log is post-V1 (Hardening pass).

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

**Q: Does this conform to IRDAI group insurance regulations?**
A: V1 is a product/engineering MVP — feature-complete for the core workflow, but regulatory conformance is a separate hardening track. Specifically what's NOT yet in V1:
- IRDAI master-policy schedule format / RI 1 / RI 2 returns
- Free-look period enforcement (15 days post-issue cancellation right)
- Claims TAT compliance (15 / 30 days)
- Section 10(10D) tax treatment certificate generation
- GST 18% on premium computation + invoicing
- IRDAI grievance-redressal SLAs
The data model captures everything you'd need to compute these; the regulatory output layer (returns, certificates, grievance UI) is post-V1.

**Q: How is proposer KYC handled? CIN, GSTIN, PAN verification?**
A: Out of V1. The Client master holds CIN-equivalent (`businessRegistrationNumber`), GSTIN, and tax reference number fields, but no validation against MCA / GST portal / Income Tax sources. KYC document upload + sanction-list screening (FATF/CFT/UN OFAC) lands with the Issuance hardening pass.

**Q: Anti-Money Laundering checks?**
A: Same answer as KYC — out of V1. Hooks exist on the Client domain to plug in PEP/sanction-list checks; integration is post-V1.

**Q: Licensing model — per-tenant, per-policy, per-seat?**
A: Commercial model isn't fixed yet — typically SaaS we'd price per-tenant + per-active-policy with seat tiers for Maker/Checker/Ops. Source-code escrow + data-export commitments are part of the contract conversation.

**Q: Vendor lock-in — how do we get our data out?**
A: All Group PAS data is exposed via the same REST APIs you see in the demo. A consumer can query and export any entity. Beyond that, the spec uses standard formats (Frictionless Table Schema for census, DMN for decision tables) so leaving wouldn't require translating proprietary structures. We can also offer scheduled bulk exports to S3/SFTP as part of the contract.

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

**Q: "How is this 'role-adaptive UI' different from any normal app showing/hiding buttons by role?"**
A: "Two things. First, in V1 alone — yes, it's button visibility from a role flag. Honest. Second, the lift comes from the schema-driven engine: the same JSON schemas that gate buttons also gate sections, mask PII fields, and adapt detail layouts per state. Adding a new role-aware flow doesn't mean writing a new screen — it's a schema change. That's the post-V1 payoff a typical RBAC frontend doesn't get."

**Q: "Show me a policy auto-activating from PENDING to ACTIVE."**
A: "Auto-activation isn't simulated in V1 — the fixture POL-2026-0001 is pre-seeded ACTIVE. In production, once enough PolicyMembers reach ADDED state, the PolicyActivationFlow workflow fires the activation. We can build the simulator quickly post-demo if you want to see it visually."

**Q: "Where are claims?"**
A: "Out of V1. Claims is a separate operational module — different actor (claims handler, not maker/checker), different lifecycle (intimation → assessment → settlement), different data model (claim event, beneficiary, settlement). The PAS data model exposes everything claims needs (member roster, policy metadata, premium status), but the claims UI is post-V1."

**Q: "What about the WITHDRAWN / EXPIRED quote screens — they look identical to other states."**
A: "True — terminal-state screens are deliberately minimal in V1 (D11 in our deferred backlog). Each state has the right StateBadge and the action bar correctly shows no actions, but no special copy or layout per terminal state. Easy fast-follow."

**Q: "Why do I see Configured / Not configured chips for some fields?"**
A: "Those are intentional V1 placeholders for fields where the underlying data is opaque JSON — a DMN decision table, a Frictionless Table Schema for census, a classification result envelope. For the demo we just signal whether the field is set; full authoring/replace UIs land post-V1 (D1, D2, D3)."

---

## 9. Final pre-demo checklist

Five minutes before going live:

1. ✅ Reset the mock store (per §6.6): `curl -X POST http://localhost:3000/api/dev/reset`.
2. ✅ Open three tabs: `/test-dashboard`, `/quotation/QTE-2026-0001`, `/policy-admin/policies/POL-2026-0002`.
3. ✅ Confirm the role switcher in the top-right shows **Maker — Sales**.
4. ✅ Have this document open in another window — bookmark §8 (Q&A) for fast lookup. The two questions you're most likely to be tested on: §8.4 "How is role-adaptive UI different from any RBAC?" and §8.3 "Does this conform to IRDAI?"
5. ✅ Have the Design Principles deck open as backup if you need to defend a UX choice.
6. ✅ If asked about backend enforcement of maker-checker, the honest answer is in §4.2 — don't bluff this one.

**If the dev server crashes mid-demo:** restart it (`npm run dev`), wait 10 seconds for it to boot, refresh the browser. The mock store will reset automatically (it's in-memory only).

**If a state transition seems stuck:** the simulator is on a 4-second delay. Wait 5 seconds and the page will pick it up via polling. If still stuck, refresh.

Good luck.
