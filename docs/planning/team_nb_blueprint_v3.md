# New Business — Technical Blueprint v5 (Team)

> Date: 30 April 2026
> Scope: Group PAS (GTL/GCL) New Business — MVP
> Architecture: Modular monolith. KSL `.api` contracts generate both REST controllers (HTTP) and in-process port interfaces (typed Java) — same contract, two adapters. Cross-module calls go via the port today; remote-ready via port-impl swap when a module is extracted. Outbox → Kafka for domain events + UW/Ops async commands. Temporal for workflows.
>
> **Changes from v4:**
> - **PAM owns activation.** PIM's W2 simplifies to a short-lived 2-step (`CreateProposal` → `CreateMasterPolicy` → done). PAM's `PolicyActivationFlow` watches member-pending signals, evaluates threshold, fires `ActivatePolicyCommand` on its own. PIM no longer has `AWAITING_MEMBERS` / `ISSUING` states or a long-lived coordinator.
> - **Per-member enrollment workflow on PAM.** PAM's `AddMember` handler is thin (persist Member as PENDING + start workflow); `MemberEnrollmentFlow` drives float reserve, optional approval gates (UW/RI/CXO), policy-active wait, activation, and cancellation compensation. Bounded per lifecycle phase — endorsement / renewal / claim get separate workflows when those land.
> - **No signal race in W3.** ProposalMember terminates at `APPROVED` → calls PAM `AddMember` and that's it. The signal race (`MemberAddedViaFirstBatch` vs `PolicyActivated`) is gone. The "first-batch" concept is gone — there is no first-batch path.
> - **Quote state machine expanded** (per Quotation owner): `DRAFT → SUBMITTED → SENT_TO_CLIENT → ACCEPTED → FINALIZED` plus `REJECTED` / `WITHDRAWN` / `EXPIRED` terminals.
> - **PAM Policy/Member states.** Policy: `CREATED → PENDING → ACTIVE` / `CANCELLED`. Member: `PENDING → ACTIVE` / `CANCELLED`. Activation cascades via `PolicyActivated` signal to per-member workflows; no same-transaction bulk cascade.
> - **Multi-dimensional grids stored as DMN / CSV in object store.** Rate cards, FCL bands, class-to-plan rules, SI formulas live as files; spec carries opaque string refs only. Avoids upfront over-design — the Rule Engine and Product Configurator harden the format later.
> - **Number Generation as external service.** `NumberGeneratorClient.generate(entityType, schemaCode, contextJson)` issues `policyNumber`, `memberNumber`, etc. Schema-configurable per entity type.
> - **PII handled at repo layer + Cerbos.** PII fields (mobile, email, government ID type/number) are declared on entities and DTOs normally; encryption at rest + access control are cross-cutting concerns enforced by the repository layer and Cerbos policies. Not an API or controller-layer concern.
> - **Generic `transactionRefs: list<string>`** replaces UTRN-specific naming. UTRN is one example; journal IDs / partner refs / etc. are others. Float Management still tracks pools internally — PAM forwards refs unchanged.
> - **Structured types in API + domain, flat in postgres.** AddMember and Policy contracts use `MemberPremium`, `MemberUwDecision`, `Money` end-to-end. Postgres flattens to columns; repo layer maps. Mirrors PIM's existing convention.
>
> Changes from v3 (still applicable): Float moved from PIM to PAM. Float API is reserve/release. Outbox → Kafka for all module events. UW/Ops via Kafka.
> Changes from v2 (still applicable): UW Workbench and Ops Workbench are Kafka-based.

---

## Table of Contents

1. [Module & Aggregate Model](#1-module--aggregate-model)
2. [External Components (Mocked for MVP)](#2-external-components-mocked-for-mvp)
3. [Quotation Module — Quote](#3-quotation-module)
4. [Policy Issuance Module — Proposal & ProposalMember](#4-policy-issuance-module)
5. [Policy Administration Module — Client, Policy, Member](#5-policy-administration-module)
6. [Workflows](#6-workflows)
7. [End-to-End Flow](#7-end-to-end-flow)
8. [API Contracts (Inter-Module)](#8-api-contracts-inter-module)
9. [Gap Analysis — High-Level Placeholders](#9-gap-analysis--high-level-placeholders)
10. [MVP Scope & Assumptions](#10-mvp-scope--assumptions)

---

## 1. Module & Aggregate Model

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────────┐
│ Quotation Module │────▶│ Policy Issuance      │────▶│ Policy Administration    │
│                  │PORT │ Module (PIM)         │PORT │ Module (PAM, SoR)        │
│                  │     │                      │     │                          │
│  Quote           │     │  Proposal            │     │  Client                  │
│  MemberQuote     │     │  ProposalMember      │     │  Policy                  │
│  (GCL only)      │     │                      │     │  Member                  │
└───┬──────┬───────┘     └────┬─────────────────┘     └────────┬─────────────────┘
    │      │                  │                                │
    │      └──────┐    ┌──────┘                                │ (sync, mocked)
    ▼             ▼    ▼                                       ▼
  ┌──────────┐ ┌──────────┐                              ┌──────────┐
  │ Product  │ │  Rule    │                              │  Float   │
  │ Config   │ │  Engine  │                              │  Mgmt    │
  └──────────┘ └──────────┘                              └──────────┘
                                                         ┌──────────┐
                                                         │ Number   │
                                                         │ Generator│
                                                         └──────────┘

       All modules emit domain events via outbox → Kafka:
       ┌─────────────────────────────────────────────────────────┐
       │  DB  │──▶│  OUTBOX TABLE  │──▶│  KAFKA  │──▶ consumers  │
       └─────────────────────────────────────────────────────────┘

  Kafka Consumers:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Accounting  │  │     CCM      │  │ UW Workbench │  │ Ops Workbench│
  │  (mocked)    │  │   (mocked)   │  │   (mocked)   │  │   (mocked)   │
  └──────────────┘  └──────────────┘  └───┬──────────┘  └──────┬───────┘
                                          │                    │
                            publishes back to Kafka:           │
                            MemberReviewCompleted     MemberRepairCompleted
                                          │                    │
                                          ▼                    ▼
                                    ┌─────────────────────────────┐
                                    │ Policy Issuance Module      │
                                    │ Kafka Processors             │
                                    └─────────────────────────────┘

       Workflow runtime (Temporal) durably holds:
       W1 QuoteFlow · W2 ProposalFlow · W3 MemberLifecycle · W4 MemberQuoteFlow
       MemberEnrollmentFlow (PAM, per member) · PolicyActivationFlow (PAM, per policy)
```

### Architectural Pattern — Modular Monolith with Dual Adapters

Each module's KSL `.api` contract generates two adapters:

| Adapter | Caller | Transport |
|---------|--------|-----------|
| **Spring REST controller** | External — frontend SPA, partner systems, admin tools | HTTP / JSON |
| **In-process Java port interface** | Internal — sibling modules within the monolith | Direct typed method call |

PIM → PAM today goes via the port (no loopback HTTP, no JSON serialization). When PAM eventually splits into its own service, PIM swaps the port impl for a generated REST client — contract unchanged. Frontend / partner integrations are unaffected by that future migration.

### Integration Pattern

| Integration | Pattern | Mechanism |
|-------------|---------|-----------|
| Quotation → Policy Issuance | **Port (in-process)** | KSL-generated port from Quotation `.api` contract |
| Policy Issuance → Policy Administration | **Port (in-process)** | KSL-generated port from PAM `.api` contract |
| Quotation → Product Configurator | **Sync REST** | W1: list products, benefits, validate combination |
| Quotation / Policy Issuance → Rule Engine | **Sync REST** | classify-member, calculate-premium |
| Policy Administration → Float Management | **Sync REST** | AddMember workflow: reserve per-member premium against transactionRefs |
| Policy Administration → Number Generator | **Sync REST** | CreatePolicy / AddMember handlers: `generate(entityType, schemaCode, ctx)` |
| Policy Issuance → UW Workbench | **Outbox → Kafka** (command outbound) + **Kafka → Processor** (event inbound) | `MemberReviewRequested` → `policy-issuance.uw-commands`; `MemberReviewCompleted` ← `uw-workbench.events` |
| Policy Issuance → Ops Workbench | **Outbox → Kafka** (command outbound) + **Kafka → Processor** (event inbound) | `MemberRepairRequested` → `policy-issuance.ops-commands`; `MemberRepairCompleted` ← `ops-workbench.events` |
| All modules → Accounting / CCM | **Outbox → Kafka** | Domain events relayed via outbox table |

### Aggregates

| Module | Aggregate | Level | ID | Purpose |
|--------|-----------|-------|----|---------|
| **Quotation** | `Quote` | Deal | `quoteId` | Plans, aggregate census, estimated premium, header config |
| **Quotation** | `MemberQuote` | Per-member | `memberQuoteId` | GCL: member-level quote, premium calc per loan stage |
| **Policy Issuance** | `Proposal` | Deal | `proposalId` | Master policy creation orchestration (short-lived) |
| **Policy Issuance** | `ProposalMember` | Per-member | `(proposalId, memberId)` | Member lifecycle: MAF, classification, repair/review, approval |
| **Policy Administration** | `Client` | Per-client | `clientId` | Client master data |
| **Policy Administration** | `Policy` | Deal | `policyId` (UUID) + `policyNumber` (`@unique`) | Master policy + plans, state machine, activation threshold |
| **Policy Administration** | `Member` | Per-member | `memberId` (UUID) + `memberNumber` (`@unique`) | Enrolled member, coverage, PII, transaction refs |

### Symmetric Pattern

```
          Quotation          Policy Issuance        Policy Administration
Deal:     Quote          →   Proposal           →   Policy
Member:   MemberQuote    →   ProposalMember     →   Member
```

### Handoff Contracts (Port / REST)

| From → To | Trigger | Data |
|-----------|---------|------|
| Quote → Proposal | `FinalizeQuote` (W1) | quoteId, clientId, policyType, header (effectiveDate, expiryDate, premiumType, lineOfBusiness, riskTermClassification, inceptionDate, ageDefinitionRule), plans (copy), aggregateCensus (copy), estimated premium |
| Proposal → Policy | `CreateMasterPolicy` (W2) | proposalId, clientId, policyType, full header, plans, `activationThreshold` (GTL: positive int, GCL: 0), estimated premium |
| ProposalMember → Member | PIM W3 step `addMemberToPolicy` after ProposalMember reaches APPROVED | proposalMemberId, identity (name, dob, gender, salary, occupation), PII (mobile, email, govId type/number), planNo, sumInsured, structured `premium: MemberPremium`, `uwDecision?: MemberUwDecision`, `transactionRefs: list<string>`, `additionalAttributesJson?` (product-specific extensions) |

Member is always created PENDING by PAM regardless of Policy state. Activation is workflow-driven (not handler-driven) — see §6.6 / §6.7.

---

## 2. External Components (Mocked for MVP)

All external components are called via sync REST. Each has a mock implementation.

### 2.1 Rule Engine

| API | Input | Output | Mock Behavior |
|-----|-------|--------|--------------|
| `POST /api/rules/classify-member` | Member data + plan context (plan, rate card ref, benefits, FCL bands ref) | `{ lane: STP\|REPAIR\|REVIEW\|REJECT, errors[] }` | SI ≤ FCL → STP. SI > FCL → REVIEW. Missing DOB/salary → REPAIR. |
| `POST /api/rules/calculate-premium` | Member data + plan context | `{ annualPremium, breakup[] }` | `SI × rate ÷ 1000` using flat rate from plan config. |

> **Note:** Rule Engine is called only during member issuance (W3) and GCL member quoting (W4) — NOT during deal-level quotation (W1). The estimated premium in W1 is a manual entry by Sales based on the configured rate card. Full plan context is sent with each call. Rule Engine is stateless.

### 2.2 Product Configurator

| API | Input | Output | Mock Behavior |
|-----|-------|--------|--------------|
| `GET /api/products` | policyType filter | `products[]` | Static: GTL-BASE, GTL-RIDER-CI, GTL-RIDER-TPD |
| `GET /api/products/{code}/benefits` | productCode | `benefits[]` | Static: DEATH, CI, TPD |
| `POST /api/products/validate-combination` | `{ products[], excludedBenefits[] }` | `{ valid: bool, errors[] }` | Validates rider compatibility (e.g., CI rider requires BASE; TPD cannot combine with CI). |

### 2.3 Float Management

> **Caller: Policy Administration Module (PAM).** Called from `MemberEnrollmentFlow.ReserveFloat` workflow item (not directly from the AddMember handler). Float Management is a separate module from Accounting — Float is operational/transactional (sync, strong consistency), Accounting is recording/ledgering (async, eventually consistent).

| API | Input | Output | Mock Behavior |
|-----|-------|--------|--------------|
| `POST /api/float/reserve` | policyId, memberId, **transactionRefs[]**, amount | `{ reservationId, status: "RESERVED" }` or `{ status: "INSUFFICIENT", shortfall }` | Always returns RESERVED with mock reservationId. |
| `POST /api/float/release` | reservationId | `{ status: "RELEASED" }` | Always succeeds. Idempotent. |

**`transactionRefs` — generic, not UTRN-specific.** Refs are opaque strings carried with each member from the upstream record (census row, partner payload, GCL loan record). Different upstream systems populate them with different ref kinds:

| Source | Example refs |
|--------|--------------|
| Bank-funded census (corporate GTL) | UTRN-A, UTRN-B (UTRN segregated pools) |
| Accounting journal | JOURNAL-2026-04-30-00123 |
| Partner integration (lending platform / GCL) | PARTNER-LOAN-987654 |

PAM forwards refs unchanged to Float Management. Float Management resolves internally which pool / journal / partner balance to deduct from.

**Reservation pattern:**
- `reserve` blocks the money against the specified refs. Returns `reservationId` (persisted on Member).
- If flow succeeds (Member activates) → reservation stays. Eventually settled by Accounting.
- If flow fails or member cancels → workflow's `ReleaseFloat` calls `release(reservationId)`. Idempotent.
- If `reserve` returns `INSUFFICIENT` → workflow parks at `WaitForFloatTopUp`. `FloatTopUpReceived` signal triggers retry.

> **For MVP:** Mock always returns RESERVED. Toggle to return `INSUFFICIENT` to exercise top-up wait + retry path.

### 2.4 UW Workbench

| Interaction | Mechanism |
|-------------|-----------|
| Policy Issuance → UW | **Outbox → Kafka command.** `MemberReviewRequested` → `policy-issuance.uw-commands`. Payload: `{ proposalMemberId, memberData, planContext, uwQuestionSetCode }` |
| UW → Policy Issuance | **Kafka event → Processor.** `MemberReviewCompleted` on `uw-workbench.events` → PIM processor. Payload: `{ proposalMemberId, decision: APPROVED\|REJECTED, exclusions[], notes }` |

> For MVP: Mock UW consumer auto-publishes `MemberReviewCompleted`. Manual testing via Kafka test harness.

### 2.5 Ops Workbench

| Interaction | Mechanism |
|-------------|-----------|
| Policy Issuance → Ops | **Outbox → Kafka command.** `MemberRepairRequested` → `policy-issuance.ops-commands`. Payload: `{ proposalMemberId, memberData, errors[] }` |
| Ops → Policy Issuance | **Kafka event → Processor.** `MemberRepairCompleted` on `ops-workbench.events` → PIM processor. Payload: `{ proposalMemberId, corrections: { field: value } }` |

> For MVP: Mock Ops consumer auto-publishes `MemberRepairCompleted`. Manual testing via Kafka test harness.

### 2.6 Number Generator

> **Caller: Policy Administration Module (PAM).** Issues formatted business identifiers (`policyNumber`, `memberNumber`, future entity numbers). Schema configurable per entity type — different products / clients can have different formats without code changes.

| API | Input | Output | Mock Behavior |
|-----|-------|--------|--------------|
| `POST /api/number-gen/generate` | `{ entityType: "POLICY"\|"MEMBER"\|..., schemaCode, contextJson }` | `{ number: "POL-2026-04-00123" }` | Returns `{entityType[:3]}-{ULID}`. Example: `POL-01HV...`, `MEM-01HV...`. |

`schemaCode` lets ops configure formats per (policyType, client, region). `contextJson` carries inputs the schema may need (e.g., `policyNumber` to derive a member number prefixed by the policy).

**Used by:**
- `CreatePolicyCommand` handler — calls `generate("POLICY", schemaCode, ctx)` to obtain `policyNumber`. Passes it to `PolicyFactory.create(policyNumber, ...)`. Factory emits `PolicyCreated`.
- `AddMemberCommand` handler — calls `generate("MEMBER", schemaCode, ctx)` to obtain `memberNumber`. Passes to `MemberFactory.enroll(memberNumber, policyId, enrollmentData)`. Factory emits `MemberEnrolled`.

> **For MVP:** Mock returns ULID-based numbers. Real Number Generator service to be built later when number-format requirements solidify (statutory codes, regional prefixes, etc.).

### 2.7 PII / Cerbos

PII fields on entities and DTOs (mobile, email, governmentIdType, governmentIdNumber, dob, salary, etc.) are declared normally — the spec doesn't differentiate them at the API or controller layer.

**Cross-cutting enforcement:**
- **Encryption at rest** — repository layer transparently encrypts/decrypts PII columns (KMS-backed key per tenant / region / policy as ops configures).
- **Access control** — Cerbos policies decide which fields a principal (operator / customer service / claims / external partner) can see. The same `MemberDto` returns full data for a CRA agent, masked for ops, and partial for a partner.
- **Search filters** — same endpoint serves all roles. Cerbos resolves what each principal can filter on. Co-required pairs (e.g., `governmentIdType + governmentIdNumber`) are validated by handler with explicit error codes.

**Why not at API / controller level:** centralised encryption + access control is hard to retrofit if scattered across endpoints. Handling it once at the repo + Cerbos layer keeps the spec clean and uniform across modules. Adding a new PII-bearing endpoint requires no new policy code beyond the Cerbos rule.

### 2.8 DMN / CSV Configuration in Object Store

Multi-dimensional grids — rate cards, FCL bands, class-to-plan rules, SI formulas — are NOT modeled in the spec as structured types. They live as DMN tables (or CSV files) in an object store. The spec carries opaque string refs:

| Domain field | Spec type | Storage |
|--------------|-----------|---------|
| `Plan.rateCardFile` | `string` | DMN / CSV in object store |
| `AmountFormula.lookupTableJson` | `string` | DMN / CSV in object store |
| `AmountFormula.dmnTableFile` | `string` | DMN / CSV in object store |
| `Quote.memberToPlanMapping` | `string` | DMN decision table (single rule, per quote) |

**Why:** Avoids upfront over-design. The Rule Engine and Product Configurator harden the format and validation later. Today the codegen treats them as opaque references; the runtime fetches the file when Rule Engine needs it.

DMN is intentionally used as a domain term — insurance subject-matter experts use DMN as standard vocabulary for decision tables. The spec keeps `DMN_TABLE` enum values and `dmnTable*` field names rather than renaming to "decision table" or similar.

---

## 3. Quotation Module

### 3.1 Quote Aggregate

#### States

```
DRAFT → SUBMITTED → SENT_TO_CLIENT → ACCEPTED → FINALIZED   (terminal — triggers W2)
                                              ↘
                                                REJECTED    (terminal — client rejected)
{DRAFT, SUBMITTED, SENT_TO_CLIENT}            → WITHDRAWN   (terminal — internal cancel)
{SUBMITTED, SENT_TO_CLIENT}                   → EXPIRED     (terminal — TTL elapsed)
```

| State | Meaning | Who Acts Next |
|-------|---------|---------------|
| `DRAFT` | Being built — header set, plans configured, rate card / DMN refs set, census set, premium estimated. Iterative. | Sales |
| `SUBMITTED` | Internal sign-off complete; ready to send to client. | Sales Ops |
| `SENT_TO_CLIENT` | Sent to client. Waiting for client decision. | Client |
| `ACCEPTED` | Client accepted; ready to finalize and trigger W2. | System |
| `FINALIZED` | W2 triggered. Terminal. | System |
| `REJECTED` | Client rejected. Terminal. | — |
| `WITHDRAWN` | Internally withdrawn before client decision. Terminal. | — |
| `EXPIRED` | TTL elapsed. Terminal. | — |

#### Commands (per Quotation owner's spec)

| Command | Precondition | State Transition | Notes |
|---------|--------------|------------------|-------|
| `CreateQuote` | — | → DRAFT | Emits `QuoteCreated`. |
| `UpdatePolicyDetail` | DRAFT | DRAFT → DRAFT | Header fields: `premiumType`, `effectiveDate`, `expiryDate`, `lineOfBusiness`, `riskTermClassification`, `inceptionDate`, `ageDefinitionRule`. Emits `QuoteUpdated` (intermediate edit). |
| `AddPlan` / `UpdatePlan` / `RemovePlan` | DRAFT | DRAFT → DRAFT | Plan composition. Emits `QuoteUpdated`. |
| `UpdateRateCard` | DRAFT | DRAFT → DRAFT | Per-plan `rateCard: string` (DMN table ref). Emits `QuoteUpdated`. |
| `UpdateMemberToPlanMapping` | DRAFT | DRAFT → DRAFT | Quote-level `memberToPlanMapping: string` (DMN table ref). Emits `QuoteUpdated`. |
| `UpdateAggregateCensus` | DRAFT | DRAFT → DRAFT | Headcount, plan breakdown. Emits `QuoteUpdated`. |
| `RequestPrice` | DRAFT, hasPolicyDetail, hasPlans, hasCensusAggregate, hasRateCard, hasMemberToPlanMapping | DRAFT → DRAFT | Emits `QuotePriceRequested`. Workflow calculates and calls `UpdatePremium`. |
| `UpdatePremium` | DRAFT | DRAFT → DRAFT | Rule Engine result loaded. Emits `QuoteUpdated`. |
| `Submit` | DRAFT, all hasX preconditions | DRAFT → SUBMITTED | Emits `QuoteSubmitted`. |
| `SendToClient` | SUBMITTED | SUBMITTED → SENT_TO_CLIENT | Emits `QuoteSentToClient`. |
| `Accept` | SENT_TO_CLIENT | SENT_TO_CLIENT → ACCEPTED | Emits `QuoteAccepted`. |
| `Reject` | SENT_TO_CLIENT | SENT_TO_CLIENT → REJECTED | Emits `QuoteRejected`. |
| `Withdraw` | DRAFT \| SUBMITTED \| SENT_TO_CLIENT | → WITHDRAWN | Emits `QuoteWithdrawn`. |
| `Expire` | SUBMITTED \| SENT_TO_CLIENT | → EXPIRED | Emits `QuoteExpired`. |
| `Finalize` | ACCEPTED | ACCEPTED → FINALIZED | Emits `QuoteFinalized`. Triggers W2 via port. |

> **Single `QuoteUpdated` envelope** for intermediate config commands: `{ quoteId, clientId, updatedAt, updateType }`. Per-step events would create noise; the `QuoteUpdated` envelope is enough for outbox audit + downstream observability.

### 3.2 MemberQuote Aggregate (GCL Only — W4)

> **GCL master-policy-first design.** GCL has a long-running master policy that's already ACTIVE (created from the original deal-level Quote). Member quotes attach to it via `policyId`. Each W4 call against `MemberQuote` is per-loan-disbursement-event, not per-loan-lifecycle-stage. Premium is calculated and locked on submit; the partner's loan-stage iterations happen client-side.

#### States

```
DRAFT → SUBMITTED → FINALIZED   (terminal — triggers W3)
```

| State | Meaning | Who Acts Next |
|-------|---------|---------------|
| `DRAFT` | Member quote being built. Sum assured set, premium calculated. | Partner system |
| `SUBMITTED` | Premium locked. Member quote submitted; ready to finalize. | System |
| `FINALIZED` | W3 triggered (creates ProposalMember). Terminal. | System |

#### Commands (per Quotation owner's spec)

| Command | Precondition | State Transition | Notes |
|---------|--------------|------------------|-------|
| `CreateMemberQuote` | Master Quote ACTIVE / FINALIZED, policyType = GCL | → DRAFT | Carries `policyId` + `sumAssured`. Emits `MemberQuoteCreated`. |
| `SetPlan` | DRAFT | DRAFT → DRAFT | Resolves plan from parent Policy via class-to-plan mapping. Emits `MemberQuotePlanSet`. |
| `UpdatePremium` | DRAFT, plan set | DRAFT → DRAFT | Rule Engine: calculate-premium with current SA. Emits `MemberQuotePremiumUpdated`. |
| `Submit` | DRAFT, premium calculated | DRAFT → SUBMITTED | Emits `MemberQuoteSubmitted`. |
| `Finalize` | SUBMITTED | SUBMITTED → FINALIZED | Emits `MemberQuoteFinalized`. Triggers W3 via port. |

---

## 4. Policy Issuance Module

### 4.1 Proposal Aggregate

> **W2 simplified.** Proposal is no longer a long-lived coordinator. PAM owns activation threshold; PIM just creates the master policy and exits. No `AWAITING_MEMBERS`, no `ISSUING`, no member counting on PIM side.

#### States

```
CREATED → POLICY_CREATED   (terminal — W2 done)
        → CANCELLED        (terminal)
```

| State | Meaning | Who Acts Next |
|-------|---------|---------------|
| `CREATED` | Proposal created from finalized quote. | System (W2 step 2) |
| `POLICY_CREATED` | Master policy exists in PAM (state PENDING or ACTIVE — workflow-driven). W2 done. Terminal. | Per-member flows (W3) |
| `CANCELLED` | Cancelled before policy creation. Terminal. | — |

#### Commands

| Command | Precondition | State Transition | Calls |
|---------|--------------|------------------|-------|
| `CreateProposal` | QuoteFinalized port call from Quotation | → CREATED | Emits `ProposalCreated` → Kafka. |
| `CreateMasterPolicy` | CREATED | CREATED → POLICY_CREATED | PAM port call: `CreatePolicyCommand`. PAM returns `policyId, policyNumber`. Emits `PolicyCreated` (PIM-side fact: "we asked PAM to create the master policy") → Kafka. |
| `CancelProposal` | CREATED | → CANCELLED | Emits `ProposalCancelled`. |

### 4.2 ProposalMember Aggregate

#### States

```
CREATED → MAF_PENDING → MAF_CONFIRMED ─┐
                                        │
CREATED ────────────────────────────────┼──▶ CLASSIFYING → APPROVED → ADDED (terminal)
                                        │                → REPAIR_PENDING → CLASSIFYING
                                        │                → REVIEW_PENDING → CLASSIFYING
                                        │                                 → REJECTED (terminal)
                                        │                → REJECTED (terminal)
```

> **W3 is straight-line now.** Once ProposalMember reaches APPROVED, it calls PAM `AddMember` and transitions to ADDED. There is no signal-race gate, no "first-batch vs subsequent" branch. PAM creates the Member in PENDING and runs `MemberEnrollmentFlow` to drive activation independently.

| State | Meaning | Who Acts Next |
|-------|---------|---------------|
| `CREATED` | Record created from census upload or single API. Carries `transactionRefs` from upstream. | System |
| `MAF_PENDING` | MAF sent, waiting for member confirmation (GCL flow). | Member |
| `MAF_CONFIRMED` | MAF received. | System |
| `CLASSIFYING` | Rule Engine classifying (or re-classifying after repair/review). Transient. | System (auto) |
| `APPROVED` | Passed classification. Premium calculated. Will transition to ADDED on next `addMemberToPolicy` step. | System (auto) |
| `REPAIR_PENDING` | Data issue. `MemberRepairRequested` published to Kafka. | Ops Workbench |
| `REVIEW_PENDING` | Needs UW review. `MemberReviewRequested` published to Kafka. | UW Workbench |
| `REJECTED` | Ineligible or UW declined. Terminal. | — |
| `ADDED` | PAM `AddMember` returned successfully. PIM emits `MemberAdded` → Kafka. Terminal. | — |

#### Commands

| Command | Precondition | State Transition | Calls |
|---------|--------------|------------------|-------|
| `CreateProposalMember` | Proposal exists (CREATED+), census parsed or single API | → CREATED | Carries `transactionRefs[]` from census. |
| `SendMAF` | CREATED, MAF applicable | CREATED → MAF_PENDING | Shuttle (mocked). |
| `ConfirmMAF` | MAF_PENDING | MAF_PENDING → MAF_CONFIRMED | — |
| `ClassifyMember` | CREATED (no MAF) or MAF_CONFIRMED or re-entry | → CLASSIFYING → auto-routes | Rule Engine: classify-member. |
| `MarkRepairPending` | CLASSIFYING, lane=REPAIR | CLASSIFYING → REPAIR_PENDING | Outbox → Kafka: `MemberRepairRequested`. |
| `CompleteMemberRepair` | REPAIR_PENDING | → CLASSIFYING | Re-classify with corrections. |
| `MarkReviewPending` | CLASSIFYING, lane=REVIEW | CLASSIFYING → REVIEW_PENDING | Outbox → Kafka: `MemberReviewRequested`. |
| `RecordReviewDecision` | REVIEW_PENDING | → CLASSIFYING (approved) or → REJECTED | Re-classify or reject. |
| `ApproveMember` | CLASSIFYING, lane=STP | CLASSIFYING → APPROVED | Rule Engine: calculate-premium. Emits `MemberApproved`. |
| `RejectMember` | CLASSIFYING, lane=REJECT | CLASSIFYING → REJECTED | Emits `MemberRejected`. |
| `AddMemberToPolicy` | APPROVED | APPROVED → ADDED | PAM port call: `AddMemberCommand`. Returns memberId + memberNumber. Emits `MemberAdded` (PIM-side fact). |

---

## 5. Policy Administration Module

### 5.1 Client Aggregate

```
ACTIVE (only state for MVP)
```

| Command | Notes |
|---------|-------|
| `CreateClient` | Deferred — A1: client always exists. Factory emits `ClientCreated`. |
| Various queries | Lookup by id, name. |

### 5.2 Policy Aggregate

#### States

```
CREATED → PENDING → ACTIVE
                  → CANCELLED (terminal)
```

| State | Meaning |
|-------|---------|
| `CREATED` | Just-created shell (transient — handler immediately persists as PENDING). |
| `PENDING` | Workflow-tracked. `pendingReason: PolicyPendingReason?` (`AWAITING_MIN_MEMBERS` / `AWAITING_COMPLIANCE`) explains why. Member-level blockers (float, approval) live on `Member.pendingReason` — never promoted onto Policy. Member enrolment continues during PENDING (members also created PENDING). |
| `ACTIVE` | Activated by `PolicyActivationFlow`. Per-member workflows waiting on `PolicyActivated` signal wake up and self-activate their Member. |
| `CANCELLED` | Terminal. |

#### Commands

| Command | Visibility | Precondition | Notes |
|---------|------------|--------------|-------|
| `CreatePolicyCommand` | Public (called by PIM via port) | — | Handler: NumberGen → `PolicyFactory.create(policyNumber, ...)` (factory emits `PolicyCreated`) → starts `PolicyActivationFlow`. |
| `ActivatePolicyCommand` | **Internal only** (workflow) | `Policy.isPending()` | Invoked by `PolicyActivationFlow` when threshold met (or immediately for threshold=0). `Policy.activate()` emits `PolicyActivated`. No public REST endpoint. |
| `CancelPolicyCommand` | Public | `Policy.isPendingOrActive()` | `Policy.cancel(reason)` emits `PolicyCancelled`. |

> **No `firstBatchMembers`.** `CreatePolicyRequest` does not carry members. Members come exclusively via `AddMember` calls (one per member, after each ProposalMember reaches APPROVED in PIM W3).

### 5.3 Member Aggregate

#### States

```
PENDING ──► ACTIVE ──► CANCELLED   (future post-activation MemberCancellationFlow)
   │           │
   │           └────► LAPSED       (future MemberLapseFlow on policy term-end)
   │
   └─► VOID                        (MemberEnrollmentFlow compensation: VoidMemberCommand)
```

**Terminal split is by lifecycle phase, not by trigger.** A policy cancellation hitting a PENDING member → VOID; hitting an ACTIVE member → CANCELLED. The trigger goes into the `voidReason` / `cancellationReason` field independent of which terminal lands.

| State | Meaning |
|-------|---------|
| `PENDING` | Workflow-tracked. `pendingReason: MemberPendingReason?` (`PENDING_FLOAT_RESERVATION` / `PENDING_APPROVAL` / `PENDING_POLICY_ACTIVATION`) explains which wait the workflow is parked at. Cleared on transition to ACTIVE. |
| `ACTIVE` | Workflow happy path completed (float reserved, approval received, policy active). Member has coverage. |
| `VOID` | Pre-activation terminal. Enrollment workflow died (float unavailable, approval rejected, policy cancelled mid-flow, proposer withdrew). `voidReason: MemberVoidReason?` captures cause. Member never had coverage → no earned premium. |
| `CANCELLED` | Post-activation terminal. Was ACTIVE, then cancelled (future flow). Premium accounting + float audit treat differently from VOID — coverage existed for some period. |

Member is **always created PENDING** by `AddMemberCommand` regardless of Policy state. `MemberEnrollmentFlow` drives the transition:
- **Early gate (`CheckPolicyState`):** if Policy is CANCELLED → straight to compensation (no float to release). PENDING|ACTIVE → proceed.
- `ReserveFloat` → (RESERVED|INSUFFICIENT loop with `WaitForFloatTopUp`).
- `RequestApproval` → `WaitForApproval` (single signal from central Approval module — module owns UW/RI/CXO chaining internally).
- **Late gate (`EvaluatePolicyState`, fresh DB read):** ACTIVE → `ActivateMemberCommand`; PENDING → park at `WaitForPolicyActivation`; CANCELLED → compensation.
- On `MemberVoidRequested` signal at any wait → `ReleaseFloat` → `VoidMemberCommand` → VOID.

**Race:** `Member.activate()` and `Member.voidEnrollment()` both require `isPending` — DB commit order picks the winner cleanly; loser fails its precondition.

#### Commands

| Command | Visibility | Precondition | Notes |
|---------|------------|--------------|-------|
| `AddMemberCommand` | Public (called by PIM via port) | Policy is PENDING or ACTIVE | Handler: NumberGen → `MemberFactory.enroll(memberNumber, policyId, enrollmentData)` (factory emits `MemberEnrolled`) → starts `MemberEnrollmentFlow`. Returns synchronously with `memberId + memberNumber`. State always PENDING at sync response. |
| `ActivateMemberCommand` | **Internal only** (workflow) | `Member.isPending()` | Invoked by `MemberEnrollmentFlow.ActivateMember`. `Member.activate()` emits `MemberActivated`. Clears `pendingReason`. |
| `ReserveFloatCommand` | **Workflow activity** | — | Calls `FloatManagementClient.reserve(...)`. On RESERVED: persists `floatReservationId`, clears `pendingReason`. On INSUFFICIENT: sets `pendingReason = PENDING_FLOAT_RESERVATION`. Returns `FloatReservationResult`. |
| `ReleaseFloatCommand` | **Workflow activity** | — | Calls `FloatManagementClient.release(reservationId)`. Idempotent — no-op if not reserved or already released. |
| `RequestApprovalCommand` | **Workflow activity** | — | Emits `MemberApprovalRequested` event with member context (SI, plan, productCode, riskClass) to outbox → central Approval module. Sets `pendingReason = PENDING_APPROVAL`. Workflow then parks at `WaitForApproval`. |
| `VoidMemberCommand` | **Workflow activity** | `Member.isPending()` | `Member.voidEnrollment(reason)` emits `MemberVoided`. Sets `voidReason`. Implicitly decrements `PolicyActivationFlow` threshold counter (next `ThresholdEvaluation` re-runs SELECT COUNT). |
| `CancelMemberCommand` | **Internal only** (future post-activation flow) | `Member.isActive()` | Placeholder. `Member.cancel(reason)` emits `MemberCancelled`. Will be invoked by future `MemberCancellationFlow`. |

#### Member Entity Fields (full inventory)

- **System**: `id` (UUID), `memberNumber` (`@unique`, NumberGen)
- **References**: `policyId`, `proposalMemberId`, `planNo`
- **State**: `state ∈ {PENDING, ACTIVE, VOID, CANCELLED}`
- **Reason fields**: `pendingReason?: MemberPendingReason` (set on park, cleared on ACTIVE), `voidReason?: MemberVoidReason` (set on PENDING→VOID), `cancellationReason?: string` (set on ACTIVE→CANCELLED, future flow)
- **Identity**: `name`, `dob`, `gender`, `salary`, `occupation?`
- **PII** (post-MVP encryption + Cerbos): `mobile?`, `email?`, `governmentIdType?`, `governmentIdNumber?`
- **Coverage**: `sumInsured`, `premium: MemberPremium` (structured: `{ annualPremium: Money, breakup: list<PremiumBreakupItem> }`), `uwDecision?: MemberUwDecision` (structured: `{ exclusions: list<UwExclusion>, notes? }`)
- **Float**: `transactionRefs: list<string>`, `floatReservationId?: string` (set by workflow's ReserveFloat — null between enrolment and reserve completion; null permanently if compensation runs first)
- **Metadata**: `additionalAttributesJson?: string` (GCL: `loanNumber/loanStatus/loanType/loanAmount`; GTL: `employeeId/grade/payrollId/costCenter`; partner refs)

Postgres storage flattens structured types: `annualPremiumAmount/Currency + premiumBreakupJson`, `uwDecisionJson`, `transactionRefsJson`. Repo layer maps.

#### Enums

```
MemberPendingReason: PENDING_FLOAT_RESERVATION | PENDING_APPROVAL | PENDING_POLICY_ACTIVATION
MemberVoidReason:    FLOAT_UNAVAILABLE | APPROVAL_REJECTED | POLICY_CANCELLED | WITHDRAWN_BY_PROPOSER
```

`pendingReason` powers Ops dashboard via `GetPolicyPendingBreakdownQuery` (single call returns counts grouped by reason — see §8). `voidReason` is similarly grouped for "why are members not activating" reporting.

---

## 6. Workflows

### 6.1 Workflow Inventory

| Workflow | Module | Level | Aggregate | Trigger | Bounded by |
|----------|--------|-------|-----------|---------|------------|
| **W1: QuoteFlow** | Quotation | Deal | Quote | Manual (Sales) | DRAFT → terminal |
| **W2: ProposalFlow** | Policy Issuance | Deal | Proposal | `QuoteFinalized` port call | CREATED → POLICY_CREATED (short-lived: 2 steps) |
| **W3: MemberLifecycleFlow** | Policy Issuance | Per-member (×N) | ProposalMember | Census upload / single API / W4 finalize | CREATED → ADDED \| REJECTED |
| **W4: MemberQuoteFlow** | Quotation | Per-member | MemberQuote | GCL only: partner port call | DRAFT → FINALIZED |
| **MemberEnrollmentFlow** | Policy Administration | Per-member (×N) | Member | PAM `AddMember` handler kicks off | Member created PENDING → ACTIVE \| VOID |
| **PolicyActivationFlow** | Policy Administration | Per policy | Policy | PAM `CreatePolicy` handler kicks off | Policy PENDING → ACTIVE (terminates after first activation) |

> **Bounded per lifecycle phase, not entity-lifetime.** Endorsement / renewal / claim get their own bounded workflows (`MemberEndorsementFlow`, `MemberRenewalFlow`, `MemberClaimFlow`) when those features land — not re-entry of `MemberEnrollmentFlow`. Cleaner replay / archival / mutex via `WorkflowIDReusePolicy`.

### 6.2 W1: QuoteFlow

**Module:** Quotation · **Aggregate:** Quote · **Trigger:** Sales creates quote

```
START → CreateQuote → DRAFT
  │
  ├─ UpdatePolicyDetail (header)
  ├─ AddPlan / UpdatePlan / RemovePlan (loop, with Product Configurator)
  ├─ UpdateRateCard (per plan, DMN ref)
  ├─ UpdateMemberToPlanMapping (DMN ref)
  ├─ UpdateAggregateCensus
  ├─ RequestPrice → Rule Engine → UpdatePremium
  │  (iterate until satisfied)
  │
  ▼
  Submit → SUBMITTED
  ▼
  SendToClient → SENT_TO_CLIENT
  ▼
  Client decision:
  ├─ Accept → ACCEPTED → Finalize → FINALIZED → triggers W2 → DONE ✓
  ├─ Reject → REJECTED → DONE ✗
  └─ (timeout) → Expire → EXPIRED
  
  Internally interruptible at any non-terminal: Withdraw → WITHDRAWN
```

**Assumptions:**
- Client always exists (A1).
- No maker-checker / internal approval gate (A2).

### 6.3 W2: ProposalFlow

**Module:** Policy Issuance · **Aggregate:** Proposal · **Trigger:** `QuoteFinalized` port call

> **Short-lived: 2 steps.** PIM creates the Proposal record and immediately calls PAM to create the master policy. Done. Member-level activation gating is PAM's job (`PolicyActivationFlow`).

```
START (QuoteFinalized port call)
  │
  CreateProposal
  │  Copies header + plans + census aggregate + estimated premium from Quote
  │  Emits ProposalCreated → Kafka
  │
  ▼
  CreateMasterPolicy → PAM port call (CreatePolicyCommand)
  │  PAM:
  │    NumberGen("POLICY") → policyNumber
  │    PolicyFactory.create(policyNumber, ...) → emits PolicyCreated (PAM event)
  │    Starts PolicyActivationFlow (PAM workflow)
  │  PAM returns: { policyId, policyNumber }
  │
  ▼
  Proposal → POLICY_CREATED (terminal)
  Emits PolicyCreated (PIM event — distinct from PAM's same-named event,
  represents PIM-side fact: "we asked PAM to create the master policy")
  DONE ✓
```

**Both GTL (threshold > 0) and GCL (threshold = 0) hit the same W2.** The threshold is passed in `CreatePolicyRequest`. PAM's `PolicyActivationFlow` interprets it: GCL self-fires `ActivatePolicyCommand` immediately at workflow start; GTL waits for the Nth `MemberPendingForActivation` signal.

### 6.4 W3: MemberLifecycleFlow

**Module:** Policy Issuance · **Aggregate:** ProposalMember · **Trigger:** Census upload / single API / W4 finalize

```
START (member record created — carries transactionRefs from upstream)
  │
  ├─ MAF applicable?
  │   YES → SendMAF → MAF_PENDING → ConfirmMAF → MAF_CONFIRMED
  │   NO ──────────────────────────────────────┐
  │                                            │
  ▼                                            │
  ClassifyMember → Rule Engine: classify-member
  │
  ├─ STP    → ApproveMember → APPROVED ──┐
  ├─ REPAIR → MarkRepairPending          │
  │            (Kafka: MemberRepairRequested)
  │            Wait MemberRepairCompleted
  │            CompleteMemberRepair → re-ClassifyMember
  ├─ REVIEW → MarkReviewPending          │
  │            (Kafka: MemberReviewRequested)
  │            Wait MemberReviewCompleted
  │            RecordReviewDecision
  │              ├─ APPROVED → re-ClassifyMember
  │              └─ REJECTED → REJECTED → DONE ✗
  └─ REJECT → RejectMember → REJECTED → DONE ✗
                                          │
  ◄───────────────────────────────────────┘
  │
  ▼
  AddMemberToPolicy → PAM port call (AddMemberCommand)
  │  Passes: identity, PII, planNo, sumInsured, structured premium + uwDecision,
  │           transactionRefs, additionalAttributesJson
  │  PAM:
  │    NumberGen("MEMBER") → memberNumber
  │    MemberFactory.enroll(memberNumber, policyId, enrollmentData)
  │      → emits MemberEnrolled (PAM event, factory-emitted at enrolment time —
  │        floatReservationId is null at this point; populated later by workflow)
  │    Starts MemberEnrollmentFlow (PAM workflow)
  │  PAM returns: { memberId, memberNumber }  (state = PENDING)
  │
  ▼
  ProposalMember → ADDED (terminal)
  Emits MemberAdded (PIM event — PIM-side fact: "we successfully called PAM")
  DONE ✓
```

**Re-classification (replay):** After Repair-Completed or UW-Approved, member re-enters `ClassifyMember` with corrected data / approval. Member may change lanes (Repair → STP, Review → STP, etc.).

> **No signal race, no `MemberAddedViaFirstBatch`, no waiting for `PolicyActivated` here.** PIM W3 returns from PAM `AddMember` synchronously with `memberId + memberNumber` — Member is PENDING at that moment, but PAM's per-member workflow drives it to ACTIVE (or CANCELLED) independently. PIM's job is done.

### 6.5 W4: MemberQuoteFlow (GCL Only)

**Module:** Quotation · **Aggregate:** MemberQuote · **Trigger:** Partner port call

```
START → CreateMemberQuote (with policyId + sumAssured)
  │
  ▼ DRAFT
  SetPlan (resolve via class-to-plan mapping from parent Policy)
  │
  ▼
  UpdatePremium → Rule Engine: calculate-premium with current SA
  │
  ▼
  Submit → SUBMITTED
  │
  ▼
  Finalize → FINALIZED → triggers W3 (creates ProposalMember) → DONE ✓
```

> Partner's loan-stage iterations (loan quote → loan approval → disbursement) happen client-side — each disbursement event creates a new `MemberQuote`. No multi-call premium recalc on the same MemberQuote.

### 6.6 MemberEnrollmentFlow (PAM, per member)

**Module:** Policy Administration · **Aggregate:** Member · **Trigger:** PAM `AddMemberCommand` handler kicks off after `MemberFactory.enroll` returns
**Workflow ID:** `member-enrollment-{memberId}`

```
                              MAIN FLOW                                VOID (parallel)
                              ─────────                                ─────────────
START open [CheckPolicyState, AwaitCancellation]
            │                                                            │
            ▼                                                            ▼
       CheckPolicyState (gateway, fresh DB read)                   AwaitCancellation
       │ ACTIVE|PENDING → ReserveFloat                             wait(MemberVoidRequested)
       │ CANCELLED      → VoidMember (no float to release)               │
       ▼                                                                 ▼
       ReserveFloat                                                ReleaseFloat
       │ (FloatMgmt.reserve)                                       (idempotent)
       │                                                                 │
       │ status = RESERVED      → clear pendingReason → RequestApproval  │
       │ status = INSUFFICIENT  → set PENDING_FLOAT_RESERVATION          │
       │                          → WaitForFloatTopUp ─┐                 │
       │                                                │                 │
       │     ◄── reopen ReserveFloat after top-up ◄────┘                 │
       ▼                                                                 │
 RequestApproval (set PENDING_APPROVAL; emits MemberApprovalRequested)    │
       │                                                                 │
       ▼                                                                 │
 WaitForApproval (single signal from central Approval module)            │
       │ decision = APPROVED|CONDITIONAL → EvaluatePolicyState            │
       │ decision = REJECTED             → VoidMember                     │
       ▼                                                                 │
 EvaluatePolicyState (gateway, fresh DB read — Pattern B)                 │
       │ ACTIVE    → clear pendingReason → ActivateMember                 │
       │ PENDING   → set PENDING_POLICY_ACTIVATION                        │
       │              → WaitForPolicyActivation                           │
       │              wait(PolicyActivated) ─────────▶ ActivateMember     │
       │ CANCELLED → ReleaseFloat → VoidMember                            │
       │                                                                 ▼
                                                                   VoidMember
                                                                         │
                                                                         ▼
done whenAny [ActivateMember, VoidMember]
```

**Signals:**
- `FloatTopUpReceived` — external (Float Mgmt).
- `MemberApprovalCompleted` — single signal from the central Approval module. Module owns role chaining (UW only / UW+RI / UW+RI+CXO / none) per its own config; PAM emits one `MemberApprovalRequested` event with member context (SI, plan, productCode, riskClass) and listens for one signal in response. "None" path = fast `MemberApprovalCompleted` with `decision=APPROVED`.
- `PolicyActivated` — cross-workflow signal dispatched by `ActivatePolicyCommand` handler to in-flight `MemberEnrollmentFlow` instances via `workflowRuntime.signal`.
- `MemberVoidRequested` — runs in parallel with main flow via `AwaitCancellation`. Triggers: explicit proposer withdrawal, or `PolicyCancelled` fanout (parent policy cancelled while member in-flight). Renamed from `MemberCancellationRequested` for terminal-state accuracy: pre-activation terminal is VOID, not CANCELLED.

**Approval module is a placeholder today.** PAM's contract is "emit `MemberApprovalRequested`, await `MemberApprovalCompleted` with a decision." The module's actual role-chaining rules wire up as products and approval policies land. The integration shape is fixed; concrete decision logic stays inside the Approval module.

**Two policy-state checks (early + late).** First `CheckPolicyState` short-circuits work on already-cancelled policies (no float reserve, no approval round-trip wasted). Second `EvaluatePolicyState` (after float + approval, fresh DB read) decides activate-or-park; race between fresh-read and park-time signal arrival is closed by the runtime's `wait(Signal)` primitive — signals fired against a registered wait are delivered when the workflow parks (Pattern B). Open Q for Nikhil: confirm runtime contract.

**Cancellation pattern.** V1 KSL grammar's `RouteEntry` doesn't support `on signal()` routes. To allow void to interrupt at any wait, `AwaitCancellation` opens in parallel with the main flow at workflow start. `ReleaseFloat` is idempotent — safe to call regardless of where the main flow had progressed when the void signal arrived.

**Race:** `ActivateMember` and `VoidMember` both require `Member.isPending` — DB commit order picks the winner cleanly; loser fails its precondition.

**Bridging events:**
- When workflow parks at `WaitForPolicyActivation` → emits `MemberPendingForActivation` event AND signals `PolicyActivationFlow` via `workflowRuntime.signal("policy-activation-{policyId}", ...)` to count toward threshold.
- When workflow terminates at `VoidMember` → emits `MemberVoided` event (auditable; PolicyActivationFlow currently picks up the implicit decrement via DB count on next signal — see §6.7 limitation).

**Reconciliation safety net.** A scheduled `MemberStateReconciliationSweeper` (Spring `@Scheduled` bean, default every 10 min) runs two indexed SQL queries to catch any member stuck in `PENDING_POLICY_ACTIVATION` while parent Policy is already ACTIVE (missed `PolicyActivated` signal) or stuck PENDING while parent Policy is CANCELLED (missed `MemberVoidRequested` fanout). Idempotent — `ActivateMemberCommand` / `VoidMemberCommand` preconditions (`isPending`) make double-fire safe. Workflow signal remains the primary mechanism; sweeper is belt-and-suspenders for race windows, process crashes, Kafka outages, and any other failure mode that leaves a member out-of-sync with its policy. Alert on non-zero hit-count in steady state.

### 6.7 PolicyActivationFlow (PAM, per policy)

**Module:** Policy Administration · **Aggregate:** Policy · **Trigger:** PAM `CreatePolicyCommand` handler kicks off, **for every policy** regardless of activation threshold
**Workflow ID:** `policy-activation-{policyId}`

```
                       MAIN PATH                         CANCELLATION (parallel)
                       ─────────                         ──────────────────────
START open [EvaluateThreshold, AwaitPolicyCancellation]
            │                                                   │
            ▼                                                   ▼
     EvaluateThreshold                                  AwaitPolicyCancellation
     (SELECT COUNT(*) WHERE policyId                    wait(PolicyCancelled)
      AND state IN ('PENDING','ACTIVE'))                       │
            │                                                  │
            │ thresholdMet = YES → ActivatePolicy ──┐          │
            │                                       │          │
            │ thresholdMet = NO  → AwaitMembershipChange       │
            │                      wait(MemberPendingForActivation)
            │                          │            │          │
            │                          ▼            │          │
            │     ◄── reopen EvaluateThreshold ◄────┤          │
            │                                       ▼          ▼
done whenAny [ActivatePolicy, AwaitPolicyCancellation]
```

**Behavior by threshold:**
- **`activationThreshold = 0` (GCL):** First `EvaluateThreshold` at start returns YES (0 ≥ 0) → fires `ActivatePolicy` immediately. Latency ≈ workflow-engine tick.
- **`activationThreshold = N > 0` (GTL):** First evaluation returns NO (0 < N) → opens `AwaitMembershipChange`. Each `MemberPendingForActivation` signal (sent by a member workflow on parking) reopens `EvaluateThreshold`. When count reaches N, fires `ActivatePolicy` → `Policy.activate()` emits `PolicyActivated` event AND `ActivatePolicyCommand` handler signals all in-flight `MemberEnrollmentFlow` waiters.

**Counter is DB-driven**, not workflow-state-driven. Workflow holds process state ("awaiting threshold"), not the count — single source of truth = Member table. `COUNT(*)` filters to `state IN ('PENDING','ACTIVE')` — VOID and CANCELLED members are excluded automatically.

**`Policy.pendingReason`.** Set to `AWAITING_MIN_MEMBERS` when `AwaitMembershipChange` opens; cleared on `ActivatePolicy`. Member-level blockers (float, approval) live on `Member.pendingReason` — never promoted onto Policy. `AWAITING_COMPLIANCE` is a placeholder for a future policy-wide compliance gate (KYC sign-off, regulatory filing).

**Cancellation: parallel-branch pattern.** `AwaitPolicyCancellation` runs in parallel with the threshold-watch path from workflow start. `CancelPolicyCommand` handler signals `PolicyCancelled` to this workflow's instance (workflow ID `policy-activation-{policyId}`) via `workflowRuntime.signal(...)`. The wait completes → `done whenAny` fires → workflow terminates. Same idiom as `MemberEnrollmentFlow.AwaitCancellation`.

**`MemberVoided` doesn't drive PolicyActivationFlow.** A member only counts toward threshold after firing `MemberPendingForActivation` (post-float, post-approval). A member voided before that never counted. A member voided after that only happens via `CancelPolicyCommand`, at which point this workflow is terminating via `AwaitPolicyCancellation`. The DB COUNT excludes VOID/CANCELLED on every re-evaluation.

**Reconciliation safety net (shared with §6.6).** The `MemberStateReconciliationSweeper` (see §6.6) covers non-race failure modes — process crashes, Kafka outages, manual DB edits — that could leave member state out of sync. Workflow signal remains the primary mechanism.

---

## 7. End-to-End Flow

> **GTL flow shown below (threshold = N).** GCL is the same flow with threshold = 0; `PolicyActivationFlow` self-fires `ActivatePolicy` immediately at start, so members never park at `WaitForPolicyActivation`.

```
SALES / OPS         QUOTATION             POLICY ISSUANCE         POLICY ADMINISTRATION
                    (W1)                   (W2 / W3)              (Workflow runtime + handlers)
  │                   │                         │                         │
  │ 1. CreateQuote    │                         │                         │
  │──────────────────▶│ DRAFT                   │                         │
  │ ... Update*, RequestPrice, Submit, SendToClient, Accept ...             │
  │                   │                         │                         │
CLIENT                │                         │                         │
  │ 2. Accept        │                         │                         │
  │──────────────────▶│ Finalize → FINALIZED    │                         │
  │                   │ ─── port call ────────▶ │                         │
  │                   │                         │ CreateProposal          │
  │                   │                         │ → CREATED               │
  │                   │                         │                         │
  │                   │                         │ CreateMasterPolicy      │
  │                   │                         │ ─── port call ────────▶ │
  │                   │                         │                         │ CreatePolicyCommand
  │                   │                         │                         │   NumberGen → policyNumber
  │                   │                         │                         │   Factory.create() emits PolicyCreated
  │                   │                         │                         │   start PolicyActivationFlow
  │                   │                         │                         │   (returns policyId, policyNumber)
  │                   │                         │                         │
  │                   │                         │                         │ PolicyActivationFlow:
  │                   │                         │                         │   EvaluateThreshold → 0 < N → NO
  │                   │                         │                         │   open AwaitMembershipChange
  │                   │                         │                         │   (parks waiting for signals)
  │                   │                         │ ◀──── { policyId, policyNumber } ───│
  │                   │                         │ Proposal → POLICY_CREATED          │
  │                   │                         │ W2 DONE ✓                          │
  │                   │                         │                                    │
  │                   │                         │ Each member from census            │
  │                   │                         │ runs W3 independently:             │
SALES OPS             │                         │                                    │
  │ 3. Census upload (carries transactionRefs)  │                                    │
  │─────────────────────────────────────────────▶│ N members → W3 × N                │
  │                                              │  │                                 │
  │                                              │  ClassifyMember → STP/Repair/Review/Reject
  │                                              │  ApproveMember → APPROVED         │
  │                                              │  AddMemberToPolicy                │
  │                                              │  ─── port call ─────────────────▶│
  │                                              │                                  │ AddMemberCommand
  │                                              │                                  │   NumberGen → memberNumber
  │                                              │                                  │   Factory.enroll(...) emits MemberEnrolled
  │                                              │                                  │   start MemberEnrollmentFlow
  │                                              │                                  │   (returns memberId, memberNumber)
  │                                              │ ◀── { memberId, memberNumber } ─│
  │                                              │ ProposalMember → ADDED           │
  │                                              │ Emits MemberAdded → Kafka        │
  │                                              │                                  │
  │                                              │  MemberEnrollmentFlow (PAM, per member):
  │                                              │   ReserveFloat (FloatMgmt.reserve(transactionRefs))
  │                                              │   EvaluateApprovalGates (placeholder)
  │                                              │   EvaluatePolicyState
  │                                              │     Policy=PENDING → WaitForPolicyActivation
  │                                              │     ←── emits MemberPendingForActivation event,
  │                                              │           signals PolicyActivationFlow ──→
  │                                              │           (count++; re-evaluate)
  │                                              │
  │                                              │ At Nth member:
  │                                              │   PolicyActivationFlow.EvaluateThreshold → YES
  │                                              │   ActivatePolicyCommand → Policy.activate()
  │                                              │   emits PolicyActivated event,
  │                                              │     handler signals ALL MemberEnrollmentFlow
  │                                              │     instances waiting at WaitForPolicyActivation
  │                                              │   each fires ActivateMemberCommand
  │                                              │   → Member PENDING → ACTIVE
  │                                              │   → emits MemberActivated → Kafka
  │                                              │   → Accounting / CCM consume
  │                                              │
  │                                              │ Subsequent members (after policy ACTIVE):
  │                                              │   MemberEnrollmentFlow.EvaluatePolicyState
  │                                              │   sees Policy=ACTIVE → ActivateMember directly
  │                                              │   (no wait)
```

---

## 8. API Contracts (Inter-Module)

### Quotation → Policy Issuance (Port)

```
PROPOSALS_PORT.createProposal({
  quoteId, clientId, policyType,
  effectiveDate, expiryDate, premiumType,
  lineOfBusiness, riskTermClassification, inceptionDate, ageDefinitionRule,
  plans: [{ planNo, planName?, products[{ code, productType, benefits[{code, name?, mandatory}], exclusions[{code, name?}] }],
            rateCard, coverAmountFormula, freeCoverLimitFormula? }],
  aggregateCensus: { headcount, planBreakdown[] },
  estimatedPremium: { amount, currency }
}) → { proposalId }
```

### Policy Issuance → Policy Administration (Port)

```
POLICIES_PORT.createPolicy({
  clientId, proposalId, policyType,
  effectiveDate, expiryDate, premiumType,
  lineOfBusiness, riskTermClassification, inceptionDate, ageDefinitionRule,
  activationThreshold,                   // GTL: positive int, GCL: 0
  plans: [PolicyPlanRequest],
  estimatedPremium: { amount, currency }
}) → { policyId, policyNumber }          // state always PENDING at response
```

```
MEMBERS_PORT.addMember(policyId, {
  proposalMemberId,
  name, dob, gender, salary, occupation?,
  mobile?, email?, governmentIdType?, governmentIdNumber?,    // PII
  sumInsured, planNo,
  premium: MemberPremium,                                     // structured
  uwDecision?: MemberUwDecision,                              // structured
  transactionRefs: list<string>,                              // generic refs
  additionalAttributesJson?                                   // product-specific
}) → { memberId, memberNumber }          // state always PENDING at response
```

> No `firstBatchMembers` field. `CreatePolicyRequest` does not carry members. Members come exclusively via `addMember` (one per call, after each ProposalMember reaches APPROVED). Activation runs async via `PolicyActivationFlow` once threshold is met.

### Policy Administration → Float Management (Sync REST, mocked)

```
POST /api/float/reserve
Body: { policyId, memberId, transactionRefs: ["UTRN-001"], amount: 1000 }
Response (success):       { reservationId: "R-xyz", status: "RESERVED" }
Response (insufficient):  { status: "INSUFFICIENT", shortfall: 200 }

POST /api/float/release
Body: { reservationId: "R-xyz" }
Response: { status: "RELEASED" }    // idempotent
```

### Policy Administration → Number Generator (Sync REST, mocked)

```
POST /api/number-gen/generate
Body: { entityType: "POLICY" | "MEMBER" | ..., schemaCode, contextJson }
Response: { number: "POL-2026-04-00123" }
```

### Policy Issuance → Rule Engine (Sync REST, mocked)

```
POST /api/rules/classify-member
Body: {
  member: { name, dob, gender, salary, occupation },
  planContext: { planNo, products[], benefits[], rateCard, fclBands }
}
Response: { lane: "STP"|"REPAIR"|"REVIEW"|"REJECT", errors: [] }

POST /api/rules/calculate-premium
Body: {
  member: { dob, gender, salary, occupation, sumInsured },
  planContext: { planNo, products[], benefits[], rateCard }
}
Response: { annualPremium: { amount, currency }, breakup: [{ productCode, benefitCode?, premium }] }
```

### Quotation → Product Configurator (Sync REST, mocked)

```
GET  /api/products?policyType=GTL                           → { products: [...] }
GET  /api/products/{code}/benefits                          → { benefits: [...] }
POST /api/products/validate-combination
Body: { products: ["GTL-BASE", "GTL-RIDER-CI"], excludedBenefits: ["TPD"] }
Response: { valid: true, errors: [] }
```

### Policy Issuance → UW Workbench (Kafka Commands)

```
Topic: policy-issuance.uw-commands
Event: MemberReviewRequested
Payload: { eventId, timestamp, proposalMemberId, memberData, planContext, uwQuestionSetCode }
```

### UW Workbench → Policy Issuance (Kafka Events)

```
Topic: uw-workbench.events
Event: MemberReviewCompleted
Payload: { eventId, timestamp, proposalMemberId, decision, exclusions[], notes }
```

### Policy Issuance → Ops Workbench (Kafka Commands)

```
Topic: policy-issuance.ops-commands
Event: MemberRepairRequested
Payload: { eventId, timestamp, proposalMemberId, memberData, errors[] }
```

### Ops Workbench → Policy Issuance (Kafka Events)

```
Topic: ops-workbench.events
Event: MemberRepairCompleted
Payload: { eventId, timestamp, proposalMemberId, corrections{} }
```

### Domain Events → Kafka (via Outbox)

All domain events are written to an outbox table in the same DB transaction as the aggregate state change. An outbox processor relays them to Kafka. Every module publishes its own events.

#### Quotation Module Events (topic: `quotation.events`)

| Event | Trigger | MVP Consumers |
|-------|---------|---------------|
| `QuoteCreated` | `CreateQuote` | — |
| `QuoteUpdated` | Any intermediate config command (UpdatePolicyDetail, AddPlan, UpdatePlan, RemovePlan, UpdateRateCard, UpdateMemberToPlanMapping, UpdateAggregateCensus, UpdatePremium) | — |
| `QuotePriceRequested` | `RequestPrice` | Quotation workflow (W1) |
| `QuoteSubmitted` | `Submit` | — |
| `QuoteSentToClient` | `SendToClient` | — |
| `QuoteAccepted` / `QuoteRejected` / `QuoteWithdrawn` / `QuoteExpired` | corresponding command | — |
| `QuoteFinalized` | `Finalize` | Triggers W2 via port |
| `MemberQuoteCreated` / `MemberQuotePlanSet` / `MemberQuotePremiumUpdated` / `MemberQuoteSubmitted` / `MemberQuoteFinalized` | corresponding command | W4 → W3 |

#### Policy Issuance Module Events (topic: `policy-issuance.events`)

| Event | Trigger | MVP Consumers |
|-------|---------|---------------|
| `ProposalCreated` | `CreateProposal` | — |
| `PolicyCreated` (PIM) | `CreateMasterPolicy` (PIM-side fact: "we asked PAM to create") | Audit |
| `MemberMAFSent` / `MemberMAFConfirmed` | corresponding commands | — |
| `MemberClassificationStarted` | `ClassifyMember` | — |
| `MemberApproved` / `MemberRejected` | corresponding commands | — |
| `MemberRepairRequested` | `MarkRepairPending` | Ops Workbench (via Kafka) |
| `MemberReviewRequested` | `MarkReviewPending` | UW Workbench (via Kafka) |
| `MemberAdded` | `AddMemberToPolicy` | Audit, Accounting (member journal) |

> Note: PIM's `PolicyCreated` and PAM's `PolicyCreated` are different events in different packages (`com.anaira.issuance.event.PolicyCreated` vs `com.anaira.policyadmin.event.PolicyCreated`). PIM emits when its `Proposal.createMasterPolicy` runs; PAM emits when its `PolicyFactory.create` runs. Both fire on the same business action — different bounded-context views.

#### Policy Administration Module Events (topic: `policy-admin.events`)

| Event | Trigger | MVP Consumers |
|-------|---------|---------------|
| `ClientCreated` | `ClientFactory.create` | — |
| `PolicyCreated` (PAM) | `PolicyFactory.create` | Accounting (init journals), CCM (policy doc) |
| `PolicyActivated` | `Policy.activate()` (driven by PolicyActivationFlow) | Outbox: Accounting + CCM. `ActivatePolicyCommand` handler also signals in-flight `MemberEnrollmentFlow` waiters via workflow runtime. |
| `PolicyCancelled` | `Policy.cancel(reason)` | Accounting, CCM |
| `MemberEnrolled` | `MemberFactory.enroll` (factory-emitted at enrolment time; floatReservationId is null at this point) | Accounting (member journal), CCM (COI / coverage schedule) |
| `MemberActivated` | `Member.activate()` (driven by MemberEnrollmentFlow) | Accounting, CCM |
| `MemberVoided` | `Member.voidEnrollment(reason)` (PENDING → VOID, MemberEnrollmentFlow compensation) | Accounting (release reservation journal), CCM (suppress COI). Implicit decrement to PolicyActivationFlow threshold (next ThresholdEvaluation re-runs SELECT COUNT) |
| `MemberCancelled` | `Member.cancel(reason)` (ACTIVE → CANCELLED; future post-activation MemberCancellationFlow) | Accounting (earned premium / pro-rata refund), CCM. **Placeholder — no workflow emits this today.** |
| `MemberApprovalRequested` | `RequestApprovalCommand` workflow activity | Central Approval module (drives UW/RI/CXO chaining per its own config; replies with `MemberApprovalCompleted` signal) |
| `MemberPendingForActivation` | MemberEnrollmentFlow parks at WaitForPolicyActivation | Outbox: audit. The pre-park step also signals `PolicyActivationFlow` to count toward threshold. |

> **Design principle:** Each module owns its outbox and publishes events from its own aggregate state changes. Events represent facts in that module's bounded context. Consumers pick which to listen to. PII fields in events are encrypted at rest at the consumer side too — Kafka topics carry the encrypted form.

---

## 9. Gap Analysis — High-Level Placeholders

> Steps identified from cross-referencing functional specs / Platform Quotation / Protec. High-level placeholders — field/screen-level detail to be added when each is picked up.

### 🔴 HIGH — Missing Steps to Detail Before/During Dev

| ID | Gap | Where in Flow | Notes |
|----|-----|---------------|-------|
| **G1** | **Quote Header / Policy Configuration completeness** | W1: `UpdatePolicyDetail` | Spec captures effective/expiry, premiumType, lineOfBusiness, riskTermClassification, inceptionDate, ageDefinitionRule. Functional Specs reference 78 fields across 6 header tabs (jurisdiction, regional regulator, multi-currency, agent codes, etc.). Add fields as scope expands. |
| **G2** | **Class-to-Plan Mapping Rules — DMN content** | W1: `UpdateMemberToPlanMapping`. W3: at member creation | DMN table format / generator UI for rules like "Grade A → Plan 1". Currently a spec field (`memberToPlanMapping: string` ref); the DMN authoring + storage is a Rule Engine / Product Configurator concern. |
| **G3** | **Product Validation Gate (deal-level)** | W1: after plan configuration, before census | Validate configured plan/product combination against master product catalog. Different from bouquet validation — "does this product exist and is valid for this policy type?" For MVP: implicit in `ConfigurePlans` call to Product Configurator. |
| **G4** | **Data Sufficiency / Census Pre-Validation** | W3: before classification | Batch check all members for mandatory fields, format correctness, referential integrity BEFORE spawning per-member W3 flows. For MVP: validation happens at classification time. |
| **G5** | **Rate Card / Premium Table Configuration — DMN content** | W1: `UpdateRateCard` (per plan) | Spec captures `rateCard: string` ref. The DMN authoring + storage + Rule Engine resolution flow is a separate concern. |
| **G6** | **Sum Assured / SI Formula Configuration** | W1: during plan setup | Spec captures `coverAmountFormula: AmountFormula` (type + table refs). FCL bands as DMN. AmountFormulaType enum: `MULTIPLE_OF_MEMBER_ATTRIBUTE`, `LOOKUP_ON_MEMBER_ATTRIBUTE`, `FIXED`, `DMN_TABLE`. |
| **G7** | **Quotation-Level Corrections Loop** | W1: after validation failure | Spec relies on user re-editing in DRAFT. Explicit correction state may be added if validation gates are introduced. |

### 🟡 MEDIUM — Named Gaps (Deferred, Tracked as Assumptions)

| ID | Gap | Source | Deferral Reason |
|----|-----|--------|----------------|
| **G8** | **Subsidiary Management** | Functional Specs (`gpolSubs`) | Single-entity groups only for MVP. |
| **G9** | **Policy-Level Exclusions** | Functional Specs (`gpolExclusions`) | Only member-level exclusions via UW for MVP. |
| **G10** | **Headcount Tracking Entity** | Functional Specs (`gpolHeadcount` per plan/product) | Aggregate census has headcount; per-plan/product entity deferred. |
| **G11** | **Beneficiary / Nominee Management** | Functional Specs (`mbrBnfy`) | Important for GTL death benefit payout. To be added to AddMember. |
| **G12** | **UW Questionnaire Auto-Generation** | Functional Specs, docs/ | Rules Engine determines which questions per policy/product/age/SI/occupation. UW Workbench receives raw member data for now. |
| **G13** | **Medical Tests Determination** | Functional Specs | Same Rules Engine pattern as G12. |
| **G14** | **UW Supporting Documents** | Functional Specs | Same Rules Engine pattern. |
| **G15** | **Pre-existing Conditions Tracking** | Functional Specs (`mbrPreExisting`) | Critical for GH (waiting periods). |
| **G16** | **Member Exclusions Entity in PAM** | Functional Specs (`mbrExclusions`) | UW returns `exclusions[]` carried in `uwDecision: MemberUwDecision`. Stored as `uwDecisionJson` in postgres; explicit entity for query/audit deferred. |
| **G17** | **Document Tracking Entity** | Functional Specs (`gpolDocTracker`) | CCM fires events but no document status tracking. |
| **G18** | **Evidence Collection Lane** | Platform Quotation | EVIDENCE_REQUIRED state for members needing pre-UW document submission. |
| **G19** | **Reinsurance Review** | Platform Quotation | High-SI members may need RI review. Spec has `WaitForReinsurerApproval` placeholder in MemberEnrollmentFlow; concrete RI emitter / decision flow not wired. |
| **G20** | **Quote Internal Approval / Pricing Exceptions** | Platform Quotation | Senior approval gate. Covered by A2 (no maker-checker). |
| **G21** | **Endorsement / Renewal / Claim Workflows** | — | Bounded-per-phase: `MemberEndorsementFlow`, `MemberRenewalFlow`, `MemberClaimFlow`. Not part of MVP; spec carries placeholder for future workflow files. |

### 🟢 LOW — Future Enhancements (Post-MVP)

| ID | Gap | Notes |
|----|-----|-------|
| **G22** | Agent/Broker Assignment (introducing + servicing agents) | Add brokerCode to Quote/Proposal. |
| **G23** | Waiting Periods / Continuity Credit | GH-specific. |
| **G24** | Cashless / TPA Contract | GH-specific. |
| **G25** | Claims History Ingest for ICR | Renewal pricing concern. |
| **G26** | Override Governance / Audit Trail | Production compliance feature. |
| **G27** | Snapshot / Evidence Packet / Hashing | Compliance/audit (SHA-256 over snapshot types). |
| **G28** | Bind Readiness Gates (13) | Pre-PAS-handoff validation. |
| **G29** | Multi-Currency / Billing Configuration | Assumes INR single currency for MVP. |
| **G30** | 64VB Compliance (Wait-for-Deposit) | Float Management buildout. |
| **G31** | Idempotency keys on CreatePolicy / AddMember | Operationally important; defer to post-freeze hardening. Idempotency on `proposalId` for CreatePolicy and `(policyId, proposalMemberId)` for AddMember. |

---

## 10. MVP Scope & Assumptions

### What's Built

| Component | Scope |
|-----------|-------|
| Quotation Module | Quote aggregate + W1 (full state machine: DRAFT → SUBMITTED → SENT_TO_CLIENT → ACCEPTED → FINALIZED + REJECTED/WITHDRAWN/EXPIRED). MemberQuote aggregate + W4 (GCL only). |
| Policy Issuance Module | Proposal aggregate + W2 (short-lived 2-step). ProposalMember aggregate + W3 (independent per-member, straight-line to ADDED or REJECTED). |
| Policy Administration Module | Client + Policy + Member aggregates. PolicyActivationFlow (per policy) + MemberEnrollmentFlow (per member). NumberGenerator + FloatManagement integrations. PII via repo + Cerbos. |
| Inter-module integration | Modular monolith — same `.api` contracts generate REST controllers (external) and in-process port interfaces (internal). Outbox → Kafka for events + UW/Ops async commands. |
| Outbox + Kafka | Every module publishes domain events. Quotation, PIM, PAM all publish. Accounting + CCM consume (mocked). UW/Ops async via Kafka commands/events. |

### What's Mocked

| Component | Mock | How to Test |
|-----------|------|-------------|
| Rule Engine | classify-member: static lane logic. calculate-premium: flat rate. | Vary member data to hit all 4 lanes. |
| Product Configurator | Static products/benefits + validation rules. | Pre-seeded config. |
| Float Management | reserve: auto-success (RESERVED). release: auto-success (idempotent). | Toggle to return INSUFFICIENT for testing top-up + retry path. |
| Number Generator | `{entityType[:3]}-{ULID}`. | Verify uniqueness; replace with real schema-based generator later. |
| UW Workbench | Kafka consumer logs request, auto-publishes MemberReviewCompleted. | Manual harness publishes events. |
| Ops Workbench | Kafka consumer logs request, auto-publishes MemberRepairCompleted. | Manual harness publishes events. |
| Accounting | Kafka consumer. Journal init + member journals: logged, not posted. | Verify domain events published with correct payload. |
| CCM | Kafka consumer. Policy doc + COI: logged, not generated. | Verify domain events published with correct payload. |
| Cerbos | Pluggable; mock policies allow ops-role full read. | Verify access-denied paths via test principal. |

### Assumptions

| # | Assumption | Impact |
|---|-----------|--------|
| A1 | **Client always exists.** Client creation flow skipped for MVP. | Client onboarding scope to be added separately. |
| A2 | **No maker-checker for Quote.** No internal approval gate. | Maker-checker is a cross-cutting concern with separate design. |
| A3 | **Float always sufficient (mocked).** Reserve/release contract is real but mock returns RESERVED. | Toggle to INSUFFICIENT to exercise WaitForFloatTopUp + retry. Real Float Management module to be built separately. |
| A4 | **500-member census is single batch.** No streaming / chunked upload. | May need chunking for larger groups. |
| A5 | **Rule Engine is stateless.** Full plan context sent with every call. | No server-side pipeline configuration in MVP. |
| A6 | **Product combination validation is Product Configurator responsibility.** | Boundary may shift during Product Configurator buildout. |
| A7 | **GCL member quoting (W4) defined but not active for GTL MVP.** | Activate when GCL product scope begins. |
| A8 | **Activation threshold drives PAM workflow, not PIM.** PAM's `PolicyActivationFlow` watches `MemberPendingForActivation` signals and fires `ActivatePolicyCommand` when count ≥ threshold. PIM has no minimum-member coordinator. | Policy goes ACTIVE async via workflow. Members enrol while PENDING; cascade to ACTIVE via `PolicyActivated` signal. |
| A9 | **Member created PENDING; activation is workflow-driven.** No same-transaction bulk cascade — each `MemberEnrollmentFlow` instance independently activates its Member on `PolicyActivated` signal. | Per-member observability + replay; durable across PENDING state. |
| A10 | **Generic `transactionRefs: list<string>`** replaces UTRN-specific naming. UTRN is one example; journal IDs and partner refs are others. | Float Management resolves internally. PAM forwards unchanged. |
| A11 | **Number Generation is an external service.** Numbers (policyNumber, memberNumber) come from `NumberGeneratorClient.generate(entityType, schemaCode, ctx)`. | Schema configurable per entity type. Mock returns ULID-based; real service replaces post-MVP. |
| A12 | **PII via repo layer + Cerbos.** Spec declares fields normally. | Encryption at rest + access control are cross-cutting concerns. No per-endpoint Cerbos calls in spec. |
| A13 | **Multi-dimensional grids as DMN / CSV in object store.** Rate cards, FCL bands, class-to-plan rules, SI formulas live as files; spec carries opaque refs only. | Rule Engine + Product Configurator harden format later. |
| A14 | **Modular monolith with dual adapters.** Sibling-module calls go via in-process port today; remote-ready via port-impl swap. | When PAM splits into its own service, port impl becomes generated REST client. |
| A15 | **Workflows bounded per lifecycle phase.** Endorsement / renewal / claim get separate workflows when those features land. | Cleaner replay / archival / mutex via `WorkflowIDReusePolicy`. |
| A16 | **Single `QuoteUpdated` event** for intermediate Quote config commands. | Per-step events would be noise. State-transition events (Submitted, Accepted, etc.) are still distinct. |
| A17 | **Quote Decline/Expire is supported.** State machine includes REJECTED/WITHDRAWN/EXPIRED terminals. | TTL / expiry timer left to W1 implementation. |
| A18 | **Subsidiaries not modeled for MVP.** Single-entity groups only. | See G8. |
| A19 | **Policy-level exclusions deferred.** Only member-level via UW. | See G9. |
| A20 | **Headcount is aggregate only.** | See G10. |
| A21 | **Beneficiary/nominee deferred.** | Critical for GTL — to be added early. See G11. |
| A22 | **UW questionnaire / medical tests / supporting docs auto-generation deferred.** | See G12, G13, G14. |
| A23 | **Pre-existing conditions not tracked for MVP.** | See G15. |
| A24 | **Member exclusions kept as `uwDecisionJson` in postgres** — no separate entity. Surfaced in DTOs as `uwDecision: MemberUwDecision`. | Explicit `MemberExclusion` entity for query/audit deferred. See G16. |
| A25 | **Document tracking deferred.** | See G17. |
| A26 | **No evidence collection lane in W3.** | See G18. |
| A27 | **Reinsurance review placeholder only.** Workflow has the wait item; concrete emitter not wired. | See G19. |
| A28 | **Approval gates (UW / RI / CXO) in `MemberEnrollmentFlow` are placeholders.** Gateway item exists; concrete decision logic per product / SI band / risk tier added as products land. | Per-product approval policies are a Rule Engine / Product Configurator concern. |
| A29 | **Idempotency on CreatePolicy / AddMember deferred** to post-freeze hardening. | See G31. |
