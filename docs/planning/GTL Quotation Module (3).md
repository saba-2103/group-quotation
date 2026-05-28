# Hybrid Approach

# **1\. What the hybrid system actually is**

At its core, you have moved from:

❌ “Engine decides everything”

to

✅ **Compute Engine → produces facts**  
**→ Orchestrator → decides what to do**  
**→ UI / Integrations → execute actions**

---

# **2\. The framework (clean mental model)**

## **2.1 Three-layer architecture**

### **Layer 1 — Deterministic Compute Core (unchanged strength)**

**What it does:**

* pure evaluation  
* no side effects  
* no routing

**Engines:**

* eligibilityEngine  
* sumAssuredEngine  
* pricingEngine  
* evidenceEngine  
* validationEngine  
* reinsuranceEngine

👉 Output:

```json
{
  "facts": {...},
  "pricing": {...},
  "validation": {...},
  "riskSignals": {...},
  "decisionHints": {...}
}
```

---

### **Layer 2 — Orchestration Layer (new brain)**

This is the biggest change.

**Service:**

```
quoteCaseOrchestrationService
```

**Driven by:**

```
orchestration_state_machine_catalog_gtl_quote.json
```

**What it does:**

* interprets compute outputs  
* determines lifecycle  
* assigns queue  
* decides actions  
* triggers integrations

👉 This is where **business flow lives now**

---

### **Layer 3 — Experience \+ Integration Layer**

Split into:

#### **UI Contract**

```
ui_experience_contract_catalog_gtl_quote.json
```

*   
  what screens show  
* what actions are allowed  
* what fields are editable

---

#### **Integration Commands**

```
integration_command_catalog_gtl_quote.json
```

*   
  UW\_CASE\_CREATE  
* DMS\_DOC\_REQUEST  
* PAS\_BIND  
* ACCOUNTING\_PREMIUM\_EVENT

---

# **3\. Execution pipeline (very important)**

## **Old system:**

```
Engine → Decision → Status → Actions → Integrations
```

## **Hybrid system:**

```
Compute Engine → Fact Graph
                ↓
         Orchestrator
                ↓
   (State + Actions + Commands)
                ↓
     UI + Integration Execution
```

---

# **4\. What exactly happens during execution**

## **Step 1 — Input ingestion**

You receive:

* census  
* product config  
* plan  
* context (new / takeover)

---

## **Step 2 — Compute pipeline runs**

```
runQuotePipeline()
```

Outputs:

```json
{
  "eligibility": PASS,
  "sumAssured": {...},
  "pricing": {...},
  "validation": {...},
  "evidence": {...},
  "ri": {...}
}
```

👉 No routing here anymore

---

## **Step 3 — Orchestrator takes over**

```
quoteCaseOrchestrationService.evaluate()
```

### **It reads:**

* validation errors?  
* missing inputs?  
* evidence triggers?  
* RI triggers?  
* pricing completeness?

---

### **Then maps to state machine**

Example:

| Condition | Result |
| ----- | ----- |
| validation FAIL | DATA\_GATHERING |
| missing data | DATA\_REQUIRED |
| UW trigger | UNDER\_UW\_REVIEW |
| clean | READY\_TO\_BIND |

---

## **Step 4 — Orchestrator outputs**

```json
{
  "lifecycle": "UNDER_UW_REVIEW",
  "queue": "UW_REVIEW",
  "allowedActions": ["VIEW_UW_CASE", "APPLY_DECISION"],
  "integrationCommands": ["UW_CASE_CREATE"]
}
```

👉 This is the **control plane**

---

## **Step 5 — UI layer consumes this**

UI does NOT decide logic anymore.

It simply reads:

```json
allowedActions
uiContract
```

---

## **Step 6 — Integration layer executes commands**

Instead of:  
❌ engine directly triggering

Now:

```
integrationCommandService.execute(commands)
```

---

# **5\. End-to-end quote flow (clean example)**

Let’s take **4 scenarios (your real cases)**

---

# **CASE A — Clean STP (best case)**

### **Compute output:**

* validation PASS  
* no missing data  
* no UW trigger  
* no RI trigger

---

### **Orchestrator:**

```
state = QUOTED
queue = READY_TO_BIND
actions = [SEND_TO_PAS_BIND]
commands = [PAS_BIND_READY]
```

---

### **Flow:**

```
Quote → Compute → Orchestrator → READY_TO_BIND → PAS
```

---

# **CASE B — Missing salary (data issue)**

### **Compute:**

* missingInputFactors present

---

### **Orchestrator:**

```
state = DATA_GATHERING
queue = DOC_COLLECTION
actions = [UPLOAD_DOCS, EDIT_DATA]
commands = [DMS_DOC_REQUEST]
```

---

### **Flow:**

```
Quote → Compute → Detect missing → Orchestrator → DOC_COLLECTION
```

---

# **CASE C — UW referral**

### **Compute:**

* FCL breached  
* evidence required

---

### **Orchestrator:**

```
state = UNDER_UW_REVIEW
queue = UW_REVIEW
actions = [VIEW_UW_CASE, APPLY_DECISION]
commands = [UW_CASE_CREATE]
```

---

### **Flow:**

```
Quote → Compute → Risk signals → Orchestrator → UW queue
```

---

# **CASE D — Takeover validation fail**

### **Compute:**

* validation FAIL  
* missing previous insurer

---

### **Orchestrator:**

```
state = DATA_GATHERING
reason = VALIDATION_ERROR
actions = [FIX_DATA]
commands = []
```

---

### **Flow:**

```
Quote → Compute → Validation FAIL → Orchestrator → Block progression
```

---

# **6\. State machine (how it works internally)**

Your catalog defines transitions like:

```json
{
  "from": "EVALUATED",
  "conditions": [
    "validation.errorCount > 0"
  ],
  "to": "DATA_GATHERING"
}
```

Another:

```json
{
  "conditions": [
    "evidence.requiresUW == true"
  ],
  "to": "UNDER_UW_REVIEW"
}
```

👉 This is now **explicit, testable, and editable**

---

# **7\. Why this is a better system**

## **Before**

* one engine doing everything  
* hard to debug  
* hard to change

---

## **Now**

### **✔ Separation of concerns**

| Layer | Responsibility |
| ----- | ----- |
| Engine | compute |
| Orchestrator | decisions |
| UI | experience |
| Integration | execution |

---

### **✔ Better debugging**

You can now ask:

* “Compute issue?”  
* “Orchestration issue?”  
* “UI issue?”

👉 No ambiguity

---

### **✔ Controlled evolution**

* pricing change → engine only  
* workflow change → orchestration only  
* UI change → frontend only

---

# **8\. What framework this resembles (real-world mapping)**

Your system now aligns with:

### **1\. Decision \+ Orchestration Pattern**

* Drools / Blaze → compute layer  
* Temporal / Camunda → orchestration layer

---

### **2\. CQRS-style separation**

* compute \= query side  
* orchestration \= command side

---

### **3\. Event-driven architecture**

* commands trigger integrations  
* not tightly coupled

---

# **9\. Hard truth (important)**

Even in hybrid:

👉 If orchestration becomes too rule-heavy  
→ you recreate the same problem again

So:

* keep orchestration simple  
* keep compute deterministic  
* don’t mix again

---

# **10\. Bottom line**

This hybrid system is:

**A controlled, layered decision system where computation is deterministic and flow is explicitly orchestrated**

It gives you:

* flexibility without chaos  
* control without rigidity  
* scalability without rule explosion

---

# Structure

Below is the **exact mapping of your hybrid zip (v2.0.0)**—catalog by catalog → runtime service → execution responsibility.

No abstraction. This is how the system is actually wired.

---

# **1\. Top-level structure (what you now have)**

## **Artifacts zip**

```
/artifacts
  /core_compute
  /orchestration
  /ui_contract
  /integration
  /governance
```

## **Execution zip**

```
/src
  /compute
  /orchestration
  /integration
  /ui
  /shared
```

---

# **2\. Core compute layer (unchanged but isolated)**

## **2.1 TermDictionary**

### **File:**

```
core_compute/term_dictionary_gtl.json
```

### **Runtime:**

```
termResolver.ts
```

### **Responsibility:**

* canonical factor registry  
* type-safe access

### **Used by:**

* ALL compute engines

---

## **2.2 Product \+ Plan \+ Benefit catalogs**

### **Files:**

```
product_catalog_gtl.json
plan_design_catalog_gtl.json
benefit_catalog_gtl.json
```

### **Runtime:**

```
productResolver.ts
benefitEngine.ts
```

### **Responsibility:**

* define product structure  
* SA rules  
* benefit mapping

---

## **2.3 Pricing catalogs**

### **Files:**

```
rate_table_catalog_gtl.json
loading_discount_catalog_gtl.json
pricing_rule_catalog_gtl.json
```

### **Runtime:**

```
pricingEngine.ts
rateResolver.ts
```

### **Responsibility:**

* premium calculation  
* loadings  
* pricing logic

---

## **2.4 Eligibility**

### **File:**

```
eligibility_rule_catalog_gtl.json
```

### **Runtime:**

```
eligibilityEngine.ts
```

### **Responsibility:**

* inclusion / exclusion logic

---

## **2.5 Evidence / UW triggers**

### **File:**

```
evidence_requirement_catalog_gtl.json
```

### **Runtime:**

```
evidenceEngine.ts
```

### **Responsibility:**

* FCL checks  
* medical triggers

---

## **2.6 Validation**

### **File:**

```
validation_rule_catalog_gtl.json
```

### **Runtime:**

```
validationEngine.ts
```

### **Responsibility:**

* mandatory fields  
* takeover rules  
* structural validation

---

## **2.7 Reinsurance**

### **File:**

```
reinsurance_rule_catalog_gtl.json
```

### **Runtime:**

```
reinsuranceEngine.ts
```

### **Responsibility:**

* concentration checks  
* RI referral

---

## **2.8 Aggregation (IMPORTANT CHANGE)**

### **File:**

```
decision_hint_catalog_gtl.json
```

### **Runtime:**

```
decisionAggregator.ts
```

### **Responsibility (now LIMITED):**

* produce **decision hints only**  
* NOT final routing

Example output:

```json
{
  "hasValidationErrors": true,
  "requiresUW": false,
  "missingData": true
}
```

---

# **3\. Compute pipeline (where everything runs)**

## **Runtime:**

```
quotePipeline.ts
```

### **Execution:**

```
runQuotePipeline():
  → eligibilityEngine
  → sumAssuredEngine
  → pricingEngine
  → evidenceEngine
  → validationEngine
  → reinsuranceEngine
  → decisionAggregator
```

### **Output:**

```json
{
  "facts": {...},
  "pricing": {...},
  "validation": {...},
  "riskSignals": {...},
  "decisionHints": {...}
}
```

👉 This is the **only output of compute layer**

---

# **4\. Orchestration layer (NEW CORE)**

## **4.1 State machine catalog**

### **File:**

```
orchestration/orchestration_state_machine_catalog_gtl_quote.json
```

### **Runtime:**

```
quoteCaseOrchestrationService.ts
```

---

## **What it contains:**

```json
{
  "states": ["DATA_GATHERING", "UW_REVIEW", "READY_TO_BIND"],
  "transitions": [
    {
      "conditions": ["validation.errorCount > 0"],
      "to": "DATA_GATHERING"
    },
    {
      "conditions": ["decisionHints.requiresUW == true"],
      "to": "UW_REVIEW"
    }
  ]
}
```

---

## **Responsibility:**

* evaluate compute output  
* assign lifecycle state  
* assign queue  
* determine actions

---

## **4.2 Orchestration service**

### **File:**

```
src/orchestration/quoteCaseOrchestrationService.ts
```

### **Core function:**

```ts
evaluateCase(computeOutput): OrchestrationResult
```

### **Output:**

```json
{
  "lifecycle": "UNDER_UW_REVIEW",
  "queue": "UW_REVIEW",
  "allowedActions": [...],
  "integrationCommands": [...]
}
```

---

# **5\. UI contract layer**

## **File:**

```
ui_contract/ui_experience_contract_catalog_gtl_quote.json
```

---

## **Runtime:**

```
uiProjectionService.ts
```

---

## **Responsibility:**

* map state → UI  
* define:  
  * screens  
  * editable fields  
  * action visibility

---

## **Important shift:**

❌ Earlier:

* UI was driven by engine logic

✅ Now:

* UI reads:  
  * orchestration state  
  * allowedActions

---

# **6\. Integration layer (NEW)**

## **6.1 Command catalog**

### **File:**

```
integration/integration_command_catalog_gtl_quote.json
```

---

## **Example:**

```json
{
  "UW_CASE_CREATE": {
    "target": "UW_SYSTEM",
    "payloadTemplate": "uw_case_payload.json"
  }
}
```

---

## **6.2 Runtime service**

### **File:**

```
src/integration/integrationCommandService.ts
```

---

## **Execution:**

```ts
execute(commands: string[], context)
```

---

## **Responsibility:**

* convert command → API call / event  
* decouple compute from integrations

---

# **7\. Governance layer (critical but often ignored)**

## **File:**

```
governance/hybrid_boundary_catalog_gtl_quote.json
```

---

## **Purpose:**

Defines:

| Domain | Allowed Layer |
| ----- | ----- |
| Pricing | Compute only |
| Workflow | Orchestration only |
| UI | UI layer only |
| Integration | Command layer |

---

👉 Prevents system from collapsing back into monolith

---

# **8\. Full end-to-end execution trace (real flow)**

## **Step 1 — API call**

```
POST /quote/evaluate
```

---

## **Step 2 — Compute**

```
quotePipeline.run()
```

Output:

```json
computeOutput
```

---

## **Step 3 — Orchestration**

```
quoteCaseOrchestrationService.evaluate(computeOutput)
```

Output:

```json
orchestrationResult
```

---

## **Step 4 — UI projection**

```
uiProjectionService.build(orchestrationResult)
```

---

## **Step 5 — Integration execution**

```
integrationCommandService.execute(
  orchestrationResult.integrationCommands
)
```

---

## **Step 6 — Final response**

```json
{
  "compute": {...},
  "state": {...},
  "ui": {...},
  "commandsExecuted": [...]
}
```

---

# **9\. File → Service → Responsibility mapping (quick table)**

| Catalog | Runtime | Responsibility |
| ----- | ----- | ----- |
| TermDictionary | termResolver | factor resolution |
| Product/Plan | productResolver | structure |
| Pricing | pricingEngine | premium |
| Eligibility | eligibilityEngine | inclusion |
| Evidence | evidenceEngine | UW trigger |
| Validation | validationEngine | correctness |
| Reinsurance | reinsuranceEngine | RI logic |
| Decision Hint | decisionAggregator | signals only |
| State Machine | orchestrationService | lifecycle |
| UI Contract | uiProjectionService | experience |
| Integration Commands | integrationService | external calls |
| Boundary Catalog | governanceValidator | guardrails |

---

# **10\. Most important conceptual shift**

## **Before:**

```
Engine = Compute + Decision + Workflow + UI + Integration
```

---

## **Now:**

```
Compute Engine → Facts
Orchestrator → Decisions
UI Layer → Experience
Integration Layer → Execution
```

---

# **11\. Hard truth**

If you violate this mapping:

* put routing back in compute  
* put UI logic in orchestration  
* put integration in engine

👉 You will recreate the same problem in 6 months

---

# **12\. Bottom line**

This mapping gives you:

* **clean separation**  
* **independent evolution**  
* **testable layers**  
* **scalable architecture**

---

# Right Architecture

Given that **workflow/orchestration stays inside the module**, and that the module assembles facts/context and then calls **rule** or **rating** with an explicit intent, the right design is:

## **The right architecture**

**Inside the module**

* **Workflow / orchestration layer**  
* **Context assembly layer**  
* **Policy pack resolver**  
* **Rule decision engine**  
* **Rating engine**  
* **Transition/state resolver**  
* **Integration command emitter**  
* **Audit/projection store**

That matches the direction in your hybrid notes: compute stays deterministic, orchestration is the control plane, and UI/integration sit downstream of that control plane.

## **Clean target shape**

```
Module API / Workbench / PAS callback
                |
                v
      Module Workflow / Orchestrator
                |
                v
         Context Assembly Layer
   (request + enrichments + canonical facts)
                |
                v
          Policy Pack Resolver
 (product, plan, scheme, effective date, version)
          /                      \
         v                        v
 Rule Decision Engine         Rating Engine
         \                        /
          v                      v
     Decision Outputs        Pricing Outputs
              \              /
               v            v
        Transition / State Resolver
               |
               v
     lifecycle / queue / actions / commands
               |
               v
      UI projection + integration emission
               |
               v
            audit store
```

## **What each part should do**

### **1\. Workflow / orchestration layer**

This remains **inside the module** and is the owner of:

* lifecycle state  
* queues  
* actions  
* retries / timers / waiting  
* downstream handoffs  
* re-entry after UW / RI / PAS / docs

Your own note already lands here: orchestration is the control plane, compute produces facts/signals, and orchestration decides what to do next.

### **2\. Context assembly layer**

This sits under orchestration and prepares a **canonical evaluation context**:

* quote input  
* product/scheme context  
* resolved terms  
* optional enrichments  
* completeness flags  
* freshness metadata  
* missing/stale factor markers

This is where the module turns raw request data into a normalized fact/context snapshot before any engine runs.

### **3\. Policy pack resolver**

This is critical and often missed.

Before either engine runs, the module should resolve:

* product code  
* plan / variant  
* scheme / employer / channel  
* effective date  
* artifact version / activation  
* intent

So the engines do not “search around” for catalogs. They get an already-resolved pack.

### **4\. Rule decision engine**

This engine should only answer questions like:

* is it eligible  
* what validations fail  
* what inputs are missing  
* what evidence is required  
* is UW referral needed  
* is RI referral needed  
* what sum assured / coverage derivation applies  
* what decision hints / reason codes apply

It returns structured decision outputs, not workflow state.

### **5\. Rating engine**

This engine should only answer:

* what premium applies  
* what rates / bands were used  
* which loadings / discounts apply  
* what pricing assumptions fired  
* what min-premium / commercial constraints were hit  
* member / slab / group pricing breakdown  
* pricing trace

It returns structured pricing outputs, not workflow state.

### **6\. Transition / state resolver**

This is where rule outputs \+ rating outputs get translated into:

* lifecycle state  
* queue  
* allowed actions  
* command IDs  
* SLA

That is exactly the role your hybrid orchestration notes describe: compute says what happened, orchestration says what the system should do about it.

---

# **What the request/response contract should look like**

## **Rule engine contract**

### **Input**

* `intent`  
* `contextSnapshot`  
* `rulePackRef`  
* `effectiveDate`  
* `traceOptions`

### **Output**

* `decisionHints`  
* `derivedFacts`  
* `validationResults`  
* `missingRequirements`  
* `evidenceRequirements`  
* `uwSignals`  
* `riSignals`  
* `reasonCodes`  
* `trace`  
* `artifactVersion`

## **Rating engine contract**

### **Input**

* `intent`  
* `contextSnapshot`  
* `pricingPackRef`  
* `effectiveDate`  
* `upstreamDerivedFacts` from rule engine  
* `traceOptions`

### **Output**

* `premiumResult`  
* `memberPricing`  
* `groupPricing`  
* `loadingResults`  
* `discountResults`  
* `pricingWarnings`  
* `pricingTrace`  
* `artifactVersion`

The orchestration layer should call them independently, but in practice the usual order is:

1. assemble context  
2. run rule decision engine  
3. enrich pricing inputs with rule-derived outputs  
4. run rating engine  
5. resolve state/actions/commands

---

# **Why rule engine and rating engine should be separate**

They should be separate because they solve **different classes of problems**.

## **1\. Different semantics**

Rule engine is mainly:

* predicates  
* eligibility  
* derivation  
* validations  
* gating  
* referrals  
* reason codes

Rating engine is mainly:

* numeric computation  
* table lookup  
* banding  
* interpolation / slabs  
* accumulation  
* pricing formulas  
* premium breakdown

Trying to force both into one engine makes one of them unnatural.

## **2\. Different output shape**

Rule engine output is mostly:

* pass/fail  
* derived values  
* required evidence  
* missing inputs  
* referrals  
* reasons

Rating engine output is mostly:

* premium numbers  
* component breakdown  
* applied factors  
* commercial warnings  
* pricing explanation

These are not the same kind of output and should not share one dominant abstraction.

## **3\. Different authoring cadence**

In real insurance products:

* rule packs change for underwriting, validation, evidence, referrals  
* pricing packs change for commercial/rate updates

They often move on different timelines and are owned by different people.

If both sit in one engine, every pricing change starts looking like a decision rule deployment, and every rule change risks touching pricing paths.

## **4\. Different testing model**

Rule engine testing is typically:

* scenario matrix  
* decision table coverage  
* missing-input handling  
* referral correctness  
* evidence correctness

Rating engine testing is typically:

* numeric accuracy  
* rate-card reconciliation  
* tolerance checks  
* actuarial sample reconciliation  
* component sum correctness

Merging them makes testing messy and brittle.

## **5\. Different explainability**

Rule explainability wants:

* which rule fired  
* why rejected / referred / required  
* which conditions matched

Pricing explainability wants:

* which rate was selected  
* which loadings applied  
* how final premium was built

A single engine usually produces poor explanations for one side.

## **6\. Different performance patterns**

Rules often need broad evaluation across many predicates.  
Pricing often needs repeated numeric calculation across many members/slabs.

For GTL, pricing can become the heavier loop, especially on census/member-level computations. That runtime profile is different from rule gating.

## **7\. Different failure meaning**

If rule engine cannot conclude, that means:

* missing data  
* invalid structure  
* referral  
* blocked progression

If rating engine cannot conclude, that usually means:

* insufficient pricing inputs  
* missing rate table  
* unresolved pricing dimensions  
* commercial configuration gap

Those failures should not collapse into one generic “engine failed” category.

---

# **Why not keep them as one engine**

You *can* share a **common policy runtime foundation**, but you should not expose them as one business engine.

The shared foundation may include:

* artifact registry  
* versioning / effective dating  
* term dictionary / schema registry  
* common expression parser  
* trace / audit envelope  
* simulation harness  
* dry-run / replay tooling  
* reason-code catalog support

But on top of that shared foundation you should expose **two logical engines**:

* `RuleDecisionEngine`  
* `RatingEngine`

That gives you reuse without mixing semantics.

---

# **The practical GTL sequence**

For a GTL quote, the module should do this:

### **Step 1: Orchestrator receives request**

Quote create / edit / evaluate / re-evaluate.

### **Step 2: Context assembly builds canonical snapshot**

* quote data  
* scheme data  
* census/member data  
* product/plan refs  
* enrichments if any  
* completeness markers

### **Step 3: Pack resolver selects packs**

* rule pack version  
* pricing pack version  
* effective-date activation

### **Step 4: Rule engine runs**

Returns:

* eligibility  
* validations  
* missing requirements  
* evidence/UW/RI signals  
* derived coverage facts  
* decision hints

### **Step 5: Rating engine runs**

Consumes:

* context snapshot  
* rule-derived outputs  
* pricing pack

Returns:

* premium  
* breakdown  
* applied loadings/discounts  
* warnings

### **Step 6: Transition/state resolver runs**

Uses:

* rule outputs  
* rating outputs  
* current workflow state  
* business intent

Returns:

* lifecycle  
* queue  
* allowed actions  
* command IDs

### **Step 7: Orchestrator persists and emits**

* audit snapshot  
* workbench projection  
* UI action model  
* integration commands

This is fully aligned with your hybrid direction where compute is separate from orchestration, and orchestration remains authoritative for business progression.

---

# **The most important design rule**

Do **not** let the rule engine return final workflow state.  
Do **not** let the rating engine emit downstream commands.  
Do **not** let orchestration embed pricing formulas.  
Do **not** let context assembly own business decisions.

The clean authority boundary is:

* **Context assembly** \= prepares truth  
* **Rule engine** \= interprets decision policy  
* **Rating engine** \= computes commercial outcome  
* **Orchestration** \= decides business progression

---

# **Final recommendation**

The right architecture for your setup is:

## **Within the module**

* **Workflow/orchestration layer inside the module**  
* **Context assembly inside the module**  
* **shared policy foundation**  
* **separate rule decision engine**  
* **separate rating engine**  
* **state/transition resolver after both**  
* **UI/integration driven only from orchestration output**

## **Why separate**

Because they differ in:

* semantics  
* outputs  
* ownership  
* testing  
* explainability  
* performance profile  
* failure meaning

So the right answer is not “one engine with two kinds of artifacts.”  
The right answer is:

**one module-owned orchestration layer, one shared policy foundation, and two separate logical engines: rule decision and rating.**

# 3 layer rule structure

By “facttype” here, the structure is **not one field**. It is a **3-layer model**:

1. **FactType** \= broad context bucket  
2. **FactRef** \= exact canonical field  
3. **Fact contract** \= execution metadata for that field

That is the core idea.

## **1\. FactType layer**

This is the broad business grouping. It answers:

* which business object does this belong to  
* at what scope does it apply

Examples from the registry:

* `QuoteContext`  
* `SchemeContext`  
* `ProductPlanContext`  
* `MemberContext`  
* `CoverageContext`  
* `LoanContext`  
* `UnderwritingContext`  
* `EvidenceContext`  
* `ReinsuranceContext`  
* `PricingContext`  
* `ValidationContext`  
* `WorkflowContext`  
* `DerivedDecisionContext`

These are intentionally broad.  
They are **not** supposed to be precise enough for execution by themselves.

Example:

* `MemberContext` tells you this is member-level input  
* but it does **not** tell you whether the field is age, salary, smoking status, or occupation

So `FactType` is only the **bucket**.

---

## **2\. FactRef layer**

This is the real semantic identifier.

Instead of vague fields like:

* `age`  
* `sum_assured`  
* `plan.min_age_at_entry`

the converted structure uses canonical refs like:

* `member.demographics.age`  
* `member.coverage.requestedSumAssured`  
* `productPlan.eligibility.minimumAgeAtEntry`  
* `underwriting.fcl.band`  
* `reinsurance.reinsurerRequired`  
* `workflow.routeId`

This is the most important layer.

Why:

* it removes ambiguity  
* it makes dependencies explicit  
* it separates raw facts from derived facts  
* it lets multiple catalogs talk about the same field consistently

So in practice:

* **FactType \= grouping**  
* **FactRef \= truth**

---

## **3\. Fact contract layer**

This is the metadata attached to each `FactRef`.

It answers:

* what type is this value  
* where does it come from  
* is it derived or raw  
* can it be null  
* what happens if it is missing  
* what unit does it use

Example shape:

```json
{
  "factType": "MemberContext",
  "dataType": "integer",
  "unit": "years",
  "nullable": false,
  "derived": false,
  "sourcePath": "member.age",
  "missingPolicy": "FAIL_REQUIRED"
}
```

That gives the engine enough structure to evaluate safely.

### **Meaning of the fields**

**`factType`**  
The broad context bucket the fact belongs to.

**`dataType`**  
The value type:

* `string`  
* `integer`  
* `decimal`  
* `boolean`  
* `date`  
* `money`  
* `list<string>`

**`unit`**  
Used where numeric values need semantic meaning:

* `years`  
* `days`  
* `INR`  
* `PERCENT`

**`nullable`**  
Whether null/missing is allowed structurally.

**`derived`**  
Whether this fact is:

* raw input / source data \= `false`  
* produced by rules/derivation \= `true`

This is critical.

Example:

* `member.demographics.age` → raw  
* `member.derived.eligibility.isEligible` → derived

**`sourcePath`**  
Where the value comes from in source payload or intermediate model.

Examples:

* `member.age`  
* `quote.effectiveDate`  
* `product.maximumAgeAtEntry`  
* `pricing_trace.warnings.length`

**`missingPolicy`**  
What to do if the fact is absent.

Examples used in the converted files:

* `FAIL_REQUIRED`  
* `ALLOW_UNKNOWN`  
* `DEFAULT_FALSE`  
* `DEFAULT_ZERO`  
* `ALLOW_EMPTY`

This is one of the biggest upgrades over a thin fact model.

---

# **How the files are structured**

## **A. Registry file**

The file `00_facttype_registry_gtl.json` is the master dictionary.

It has 2 main parts:

### **`fact_types`**

This defines the top-level buckets.

Example shape:

```json
{
  "factType": "MemberContext",
  "description": "Member-level input facts from census/proposal.",
  "entity": "Member",
  "scope": "member"
}
```

This means:

* `factType` \= canonical bucket name  
* `entity` \= business entity  
* `scope` \= execution scope

### **`facts`**

This is the central dictionary of canonical `FactRef`s.

Example:

```json
"quote.businessProcess.code": {
  "factType": "QuoteContext",
  "dataType": "string",
  "nullable": false,
  "derived": false,
  "sourcePath": "quote.keyData.businessType",
  "missingPolicy": "FAIL_REQUIRED"
}
```

So the registry is basically:

* available fact buckets  
* available canonical fact refs  
* metadata for each fact ref

That is your **global language** for the rule side.

---

## **B. Each converted catalog**

Each converted catalog has its own local structure.

Example pattern:

```json
{
  "catalog_id": "...",
  "source_catalog_id": "...",
  "decision_name": "...",
  "fact_contract": { ... },
  "rules": [ ... ]
}
```

### **`catalog_id`**

The ID of the converted catalog.

### **`source_catalog_id`**

The original catalog it came from.

### **`decision_name`**

The logical decision this catalog supports.

Examples:

* `EligibilityDecision`  
* `EvidencePlanningDecision`  
* `QuoteValidationDecision`  
* `WorkflowRoutingDecision`

### **`fact_contract`**

This is the **catalog-local subset** of the registry.

Important: this is not meant to redefine the whole universe.  
It defines only the facts relevant for that catalog.

So:

* the registry \= global universe  
* the catalog `fact_contract` \= local input/output contract for that decision

That is the right split.

---

# **How a rule is represented now**

Take the eligibility conversion. A rule looks like this:

```json
{
  "rule_id": "ELIG.AGE.MIN",
  "scope": "member",
  "factTypes": [
    "MemberContext",
    "ProductPlanContext"
  ],
  "factRefs": [
    "member.demographics.age",
    "productPlan.eligibility.minimumAgeAtEntry"
  ],
  "condition": {
    "expressionSource": "age >= plan.min_age_at_entry",
    "normalizedSource": "member.demographics.age >= productPlan.eligibility.minimumAgeAtEntry"
  },
  "outputs": {
    "onPass": [
      {
        "factRef": "member.derived.eligibility.isEligible",
        "value": true,
        "dataType": "boolean"
      }
    ],
    "onFailure": {
      "setDerivedFacts": [
        {
          "factRef": "member.derived.eligibility.isEligible",
          "value": false,
          "dataType": "boolean"
        }
      ],
      "appendReasonCodes": [
        "RC.GTL.ELIGIBILITY.AGE_BELOW_MIN"
      ]
    }
  }
}
```

## **What is happening here**

### **`scope`**

Tells you the evaluation grain:

* member  
* quote  
* scheme  
* route  
* etc.

### **`factTypes`**

Broad buckets involved in this rule.

This is for:

* grouping  
* quick filtering  
* understanding context families

But not enough for execution by itself.

### **`factRefs`**

These are the exact fields consumed by the rule.

This is the real dependency contract.

### **`condition`**

There are two useful forms:

**`expressionSource`**  
Close to original business/runtime syntax.

**`normalizedSource`**  
Canonical form using `FactRef`s.

That is very useful because it preserves both:

* human-origin shape  
* canonical execution meaning

### **`outputs`**

This explicitly tells what the rule writes.

That is another major improvement.

Instead of mutating a generic bag, the rule now says:

* set this derived fact  
* append these reason codes

So output ownership is much clearer.

---

# **Raw facts vs derived facts**

This is one of the most important parts of the structure.

The conversion deliberately separates:

## **Raw facts**

Input/source values.

Examples:

* `member.demographics.age`  
* `scheme.type`  
* `quote.effectiveDate`  
* `member.coverage.requestedSumAssured`

## **Derived facts**

Produced by engines.

Examples:

* `member.derived.eligibility.isEligible`  
* `member.derived.eligibility.failureCodes`  
* `underwriting.fcl.band`  
* `evidence.selectedSetId`  
* `reinsurance.reinsurerRequired`  
* `workflow.routeId`

This separation matters because otherwise everything becomes one mutable bag.

---

# **Why `FactTypes` alone are not enough**

Because a rule like eligibility often spans multiple contexts.

Example:

* `member.demographics.age` → `MemberContext`  
* `productPlan.eligibility.minimumAgeAtEntry` → `ProductPlanContext`

If you only stored:

```json
"factTypes": ["MemberContext"]
```

you would lose half the real meaning.

That is why the converted structure always uses both:

* `factTypes` for broad grouping  
* `factRefs` for precise semantics

---

# **Why the structure is better than the original**

The original catalogs were mostly closer to:

* business expressions  
* stage-specific configs  
* thinner field references

The converted structure adds 5 things the original did not express strongly enough:

## **1\. Canonical naming**

Every important field now has a stable `FactRef`.

## **2\. Explicit contracts**

Each decision says which facts it needs and produces.

## **3\. Raw vs derived separation**

This prevents hidden mutation chaos.

## **4\. Missing-data behavior**

Facts now declare how absence should be handled.

## **5\. Cross-catalog consistency**

Eligibility, evidence, validation, RI, and workflow can all refer to the same facts the same way.

---

# **How to read the facttype structure correctly**

The clean mental model is:

## **Level 1: business area**

`MemberContext`, `SchemeContext`, `WorkflowContext`

## **Level 2: exact fact**

`member.demographics.age`, `workflow.routeId`

## **Level 3: field semantics**

type, unit, source, nullability, missing policy, derived/raw

## **Level 4: decision usage**

which catalog consumes it, which rule writes it

That is the full structure.

---

# **What the manifest file is doing**

The file `08_rule_catalog_gtl.facttyped_manifest.json` is not a rule catalog itself.

It is a **pack/stage manifest**.

It tells you:

* what stages exist  
* which engine owns each stage  
* what each stage produces

Example:

* `SCHEME_ELIGIBILITY` → `RuleDecisionEngine` → produces `member.derived.eligibility.*`  
* `SUM_ASSURED` → `RuleDecisionEngine`  
* `FCL_CLASSIFICATION` → `RuleDecisionEngine`  
* `WORKFLOW_ROUTING` → `ModuleOrchestrator`

That means the manifest is describing **execution packaging**, not fact definition.

So the full picture is:

* registry \= global fact language  
* catalog \= decision-specific fact contract and logic  
* manifest \= pack/stage layout

---

# **Bottom line**

The facttype structure is:

## **1\. `FactType`**

Broad context bucket  
Example: `MemberContext`

## **2\. `FactRef`**

Precise canonical field  
Example: `member.demographics.age`

## **3\. `Fact contract`**

Execution metadata  
Example: type, unit, sourcePath, nullable, derived, missingPolicy

## **4\. `Rule/decision contract`**

Which facts are consumed and produced in a catalog

That is why this is much stronger than the earlier thin model.

The most important point is this:

**FactType is only the bucket. FactRef is the real semantic key.**

If you want, I can next turn this into a single visual mapping table:

**Original field | Converted FactType | Converted FactRef | Raw/Derived | SourcePath | MissingPolicy | Used In Catalogs**

# Workflows

**Bottom line:** from our quotation, PAS, accounting, CCM, rules, and workbench perspective, the Workflow Patterns lens is exactly the right one. It shows why a simple BPMN-style flow is not enough for us. The official catalog spans basic control-flow, advanced branching/synchronization, structural, multiple-instance, state-based, cancellation, and newer control-flow patterns, and the revised control-flow set contains 43 patterns. The standard evaluations also show that notations usually handle the basics, but often weaken around milestone/state semantics, general synchronizing merges, interleaved routing, critical sections, and dynamic multi-instance behavior. ([Workflow Patterns](https://workflowpatterns.com/sitemap/index.php?utm_source=chatgpt.com))

## **What matters for our modules**

### **1\) Basic control-flow patterns**

Sequence, parallel split, synchronization, exclusive choice, and simple merge are not the problem area for us. Quotation, PAS, accounting, and CCM all obviously need them, and the workflow literature treats these as the elementary baseline. ([Workflow Patterns](https://www.workflowpatterns.com/documentation/documents/BPM-06-22.pdf?utm_source=chatgpt.com))

### **2\) Advanced branching and synchronization**

This is where our platform starts getting real. Multi-choice, synchronizing merge, multi-merge, discriminator, interleaved routing, and milestone-like gating matter much more than “draw a process with a few gateways.” The standard evaluations show that even mainstream standards have uneven support here: BPMN supports structured synchronizing merge, but has partial support for the structured discriminator, and BPMN’s evaluation snippet explicitly says interleaved parallel routing is unsupported and milestone is unsupported because there is no support for states. ([Workflow Patterns](https://www.workflowpatterns.com/evaluations/standard/bpmn.php?utm_source=chatgpt.com))

**Our read:**  
Quotation and PAS are **not** basic split/join flows. They are rich conditional coordination flows:

* quote intake can fan out to census validation, claims normalization, eligibility checks, rate retrieval, UW referral, broker correction, and document completeness checks;  
* policy servicing can fan out to PAS mutation, accounting impact, certificate/document regeneration, partner notifications, and maker-checker approval;  
* some branches are mandatory, some optional, and some should continue only after the *right subset* completes.

That means we need real synchronizing-merge/discriminator semantics, not ad hoc “wait for all” or “continue on first event” code.

### **3\) Multiple-instance patterns**

The Workflow Patterns catalog distinguishes between multiple instances with a priori run-time knowledge and those **without** a priori run-time knowledge. That distinction is central for us because insurer workloads are full of dynamic fan-out: census members, dependents, certificates, riders, document packs, accounting lines, claim records, endorsement items, and downstream notifications. The standard evaluations also show dynamic multi-instance support is much weaker than basic flow support. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/multiple_instance/wcp14.php?utm_source=chatgpt.com))

**Our read:**  
This is one of the biggest pattern gaps in insurer systems.

* **Quotation:** census ingestion, dependent expansion, experience-rating records, multiple quote scenarios.  
* **PAS:** member-wise issuance, rider-wise servicing, bulk endorsement rows, certificate generation.  
* **CCM:** per-recipient/per-document/per-channel dispatch.  
* **Accounting:** per-event journal line creation, allocations, reversals.

If closure is decided chunk-by-chunk instead of case-wide, or if downstream completion is inferred from partial batches, the workflow is wrong even if every individual service “works.”

### **4\) State-based patterns**

The control-flow catalog explicitly treats **deferred choice**, **interleaved parallel routing**, and **milestone** as state-based patterns. Deferred choice means the process waits and the environment determines which path fires; milestone means an activity is enabled only when a particular state has been reached. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/?utm_source=chatgpt.com))

**This is critical for our target architecture.**

* **Quotation:** wait for corrected census vs expiry vs underwriter override vs broker resubmission.  
* **PAS:** payment success vs timeout vs failure; endorsement approval vs rejection; renewal accepted vs lapsed; evidence received vs case expired.  
* **Accounting:** only post when the PAS state is authoritative and the financial milestone is truly reached.  
* **CCM:** send the right document only after policy/endorsement/cancellation reaches the correct business milestone.

This is why I do **not** think “BPMN diagram first, runtime later” is enough. The BPMN evaluation on the Workflow Patterns site explicitly flags milestone/state support as weak. ([Workflow Patterns](https://www.workflowpatterns.com/evaluations/standard/bpmn.php?utm_source=chatgpt.com))

### **5\) Cancellation and compensation**

The Workflow Patterns material separates cancellation patterns such as **cancel activity** and **cancel case** and also introduces newer patterns like **cancel region**. The exception-handling material also distinguishes rollback from compensation and notes that compensation is needed to semantically undo already-committed effects. ([Workflow Patterns](https://workflowpatterns.com/sitemap/index.php?utm_source=chatgpt.com))

**Our read:**  
This is absolutely essential for PAS, accounting, and CCM.

* a superseded quote must cancel stale review tasks, stale approvals, and stale document-generation requests;  
* a rejected endorsement must cancel pending downstream work;  
* a completed accounting action usually cannot be “deleted” and instead needs reversal/compensation;  
* a wrongly triggered certificate/comms flow must be cancellable if the business case is later invalidated.

If this is not designed explicitly, the platform will accumulate duplicate postings, duplicate documents, and orphaned work items.

### **6\) Data patterns**

The Workflow Patterns initiative also defines workflow **data patterns**, including task data, scope/block data, task-to-task data interaction, and **data-based routing**. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/data/?utm_source=chatgpt.com))

**Our read:**  
Quotation and PAS are heavily data-routed systems.

* product/rider selection drives branch activation;  
* risk attributes determine evidence orchestration and referrals;  
* policy state and endorsement type determine accounting and CCM behavior;  
* the same business case moves through multiple bounded contexts but must preserve deterministic case truth.

So the workflow engine cannot rely on loose request payloads. It needs a durable case data model, versioned snapshots, and explicit data handoff rules.

### **7\) Resource patterns**

The resource-pattern catalog covers direct distribution, role-based distribution, deferred distribution, authorization, separation of duties, retain-familiar, capability-based distribution, and related work-allocation controls. The resource papers also note that direct and role-based allocation are standard, while separation of duties is a distinct pattern that often needs explicit support. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/resource/?utm_source=chatgpt.com))

**Our read:**  
This is the workbench/maker-checker/UW-ops heart of the platform.

* **Quotation workbench:** assign to UW, actuarial reviewer, ops reviewer, approver.  
* **PAS servicing:** maker-checker, role-restricted approvals, escalation.  
* **Claims/legal/exception cases:** retain-familiar and capability-based assignment.  
* **Governance:** separation of duties so the same person does not author and approve a sensitive servicing or pricing change in the same case.

If this stays as UI-only or IAM-only logic and is not embedded into workflow/task allocation semantics, controls will be cosmetic.

## **Module-by-module verdict**

### **Quotation module**

This is a **pattern-heavy orchestration domain**, not a CRUD front end. It needs dynamic multiple instances, data-based routing, deferred choice, milestone gating, and resource allocation. The highest-risk failure modes are stale quote versions, incorrect batch closure, partial fan-in, and weak underwriter assignment semantics. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/multiple_instance/wcp15.php?utm_source=chatgpt.com))

### **PAS**

PAS is the hardest module from a workflow-pattern perspective. Issuance, endorsement, cancellation, switch, renewal, and reinstatement all need state-based control, cancellation/compensation, and authoritative milestone gates. PAS cannot just emit events and hope downstream modules sort themselves out. It must define the canonical business state transitions. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/?utm_source=chatgpt.com))

### **Accounting**

Accounting is less about fancy routing and more about **critical section, trigger durability, milestone correctness, and compensation**. Journal posting must happen once, in the right order, against authoritative PAS state, with reversals when business actions are unwound. This is not a loose async subscriber problem. ([Workflow Patterns](https://www.workflowpatterns.com/evaluations/standard/?utm_source=chatgpt.com))

### **CCM**

CCM needs persistent triggers, cancellation, multiple instances, and milestone-aware dispatch. It must handle “send later,” “retry later,” “don’t send if case got invalidated,” and “regenerate artifacts when state changed.” That is workflow semantics, not just notification plumbing. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/new/wcp24.php?utm_source=chatgpt.com))

### **Rules/rating/workbench**

These are dominated by data and resource patterns. Data-based routing drives the branch logic; resource patterns govern allocation, reviewer assignment, maker-checker, SoD, and escalation. If we build this as only a rules engine plus screens, it will still miss actual work distribution control. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/data/routing/wdp40.php?utm_source=chatgpt.com))

## **What this means for our architecture**

The right interpretation for our platform is:

* **Temporal/orchestration layer** should own long-running workflow semantics: waits, timers, signals, durable event choice, fan-out/fan-in, retry policy, cancellation scopes, and compensation coordination.  
* **Domain services** should own domain truth and side effects: quotation truth, PAS truth, accounting truth, CCM truth.  
* **UI/workbenches** should never be the real orchestrator.  
* **Every major case** should have explicit case state, milestone state, task state, cancellation scope, compensation map, and idempotency keys.

## **Direct verdict**

From the Workflow Patterns perspective, our overall direction is right **only if** we treat workflow as a first-class runtime discipline.

If we reduce it to:

* a few BPMN diagrams,  
* some async events,  
* a maker-checker UI,  
* and service-local retry logic,

then quotation, PAS, accounting, and CCM will all look fine in demos and still fail in production on the exact pattern areas the Workflow Patterns research calls out as hard: dynamic multi-instance execution, milestone/state gating, cancellation regions, compensation, and constrained human task allocation. ([Workflow Patterns](https://www.workflowpatterns.com/evaluations/standard/?utm_source=chatgpt.com))

# Pattern Matrix

Below is the matrix I would use for our target-state architecture.

The Workflow Patterns catalog spans control-flow, multiple-instance, state-based, cancellation, data, and resource perspectives. For our stack, the high-value patterns are dynamic multiple instances, milestone/state gating, cancellation scopes, data-based routing, role-based distribution, and separation of duties. The site’s standard-evaluation framework rates patterns as directly supported, partially supported, or unsupported, and the BPMN evaluation snippet explicitly calls out weak support for interleaved parallel routing and milestone/state semantics. ([Workflow Patterns](https://www.workflowpatterns.com/evaluations/standard/?utm_source=chatgpt.com))

### **Legend**

* **Need**: H \= critical, M \= important, L \= useful but not core  
* **Owner layer**:  
  * **Orch** \= orchestration layer / Temporal  
  * **Domain** \= quotation / PAS / accounting / CCM / rules service  
  * **UI** \= portal/workbench only  
* **Current gap** \= where our current direction is most likely to break

## **Pattern matrix**

| Workflow pattern | Quotation | PAS | Accounting | CCM | Rules | Portal / Workbench | Primary owner layer | Current gap |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| **Sequence / simple routing** | H | H | H | H | M | M | Domain \+ Orch | Mostly fine; not the real bottleneck |
| **Parallel split / synchronization** | H | H | M | H | M | L | Orch | Easy to model, but fan-in correctness is often weak |
| **Exclusive choice / simple merge** | H | H | H | H | H | M | Domain | Fine in principle; must be driven by authoritative case data |
| **Multi-choice / conditional parallelism** | H | H | M | H | H | M | Orch \+ Domain | Branch activation is often scattered across services/UI instead of centrally governed |
| **Synchronizing merge / partial join** | H | H | M | H | M | L | Orch | One of the biggest risk areas; wrong “wait for all” vs “wait for relevant subset” logic |
| **Discriminator / first-completer continuation** | M | H | L | M | L | L | Orch | Needed for “continue after first viable path” flows; usually approximated badly |
| **Multiple instances with known cardinality** | H | H | H | H | M | L | Orch \+ Domain | Straightforward only if batch closure is aggregate, not chunk-local |
| **Multiple instances without prior run-time knowledge** | H | H | M | H | L | L | Orch | Critical for census/member/certificate/document fan-out; common production failure point |
| **Deferred choice** | H | H | M | M | L | M | Orch | Needed where environment/event decides next path; often faked with brittle polling or UI logic |
| **Interleaved parallel routing** | M | M | L | L | M | M | Orch | Needed where tasks can happen in any order but not simultaneously; rarely modeled explicitly |
| **Milestone / state gating** | H | H | H | H | M | M | Orch \+ Domain | Core gap today; many downstream actions should only fire after true business-state milestones |
| **Cancel activity / cancel case** | H | H | M | H | L | M | Orch | Superseded quotes, invalidated endorsements, expired tasks need durable cancellation |
| **Cancel region** | M | H | M | H | L | L | Orch | Essential for stopping one branch set without killing the whole case |
| **Compensation / semantic undo** | M | H | H | M | L | L | Orch \+ Domain | Major PAS/accounting gap; reversal logic must be explicit, not “delete and retry” |
| **Persistent trigger** | H | H | H | H | M | L | Orch | Required for wait-for-event patterns that must survive restarts and delays |
| **Data-based routing** | H | H | H | H | H | M | Domain \+ Orch | Must be driven by canonical case data, not caller payloads or UI-side conditions |
| **Data-based task trigger** | H | H | M | H | H | M | Orch \+ Domain | Useful for evidence requests, document creation, referrals, and exception reviews |
| **Role-based distribution** | H | H | M | M | M | H | Orch \+ UI | Work allocation exists conceptually, but often not embedded deeply enough in workflow semantics |
| **Direct distribution** | M | M | M | M | M | H | UI \+ Orch | Fine for named approvals/escalations; lower-order problem |
| **Deferred allocation / pull assignment** | H | H | L | L | M | H | Orch \+ UI | Needed for ops/UW queues; often missing real queue semantics |
| **Separation of duties** | M | H | H | M | H | H | Orch \+ IAM/UI | Critical control gap if enforced only cosmetically in UI |
| **Retain familiar / same handler continuity** | M | H | M | L | M | H | Orch \+ UI | Important for servicing and exception cases; often absent in first-cut workbench designs |
| **Escalation / reallocation** | H | H | M | M | M | H | Orch \+ UI | Required for SLA-driven workbenches, but usually under-specified |
| **Critical section / serialized mutation zone** | M | H | H | M | M | L | Domain \+ Orch | Very important where concurrent endorsements, postings, or document rebuilds can race |

## **Module-wise readout**

### **1\) Quotation**

**Most critical patterns:**  
multiple instances, synchronizing merge, deferred choice, milestone gating, data-based routing, deferred allocation.

**Why:**  
Quotation is a case orchestration problem, not a simple request-response flow. Census rows, claims rows, scenario variants, underwriting referrals, correction loops, and approval tasks all create dynamic fan-out and delayed branching. The Workflow Patterns catalog explicitly distinguishes multiple instances with and without prior run-time knowledge, and that distinction maps directly to insurer intake and pricing workloads. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/multiple_instance/wcp15.php?utm_source=chatgpt.com))

**Current gap:**  
The biggest likely defect is **false closure**: chunk-level progress being mistaken for case-level completion. The second is **UI-led orchestration**, where workbench state drifts from orchestration truth.

### **2\) PAS**

**Most critical patterns:**  
milestone/state gating, cancel region, cancel case, compensation, critical section, synchronizing merge.

**Why:**  
PAS servicing flows are where workflow semantics become real business risk. Issuance, endorsement, cancellation, switch, reinstatement, and renewal all depend on correct case state, scoped cancellation, and durable downstream coordination. The milestone pattern is explicitly about allowing execution only before or while a specific business condition/state holds. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/state/wcp18.php?utm_source=chatgpt.com))

**Current gap:**  
The hardest PAS problem is not screen flow. It is ensuring that only the correct downstream actions fire after the authoritative PAS milestone is reached, and that already-triggered side effects can be compensated if the servicing decision changes.

### **3\) Accounting**

**Most critical patterns:**  
milestone gating, compensation, persistent trigger, critical section, separation of duties.

**Why:**  
Accounting does not need the richest branching catalog, but it absolutely needs correct trigger timing and semantic undo. A posting should happen once, against authoritative business state, and reversals should be first-class. Cancellation of a case disables active work, but financial actions often require compensation rather than disappearance. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/control/cancellation/wcp20.php?utm_source=chatgpt.com))

**Current gap:**  
If accounting is treated as “just another event consumer,” you will get duplicate posts, out-of-order posts, and weak reversal discipline.

### **4\) CCM**

**Most critical patterns:**  
multiple instances, milestone gating, persistent trigger, cancel activity/cancel region, data-based task trigger.

**Why:**  
CCM is a workflow system, not just a notification system. One servicing case may generate multiple artifacts, recipients, channels, retries, and timing conditions. Persistent triggers matter because the system must survive waits, retries, and delayed external readiness. The standard pattern set explicitly includes transient and persistent trigger families in the revised view. ([Workflow Patterns](https://www.workflowpatterns.com/documentation/documents/BPM-06-22.pdf?utm_source=chatgpt.com))

**Current gap:**  
Without milestone-aware dispatch and cancellation scopes, CCM will send stale or duplicate documents.

### **5\) Rules / Rating**

**Most critical patterns:**  
data-based routing, data-based task trigger, separation of duties, role-based distribution.

**Why:**  
Rules are primarily data- and governance-heavy. The Workflow Data Patterns material treats data-based routing as the ability to alter control flow based on evaluated data expressions, which is exactly what product, benefit, waiting period, evidence, and pricing logic do for us. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/data/routing/wdp40.php?utm_source=chatgpt.com))

**Current gap:**  
The risk is that rules are treated as pure evaluation engines, while approvals, simulations, overrides, and deployment controls remain loosely coupled and weakly governed.

### **6\) Portal / Workbench**

**Most critical patterns:**  
role-based distribution, deferred allocation, separation of duties, retain familiar, escalation/reallocation.

**Why:**  
This is the resource-pattern-heavy module. The resource-pattern catalog explicitly includes role-based distribution and separation of duties, and the broader resource-pattern literature notes that direct and role-based allocation are common, while richer allocation/control patterns vary much more by platform. ([Workflow Patterns](https://www.workflowpatterns.com/patterns/resource/creation/wrp2.php?utm_source=chatgpt.com))

**Current gap:**  
A polished UI alone does not solve workflow control. If queues, assignments, SoD, escalations, and familiar-handler continuity are not enforced by orchestration and task semantics, the workbench becomes cosmetic.

## **What should own what**

### **Orchestration layer / Temporal should own**

* waits, timers, signals, reminders  
* fan-out / fan-in  
* partial joins and discriminators  
* deferred choice  
* persistent triggers  
* cancellation scopes  
* compensation choreography  
* SLA escalation clocks  
* task lifecycle state

### **Domain services should own**

* business-state truth  
* data validation and invariant checks  
* authoritative milestones  
* side effects within their bounded context  
* idempotent command handling  
* compensation actions they can legally perform

### **UI / workbench should own**

* queue presentation  
* user actions  
* approval and review surfaces  
* operator productivity controls

But the UI should **not** be the real orchestrator.

## **Direct verdict**

If I compress the matrix into one line:

**Quotation and PAS are orchestration-heavy. Accounting is trigger/compensation-heavy. CCM is multi-instance \+ cancellation-heavy. Rules and Portal are data/resource-control-heavy.**

That means our architecture is only sound if:

* orchestration is durable and stateful,  
* PAS owns authoritative milestones,  
* accounting and CCM are not loose async afterthoughts,  
* and work allocation is enforced as workflow semantics, not just UI behavior.

The next artifact I would create is a **target-state ownership matrix**:

**Pattern × Temporal/orchestration × Quotation service × PAS × Accounting × CCM × Rules × Workbench × IAM/control**

That will make the implementation boundaries explicit.

# Authoring

Yes. The right answer is **not BPMN-driven runtime**.

Use **BPMN as a visual communication layer**, not as the executable source of truth. BPMN is meant to provide a business-readable graphical notation and bridge business design with implementation, but the Workflow Patterns evaluations show weak spots exactly where your platform is hardest: milestone/state semantics, interleaved routing, and richer synchronization behavior. The Workflow Patterns program also treats dynamic multiple-instance behavior as a first-class concern, including cases where the number of instances is only known at runtime. ([omg.org](https://www.omg.org/bpmn/))

For your stack, the executable center should be **a layered authoring model**:

* **catalogs** for domain truth,  
* **DMN** for business decisions,  
* **explicit state machines** for lifecycle truth,  
* **a typed orchestration spec** compiled to durable runtime workflows,  
* and **BPMN generated from that model** for human review.  
  That fits the standards better too: DMN is explicitly designed to work alongside BPMN/CMMN and to model decision requirements, decision tables, and executable decision logic, while Temporal’s workflow model is code-defined, durable, replayable, deterministic, timer-aware, signal-aware, and built for long-running executions. ([omg.org](https://www.omg.org/spec/DMN/1.4/About-DMN))

## **Direct recommendation**

Build a **hybrid authoring architecture**:

**1\. BPMN for**

* business walkthroughs,  
* design reviews,  
* onboarding,  
* dependency visualization,  
* approval documentation,  
* regulator/client communication.

**2\. DMN for**

* eligibility,  
* pricing,  
* routing decisions,  
* closure decisions,  
* posting derivation,  
* communication selection,  
* evidence requirements,  
* approval thresholds.

**3\. State-machine catalogs for**

* quote state,  
* batch state,  
* row state,  
* policy state,  
* endorsement state,  
* accounting event state,  
* journal state,  
* CCM trigger/plan/job/receipt states.

**4\. Orchestration spec for**

* timers,  
* waits,  
* signals,  
* fan-out/fan-in,  
* partial joins,  
* cancellation scopes,  
* compensation plans,  
* retries,  
* escalation,  
* human-task creation,  
* child workflow boundaries.

**5\. Temporal as runtime**

* to execute the long-running workflow behavior durably and deterministically. ([docs.temporal.io](https://docs.temporal.io/workflows))

## **Why pure BPMN is the wrong center**

BPMN is useful, but it is the wrong place to make your runtime truth live.

### **1\) Your hardest problems are not drawing problems**

They are:

* dynamic batch/member/document fan-out,  
* milestone-gated downstream actions,  
* cancellation of only part of a case,  
* compensation for already-fired side effects,  
* human allocation and maker-checker,  
* and versioned business policy.  
  Those are exactly the areas where the workflow-pattern literature becomes important and where standard BPMN support is weaker or only partial. ([workflowpatterns.com](https://www.workflowpatterns.com/evaluations/standard/bpmn.php?utm_source=chatgpt.com))

### **2\) BPMN tends to hide case state**

Your insurer flows are not just “token moved from task A to task B.”  
They are “the case is in a milestone-valid state, with authoritative PAS truth, after a particular decision version, with a specific compensation posture, and a set of outstanding child obligations.”  
That is better modeled through explicit lifecycle/state catalogs plus orchestration rules than through BPMN XML as the primary truth. This is an inference from the Workflow Patterns emphasis on milestone/state and multiple-instance behavior, and from Temporal’s event-history/replay model. ([workflowpatterns.com](https://www.workflowpatterns.com/patterns/control/state/wcp18.php?utm_source=chatgpt.com))

### **3\) BPMN runtime often becomes tool-driven instead of domain-driven**

If BPMN becomes the main authoring surface, people start forcing domain behavior into gateway diagrams. That usually creates:

* unreadable diagrams,  
* logic split across BPMN, scripts, Java delegates, and database flags,  
* poor versioning,  
* and weak testability.  
  For your platform, that will get ugly fast across quotation, PAS, accounting, and CCM.

## **What should be the actual authoring model**

You already have the beginnings of the right direction in the uploaded bundle: there are separate catalogs for batch closure, accounting trigger policy, accounting event states, posting playbooks, CCM trigger states, and manual-action policies. That is good. The problem is that this needs to be turned into a deliberate authoring system, not a growing collection of JSON files.

Use **five authoring layers**.

---

## **Layer 1: Canonical business catalogs**

These define the vocabulary of the system. No workflow engine should invent these.

Examples:

* TermDictionary  
* ClauseCatalog  
* ConstraintCatalog  
* ReasonCodeRegistry  
* EventVocabulary  
* CaseTypeRegistry  
* RoleRegistry  
* ChannelRegistry  
* ProductCodeRegistry  
* EvidenceTypeRegistry  
* ManualActionRegistry  
* CompensationActionRegistry

These are the base primitives every other artifact references.

**Rule:** no workflow, DMN, or state machine is allowed to use free-text identifiers. Everything references catalog IDs.

---

## **Layer 2: Decision services**

Use **DMN or DMN-like decision tables** for pure determinations.

Good fits:

* eligibility  
* premium derivation  
* decision lane routing  
* batch closure status  
* whether accounting is required  
* which posting playbook to use  
* whether comms should be suppressed  
* approval required yes/no  
* maker-checker threshold  
* retry policy selection  
* compensation path selection

DMN is a strong fit here because it is built for decision requirements graphs, reusable decision services, and decision tables. It should not own timers, waits, callbacks, or long-running orchestration. ([omg.org](https://www.omg.org/spec/DMN/1.4/About-DMN))

**Rule:** if the logic is a pure function of inputs and policy tables, it belongs in DMN.  
If it waits, retries, signals, cancels, or spans time, it does **not** belong in DMN.

---

## **Layer 3: Lifecycle/state-machine catalogs**

This is the part many teams skip and regret later.

Every durable business object needs an explicit state model:

* QuoteCase  
* Batch  
* EnrolmentRow  
* Policy  
* EndorsementCase  
* AccountingEvent  
* Journal  
* CommTrigger  
* CommPlan  
* MessageJob  
* ManualReviewTask

Each state machine should define:

* states,  
* allowed transitions,  
* transition guards,  
* transition commands/events,  
* invariants,  
* terminal states,  
* compensation eligibility,  
* reopen/retry rules,  
* audit requirements.

This is where milestone truth should live. The Workflow Patterns milestone concept is precisely why this matters: actions should only be enabled while a defined state condition holds. ([workflowpatterns.com](https://www.workflowpatterns.com/patterns/control/state/wcp18.php?utm_source=chatgpt.com))

**Rule:** BPMN cannot be the only place where state is implied. State must be explicit and versioned.

---

## **Layer 4: Orchestration specification**

This is the heart of the system.

Do **not** author long-running workflow behavior directly in BPMN first.  
Author it in a **typed orchestration DSL** that compiles to Temporal workflows.

The DSL should define:

* workflow type,  
* case keys and idempotency keys,  
* start conditions,  
* stages,  
* child workflows,  
* signals/messages consumed,  
* timers,  
* joins,  
* cancellation scopes,  
* compensation plan,  
* manual tasks,  
* escalation policies,  
* emitted commands/events,  
* projections to update,  
* observability tags.

A minimal shape should look like this:

```
workflowType: QUOTATION_BATCH
version: 1.0.0

caseIdentity:
  aggregate: QuoteBatch
  keys: [tenantId, batchId]
  idempotencyKey: intakeRequestId

start:
  command: START_BATCH_PROCESSING
  preconditions:
    - state(QuoteBatch) == RECEIVED

stages:
  - code: NORMALIZE_INPUT
    kind: activity
    action: normalizeIntakeFile

  - code: EXPAND_ROWS
    kind: fanout
    foreach: batch.rows
    childWorkflow: ENROLMENT_ROW_PROCESS

  - code: WAIT_FOR_ROWS
    kind: join
    mode: dynamic_partial_join
    completionDecisionRef: dmn.batchClosureResolution

  - code: ESCALATE_REVIEW
    kind: manual_task
    when: dmn.reviewEscalationNeeded == true
    taskTemplate: UW_REVIEW

  - code: ISSUE_TO_PAS
    kind: activity
    when: state(QuoteBatch) in [CLOSABLE, PARTIALLY_CLOSABLE]

timers:
  - code: REVIEW_SLA
    startsAt: taskCreated(UW_REVIEW)
    duration: PT4H
    onExpiry: ESCALATE_TO_MANAGER

cancellationScopes:
  - code: SUPERSEDED_BATCH
    cancels:
      - pending child workflows
      - open review tasks
      - unsent comm plans

compensation:
  - if: PAS_ISSUED and ACCOUNTING_POSTED and caseCancelled
    actions:
      - startWorkflow: PAS_REVERSAL
      - startWorkflow: ACCOUNTING_REVERSAL
      - cancelScope: OUTSTANDING_CCM
```

That is much closer to what you need than raw BPMN XML.

---

## **Layer 5: Visual projections**

From the above artifacts, generate:

* BPMN review diagrams,  
* state diagrams,  
* dependency graphs,  
* DRDs,  
* task swimlanes,  
* audit flow views.

That keeps BPMN valuable without making it your runtime trap.

## **What gets authored by whom**

### **Business/product/rules team**

They should author:

* term dictionaries,  
* constraint catalogs,  
* decision tables,  
* approval thresholds,  
* routing rules,  
* channel policies,  
* communication suppression policies,  
* posting mappings,  
* reason codes.

### **Ops/control team**

They should author:

* SLA catalogs,  
* escalation matrices,  
* queue allocation policies,  
* maker-checker rules,  
* exception handling policies,  
* manual action policies.

### **Architecture/platform team**

They should author:

* state machine schemas,  
* orchestration DSL schemas,  
* compiler/validator,  
* Temporal runtime bindings,  
* event contracts,  
* compensation framework,  
* test harness.

### **Engineering**

They should implement:

* activities,  
* projections,  
* adapters,  
* side-effect services,  
* UIs,  
* observability.

## **The core design principle**

Use this split:

**Decisions are declarative.**  
**State is explicit.**  
**Orchestration is durable.**  
**Side effects are activities.**  
**BPMN is generated.**

That is the cleanest model.

## **How workflows should actually be authored**

For each workflow, author in this order:

### **1\) Define the case**

Example: `QuoteBatch`, `PolicyServicingCase`, `AccountingPostingCase`, `CCMTriggerCase`.

Define:

* case keys,  
* owner aggregate,  
* lifecycle object,  
* start commands,  
* terminal outcomes.

### **2\) Define lifecycle truth**

Create state machine first:

* what states exist,  
* what transitions are legal,  
* what transition opens/closes a milestone,  
* which transitions are compensable,  
* which transitions are final.

### **3\) Define decisions**

Add DMN tables for:

* routing,  
* approval,  
* closure,  
* suppression,  
* thresholding,  
* action selection.

### **4\) Define orchestration**

Only then write:

* stages,  
* child workflow boundaries,  
* timers,  
* signals,  
* joins,  
* retries,  
* cancellation scopes,  
* compensation plan.

### **5\) Generate review views**

Auto-generate:

* BPMN diagram,  
* state chart,  
* dependency graph,  
* happy-path and exception-path sequence views.

### **6\) Simulate before publish**

Every workflow version should be simulation-tested with:

* happy path,  
* partial completion,  
* timeout,  
* duplicate signal,  
* stale response,  
* cancellation during fan-out,  
* compensation after partial downstream completion,  
* reopen/retry,  
* manual override.

## **What BPMN should still be used for**

Use BPMN for four things only:

### **1\) Business communication**

For AXA, insurer ops, finance, and business users, BPMN is still the cleanest common visual language for process walkthroughs. BPMN’s stated goal is precisely to be understandable to business users while bridging to technical implementation. ([omg.org](https://www.omg.org/bpmn/))

### **2\) Review artifact**

Before a workflow version is approved, show:

* business BPMN,  
* system BPMN,  
* exception BPMN.

### **3\) Traceability**

Link BPMN nodes to:

* state transitions,  
* DMN decisions,  
* activities,  
* event contracts,  
* UI tasks.

### **4\) Documentation export**

Use it in PRDs, solution decks, audit packs, and onboarding kits.

But do **not** make BPMN the only editable master.

## **What not to do**

Do not choose any of these three bad extremes:

### **1\) Pure BPMN runtime**

Looks elegant at first. Becomes brittle and scattered.

### **2\) Pure code-first Temporal with no declarative layer**

Technically powerful, but business ownership disappears and governance becomes weak.

### **3\) Pure JSON catalogs with no explicit lifecycle/orchestration meta-model**

Better than BPMN-only, but eventually turns into undocumented coupling between files.

## **Best target state for Anaira-style platform**

The best architecture for your modules is:

### **Authoring stack**

* **Catalog Registry** for vocabularies and mappings  
* **DMN** for decision logic  
* **Lifecycle Catalogs** for state machines  
* **WorkflowSpec DSL** for orchestration  
* **UI TaskSpec** for workbench/manual tasks  
* **Contract Catalogs** for inbound/outbound events  
* **Compensation Catalogs** for semantic undo  
* **Projection Catalogs** for read models

### **Runtime stack**

* **Temporal** for orchestration execution  
* domain services for activities and state mutation  
* outbox/inbox for event delivery  
* event store / workflow history / audit store  
* workbench service for manual tasks  
* observability layer for replayable evidence and SLA monitoring. ([docs.temporal.io](https://docs.temporal.io/workflows))

## **Concrete recommendation for your current bundle**

You should evolve the current bundle into these authoring packages:

### **A. Core common package**

* `CaseTypeRegistry`  
* `EventVocabulary`  
* `ReasonCodeRegistry`  
* `RoleAndSodRegistry`  
* `TimerPolicyCatalog`  
* `RetryPolicyCatalog`  
* `CompensationActionCatalog`

### **B. Quotation package**

* `QuoteBatchStateMachine`  
* `RowStateMachine`  
* `BatchClosureDecisionService`  
* `LaneRoutingDecisionService`  
* `QuotationWorkflowSpec`  
* `UWTaskPolicyCatalog`

### **C. PAS package**

* `PolicyLifecycleStateMachine`  
* `EndorsementLifecycleStateMachine`  
* `ServicingMilestoneCatalog`  
* `PasWorkflowSpec`  
* `ServicingCompensationCatalog`

### **D. Accounting package**

* `AccountingEventStateMachine`  
* `JournalStateMachine`  
* `PostingDecisionService`  
* `PostingWorkflowSpec`  
* `ReversalCompensationCatalog`

### **E. CCM package**

* `TriggerStateMachine`  
* `CommPlanStateMachine`  
* `MessageJobStateMachine`  
* `SuppressionDecisionService`  
* `CCMWorkflowSpec`  
* `ManualActionPolicyCatalog`

## **Governance flow**

Every artifact type should follow one publish path:

**Draft → Validate → Simulate → Approve → Publish → Activate → Observe → Roll back**

Validation should include:

* schema validation,  
* reference integrity,  
* no dangling IDs,  
* state transition legality,  
* cycle checks,  
* unreachable state checks,  
* DMN gap/overlap checks,  
* timer and escalation sanity checks,  
* compensation coverage,  
* SoD policy checks,  
* backward compatibility checks,  
* sample replay tests.

## **Final answer**

So: **should authoring be driven by BPMN?**  
**No.**

The right model is:

**BPMN for visualization and review**  
**DMN for decisions**  
**explicit state machines for lifecycle truth**  
**typed orchestration specs compiled to Temporal for execution**

That is the only approach that stays readable for business users while still handling the workflow-pattern complexity your quotation, PAS, accounting, CCM, and workbench modules actually need. ([omg.org](https://www.omg.org/bpmn/))

# Orchestration Layer

The orchestration layer is the **control plane** of the hybrid model.

It does **not** calculate premium, sum assured, FCL, evidence, or RI.  
It takes those outputs and decides:

* what state the quote is now in  
* which queue owns it  
* what users are allowed to do next  
* which downstream commands must be emitted

That is the real role.

---

# **1\. What the orchestration layer is in your hybrid pack**

In your current hybrid files, the orchestration layer is a **catalog-driven, synchronous state resolver**.

It is **not yet** a long-running workflow engine like Temporal or Camunda.

It is closer to:

**priority-based policy evaluation over compute outputs**

The main catalog is:

`orchestration_state_machine_catalog_gtl_quote.json`

Its structure is simple and explicit:

* `always_command_ids`  
* `transitions[]`  
  * `rule_id`  
  * `priority`  
  * `when`  
  * `derive`

So the framework is:

**facts in → ordered transition matching → state projection out → command list out**

---

# **2\. What it consumes**

The orchestration layer does not work from raw quote input alone. It works on the **evaluated envelope** produced by the compute layer.

Its effective inputs are:

* `quote`  
* `requiredFactorStatus`  
* `derivedArtifacts.validation`  
* `stageResults.finalDecision`  
* `stageResults.pricing`  
* `stageResults.ri`  
* `stageResults.evidence`  
* `missingInputFactors`  
* `pendingDependencies`

In plain terms:

* compute tells orchestration what happened  
* orchestration tells the system what to do about it

---

# **3\. What it produces**

The orchestration layer produces four things that matter:

## **A. Status projection**

This becomes the operational truth:

* `mainStatus`  
* `secondaryStatus`  
* `transactionStatus`  
* `lifecycleState`  
* `workbenchQueue`

Example from the clean STP case:

* `QUOTED`  
* `READY_FOR_BIND`  
* `ACTIVE`  
* `QUOTED`  
* `READY_TO_BIND`

Example from the UW case:

* `PENDING`  
* `UW_REVIEW_PENDING`  
* `ACTIVE`  
* `UNDER_UW_REVIEW`  
* `UW_REVIEW`

---

## **B. Route \+ SLA**

This is the workflow routing outcome:

* `AUTO_QUOTE`  
* `UW_REVIEW`  
* `DOC_COLLECTION`  
* `RI_REVIEW`

And associated SLA minutes.

---

## **C. Allowed actions**

This is the control of the workbench and UI policy.

For example:

Data gathering state allows:

* save draft  
* run evaluation  
* upload/request document  
* edit quote structure

UW review state allows:

* create UW task  
* apply UW decision  
* apply UW pricing

Quoted/ready state allows:

* send to PAS bind  
* requote  
* withdraw

---

## **D. Command IDs**

This is the bridge to integrations.

Examples:

* `ACC_PREMIUM_INDICATION`  
* `UW_CASE_CREATE`  
* `DOC_COLLECTION_REQUEST`  
* `PAS_BIND_QUOTE`  
* `WORKBENCH_REFRESH`

These are not free-form. They are looked up in the integration command catalog and materialized into actual payloads.

---

# **4\. The exact orchestration model in your catalog**

Your orchestration catalog currently has these state rules, in descending priority:

1. `STATE_DATA_GATHERING_VALIDATION_FAIL` — priority 100  
2. `STATE_DATA_GATHERING_REQUEST_INFORMATION` — priority 90  
3. `STATE_UW_REVIEW` — priority 80  
4. `STATE_RI_REVIEW` — priority 70  
5. `STATE_QUOTED_READY_FOR_BIND` — priority 60  
6. `STATE_REJECTED` — priority 50

This means the orchestration layer is using a **first-match-wins priority resolver**.

That is important.

It is not a graph that says “from this state, you may move only to these two next states.”  
It is an ordered policy table that says:

look at the evaluated quote, match the strongest applicable rule, then derive the operational state

That is why validation failure dominates request-information, and request-information dominates UW/RI/quoted.

---

# **5\. How matching works**

A transition has two parts:

## **`when`**

This is the guard.

Examples from your catalog:

* `validation_status_in: ["FAIL"]`  
* `decision_in: ["REQUEST_INFORMATION"]`  
* `decision_in: ["REFER_TO_UNDERWRITING", "REQUEST_EVIDENCE"]`  
* `decision_in: ["REFER_TO_REINSURER"]`  
* `decision_in: ["QUOTE_READY"]`  
* `decision_in: ["REJECT"]`

## **`derive`**

This is the state projection to emit when the guard matches.

For example, for validation failure, it derives:

* `main_status = PENDING`  
* `secondary_status = DATA_REQUIRED`  
* `lifecycle_state = DATA_GATHERING`  
* `workbench_queue = DOC_COLLECTION`  
* `route_id = DOC_COLLECTION`  
* `sla_minutes = 1440`  
* editable actions  
* command IDs for accounting, document collection, workbench refresh

So the orchestration layer is not guessing. It is applying a fixed policy artifact.

---

# **6\. Evaluation order and why it matters**

This is one of the most important design details.

Because the layer is priority-driven, if two conditions are both true, the **higher priority wins**.

That is exactly what happens in your takeover case.

## **Takeover case**

The evaluated quote contains:

* final decision \= `REQUEST_INFORMATION`  
* validation status \= `FAIL`

Both state rules could match:

* `STATE_DATA_GATHERING_VALIDATION_FAIL`  
* `STATE_DATA_GATHERING_REQUEST_INFORMATION`

But the validation-fail rule has priority 100 and the request-information rule has priority 90\.

So orchestration chooses:

* lifecycle \= `DATA_GATHERING`  
* queue \= `DOC_COLLECTION`  
* secondary status \= `DATA_REQUIRED`

This is correct, because validation failure is stronger than a softer information request.

That is the value of having orchestration separate from compute:  
you can impose **workflow precedence** over raw decision outcomes.

---

# **7\. The four orchestration outcomes in your examples**

## **A. Missing-salary case**

Compute says:

* decision \= `REQUEST_INFORMATION`

Validation is not hard fail, but the quote is incomplete.

Orchestration resolves to:

* lifecycle \= `DATA_GATHERING`  
* queue \= `DOC_COLLECTION`  
* route \= `DOC_COLLECTION`  
* actions \= edit \+ upload \+ re-run  
* commands \= accounting indication \+ DMS doc request \+ workbench refresh

Meaning:

* keep quote open  
* do not escalate to UW  
* send it back for operational correction

---

## **B. UW case**

Compute says:

* decision \= `REFER_TO_UNDERWRITING`

Orchestration resolves to:

* lifecycle \= `UNDER_UW_REVIEW`  
* queue \= `UW_REVIEW`  
* route \= `UW_REVIEW`  
* actions \= UW review actions  
* commands \= UW case creation \+ workbench refresh

Meaning:

* underwriting owns the next move  
* UI becomes review-oriented, not editing-oriented

---

## **C. Takeover fail case**

Compute says:

* decision \= `REQUEST_INFORMATION`  
* validation status \= `FAIL`

Orchestration resolves to validation-fail state because of higher priority.

Meaning:

* hard block  
* document collection and data completion first  
* no UW, no PAS, no RI progression

---

## **D. Quote-ready case**

Compute says:

* decision \= `QUOTE_READY`

Orchestration resolves to:

* lifecycle \= `QUOTED`  
* queue \= `READY_TO_BIND`  
* route \= `AUTO_QUOTE`  
* actions \= send to PAS bind, duplicate, withdraw, requote  
* commands \= accounting indication \+ PAS bind \+ workbench refresh

Meaning:

* this is an STP-ready commercial quote  
* control passes to PAS issuance flow

---

# **8\. The orchestration layer is also the action policy engine**

This is one of the biggest structural improvements in the hybrid model.

Previously, action policy was entangled with engine output and frontend projection.

Now orchestration owns action policy.

That means:

## **In `DATA_GATHERING`**

The system deliberately allows mutation:

* save  
* edit  
* upload  
* delete structure  
* rerun evaluation

## **In `UNDER_UW_REVIEW`**

The system deliberately restricts mutation and shifts into review controls:

* create UW task  
* sync UW decision  
* apply UW pricing  
* apply override

## **In `QUOTED`**

The system deliberately becomes mostly read-only with terminal actions:

* bind  
* duplicate  
* requote  
* withdraw

This is not just UI decoration. It is operational governance.

---

# **9\. How orchestration connects to the UI layer**

The orchestration layer does not render screens. It supplies the state policy that the UI consumes.

The UI contract catalog says:

* view schemas remain static and artifact-driven  
* allowed actions come from orchestration  
* editability is driven by lifecycle state  
* backend emits UI hints; frontend owns rendering

The state-mode mapping is:

* `DATA_GATHERING` → `EDITABLE`  
* `UNDER_UW_REVIEW` → `REVIEW`  
* `RI_REVIEW_REQUIRED` → `REVIEW`  
* `QUOTED` → `READ_ONLY`

So the UI contract is stable, while orchestration changes only:

* current state  
* action list  
* focus sections  
* operational emphasis

That is the right split.

---

# **10\. How orchestration connects to integrations**

This is the second major job of orchestration.

The orchestration layer does not directly call systems.  
It emits **command IDs**, and the integration command catalog defines:

* target module  
* gate ID  
* event code  
* whether to emit handoff  
* how to build payload fields

Examples:

## **`ACC_PREMIUM_INDICATION`**

Target:

* ACCOUNTING

Payload uses:

* quote version  
* currency  
* billing currency  
* gross premium  
* modal premium  
* net rate per thousand  
* status fields

## **`UW_CASE_CREATE`**

Target:

* UW

Payload uses:

* full quote context  
* provisional pricing  
* member pricing results  
* sum assured results  
* evidence decisions  
* RI status  
* validation details  
* plan runtime  
* billing profile

## **`PAS_BIND_QUOTE`**

Target:

* PAS

Payload uses:

* product  
* effective date  
* premium  
* plan runtime  
* billing profile  
* traceability candidate

## **`DOC_COLLECTION_REQUEST`**

Target:

* DMS

Payload uses:

* missing mandatory docs  
* validation errors

This means orchestration decides **which command IDs to issue**, and integration resolves **how those commands become external messages**.

That is exactly the boundary you wanted.

---

# **11\. The “always commands” concept**

Your orchestration catalog also has:

* `QUOTE_EVALUATED`  
* `QUOTE_VALIDATION_COMPLETED`  
* `QUOTE_STATUS_DERIVED`

These are always emitted regardless of final state.

That is useful because some events are informational and should always be published:

* “quote evaluated”  
* “validation completed”  
* “status derived”

Then state-specific commands are added on top.

So command emission is:

common audit/notification commands

* state-specific operational commands

That is a clean design.

---

# **12\. What the orchestration layer is not doing**

This is important.

It is not currently doing:

* asynchronous waiting  
* compensation logic  
* retry orchestration  
* long-running task tracking  
* human-in-the-loop task lifecycle  
* external callback correlation  
* branch re-entry from UW/RI/PAS responses

So right now it is a **synchronous decision-state resolver**, not a full workflow engine.

That is good enough for quote evaluation and dispatch, but not enough for full end-to-end policy lifecycle orchestration.

If you later want:

* “wait for TeleMER transcript”  
* “pause until UW response”  
* “resume after PAS bind acknowledgment”  
* “re-enter flow after reinsurer reply”

then you will need a proper workflow runtime or stateful orchestration service.

---

# **13\. The biggest strength of this orchestration design**

The biggest strength is that it converts:

* raw compute outcomes  
* validation results  
* business context

into **operational control** in one place.

That gives you:

* explicit precedence  
* testable workflow policy  
* centralized action governance  
* reusable command routing

This is exactly what was missing from the fully engine-owned approach.

---

# **14\. The biggest weakness in the current hybrid sample**

Bluntly: the current hybrid pack is improved, but not fully pure yet.

There is still a leftover coupling leak.

Some integration payloads still read from:

* `envelope.stageResults.finalDecision.decision`  
* `envelope.stageResults.finalDecision.route.routeId`

instead of sourcing entirely from orchestration’s own state projection and derived route.

That means the compute envelope is still partially treated as authoritative for workflow-facing values.

That is a design smell.

The cleaner target should be:

* compute layer produces:  
  * facts  
  * signals  
  * decision hints  
* orchestration produces:  
  * authoritative state  
  * authoritative route  
  * authoritative command set

Then all downstream payloads should source route/status from orchestration outputs only.

Right now, the two are aligned in your examples, so it works.  
But the authority boundary is not perfectly closed yet.

---

# **15\. How the orchestration layer should execute, step by step**

The runtime sequence should be:

## **Step 1**

Compute pipeline runs and returns:

* eligibility  
* sum assured  
* pricing  
* evidence  
* validation  
* RI  
* decision hints

## **Step 2**

Orchestration service loads:

* orchestration state machine catalog  
* process context catalog  
* transaction policy catalog  
* numbering setup catalog

## **Step 3**

It evaluates transitions by descending priority.

## **Step 4**

On first match, it derives:

* statuses  
* lifecycle  
* queue  
* route  
* SLA  
* allowed actions  
* command IDs

## **Step 5**

It merges this with UI contract:

* current state  
* allowed actions  
* mode (editable/review/read-only)

## **Step 6**

It resolves integration commands through the integration command catalog and emits:

* events  
* handoff payloads

## **Step 7**

It writes the final envelope:

* `statusProjection`  
* `frontendProjection`  
* `integrationEvents`  
* `handoffPayloads`

That final envelope is what the workbench, DMS, UW, PAS, and accounting consume.

---

# **16\. What the orchestration layer should eventually become**

The current design is good for synchronous quote evaluation.

The next maturity step is:

## **Keep this catalog-driven policy resolver**

but wrap it in a stronger orchestration capability that also handles:

* state persistence  
* external callback re-entry  
* task ownership  
* timers/SLAs  
* retries and compensation  
* event correlation  
* human decisions over time

So the evolution path is:

1. current synchronous orchestrator  
2. persisted state machine  
3. full long-running workflow orchestration

---

# **17\. Bottom line**

The orchestration layer in your hybrid system is:

**a priority-driven state derivation and command emission layer that converts deterministic compute results into operational workflow control**

Its real jobs are:

* enforce workflow precedence  
* derive lifecycle and queue  
* govern allowed actions  
* decide downstream command emission

It is the layer that turns:

* “this quote has validation fail”  
  or  
* “this quote needs UW”  
  or  
* “this quote is ready”

into:

* exact state  
* exact queue  
* exact actions  
* exact integration payloads

That is why it is the most important architectural layer in the hybrid design.

# Temporal \+ Artifacts

### **9\. What I would recommend for your exact system**

For your GTL hybrid model, the recommended design is:

* **Temporal workflow owns lifecycle and waiting**  
* **artifact-driven compute services own eligibility, pricing, evidence, validation, RI**  
* **artifact-driven transition resolver activity owns state derivation**  
* **integration command activity emits UW/DMS/PAS/accounting commands**  
* **UI reads current workflow state plus your static UI contract catalog**

Yes. Temporal is a strong fit for the **orchestration layer** of this system, especially once a quote can pause for documents, wait for underwriting, wait for reinsurer responses, or wait for PAS binding acknowledgements. Temporal workflows are durable, can run for long periods, resume after failures, and receive external messages through Queries, Signals, and Updates, which maps well to a quote case that behaves like a long-lived stateful process. ([Temporal Docs](https://docs.temporal.io/workflows))

What I would **not** recommend is moving the whole hybrid stack into Temporal workflow code. Temporal workflow code must stay deterministic, and Temporal explicitly warns that changes to running workflow code that would alter replay behavior need versioning or patching. Since your pricing, validation, evidence, and routing artifacts will evolve frequently, pushing too much business logic directly into workflow code creates a versioning burden for every in-flight quote. ([Temporal Docs](https://docs.temporal.io/workflows))

The right pattern is:

**Temporal \= durable case orchestration runtime**  
**Artifacts \= decision/configuration source of truth**  
**Activities \= compute and side-effect boundary**

That preserves the essence of your artifact-driven system while giving you durable waiting, retries, timers, human-in-loop handling, and crash recovery. Temporal activities are meant for well-defined units of work, can be non-deterministic, and are recommended to be idempotent; workflow code should orchestrate those activities rather than absorb all of their logic. ([Temporal Docs](https://docs.temporal.io/activities))

A good implementation for your GTL quote stack would look like this.

### **1\. One Temporal workflow per quote case**

Have a `QuoteCaseWorkflow` for each quote. That workflow becomes the durable owner of the quote lifecycle: `DATA_GATHERING`, `UNDER_UW_REVIEW`, `RI_REVIEW`, `QUOTED`, `BOUND`, `WITHDRAWN`, `REQUOTING`, and so on. Temporal workflows are the natural place to hold long-lived process state; workers execute the code externally while the Temporal service manages the workflow’s progression through recorded history. ([Temporal Docs](https://docs.temporal.io/workflows))

### **2\. Keep compute outside the workflow core**

Your current compute core should stay outside the workflow logic, typically as activities or behind activity-invoked services:

* `RunEligibilityActivity`  
* `RunSumAssuredActivity`  
* `RunEvidenceActivity`  
* `RunPricingActivity`  
* `RunValidationActivity`  
* `RunRIActivity`

This is the safer split because activities can be non-deterministic, can call databases and external services, and their results are persisted back into workflow history. That lets the workflow stay thin and durable while the compute layer stays artifact-driven and easier to change. ([Temporal Docs](https://docs.temporal.io/activities))

### **3\. Keep the orchestration policy artifact-driven too**

You do **not** have to hardcode all orchestration rules in workflow code. In your case, I would keep `orchestration_state_machine_catalog_gtl_quote.json` as the authoritative policy input and evaluate it through an activity such as `ResolveTransitionActivity`. That activity would take:

* current workflow state  
* compute outputs  
* quote context  
* current artifact versions

and return:

* next state  
* queue  
* SLA  
* allowed actions  
* command IDs to emit

Because activity results are recorded in workflow history, replay remains safe even if the policy catalog changes later. This is the cleanest way to combine Temporal with artifact-driven configurability. ([Temporal Docs](https://docs.temporal.io/activities))

### **4\. Use Signals and Updates for external business events**

This is where Temporal fits extremely well. The quote workflow can behave like a stateful service and receive events such as:

* `documentUploaded`  
* `previousInsurerProvided`  
* `uwDecisionReceived`  
* `riResponseReceived`  
* `pasBindAcknowledged`  
* `requoteRequested`  
* `withdrawRequested`

Temporal’s message-passing model is built around Queries, Signals, and Updates for exactly this style of control plane. Queries read state, Signals push asynchronous events, and Updates are for controlled state-changing requests with validation/response semantics. ([Temporal Docs](https://docs.temporal.io/develop/typescript/message-passing))

### **5\. Use timers for SLA and escalation**

Your current orchestration layer already has SLA minutes like 15, 480, and 1440\. Temporal is very good at durable timers. For example:

* when entering `DOC_COLLECTION`, start a 24-hour timer  
* when entering `UW_REVIEW`, start an 8-hour timer  
* when entering `READY_TO_BIND`, start a 15-minute bind timer

If the timer fires before the expected signal or update arrives, the workflow can emit reminders, escalate queues, or auto-close stale cases. This is much more robust than trying to bolt timers onto a stateless orchestrator. Temporal also recommends Continue-As-New when histories grow, which matters for quote cases that can stay alive for a long time and receive many messages. ([Temporal Docs](https://docs.temporal.io/develop/typescript/continue-as-new))

### **6\. Use task queues to separate workload types**

Temporal task queues are lightweight queues polled by workers, and worker entities listen on a single task queue. That makes it straightforward to separate orchestration from heavy compute and external integrations. A practical setup would be:

* `quote-workflow-tq` for workflow workers  
* `quote-compute-tq` for pricing/validation/evidence activities  
* `uw-integration-tq` for UW activities  
* `pas-integration-tq` for PAS binding activities  
* `doc-ops-tq` for DMS/document activities

This keeps orchestration responsive while letting you scale compute and integrations independently. ([Temporal Docs](https://docs.temporal.io/workers))

### **7\. Use child workflows only where there is a real independent sub-process**

Temporal supports child workflows, but their own docs are clear that they are not for code organization alone; they are better when there is a meaningful, separately managed execution. In your case, child workflows make sense only if you want durable subcases like:

* `UnderwritingCaseWorkflow`  
* `ReinsuranceCaseWorkflow`  
* `BindPolicyWorkflow`

They do **not** make sense just to split a quote evaluation function into smaller pieces. Temporal explicitly recommends starting with a single workflow definition when the problem has bounded size, and not using child workflows purely for structure. ([Temporal Docs](https://docs.temporal.io/child-workflows))

### **8\. The biggest design trap**

The biggest trap is this:

**If you encode routing, queue logic, and evolving artifact rules directly into workflow code, you will turn every orchestration change into a Temporal versioning problem.**

Temporal can absolutely do orchestration, but it works best when workflow code is stable and durable, while fast-changing business logic is delegated to activities or external policy evaluators. That way:

* workflow code changes rarely  
* artifact changes happen frequently  
* replay safety stays manageable

This is the key architectural boundary. ([Temporal Docs](https://docs.temporal.io/develop/typescript/versioning))

### **9\. What I would recommend for your exact system**

For your GTL hybrid model, the recommended design is:

* **Temporal workflow owns lifecycle and waiting**  
* **artifact-driven compute services own eligibility, pricing, evidence, validation, RI**  
* **artifact-driven transition resolver activity owns state derivation**  
* **integration command activity emits UW/DMS/PAS/accounting commands**  
* **UI reads current workflow state plus your static UI contract catalog**

That gives you:

* durable case orchestration  
* artifact-driven flexibility  
* clean separation of compute vs process  
* safer evolution than putting everything into workflow code

### **10\. Final answer**

So the answer is:

**Yes, the orchestration layer can be done through Temporal, and for the long-running quote case lifecycle it is a very good fit.**  
But the recommended implementation is **not** “rewrite the whole hybrid architecture as Temporal workflows.” The recommended implementation is:

**Temporal for durable process orchestration**  
**Artifacts for business policy**  
**Activities for compute and side effects**

That is the version I would back.

# GTL Quotation Artifacts Hybrid v2

# **GTL Quotation Artifacts Hybrid v2.0.0**

## **Structured Assessment Note**

## **1\. Executive summary**

This bundle represents a hybrid, layered GTL quotation artifact architecture with strong separation between compute logic, orchestration, UI contracts, and integration contracts. The uploaded note states that the package contains 88 JSON files, all parsed successfully, and positions the design as highly complete, consistent, extensible, and integration-ready, with the main remaining gap being runtime validation against real census and execution scenarios.

---

## **2\. Bundle overview**

| Parameter | Detail |
| ----- | ----- |
| Package assessed | `GTL_Quotation_Artifacts_Hybrid_v2_0_0.zip` |
| Total files | 88 JSON files |
| Parse status | All parsed successfully |
| Bundle version | 1.2.0 |
| Generated on | 2026-03-16 |
| Architecture style | Hybrid |
| Dependency model | 4-layer dependency graph |

These details are directly stated in the uploaded note.

---

## **3\. Core architecture**

The artifact model is organized into four layers:

### **Layer 1: Compute core**

Owns the actual insurance computation and decision logic, including:

* products  
* pricing  
* underwriting  
* rules  
* FCL

### **Layer 2: Orchestration**

Owns process flow and state progression, including:

* process context  
* state machines

### **Layer 3: UI contracts**

Owns server-driven UI and query-facing metadata, including:

* frontend metadata  
* query projections

### **Layer 4: Integration contracts**

Owns external and downstream interoperability, including:

* APIs  
* events  
* documents  
* ledgers

This is the central architectural framing in the uploaded content.

---

## **4\. Artifact organization**

The note splits the package into two broad groups:

### **A. Foundation generic artifacts**

These are reusable cross-product building blocks. The uploaded note specifically calls out:

| Artifact | Stated purpose |
| ----- | ----- |
| `final_generic_term_dictionary.json` | 441 canonical terms |
| `final_generic_clause_catalog.json` | 152 generic clauses normalized across BSLI, SBI, Axis, Tata |
| `final_generic_codeset_registry.json` | 44 codesets in `GS.*` namespace |
| `final_generic_constraint_catalog.json` | 103 cross-product constraints |
| `final_generic_function_registry.json` | 60 reusable functions |
| `final_generic_reason_code_registry.json` | 121 reason codes in `GR.*` namespace |
| `final_generic_lifecycle_dictionary.json` | 41 lifecycle states |
| `final_generic_numeric_dictionary.json` | 90 numeric templates |

### **B. GTL quote-specific artifacts**

These are the quotation-domain artifacts for GTL. The uploaded note groups them as follows:

| Area | Representative files |
| ----- | ----- |
| Schema and context | `canonical_quote_schema_gtl.json`, `quote_process_context_catalog_gtl_quote.json` |
| Product model | `product_registry_gtl.json`, `plan_template_catalog_gtl.json`, `benefit_catalog_gtl.json` |
| Pricing engine | `premium_method_catalog_gtl.json`, `rate_table_catalog_gtl.json`, `loading_discount_catalog_gtl.json` |
| Underwriting | `fcl_catalog_gtl.json`, `eligibility_rule_catalog_gtl.json`, `evidence_catalog_gtl.json` |
| Census layer | `census_normalization_catalog_gtl.json`, `census_validation_catalog_gtl.json`, `class_bucketing_catalog_gtl.json` |
| Integration | `api_contract_catalog_gtl_quote.json`, `module_handoff_catalog_gtl_quote.json`, `integration_event_catalog_gtl_quote.json` |
| Process control | `quote_status_derivation_catalog_gtl_quote.json`, `quote_transaction_policy_catalog_gtl_quote.json`, `workflow_routing_catalog_gtl.json` |

---

## **5\. Design principles reflected in the bundle**

The uploaded note says the artifacts adhere to seven core principles:

1. **RiskObject \+ FactorCatalog as the system contract**  
   Supported through `factor_catalog_gtl.json` and `factor_requirement_catalog_gtl_quote.json`.  
2. **Quotation logic is catalog-driven**  
   UI and flow behavior are driven through `quote_frontend_metadata_catalog_gtl_quote.json`.  
3. **Rules propose, aggregation decides**  
   Rule outputs are normalized through `decision_vocabulary_gtl.json` and `rule_catalog_gtl.json`.  
4. **Workbench renders server-composed truth**  
   UI packaging is handled through `workbench_ui_pack_gtl_quote.json`.  
5. **Outputs are version-stamped and ledgerable**  
   Event and accounting shape are carried through `ledger_event_schema_catalog_gtl.json`.  
6. **Process context is backend-owned**  
   Flow control is governed through `quote_process_context_catalog_gtl_quote.json`.  
7. **Status derivation is normalized**  
   Lifecycle state logic is centralized in `quote_status_derivation_catalog_gtl_quote.json`.

---

## **6\. Functional coverage of the bundle**

The note describes ten major functional coverage areas.

| Coverage area | Example artifacts |
| ----- | ----- |
| Quote headers / policy configuration | `term_dictionary_gtl_quote.json`, `constraint_catalog_gtl_quote.json` |
| Plans / products / benefits | `plan_product_catalog_gtl.json`, `benefit_limit_template_catalog_gtl.json` |
| Census / member layer | `census_validation_catalog_gtl.json`, `eligibility_rule_catalog_gtl.json` |
| Pricing / FCL / UW / RI | `premium_method_catalog_gtl.json`, `reinsurance_catalog_gtl.json` |
| Governance / versioning | `rate_versioning_catalog_gtl.json`, `override_catalog_gtl.json` |
| Factor resolution | `factor_requirement_catalog_gtl_quote.json`, `query_projection_catalog_gtl_quote.json` |
| Party / document / exposure | `party_role_catalog_gtl_quote.json`, `document_requirement_catalog_gtl_quote.json` |
| Integration / handoffs | `external_gate_catalog_gtl_quote.json`, `api_contract_catalog_gtl_quote.json` |
| Process / status / transactions | `quote_process_context_catalog_gtl_quote.json`, `quote_transaction_policy_gtl_quote.json` |

Net view: the package is not just a pricing pack. It attempts to cover the entire quotation operating model.

---

## **7\. What is strong in this design**

The uploaded note highlights four major strengths:

### **7.1 Normalization quality**

The generic layer reportedly normalizes across four source product ecosystems: SBI, Axis, Tata AIA, and BSLI.

### **7.2 Product-model expansion**

The note specifically mentions BSLI v2 expansion, including:

* policy pay types  
* increasing cover  
* ADB / ATPD / ACI packages  
* service-request lifecycle

### **7.3 Clear dependency graph**

The architecture follows a visible progression:  
`compute_core → orchestration → ui_contracts → integration_contracts`

### **7.4 Mature reason-code strategy**

The reason-code registry is described as comprehensive, using a `GR.*` namespace with severity levels such as:

* BLOCK  
* DENY  
* HARD  
* INFO

---

## **8\. Key concerns or likely gaps**

The note identifies three important gaps:

### **8.1 No explicit rating engine artifact**

There is a `rate_table_catalog_gtl.json`, but the note says there is no clearly explicit rating algorithm artifact.

### **8.2 No quote comparison artifact**

There appears to be no dedicated structure for multi-scenario quote comparison.

### **8.3 Document generation may still be thin**

`document_template_catalog_gtl.json` exists, but the note suggests it may need richer support for dynamic clause composition.

These are not cosmetic issues. They matter because they affect rating transparency, sales comparison workflows, and downstream document issuance quality.

---

## **9\. Readiness view**

The uploaded assessment rates the bundle as follows:

| Criterion | Assessment |
| ----- | ----- |
| Completeness | Very strong |
| Consistency | Very strong |
| Extensibility | Very strong |
| Integration readiness | Very strong |
| Production readiness | Strong, but not fully proven |

The specific production caveat called out is that runtime validation against real census data is still required.

---

## **10\. Recommended validation priorities**

The uploaded note recommends four practical next checks:

### **10.1 Validate factor resolution chain**

Test the chain:  
`factor_catalog_gtl.json`  
→ `factor_requirement_catalog_gtl_quote.json`  
→ `quote_frontend_metadata_catalog_gtl_quote.json`

### **10.2 Validate status derivation**

Confirm that `quote_status_derivation_catalog_gtl_quote.json` correctly handles lifecycle transitions.

### **10.3 Validate handoff and event flow**

Test:  
`module_handoff_catalog_gtl_quote.json`  
→ `integration_event_catalog_gtl_quote.json`

### **10.4 Validate census processing pipeline**

Test:  
`census_normalization_catalog_gtl.json`  
→ `census_validation_catalog_gtl.json`  
→ `class_bucketing_catalog_gtl.json`

---

## **11\. Bottom-line interpretation**

This bundle is best understood as a **serious, architecture-led quotation platform artifact pack**, not just a set of product JSONs. It already covers canonical definitions, quote context, pricing, underwriting, census handling, UI contracts, handoffs, and lifecycle/state management. The main issue is not breadth. The main issue is proving that the orchestration and runtime behavior are as strong as the artifact coverage suggests. That interpretation is grounded in the uploaded note’s coverage map, strengths, and readiness comments.

# Frontend

Below is the **UI-only view** of the hybrid structure: where the screen schema lives, how screens change, how actions are enabled, and how the frontend payload is assembled.

---

# **1\. The UI framework in this hybrid design**

The frontend is **metadata-driven**, not hardcoded screen-by-screen.

The shell definition itself says:

* `shell_mode = METADATA_DRIVEN`

That means the UI is expected to render screens from catalogs, not from handwritten per-screen logic.

But in the hybrid design, there is an important split:

## **Static UI structure comes from catalogs**

This includes:

* which screens exist  
* screen routes  
* sections  
* fields  
* widgets  
* columns  
* filters

## **Dynamic UI behavior comes from orchestration output**

This includes:

* current state  
* allowed actions  
* missing sections to focus  
* whether the screen is effectively editable/review/read-only

So the frontend is built as:

**static schema \+ dynamic state policy**

That is the framework.

---

# **2\. Where the screen schema is stored**

There are **four main UI-related catalogs**.

## **A. `quote_frontend_metadata_catalog_gtl_quote.json`**

This is the **main schema source** for the screens.

It stores the actual view definitions:

* `view_id`  
* `kind`  
* `route`  
* `entity`  
* `sections`  
* `fields`  
* `filters`  
* `columns`  
* optional `actions`

This is where the actual form/query structure lives.

### **Example views in this file**

* `QUOTE_INBOX`  
* `QUOTE_KEY_DATA`  
* `QUOTE_DOCUMENTS`  
* `QUOTE_SUBSIDIARIES`  
* `QUOTE_HEADCOUNT`  
* `QUOTE_BILLING`  
* `QUOTE_PLANS`  
* `QUOTE_PRODUCTS`  
* `QUOTE_BENEFITS`  
* `QUOTE_EXCLUSIONS`  
* `QUOTE_DECISION`

So if you ask, “where is the schema of the screens?”, the primary answer is:

**`quote_frontend_metadata_catalog_gtl_quote.json`**

---

## **B. `query_projection_catalog_gtl_quote.json`**

This stores the **list/grid projection model**.

It defines for query-type views:

* which columns are shown  
* available sorts  
* available filters

Examples:

* `QUOTE_INBOX`  
* `DOC_COLLECTION_QUEUE`  
* `UW_QUEUE`

This is less about forms and more about queue/inbox/table behavior.

---

## **C. `workbench_ui_pack_gtl_quote.json`**

This is the **UI shell manifest**.

It does not define all field-level schemas.  
It defines how the workbench is organized:

* shell mode  
* metadata sources  
* query views  
* form views

In your current pack it says the workbench shell depends on:

* `quote_frontend_metadata_catalog_gtl_quote.json`  
* `query_projection_catalog_gtl_quote.json`  
* `quote_action_catalog_gtl_quote.json`  
* `factor_requirement_catalog_gtl_quote.json`  
* `quote_process_context_catalog_gtl_quote.json`  
* `quote_status_derivation_catalog_gtl_quote.json`  
* `quote_transaction_policy_catalog_gtl_quote.json`

So this file is the **composition manifest** for the UI layer.

---

## **D. `ui_experience_contract_catalog_gtl_quote.json`**

This is the **interaction mode contract**.

It defines the intended mapping from lifecycle state to frontend mode:

* `DATA_GATHERING -> EDITABLE`  
* `UNDER_UW_REVIEW -> REVIEW`  
* `RI_REVIEW_REQUIRED -> REVIEW`  
* `QUOTED -> READ_ONLY`

This file expresses the intended behavior of the frontend layer.

Important blunt point:

In the current runtime, this catalog exists, but it is **not actively enforced by code yet**.

It is present as a contract, but the current runtime does not apply it directly.

---

# **3\. How a screen is actually described**

Take `QUOTE_KEY_DATA`.

Its definition includes:

* route: `/quotes/:quoteId/key-data`  
* kind: `FORM`  
* entity: `quote.header`

Then sections like:

* `process_context`  
* `quote_context`  
* `distribution`  
* `party_roles`  
* `member_rules`  
* `pricing_controls`  
* `uw_controls`  
* `status_snapshot`

Each section has fields with:

* `field_id`  
* `label`  
* `factor_id`  
* `bind_path`  
* `widget`

Example:

* `previousInsurerRef`  
* widget \= `entity-search`  
* bind path \= `partyRefs.previousInsurerRef`

So the frontend does not need a custom hardcoded “Takeover Previous Insurer component.”  
It just renders the metadata and binds to the payload path.

That is the essence of the design.

---

# **4\. How actions are supposed to work**

There are two layers for actions.

## **A. `quote_action_catalog_gtl_quote.json`**

This is the **semantic action dictionary**.

It defines:

* `action_id`  
* `allowed_states`  
* `next_state`  
* optional `output_event`

Examples:

* `SAVE_DRAFT`  
* `RUN_EVALUATION`  
* `UPLOAD_DOCUMENT`  
* `CREATE_UW_TASK`  
* `WITHDRAW_QUOTE`

This file tells you what an action means in theory.

---

## **B. Orchestration output**

This is what actually enables/disables actions at runtime.

The runtime does **not** look up the action catalog to decide visibility.  
Instead, the orchestration layer emits:

* `allowedActions`

For example:

### **Data-gathering case**

Allowed actions become:

* `SAVE_DRAFT`  
* `RUN_EVALUATION`  
* `UPLOAD_DOCUMENT`  
* `REQUEST_DOCUMENT`  
* `ADD_PLAN`  
* `EDIT_PLAN`  
* etc.

### **UW case**

Allowed actions become:

* `CREATE_UW_TASK`  
* `VIEW_UW_CASE`  
* `SYNC_UW_DECISION`  
* `APPLY_UW_DECISION`  
* `APPLY_UW_PRICING`

### **Quote-ready case**

Allowed actions become:

* `SEND_TO_PAS_BIND`  
* `REQUOTE`  
* `WITHDRAW_QUOTE`

So the real runtime rule is:

**Action catalog defines the action vocabulary**  
**Orchestration defines which actions are live now**

That is how it comes together.

---

# **5\. How screens change across states**

This is the most important UI behavior.

The frontend changes because the backend returns a `frontendProjection` object.

That projection includes:

* `currentState`  
* `allowedActions`  
* `applicableViews`  
* `focusSections`  
* `schemaCatalogVersion`

The **same screens** mostly remain present, but their behavior changes because:

* actions change  
* missing sections are highlighted  
* form intent changes from editable to review to read-only

So the screen system is not “switch to a totally different app.”  
It is more like:

**same shell, different policy**

---

## **State 1: `DATA_GATHERING`**

This is the editable state.

UI behavior:

* forms are open for editing  
* document upload/request actions are enabled  
* plan/product/benefit editing is enabled  
* missing sections can be highlighted

In the takeover example, `frontendProjection.focusSections` points to:

* `QUOTE_KEY_DATA`  
* section `party_roles`  
* missing factor `P.PREVIOUS_INSURER_REF`

And the `QUOTE_KEY_DATA` schema is returned inline with:

* `missingCount = 1`  
* the `party_roles` section marked with missing factor IDs

This is how the UI knows exactly where to focus the user.

---

## **State 2: `UNDER_UW_REVIEW`**

This is the review state.

UI behavior:

* core quote forms remain visible  
* edit actions are mostly gone  
* review and underwriting actions are enabled  
* decision view exposes `CREATE_UW_TASK`

In your sample UW output:

* `currentState = UNDER_UW_REVIEW`  
* `allowedActions` is UW-centric  
* `QUOTE_DECISION.actions = ["CREATE_UW_TASK"]`

So the screen structure does not disappear; it becomes a review surface.

---

## **State 3: `QUOTED`**

This is the terminal pre-bind state.

UI behavior:

* forms remain visible for inspection  
* no editing actions on those form views  
* decision view shows bind action  
* top-level quote actions become bind/requote/withdraw

In your quote-ready sample:

* `currentState = QUOTED`  
* `allowedActions = ["OPEN_QUOTE", "DUPLICATE_QUOTE", "WITHDRAW_QUOTE", "SEND_TO_PAS_BIND", "REQUOTE"]`  
* `QUOTE_DECISION.actions = ["SEND_TO_PAS_BIND"]`

This is how the UI flips from “build the quote” to “issue the quote.”

---

# **6\. How the runtime assembles the frontend payload**

The main runtime function for UI assembly is:

* `src/services/metadataViewService.ts`

The key function is:

* `buildFrontendProjection(...)`

This is the actual assembly step.

## **What it takes in**

It receives:

* `statusProjection`  
* `allowedActions`  
* `packSet`  
* `factorStatus`

So it uses:

* orchestration output  
* compiled UI catalogs  
* missing factor detection

## **What it does**

### **Step 1: Determine current state**

It reads:

* `statusProjection.lifecycleState`

That becomes:

* `frontendProjection.currentState`

### **Step 2: Build focus map from missing factors**

For each missing factor, if the factor carries:

* `viewId`  
* `sectionId`

it groups them into a focus map.

This is how takeover missing-insurer ends up as:

* `QUOTE_KEY_DATA -> party_roles`

### **Step 3: Walk through every view in the UI metadata catalog**

It iterates through `packSet.uiPack.views`.

For each view it:

* copies route and kind  
* calculates `missingCount`  
* filters actions against `allowedActions`  
* attaches schema reference  
* conditionally inlines columns / filters / sections

### **Step 4: Emit `applicableViews`**

This becomes the frontend-ready payload.

---

# **7\. How action filtering works per screen**

This is the exact mechanism.

Each view may declare its own possible actions.

Examples:

* `QUOTE_DOCUMENTS` declares:  
  * `UPLOAD_DOCUMENT`  
  * `REQUEST_DOCUMENT`  
* `QUOTE_DECISION` declares:  
  * `SEND_TO_PAS_BIND`  
  * `CREATE_UW_TASK`  
  * `CREATE_RI_TASK`  
  * `CREATE_PRICING_REVIEW_TASK`

Then `metadataViewService` filters these by the orchestration-derived `allowedActions`.

So:

## **In UW state**

`QUOTE_DECISION` becomes:

* `["CREATE_UW_TASK"]`

## **In quote-ready state**

`QUOTE_DECISION` becomes:

* `["SEND_TO_PAS_BIND"]`

## **In data-gathering state**

`QUOTE_DECISION` becomes:

* `[]`

That is why the same decision screen changes behavior across states.

---

# **8\. How missing-field highlighting works**

This is one of the best parts of the current hybrid UI design.

Missing factors come from:

* `RequiredFactorStatus.missingInputFactors`

Each missing factor may already know:

* which view it belongs to  
* which section it belongs to

Example:

* `P.PREVIOUS_INSURER_REF`  
* `viewId = QUOTE_KEY_DATA`  
* `sectionId = party_roles`

The metadata view service groups these and emits:

* `focusSections`  
* section-level `missingFactorIds`  
* view-level `missingCount`

That allows the frontend to do all of this without custom business code:

* show a red badge on the tab  
* auto-scroll to the right section  
* highlight the section header  
* show a “1 missing field” chip  
* focus the exact missing field

This is very strong.

---

# **9\. How queue/list screens are handled**

The list views are not the same as form views.

They come from:

* `QUOTE_INBOX` in the frontend metadata catalog  
* queue projections in `query_projection_catalog_gtl_quote.json`

So the inbox and operational queue UIs are built from:

* column metadata  
* filter metadata  
* projection metadata

That means the frontend can build:

* inbox table  
* doc collection queue  
* UW queue  
* RI queue  
* ready-to-bind queue

without needing hardcoded per-queue column configs.

That is exactly what query projection catalogs are for.

---

# **10\. The role of `workbench_ui_pack_gtl_quote.json`**

This file is the UI shell manifest.

It tells the shell:

* which metadata files to load  
* which views are query views  
* which views are form views  
* that the shell is metadata-driven

So if you think in frontend architecture terms:

* `quote_frontend_metadata_catalog...` \= page schema  
* `query_projection_catalog...` \= list/table model  
* `workbench_ui_pack...` \= UI composition manifest  
* `ui_experience_contract...` \= intended interaction policy  
* orchestration output \= runtime behavior

That is the full picture.

---

# **11\. How all of this comes together end to end**

Here is the exact UI assembly flow.

## **Step 1: Catalogs are compiled**

`packCompiler.ts` loads:

* frontend metadata catalog  
* query projection catalog  
* orchestration catalog  
* other packs

and builds:

* `packSet.uiPack`  
* `packSet.orchestrationPack`

---

## **Step 2: Quote is evaluated**

`quoteOrchestrator.ts` runs:

* process init  
* compute pipeline  
* orchestration

---

## **Step 3: Orchestration decides state**

`quoteCaseOrchestrationService.ts` picks one transition rule and returns:

* status projection  
* route  
* allowed actions  
* command IDs

This is the dynamic UI control input.

---

## **Step 4: Frontend projection is built**

`metadataViewService.ts` takes:

* state  
* actions  
* missing factors  
* UI metadata

and emits:

* `frontendProjection`

This is the backend-to-frontend contract.

---

## **Step 5: Frontend renders from `frontendProjection`**

The frontend can then:

* render tabs/screens  
* enable/disable buttons  
* highlight missing sections  
* show query tables  
* decide which screens are in review vs read-only mode

That is the intended runtime.

---

# **12\. Hard truth: what is good, and what is still incomplete**

## **What is strong**

The design is strong in these areas:

### **Static schema is centralized**

You do not have form structure scattered through code.

### **Actions are state-driven**

Good separation from pure compute.

### **Missing-factor guidance is precise**

This is operationally useful.

### **Same screen can change role by state**

Good for workbench continuity.

---

## **What is still incomplete or leaky**

### **1\. `ui_experience_contract_catalog` is not actually enforced**

The file exists and is sensible, but the runtime does not read it.

So today:

* `DATA_GATHERING -> EDITABLE`  
* `UNDER_UW_REVIEW -> REVIEW`  
* `QUOTED -> READ_ONLY`

is more of a declared contract than an active engine-enforced behavior.

The frontend would have to honor it on its own or you need a service to apply it.

---

### **2\. `quote_action_catalog` is not actively used in runtime gating**

The runtime filters actions based on orchestration’s `allowedActions`, but it does not validate them against the action catalog’s `allowed_states`.

So right now:

* the action catalog is vocabulary/documentation/future guardrail  
* not the current enforcement source

---

### **3\. All views are returned for all states**

`metadataViewService` currently maps over all views in `packSet.uiPack.views`.

That means the backend is not doing strong state-based view suppression.  
It is mainly changing actions and focus, not the list of visible views.

So the frontend still has to decide whether to:

* hide some views  
* collapse some tabs  
* show read-only summaries instead of full forms

---

### **4\. Editability is not field-level yet**

The current runtime does not emit:

* field disabled flags  
* section-level mode  
* per-view edit mode

It only emits:

* current state  
* actions  
* missing sections

So the frontend still needs a mode policy layer to say:

* hide edit widgets in `QUOTED`  
* disable grid mutation in `UNDER_UW_REVIEW`  
* keep header editable in `DATA_GATHERING`

That is not fully materialized yet.

---

# **13\. What the ideal frontend model should be**

The clean target should be:

## **Static**

Stored in catalogs:

* view schema  
* field schema  
* widget types  
* query columns/filters

## **Dynamic**

Stored in frontend projection:

* current state  
* view mode  
* section mode  
* allowed actions  
* hidden/visible views  
* focus sections  
* warnings/errors badges

Right now your system has the first half fully and the second half partially.

---

# **14\. Bottom line**

The frontend/UI process in your hybrid design works like this:

**Screen schemas are stored centrally in metadata catalogs.**  
**Orchestration decides the current state and allowed actions.**  
**A projection service merges those with missing-factor signals and emits a frontend payload.**  
**The frontend shell renders the same workbench differently depending on that runtime policy.**

So the real control chain is:

**catalogs define what can exist**  
**orchestration defines what is currently allowed**  
**frontend projection packages that into a UI contract**  
**frontend renders accordingly**

That is the core of it.

The blunt truth is:

* the architecture is directionally right  
* the static metadata side is strong  
* the runtime UI-mode enforcement is still incomplete

So this is a good hybrid base, but not yet the fully mature UI control plane.

# End to End flow

* In the current runtime, **`quoteId` is expected in the request already**. The hybrid pack does **not** generate `quoteId` inside the compute/orchestration flow. What it does generate is the **`quoteNumber`**, using the numbering setup catalog and the process context.  
* The system does **not** let the rule engine decide workflow state. Compute produces facts, pricing, validation, evidence, RI, and decision hints; then orchestration resolves lifecycle, queue, actions, and command IDs.  
* The frontend is **not built directly from the factor catalog**. Static view schemas come from UI metadata/UI contract artifacts; factor requirements tell the system which sections are missing and where to focus.  
* The current sample is a **synchronous quote evaluation \+ dispatch** design. It can reach **QUOTED / READY\_TO\_BIND** and emit **`PAS_BIND_QUOTE`**, but it does **not yet implement durable waiting for PAS acknowledgment and final BOUND transition** inside the sample orchestrator.

Below is the **actual end-to-end runtime shape** that mirrors the pack, with notes on where the sample ends and where a fuller bind lifecycle would continue.

## **1\. What the hybrid stack actually is**

The current hybrid design is:

* **Compute core**: deterministic evaluation only  
* **Orchestration layer**: state/queue/action/command resolution  
* **UI layer**: render screens and apply editability/action visibility  
* **Integration layer**: turn command IDs into payloads/events/API calls

That separation is explicit in the hybrid notes and service mapping: compute runs eligibility, sum assured, pricing, evidence, validation, reinsurance, and decision aggregation; orchestration then evaluates the state machine and emits lifecycle, queue, allowed actions, and integration commands.

## **2\. The exact starting point: what comes in first**

### **Current sample reality**

The runtime expects a **canonical quote request** to arrive first. From direct inspection of the sample request and runtime:

* `quoteId` is already present  
* `productCode` is already present  
* `effectiveDate` is already present  
* business type / takeover flag / scheme type / members / plans / products / policy config are already present  
* canonical members are already present on the quote payload

So in the sample, the true first step is **not** “generate quote ID.”  
It is:

**Quote API / case service receives a quote payload that already has quote identity and core product selection.**

### **If census upload is raw**

The artifacts also contain a separate pipeline, `PIPE_CENSUS_INGEST`, with steps like:

* detect columns  
* map columns  
* normalize values  
* validate rows  
* compute data quality score  
* publish canonical members

So if your real production flow starts with raw census upload, **that pipeline should run before quote compute**. The current quote compute path assumes the member list is already canonicalized. This is consistent with the playbook-driven architecture, where compute expects structured inputs and not ad hoc raw files at evaluation time.

## **3\. Step 1 — Pack selection and compile phase**

Once the quote request is available, the backend loads the artifact bundle and compiles a **pack set** for the quote’s:

* `productCode`  
* `effectiveDate`

From direct inspection of the runtime, the compiler does all of this before execution:

* resolves product from `product_registry_gtl.json`  
* resolves the default plan template  
* resolves the premium method  
* selects the active rate tables by **effective date**  
* compiles rule-side packs  
* compiles pricing-side packs  
* compiles orchestration, UI, integration, process context, numbering, validation, factor requirement, and playbook packs

This is the point where the system decides **which exact artifacts are authoritative** for this quote version and date. That is also consistent with the broader rule-architecture requirement that rules and pricing must be effective-dated and replayable.

## **4\. Step 2 — Process-context initialization**

This is the first real stateful step inside the module.

From direct inspection of `quote_process_context_catalog_gtl_quote.json`, `numbering_setup_catalog_gtl_quote.json`, and `quote_transaction_policy_catalog_gtl_quote.json`, the runtime does this:

### **2.1 Resolve process context**

It matches the incoming quote into one of the process contexts, such as:

* `NEW_BUSINESS_QUOTE_INIT`  
* `TAKEOVER_QUOTE_INIT`  
* `REQUOTE_REOPEN`

That context initializes:

* `record_type = QUOTATION`  
* `quote_phase = PRE_BIND`  
* `main_status = PENDING`  
* `secondary_status = INITIAL`  
* `transaction_status = ACTIVE`  
* `current_transaction_no = 1`  
* `last_transaction_no = 1`  
* `lifecycle_state = DRAFT`  
* `workbench_queue = PENDING`

### **2.2 Generate quote number**

The runtime then applies numbering setup.

In the sample pack, the default setup is effectively:

* prefix `GTLQ`  
* format like `GTLQ-{yyyy}-{seq6}`

So the system generates **quote number**, not `quoteId`.

### **2.3 Apply transaction policy**

Then transaction policy runs:

* create quote → initialize version and transaction numbers  
* reopen/requote → increment quote version and current transaction number  
* convert to policy → mark transaction semantics for conversion

This step is how the module establishes the initial **DRAFT / PENDING** working state before compute. That is part of the process-context/transaction-policy initialization the orchestration notes describe.

## **5\. Step 3 — Factor resolution and intake completeness**

It uses **two related artifacts**:

### **A. Factor catalog**

From direct inspection of `factor_catalog_gtl.json`, this is the broader factor universe:

* factor IDs  
* group/scope  
* data type  
* missing policy  
* whether derived or raw  
* source precedence

Example types include scheme factors, quote factors, member factors, member-coverage factors.

### **B. Factor requirement catalog**

From direct inspection of `factor_requirement_catalog_gtl_quote.json`, this is the operational contract for the quote flow:

* which factors are required in each **context**  
* whether each is `INPUT`, `REFERENCE`, `DERIVED`, `EXTERNAL`, or `ENRICHED`  
* which stage it belongs to  
* which `view_id` and `section_id` it maps to

Examples I verified directly in the zip:

* base quote context requires things like business type, channel, branch, policy classification, policy year dates, party refs, member ID rule, premium allocation rule, UW SA basis  
* takeover context additionally requires previous insurer reference  
* billing context requires billing frequency, collection frequency, refund rules, policy unit  
* plan/product/benefit contexts require plan/product grids and product configuration fields  
* headcount context activates only if the product is headcount-based

### **What the backend actually does**

The runtime evaluates the applicable factor-requirement contexts against the current quote and produces:

* `applicableContextIds`  
* `missingInputFactors`  
* `pendingDependencyFactors`  
* `totalRequiredFactorCount`

And it splits missing items like this:

* `INPUT` / `REFERENCE` missing → `missingInputFactors`  
* `DERIVED` / `EXTERNAL` / `ENRICHED` missing → `pendingDependencyFactors`

**The factor requirement catalog determines what must exist for this quote context, where it should surface in the UI, and whether the gap is an input gap or a dependency gap.**

## **6\. Step 4 — Frontend population and data capture**

This is another place where the real design matters.

The frontend is **not dynamically generated from factor requirements alone**.

The hybrid design explicitly says:

* view schemas remain artifact-driven and static  
* allowed actions come from orchestration  
* form editability is driven by lifecycle state  
* backend emits UI hints; frontend owns rendering

From direct inspection of the runtime:

* `quote_frontend_metadata_catalog_gtl_quote.json` defines the views/sections  
* `ui_experience_contract_catalog_gtl_quote.json` defines state → mode mapping  
* `factorRequirementResolver` tells you which factors are missing and in which `view_id / section_id`  
* `uiProjectionService` injects those missing factor IDs into `focusSections`

So the real frontend sequence is:

1. backend resolves applicable factor requirements  
2. backend identifies missing fields by section  
3. backend builds UI projection with focus sections  
4. frontend renders static view schemas and highlights the relevant sections  
5. user fills the missing data  
6. quote is saved/re-evaluated

That split is exactly what the hybrid design calls for.

## **7\. Step 5 — Compute pipeline runs**

This is the core evaluation step.

The hybrid notes say compute runs:

* eligibility  
* sum assured  
* pricing  
* evidence  
* validation  
* RI  
* decision hints

and returns only compute output, not workflow routing.

From direct inspection of `normalization_playbook_gtl_quote.json` and the runtime:

### **The playbook order is:**

1. `hydrate_scheme`  
2. `hydrate_plans`  
3. `resolve_required_factors`  
4. `evaluate_eligibility`  
5. `derive_sum_assured`  
6. `classify_fcl`  
7. `resolve_evidence`  
8. `lookup_rates`  
9. `compute_premium`  
10. `evaluate_ri`  
11. `validate_quote`  
12. `aggregate_quote`

### **In the current runtime, that maps roughly to:**

* `hydrate_plans` → build plan runtime  
* `resolve_required_factors` → find missing input/dependency factors  
* `evaluate_eligibility` → inclusion/exclusion logic  
* `derive_sum_assured` → member/group SA derivation  
* `resolve_evidence` → FCL/evidence selection  
* `compute_premium` → rating  
* `evaluate_ri` → treaty/retention referral logic  
* `validate_quote` → date rules, takeover rules, structural rules, document warnings  
* `aggregate_quote` → final decision (`REQUEST_INFORMATION`, `REFER_TO_UNDERWRITING`, `REFER_TO_REINSURER`, `QUOTE_READY`, etc.)

A blunt but important nuance: in the current runtime, some playbook steps are present as named steps but are effectively absorbed elsewhere or stubbed:

* `classify_fcl` is effectively handled inside evidence flow  
* `lookup_rates` is effectively handled inside pricing flow  
* `hydrate_scheme` is not a separate runtime behavior yet

So the playbook is the intended control plane, but the implementation is still a bit compacted.

## **8\. Step 6 — What each compute engine actually does**

The service mapping in your notes is explicit:

* `eligibilityEngine.ts` → inclusion / exclusion logic  
* `sumAssuredEngine.ts` → SA derivation  
* `pricingEngine.ts` → premium calculation  
* `evidenceEngine.ts` → FCL checks and medical/evidence triggers  
* `validationEngine.ts` → mandatory fields, takeover rules, structural validation  
* `reinsuranceEngine.ts` → concentration / RI referral  
* `decisionAggregator.ts` → limited to decision hints / decision projection, not final workflow routing

Mirroring your desired deployment boundary:

* **Rule engine side** should own eligibility, evidence/FCL, validation, RI, decision hints  
* **Rating engine side** should own premium methods, rate tables, loadings/discounts, pricing results  
* **Compute service** can either host both as sub-engines or orchestrate them as two separate services

The current sample keeps them inside one compute executable, but architecturally they are already separable.

## **9\. Step 7 — Aggregation decides the decision, not the workflow**

This matters.

From direct inspection of the runtime, aggregation currently decides the **commercial decision** in this order:

1. validation errors → `REQUEST_INFORMATION`  
2. missing mandatory inputs → `REQUEST_INFORMATION`  
3. missing mandatory documents → `REQUEST_INFORMATION`  
4. execution issues → `REQUEST_INFORMATION`  
5. eligibility exceptions → `REFER_TO_UNDERWRITING`  
6. RI refer → `REFER_TO_REINSURER`  
7. evidence required → `REFER_TO_UNDERWRITING`  
8. pricing warnings → `REFER_TO_UNDERWRITING`  
9. else → `QUOTE_READY`

That is **decisioning**, not lifecycle routing.

This matches your hybrid notes that compute produces facts, pricing, validation, risk signals, decision hints — and routing belongs later.

## **10\. Step 8 — Orchestration runs the state machine**

This is the most important control step.

The orchestration layer consumes the evaluated envelope, not raw quote input. It works from:

* quote  
* required factor status  
* validation result  
* pricing result  
* evidence result  
* RI result  
* final decision / decision hints

and then applies a priority-driven state machine. That is explicitly how your catalog is described.

### **The current state rules, in priority order, are:**

* validation fail → `DATA_GATHERING`  
* request information → `DATA_GATHERING`  
* refer to underwriting / request evidence → `UNDER_UW_REVIEW`  
* refer to reinsurer → `RI_REVIEW_REQUIRED`  
* quote ready → `QUOTED`  
* reject → rejected/closed path

### **What orchestration derives**

It produces:

* `mainStatus`  
* `secondaryStatus`  
* `transactionStatus`  
* `lifecycleState`  
* `workbenchQueue`  
* `routeId`  
* `slaMinutes`  
* `allowedActions`  
* `commandIds`

This is the state machine by state machine view:

### **State A — `DATA_GATHERING`**

Triggered by:

* validation fail, or  
* `REQUEST_INFORMATION`

Derived as:

* main status `PENDING`  
* secondary `DATA_REQUIRED`  
* lifecycle `DATA_GATHERING`  
* queue `DOC_COLLECTION`  
* route `DOC_COLLECTION`  
* SLA 1440 minutes

Typical actions:

* save draft  
* run evaluation  
* upload/request document  
* edit quote structure

Typical commands:

* accounting indication  
* document collection request  
* workbench refresh

### **State B — `UNDER_UW_REVIEW`**

Triggered by:

* `REFER_TO_UNDERWRITING`  
* `REQUEST_EVIDENCE`

Derived as:

* main status `PENDING`  
* secondary `UW_REVIEW_PENDING`  
* lifecycle `UNDER_UW_REVIEW`  
* queue `UW_REVIEW`  
* route `UW_REVIEW`  
* SLA 480 minutes

Typical actions:

* create UW task  
* view UW case  
* sync/apply UW decision  
* apply UW pricing  
* apply override

Typical commands:

* `UW_CASE_CREATE`  
* `WORKBENCH_REFRESH`

### **State C — `RI_REVIEW_REQUIRED`**

Triggered by:

* `REFER_TO_REINSURER`

Derived as:

* lifecycle `RI_REVIEW_REQUIRED`  
* queue `RI_REVIEW`  
* route `RI_REVIEW`

Typical commands:

* RI referral payload  
* workbench refresh

The UI stays in review mode, not edit mode.

### **State D — `QUOTED`**

Triggered by:

* `QUOTE_READY`

Derived as:

* main status `QUOTED`  
* secondary `READY_FOR_BIND`  
* lifecycle `QUOTED`  
* queue `READY_TO_BIND`  
* route `AUTO_QUOTE`  
* SLA 15 minutes

Typical actions:

* send to PAS bind  
* duplicate quote  
* requote  
* withdraw

Typical commands:

* accounting indication  
* `PAS_BIND_QUOTE`  
* workbench refresh

## **11\. Step 9 — UI projection happens after state resolution**

Only after orchestration derives the authoritative state does the UI layer build the frontend projection.

The contract is:

* `DATA_GATHERING` → `EDITABLE`  
* `UNDER_UW_REVIEW` → `REVIEW`  
* `RI_REVIEW_REQUIRED` → `REVIEW`  
* `QUOTED` → `READ_ONLY`

So the UI does **not** decide business logic. It reads:

* current lifecycle state  
* allowed actions  
* focus sections / missing factors  
* static view metadata

That is the correct split.

## **12\. Step 10 — Integration command execution**

This is the last synchronous step in the sample.

Orchestration does **not** directly call PAS/UW/DMS/accounting. It emits command IDs, and the integration command catalog/materializer turns those into payloads and handoffs. That is explicit in your notes.

Also, there are always-on commands like:

* `QUOTE_EVALUATED`  
* `QUOTE_VALIDATION_COMPLETED`  
* `QUOTE_STATUS_DERIVED`

and then state-specific commands are added on top.

So the real execution is:

1. compute finishes  
2. orchestration derives state and command IDs  
3. integration layer materializes payloads and executes/emits them  
4. final envelope is written for workbench/UI/downstream consumers

## **13\. End-to-end example: clean STP quote from incoming request to bind-ready**

This is the cleanest path.

### **Initial intake**

* quote request arrives with `quoteId`, `productCode`, `effectiveDate`, canonical members, plan/product structure  
* process context resolves to `NEW_BUSINESS_QUOTE_INIT`  
* quote number is assigned  
* transaction defaults are applied  
* state is still basically **DRAFT / PENDING** at this point

### **Required factor resolution**

* all mandatory required input/reference factors are present  
* no missing dependencies remain  
* UI has nothing material to focus

### **Compute**

* eligibility passes  
* sum assured derives successfully  
* evidence does not require UW escalation  
* pricing computes cleanly  
* validation passes  
* RI passes  
* aggregation returns `QUOTE_READY`

### **Orchestration**

* matches `STATE_QUOTED_READY_FOR_BIND`  
* derives:  
  * `mainStatus = QUOTED`  
  * `secondaryStatus = READY_FOR_BIND`  
  * `lifecycleState = QUOTED`  
  * `workbenchQueue = READY_TO_BIND`  
  * `route = AUTO_QUOTE`  
  * `allowedActions` include bind/requote/withdraw  
  * commands include `PAS_BIND_QUOTE`

### **UI**

* opens in read-only quoted mode

### **Integration**

* accounting indication  
* PAS bind command  
* workbench refresh

That is exactly the “clean STP” example in your hybrid notes.

## **14\. End-to-end exception examples**

### **A. Missing data / incomplete quote**

If compute yields `REQUEST_INFORMATION`, orchestration resolves to:

* `DATA_GATHERING`  
* queue `DOC_COLLECTION`  
* actions like edit/upload/re-run  
* command like document collection request

The quote remains open for correction and does not escalate to UW or PAS.

### **B. Takeover hard fail**

If takeover quote is missing previous insurer details, validation fails. Because validation-fail has higher priority than generic request-information, orchestration still chooses `DATA_GATHERING / DOC_COLLECTION`. That precedence is explicitly called out in your state-machine notes.

### **C. UW referral**

If evidence/FCL/pricing triggers underwriter review, compute returns `REFER_TO_UNDERWRITING` and orchestration moves the quote to `UNDER_UW_REVIEW / UW_REVIEW`, creating the UW case.

### **D. RI referral**

If RI logic returns refer, orchestration moves to `RI_REVIEW_REQUIRED / RI_REVIEW`. In the current state priority, this sits below UW but above quoted-ready.

## **15\. Where “bind” actually ends in the current sample**

This is the hard truth.

The current hybrid pack **does not complete the full bind lifecycle inside the synchronous orchestrator**. It reaches:

* `QUOTED`  
* `READY_TO_BIND`  
* emits `PAS_BIND_QUOTE`

But it does **not yet** do all of this in a durable way:

* wait for PAS acknowledgment  
* correlate callback  
* transition to final `BOUND`  
* handle retries/compensation/timers  
* re-enter after PAS/UW/RI replies

That limitation is explicitly called out in your orchestration notes: the current layer is a synchronous state resolver, not yet a long-running workflow engine.

## **16\. So what is the true full quote-to-bind process?**

If you want the **real production-grade end-to-end process**, it should be:

### **Phase 1 — synchronous quote evaluation**

* intake  
* process-context init  
* required-factor resolution  
* compute  
* orchestration  
* UI projection  
* command emission

### **Phase 2 — durable case workflow**

Then a long-running quote case should own the post-evaluation lifecycle:

* `documentUploaded`  
* `previousInsurerProvided`  
* `uwDecisionReceived`  
* `riResponseReceived`  
* `pasBindAcknowledged`  
* `requoteRequested`  
* `withdrawRequested`

That is exactly why Temporal was recommended as the durable orchestration runtime around the current artifact-driven compute/orchestration design. The workflow should own lifecycle and waiting; compute stays artifact-driven and external to workflow code.

## **17\. The clean final architecture I would back**

For your GTL module, the exact end-to-end shape I would back is:

1. **Quote API / Case Service**  
   * creates `quoteId`  
   * persists raw draft  
   * triggers quote evaluation  
2. **Process Init Service**  
   * resolves process context  
   * assigns quote number  
   * applies transaction policy  
3. **Census Ingest Service** when raw census is uploaded  
   * canonicalizes members before quote compute  
4. **Compute Service**  
   * hosts or orchestrates:  
     * RuleDecisionService  
     * RatingService  
   * returns deterministic compute envelope only  
5. **Quote Case Orchestrator**  
   * evaluates state machine  
   * derives lifecycle / queue / actions / commands  
6. **UI Projection Service**  
   * builds frontend projection using state \+ missing factor focus  
7. **Integration Command Service**  
   * emits PAS/UW/DMS/accounting payloads  
8. **Durable Workflow Runtime** for long-running lifecycle  
   * waits on UW/RI/PAS/docs  
   * handles timers/SLAs/re-entry  
   * owns final BOUND/WITHDRAWN/REQUOTING transitions

That preserves the current hybrid design instead of collapsing it back into one engine.

Most important takeaway:

**The current pack already supports clean quote evaluation and bind-readiness. It does not yet implement full durable quote-case-to-bound orchestration.**

# Quote Assembly Layer

## **Core conclusion**

Using the current artifacts and implementation as the base, the missing capability is **not** in the compute/orchestration core. The missing capability is a **pre-compute quote assembly layer** that can start from an empty frontend, generate `quoteId`, let the user choose product and quote type, derive allowed plan/scheme/member options, ingest raw census and loss/claims files, and then build the **canonical quote payload** that the current GTL runtime already expects. The current sample starts only after that canonical payload already exists.

The right move is to add these layers ahead of the current `/quote/evaluate` path:

1. **Quote Bootstrap / Draft Service**  
2. **Product & Configuration Discovery Service**  
3. **Dynamic Option Resolution / Structure Builder**  
4. **Raw File Ingestion Pipelines** for census and claims/loss  
5. **Canonical Quote Assembly Service**  
6. **Pre-compute Completeness / Mapping State Machine**  
7. then hand off to the **existing hybrid runtime** unchanged.

---

# **1\. What the current runtime already does well**

The current hybrid stack is already correctly split into:

* **Compute core** for deterministic evaluation  
* **Orchestration layer** for state/queue/action/command resolution  
* **UI projection layer** for state-based experience  
* **Integration command layer** for external handoffs

It already expects:

* `quoteId`  
* `productCode`  
* `effectiveDate`  
* business/quote context  
* canonicalized members  
* structured plan/product data

It also already has:

* process context resolution  
* quote number generation  
* transaction policy  
* factor requirement evaluation  
* compute pipeline  
* orchestration state machine  
* UI projection  
* integration command emission

So the current runtime is already a good **post-assembly evaluator**. The gap is everything needed **before** canonical quote evaluation begins.

---

# **2\. What additional capabilities are required**

## **A. Quote Bootstrap / Draft Creation Service**

### **What it must do**

This service should become the true frontend entry point instead of starting from a pre-built quote payload.

It should:

* generate `quoteId`  
* create an initial draft quote record  
* capture initial selection:  
  * product line / product  
  * quote type (`NEW`, `TAKEOVER`, `REQUOTE`, etc.)  
  * effective date  
  * channel / broker / branch / insurer context where relevant  
* persist draft state immediately

### **Why this is needed**

The current runtime only generates **quote number** after process initialization; it does not create `quoteId` itself. That must happen before the current evaluation pipeline starts.

### **What it should output**

A draft record such as:

* `quoteId`  
* `draftStatus = INITIATED`  
* `selectedProductCode`  
* `selectedQuoteType`  
* `effectiveDate`  
* `createdBy`  
* `createdAt`

---

## **B. Product & Configuration Discovery Service**

### **What it must do**

Once `productCode` or line of business is selected, this service must resolve the product-specific structure that the frontend can use.

It should read and combine:

* product registry  
* plan design catalog  
* benefit catalog  
* term dictionary  
* clause catalog  
* constraint catalog  
* default scheme templates  
* default billing templates  
* quote-type-specific rule applicability

### **Why this is needed**

The current pack already resolves product and plan templates during compile, but only **after** a canonical quote request is formed. To support frontend-first creation, the same product artifacts must be exposed earlier as a **discovery/configuration API**. The current artifacts already show product resolution, plan hydration, and factor requirement evaluation as distinct responsibilities.

### **What it should output**

For the frontend, this service should provide:

* available plans for selected product  
* available scheme design patterns  
* available member categories  
* allowed coverage structures  
* allowed billing modes  
* allowed optional benefits/riders  
* allowed takeover-only or new-business-only options  
* defaults and hidden constraints

This should not be a raw artifact dump. It should be a **resolved option model**.

---

## **C. Dynamic Option Resolution / Structure Builder**

This is one of the most important missing parts.

### **What it must do**

After product and quote type are selected, the frontend needs guided options such as:

* which plans are available  
* which member categories can be created  
* whether headcount or census-based structure applies  
* whether policyholder-paid / employer-paid / voluntary combinations are allowed  
* which benefit options can be toggled  
* whether takeover fields should appear  
* what minimum structure is needed before file upload

This should be resolved by a dedicated **option engine**, not by hardcoding in UI.

### **How it should work**

Use:

* **generic catalogs** as the source of business options  
* **constraint evaluation** to remove illegal combinations  
* **term/clause catalogs** to produce labels, help text, defaults, and policy wording references  
* **product/plan templates** to define available structural skeletons

### **What should be added**

The current runtime already has static frontend metadata and factor requirement context mapping, but it does not yet expose a first-class **option resolver** for pre-canonical draft creation. That should be added as a separate pre-compute capability. The existing UI contract is state-driven, not product-option-driven.

---

## **D. Raw Census Ingestion Pipeline**

### **What it must do**

The system needs a proper census ingestion service before quote compute.

The current notes already indicate a `PIPE_CENSUS_INGEST` shape with steps like:

* detect columns  
* map columns  
* normalize values  
* validate rows  
* compute data quality score  
* publish canonical members

### **What is still required**

That pipeline must be promoted from a background idea into a formal first-class service with:

1. **file registration**  
2. **template detection**  
3. **column auto-mapping**  
4. **human correction for unmapped columns**  
5. **value normalization**  
6. **member-level row validation**  
7. **deduplication / row conflict handling**  
8. **data quality summary**  
9. **canonical member publication**  
10. **linking canonical members back to quote draft**

### **New artifacts needed**

Add:

* census template registry  
* column synonym catalog  
* value normalization catalog  
* row validation catalog  
* member canonicalization schema  
* ingest issue code catalog

These should sit before the current compute layer.

---

## **E. Raw Loss / Claims File Ingestion Pipeline**

The system also needs a separate ingestion pipeline for raw loss ratio / claims experience files.

### **What it must do**

For takeover or experience-rated flows, this pipeline must:

* ingest raw claims/loss file  
* detect expected sections  
* map columns  
* normalize dates/currencies/amounts/claim statuses  
* aggregate or structure the claims history  
* compute quality/completeness  
* produce canonical experience payload

### **Why it is separate from census**

Because census and claims files are not the same artifact class:

* census \= member roster / exposure basis  
* loss/claims file \= historical claims experience / pricing and takeover input

These should have different templates, mappings, validation rules, and canonical outputs.

### **New artifacts needed**

Add:

* claims file template registry  
* claims column mapping catalog  
* claims normalization rules  
* claims aggregation rules  
* experience-quality checks  
* canonical claims experience schema

The output should become part of the quote’s structured input for pricing, validation, and takeover checks.

---

## **F. Canonical Quote Assembly Service**

This is the key bridge.

### **What it must do**

Once the user selections, structure, census file, and claims file are ready, this service must assemble the exact payload shape expected by the current hybrid runtime.

It should merge:

* bootstrap quote header  
* selected product/quote type  
* scheme and plan selections  
* member category structure  
* canonical members from census ingest  
* canonical claims experience from claims ingest  
* billing setup  
* optional overrides/manual inputs  
* resolved defaults from product/scheme catalogs  
* derived structure metadata

### **Why this is needed**

The current runtime assumes this canonical payload already exists. It compiles packs and then evaluates it. The missing layer is the payload builder that makes the draft frontend experience converge into the current evaluator input.

### **Output**

This service should generate the **single canonical `QuoteRequest`** that the existing compute/orchestration flow already knows how to consume.

---

## **G. Pre-compute Completeness Resolver**

### **What it must do**

Before handing off to quote evaluation, the assembled draft should pass through a completeness resolver that uses the existing factor requirement logic.

The current runtime already distinguishes:

* `missingInputFactors`  
* `pendingDependencyFactors`  
* applicable factor contexts  
* view/section mappings

That same mechanism should be used earlier in the draft flow to answer:

* is the quote structurally ready for evaluation  
* which remaining factors still need UI capture  
* which missing items are pending from ingestion vs manual entry  
* which quote sections must still be completed

### **Result**

Do **not** send incomplete drafts to compute just because files are uploaded.  
First resolve whether the canonical quote assembly is complete enough to evaluate.

---

## **H. Draft-Oriented State Machine Before Existing Runtime States**

The current orchestration state machine starts from evaluated outcomes like:

* `DATA_GATHERING`  
* `UNDER_UW_REVIEW`  
* `RI_REVIEW_REQUIRED`  
* `QUOTED`

That is too late for a frontend-first quote creation flow.

### **Add pre-evaluation states**

A separate **draft assembly state machine** should be introduced before compute/orchestration.

Recommended states:

1. `INITIATED`  
   `quoteId` created, no product chosen yet  
2. `PRODUCT_SELECTED`  
   product, quote type, effective date chosen  
3. `STRUCTURE_DRAFTING`  
   plan/scheme/member category structure being configured  
4. `FILES_PENDING`  
   raw census/claims files not yet uploaded where required  
5. `FILES_INGESTING`  
   ingest pipelines running  
6. `MAPPING_REVIEW_REQUIRED`  
   auto-mapping failed or needs human correction  
7. `CANONICALIZATION_IN_PROGRESS`  
   canonical members / claims experience being built  
8. `ASSEMBLY_INCOMPLETE`  
   canonical draft exists but factor completeness not yet satisfied  
9. `READY_FOR_EVALUATION`  
   canonical quote payload is complete enough to call current `/quote/evaluate`

Only after `READY_FOR_EVALUATION` should the existing hybrid evaluator take over.

---

# **3\. Exact end-to-end target process**

## **Phase 0 — Create draft**

1. Frontend calls `POST /quotes`  
2. Quote Bootstrap Service generates `quoteId`  
3. Draft quote record is created in `INITIATED`

## **Phase 1 — Select product and quote type**

4. Frontend calls `GET /quote-options/bootstrap`  
5. Product Discovery Service returns product list, quote types, effective-date defaults  
6. User selects:  
   * product  
   * quote type (`NEW`, `TAKEOVER`)  
   * effective date  
7. Draft moves to `PRODUCT_SELECTED`

## **Phase 2 — Resolve structure options**

8. Frontend calls `GET /quotes/{quoteId}/structure-options`  
9. Option Resolver reads:  
   * product registry  
   * plan design  
   * benefit catalogs  
   * generic clauses/terms/constraints  
10. Resolver returns:  
* allowed plans  
* allowed schemes  
* allowed member categories  
* required billing modes  
* takeover-only sections if applicable  
11. User configures quote structure  
12. Draft moves to `STRUCTURE_DRAFTING`

## **Phase 3 — Upload files**

13. Frontend uploads:  
* census file  
* claims/loss file where applicable  
14. Draft moves to `FILES_INGESTING`

## **Phase 4 — Ingest raw files**

15. Census ingest runs:  
* detect columns  
* map columns  
* normalize  
* validate rows  
* publish canonical members  
16. Claims ingest runs:  
* detect template  
* map columns  
* normalize claims  
* aggregate claims experience  
* publish canonical experience payload  
17. If mappings fail, draft moves to `MAPPING_REVIEW_REQUIRED`  
18. If both succeed, move to `CANONICALIZATION_IN_PROGRESS`

## **Phase 5 — Assemble canonical quote**

19. Canonical Quote Assembly Service merges:  
* quote header  
* selected product/scheme/plan structure  
* canonical members  
* canonical claims experience  
* catalog-driven defaults  
* manual inputs  
20. Draft now has a machine-readable canonical `QuoteRequest`

## **Phase 6 — Resolve completeness before evaluation**

21. Factor requirement resolver runs against draft quote  
22. It derives:  
* `missingInputFactors`  
* `pendingDependencyFactors`  
* `focusSections`  
23. If gaps remain, move to `ASSEMBLY_INCOMPLETE`  
24. Frontend highlights missing sections using UI metadata \+ focus hints  
25. User completes remaining manual fields

## **Phase 7 — Current hybrid runtime begins**

26. When no blocking gaps remain, state moves to `READY_FOR_EVALUATION`  
27. Existing process initialization applies:  
* resolve process context  
* generate quote number  
* apply transaction policy  
28. Existing compute pipeline runs:  
* eligibility  
* sum assured  
* pricing  
* evidence  
* validation  
* RI  
* decision aggregation  
29. Existing orchestration state machine runs:  
* `DATA_GATHERING`  
* `UNDER_UW_REVIEW`  
* `RI_REVIEW_REQUIRED`  
* `QUOTED`  
30. UI projection and integration commands run as they do today.

---

# **4\. Exact services to add**

These are the concrete services needed.

## **1\. QuoteBootstrapService**

Owns:

* `quoteId` generation  
* draft creation  
* initial metadata persistence

## **2\. ProductDiscoveryService**

Owns:

* product list  
* quote type list  
* effective-date-aware product activation  
* bootstrap option payload

## **3\. QuoteStructureOptionService**

Owns:

* resolving available plans/schemes/member categories  
* applying clause/term/constraint logic  
* building frontend option payloads

## **4\. CensusIngestService**

Owns:

* raw census parsing  
* mapping  
* normalization  
* canonical member publication

## **5\. ClaimsExperienceIngestService**

Owns:

* raw claims/loss file parsing  
* mapping  
* normalization  
* experience aggregation  
* canonical experience publication

## **6\. QuoteAssemblyService**

Owns:

* building canonical `QuoteRequest` from draft components

## **7\. DraftCompletenessService**

Owns:

* applying factor requirement checks before compute  
* reporting missing input/dependency factors  
* returning `focusSections`

## **8\. Existing ComputeService**

Keep as-is:

* rule decision side  
* rating side  
* decision aggregation

## **9\. Existing QuoteCaseOrchestrationService**

Keep as-is for post-evaluation state derivation.

---

# **5\. Additional artifacts required**

To make this work cleanly, add these artifacts.

## **Draft/bootstrap artifacts**

* `quote_bootstrap_catalog.json`  
* `quote_type_catalog.json`  
* `draft_state_machine_catalog.json`

## **Option-resolution artifacts**

* `scheme_template_catalog.json`  
* `member_category_catalog.json`  
* `quote_structure_constraint_catalog.json`  
* `ui_option_mapping_catalog.json`

## **Census ingest artifacts**

* `census_template_registry.json`  
* `census_column_mapping_catalog.json`  
* `census_value_normalization_catalog.json`  
* `census_row_validation_catalog.json`

## **Claims ingest artifacts**

* `claims_template_registry.json`  
* `claims_column_mapping_catalog.json`  
* `claims_normalization_catalog.json`  
* `claims_aggregation_catalog.json`

## **Assembly artifacts**

* `canonical_quote_schema.json`  
* `quote_assembly_mapping_catalog.json`  
* `draft_to_quote_payload_mapping_catalog.json`

The current artifacts already cover the **post-assembly evaluation** side; these new artifacts cover the **pre-assembly creation** side.

---

# **6\. Important design rules**

## **Rule 1**

Do not let the frontend construct the final quote payload by itself.  
Frontend should collect structure and files; backend should assemble the canonical payload.

## **Rule 2**

Do not make factor catalog the frontend schema source.  
Use frontend metadata/UI contract for rendering, and factor requirements only for completeness/focus. The current runtime already follows this split.

## **Rule 3**

Do not push routing or lifecycle into the rule engine.  
Compute stays deterministic; orchestration stays authoritative for state and command emission.

## **Rule 4**

Do not send raw files directly into compute.  
Always canonicalize first.

## **Rule 5**

Keep rule and rating artifact ownership separate.  
The current architecture already supports compute-side separation of rule decisioning and rating.

## **Rule 6**

Audit the exact canonical input and artifact versions used for evaluation.  
The broader rule-architecture note correctly emphasizes immutable audit and version selection based on evaluation date.

---

# **7\. Practical phased rollout**

## **Phase 1**

Add:

* QuoteBootstrapService  
* ProductDiscoveryService  
* QuoteStructureOptionService  
* draft state machine

Goal:  
user can start a quote from empty frontend and build structure manually.

## **Phase 2**

Add:

* CensusIngestService  
* ClaimsExperienceIngestService  
* mapping review UI

Goal:  
raw files can be uploaded and canonicalized.

## **Phase 3**

Add:

* QuoteAssemblyService  
* DraftCompletenessService  
* handoff into existing `/quote/evaluate`

Goal:  
assembled canonical quote reaches current hybrid evaluator.

## **Phase 4**

Add:

* durable long-running workflow around the full quote case

Goal:  
documents, UW, RI, PAS acknowledgment, requote and withdrawal become durable lifecycle events, which the current synchronous orchestrator does not yet handle fully.

---

# **Bottom line**

To get from “frontend starts empty” to “current GTL evaluator can run,” the additional requirement is a **draft-first quote assembly platform** ahead of the current hybrid runtime.

The essential additions are:

* generate `quoteId` at draft creation  
* expose product and quote-type selection APIs  
* resolve plans/schemes/member options from product \+ generic catalogs  
* ingest raw census and claims files  
* canonicalize those files into structured member and experience payloads  
* assemble a canonical quote request  
* run factor completeness against that assembled draft  
* only then hand off to the existing compute \+ orchestration flow

That is the cleanest way to use the current artifacts and implementation without distorting the architecture.

# End to End Flow

Below is the actual end-to-end runtime shape for the **draft-first quote assembly platform**, written in the same style as the earlier hybrid-runtime explanation. The key difference is that this flow starts from an **empty quotation frontend** and ends at **`READY_FOR_EVALUATION`**, where the assembled canonical quote is handed off to the current GTL hybrid evaluator. It does not replace the current evaluator; it sits in front of it.

## **1\. What the draft-first stack actually is**

The draft-first platform is a **pre-evaluation assembly layer**. Its job is to take the user from a blank quote screen to a canonical `QuoteRequest` that the current hybrid GTL evaluator already knows how to process.

It is organized into these logical layers:

* **Draft bootstrap layer**  
  Creates the draft, generates `quoteId`, and captures the first quote selections.  
* **Product discovery and structure option layer**  
  Resolves product-specific templates, scheme options, member categories, default benefits, visible sections, and required uploads.  
* **Raw file ingestion layer**  
  Ingests raw census and claims/loss files, maps columns, normalizes values, validates rows, and publishes canonical member/claims structures.  
* **Canonical quote assembly layer**  
  Takes bootstrap data, manual inputs, structure selection, and canonicalized file outputs and builds the exact `QuoteRequest` shape expected by the current evaluator.  
* **Draft completeness and frontend projection layer**  
  Uses the current factor-requirement model to determine whether the assembled quote is ready for evaluator handoff and which sections still need attention.  
* **Evaluator handoff layer**  
  Emits the final payload for the current `POST /quote/evaluate` flow.

This is the correct boundary: **draft-first assembly prepares the quote; the current hybrid evaluator still owns quote evaluation, pricing, orchestration, and bind-readiness.**

---

## **2\. The exact starting point: what comes in first**

Unlike the current hybrid evaluator, which expects `quoteId` and a canonical quote payload to already exist, the draft-first platform starts with a **minimal bootstrap request**.

That bootstrap request contains things like:

* product selection  
* quote type (`NEW`, `TAKEOVER`, `REQUOTE`)  
* effective date  
* branch/channel context  
* party references if already known  
* user identity / creator

At this point, there is **no canonical quote payload yet** and usually no canonical member list yet.

The system’s first real job is therefore:

**Create a draft quote and generate `quoteId`.**

---

## **3\. Step 1 — Bootstrap pipeline starts**

The artifact `quote_bootstrap_catalog_gtl_quote.json` defines the initial bootstrap behavior.

### **What happens**

The draft bootstrap pipeline does three things:

1. **generate\_quote\_id**  
2. **persist\_draft\_header**  
3. **resolve\_discovery\_profile**

The generated quote ID follows the configured draft pattern:

* prefix `DQ`  
* format `DQ-{yyyy}-{seq6}`

So this platform generates the draft quote ID itself, unlike the downstream evaluator which only later generates quote number. In the sample outputs, the draft IDs are things like:

* `DQ-2026-000101`  
* `DQ-2026-000102`

### **Quote-type behavior**

The bootstrap catalog also classifies quote types:

* `NEW`  
* `TAKEOVER`  
* `REQUOTE`

and attaches behavior such as:

* whether a claims file is required  
* whether previous insurer details are required

That means the quote type immediately affects the draft flow.

---

## **4\. Step 2 — Draft state machine enters `INITIATED`**

The draft state machine is separate from the current evaluator’s orchestration state machine.

The first state is:

### **`INITIATED`**

Triggered when:

* draft exists  
* product is not yet selected

Derived behavior:

* `assembly_state = INITIATED`  
* allowed actions:  
  * `SELECT_PRODUCT`  
  * `SELECT_QUOTE_TYPE`  
  * `SAVE_DRAFT`  
* command:  
  * `DRAFT_CREATED`

This is the true “quote creation” state that the current hybrid evaluator did not have.

---

## **5\. Step 3 — Product and quote-type selection**

Once product and quote type are selected, the platform resolves the discovery profile.

The product discovery artifacts provide:

* allowed quote types by product  
* default scheme templates  
* required uploads by quote type  
* recommended member categories

### **Example**

For `GTL_EMPLOYER_STANDARD_LEVEL`:

* allowed quote types:  
  * `NEW`  
  * `TAKEOVER`  
  * `REQUOTE`  
* default scheme templates:  
  * `SCHEME_TEMPLATE_EMPLOYER_STANDARD`  
  * `SCHEME_TEMPLATE_EMPLOYER_FLEX`  
* required uploads:  
  * `NEW` → `CENSUS`  
  * `TAKEOVER` → `CENSUS`, `CLAIMS_EXPERIENCE`

This is the point where the platform understands whether the flow is:

* simple new quote  
* takeover quote requiring prior insurer \+ claims experience  
* requote/reopen style flow

### **Draft state**

After product selection, the draft moves to:

### **`PRODUCT_SELECTED`**

Triggered when:

* product selected  
* structure not yet selected

Allowed actions:

* `CONFIGURE_STRUCTURE`  
* `UPLOAD_CENSUS`  
* `SAVE_DRAFT`

---

## **6\. Step 4 — Structure options are resolved for the frontend**

This is where the platform starts behaving like a real quote-building experience.

The structure option resolver reads:

* product registry  
* scheme template catalog  
* member category catalog  
* benefit catalog  
* clause catalog  
* plan template catalog  
* draft option resolution catalog

and produces a **resolved option model** for the frontend.

### **What it returns**

For each applicable scheme template, it gives:

* scheme template ID  
* scheme type  
* participation rule  
* applicable member categories  
* default benefits  
* default plan template  
* clause pack  
* required files  
* visible draft sections for that quote type

### **Example**

For an employer-paid standard GTL scheme, the returned structure option can include:

* scheme type \= `EMPLOYER_PAID`  
* participation rule \= `MANDATORY`  
* member category \= `EMPLOYEE`  
* default benefits:  
  * base death benefit  
  * accidental death benefit  
* default plan template \= salary-multiple level-term  
* required file \= census

### **Visible sections**

The `draft_option_resolution_catalog` also controls which sections appear on the frontend.

For example:

* `NEW` shows:  
  * bootstrap  
  * scheme structure  
  * census upload  
  * review and submit  
* `TAKEOVER` shows:  
  * bootstrap  
  * scheme structure  
  * census upload  
  * claims upload  
  * previous insurer  
  * review and submit

This means the frontend is not just a blank form. It becomes a quote-type-aware guided structure builder.

---

## **7\. Step 5 — Draft state moves to `STRUCTURE_DRAFTING`**

Once the user selects the scheme template, member category set, and basic structure, the draft enters:

### **`STRUCTURE_DRAFTING`**

Triggered when:

* structure selected  
* ingest not running  
* canonical quote not yet ready

Allowed actions:

* `UPLOAD_CENSUS`  
* `UPLOAD_CLAIMS`  
* `SAVE_DRAFT`  
* `ASSEMBLE_QUOTE`

At this stage, the quote still exists only as a **draft structure**, not as a full evaluator-ready payload.

---

## **8\. Step 6 — Raw file ingestion begins**

The draft-first platform has its own ingest playbook.

### **Census ingest pipeline**

`PIPE_CENSUS_INGEST` runs:

1. `detect_template`  
2. `map_columns`  
3. `normalize_values`  
4. `validate_rows`  
5. `publish_canonical_members`

### **Claims ingest pipeline**

`PIPE_CLAIMS_INGEST` runs:

1. `detect_template`  
2. `map_columns`  
3. `normalize_values`  
4. `validate_rows`  
5. `aggregate_experience`  
6. `publish_canonical_claims`

This is one of the biggest additions versus the current hybrid evaluator. The evaluator assumes canonical members already exist; the draft-first platform creates them from raw uploads.

---

## **9\. Step 7 — What census ingest actually does**

The census ingest service reads the uploaded CSV and performs:

* template matching using required headers  
* column mapping into canonical field names  
* unresolved-column detection  
* value normalization  
* row-level validation  
* member-type defaulting based on selected member category

### **Canonical census output**

Each row becomes a canonical member-like structure with fields such as:

* `memberId`  
* `name`  
* `age`  
* `gender`  
* `salary`  
* `grade`  
* `employmentStatus`  
* `memberType`  
* loan fields where relevant

### **Validation behavior**

The ingest service raises issues when required values are missing, such as:

* missing member ID  
* missing name  
* invalid DOB  
* missing salary for employee flows

### **Mapping review**

If columns cannot be mapped, they are surfaced as `unresolvedColumns`. That is important because unresolved mappings block evaluator handoff later.

---

## **10\. Step 8 — What claims ingest actually does**

For takeover flows, the claims experience ingest service reads the uploaded claims/loss CSV and performs:

* template matching  
* canonical column mapping  
* unresolved-column detection  
* value normalization  
* row structuring into claim entries  
* summary aggregation

### **Canonical claims output**

The service derives both claim records and summary metrics such as:

* `claimCount`  
* `claimantCount`  
* `totalIncurred`  
* `totalPaid`  
* `openClaimCount`  
* `averageIncurred`  
* `experienceClaimRatio12m`

This claims summary is later injected into the assembled quote payload for takeover/pricing/validation use.

---

## **11\. Step 9 — Draft state during file work**

While ingest is running, the draft state machine moves to:

### **`FILES_INGESTING`**

Triggered when:

* ingest running \= true

Allowed actions:

* `VIEW_INGEST_STATUS`

Commands:

* `CENSUS_INGEST_REQUESTED`  
* `CLAIMS_INGEST_REQUESTED`

If there are unresolved mappings, the draft moves to:

### **`MAPPING_REVIEW_REQUIRED`**

Triggered when:

* `unresolvedMappingsCount > 0`

Allowed actions:

* `REVIEW_COLUMN_MAPPING`  
* `RETRY_INGEST`

Command:

* `MAPPING_REVIEW_REQUESTED`

This is a pre-evaluation quality-control state that does not exist in the downstream evaluator.

---

## **12\. Step 10 — Canonical quote assembly begins**

Once the draft has:

* bootstrap data  
* structure selection  
* canonical census output  
* canonical claims output where needed  
* manual overrides

the assembly service builds the **canonical quote payload**.

The assembly mapping catalog defines the assembly strategy as:

**`skeleton_overlay_plus_dynamic_sections`**

That means the system does not build the quote payload from scratch field by field. It starts with a **quote skeleton** and overlays dynamic content into it.

### **Key dynamic sections**

The assembly layer fills sections such as:

* quote header from bootstrap  
* party refs from manual overrides  
* policy config from overrides or bootstrap defaults  
* members from canonical census  
* claims experience from canonical claims summary  
* plans from structure selection resolution

### **Important mapping examples**

The assembly mapping explicitly pushes fields like:

* `bootstrap.productCode` → `productCode`  
* `bootstrap.effectiveDate` → `effectiveDate`  
* `bootstrap.quoteId` → `quoteId`  
* `manual_overrides.partyRefs.policyholderRef` → `partyRefs.policyholderRef`  
* `manual_overrides.partyRefs.previousInsurerRef` → `partyRefs.previousInsurerRef`  
* `canonical_claims.summary.experienceClaimRatio12m` → `experienceClaimRatio12m`  
* `canonical_members.members` → `members`

So this service is the precise bridge between draft-world and evaluator-world.

---

## **13\. Step 11 — What the assembly service actually produces**

The assembly service builds a full evaluator-shaped quote payload with:

* `quoteId`  
* `productCode`  
* `schemeType`  
* `effectiveDate`  
* policy year dates  
* party refs  
* distribution and servicing blocks  
* policy config defaults  
* `takeoverBusiness` flag  
* documents  
* canonical members  
* headcount summary  
* pricing/segment attributes  
* claim ratio  
* plan and product structure  
* benefits  
* rate slab placeholders  
* business process context

### **Business process context**

The service explicitly sets:

* `NEW_BUSINESS_QUOTE_INIT` for new flows  
* `TAKEOVER_QUOTE_INIT` for takeover flows

That means the assembled payload is already aligned to the downstream evaluator’s process-init expectations.

---

## **14\. Step 12 — Completeness is checked before evaluator handoff**

This is the draft-first equivalent of pre-evaluation gating.

The completeness service reuses the **current factor requirement catalog** to determine whether the assembled quote is actually ready to be sent to the current evaluator.

### **What it checks**

It walks through factor requirement contexts and produces:

* `missingInputFactors`  
* `pendingDependencyFactors`  
* `focusSections`  
* `handoffReady`

It also adds special draft-first blocking logic for:

* unresolved column mappings  
* missing previous insurer reference for takeover

### **Blocking logic**

The completeness projection defines these blockers:

* unresolved mappings  
* missing input factors  
* missing previous insurer on takeover

### **Meaning**

This is critical:

The draft-first platform does **not** hand off just because assembly succeeded.  
It hands off only when the assembled quote is complete enough for the downstream evaluator.

---

## **15\. Step 13 — Frontend projection for draft flow**

The draft frontend projection is built from completeness results, not just from static schemas.

It surfaces:

* missing-input factors  
* pending dependencies  
* upload status  
* mapping-review status  
* section focus hints

This is how the frontend knows whether to push the user toward:

* quote identity details  
* scheme structure  
* census correction  
* claims correction  
* previous insurer capture  
* final review

So the draft-first UI is a guided assembly experience, not just a static wizard.

---

## **16\. Step 14 — Draft state machine resolves final assembly state**

After assembly and completeness evaluation, the draft state machine chooses one of the late-stage states.

### **`ASSEMBLY_INCOMPLETE`**

Triggered when:

* canonical quote exists  
* handoff not ready

Allowed actions:

* `EDIT_MISSING_INPUTS`  
* `REASSEMBLE_QUOTE`

Command:

* `ASSEMBLED_QUOTE_PUBLISHED`

### **`READY_FOR_EVALUATION`**

Triggered when:

* `handoffReady = true`

Allowed actions:

* `OPEN_CANONICAL_PAYLOAD`  
* `SEND_TO_EVALUATOR`

Commands:

* `ASSEMBLED_QUOTE_PUBLISHED`  
* `HANDOFF_TO_CURRENT_EVALUATOR`

This is the most important boundary in the draft-first system.

It does **not** try to evaluate eligibility, pricing, evidence, RI, or workflow state itself.  
It stops at a clean handoff point.

---

## **17\. Step 15 — Evaluator handoff is built**

The evaluator handoff contract defines the target as:

* service: `CurrentGTLHybridEvaluator`  
* endpoint: `POST /quote/evaluate`  
* required bundle version: `2.0.0-hybrid`

### **Preconditions**

The handoff is allowed only when:

* `assembly_state == READY_FOR_EVALUATION`  
* canonical quote payload exists  
* missing input factors \= 0  
* unresolved mappings \= 0

### **Expected downstream response**

The draft-first platform expects the evaluator to return:

* decision  
* status projection  
* frontend projection  
* integration events

That makes the handoff contractually explicit.

---

## **18\. The exact runtime sequence in code**

The runtime implementation follows this order:

1. `createDraftQuote`  
2. `getProductDiscovery`  
3. `resolveStructureOptions`  
4. `ingestCensus` if census file exists  
5. `ingestClaimsExperience` if claims file exists  
6. `assembleCanonicalQuote`  
7. `evaluateDraftCompleteness`  
8. `buildFrontendProjection`  
9. `buildEvaluatorHandoff`  
10. derive final draft assembly state

So the actual control flow is:

**bootstrap → discover → structure → ingest → assemble → check completeness → project UI → build handoff**

That is the real end-to-end path.

---

## **19\. End-to-end example: new business quote**

This is the cleanest example.

### **Initial intake**

The user starts a new draft quote from the frontend and chooses:

* product \= `GTL_EMPLOYER_STANDARD_LEVEL`  
* quote type \= `NEW`  
* effective date \= `2026-04-15`

The system creates:

* `quoteId = DQ-2026-000101`

### **Product discovery**

The platform resolves:

* allowed quote types  
* default scheme templates  
* recommended member categories  
* required uploads for `NEW` \= census only

### **Structure selection**

The user selects:

* scheme template \= `SCHEME_TEMPLATE_EMPLOYER_STANDARD`  
* member category \= `MCAT_EMPLOYEE`  
* billing frequency \= `MONTHLY`

### **Census ingestion**

The user uploads census CSV. The ingest pipeline:

* matches template  
* maps columns  
* normalizes data  
* validates rows  
* produces canonical members

### **Canonical assembly**

The platform overlays the quote skeleton with:

* bootstrap header  
* employee members  
* selected scheme  
* policy config defaults  
* plan and benefit defaults

### **Completeness**

The factor-requirement check finds:

* no missing input factors  
* no unresolved mappings

### **State**

The draft moves to:

* `READY_FOR_EVALUATION`

### **Output**

The platform produces:

* assembled canonical `QuoteRequest`  
* draft frontend projection  
* evaluator handoff payload

Only then is it ready to call the current hybrid evaluator.

---

## **20\. End-to-end example: takeover quote**

The takeover path is similar, but with two extra responsibilities.

### **Initial intake**

The user starts a takeover draft and chooses:

* product \= `GTL_EMPLOYER_STANDARD_LEVEL`  
* quote type \= `TAKEOVER`  
* effective date \= `2026-04-15`

The system creates:

* `quoteId = DQ-2026-000102`

### **Product discovery**

Because quote type is `TAKEOVER`, the platform now requires:

* census upload  
* claims experience upload  
* previous insurer details

### **Structure selection**

The structure is chosen the same way as new business.

### **File ingestion**

Two pipelines run:

* census ingest  
* claims ingest

The claims ingest derives experience metrics like claim ratio.

### **Canonical assembly**

The assembled quote now includes:

* `takeoverBusiness = true`  
* previous insurer reference  
* claim experience summary  
* experience claim ratio

### **Completeness**

The completeness gate additionally checks that:

* unresolved mappings are zero  
* previous insurer ref is present

### **State**

If all of that is satisfied, the draft moves to:

* `READY_FOR_EVALUATION`

If previous insurer data is missing, or claims mapping is incomplete, it stops earlier in:

* `MAPPING_REVIEW_REQUIRED`, or  
* `ASSEMBLY_INCOMPLETE`

That is the correct takeover-specific control.

---

## **21\. What this platform does not do**

This is the blunt boundary.

The draft-first assembly platform does **not** do:

* eligibility evaluation  
* sum assured derivation  
* evidence/FCL logic  
* pricing  
* validation decisioning  
* RI referral decisioning  
* lifecycle routing like `DATA_GATHERING`, `UNDER_UW_REVIEW`, `QUOTED`  
* PAS bind readiness

Those are still owned by the **current hybrid GTL evaluator** after handoff.

So the draft-first platform is not a second evaluator.  
It is a **front-loaded quote creation and canonicalization system**.

---

## **22\. The clean boundary between draft-first and current evaluator**

The clean split is:

### **Draft-first assembly platform owns**

* `quoteId` generation  
* draft creation  
* product/quote-type bootstrap  
* structure optioning  
* raw file ingestion  
* canonicalization  
* quote payload assembly  
* pre-evaluator completeness check  
* frontend guidance for missing sections  
* evaluator handoff payload

### **Current hybrid evaluator owns**

* process-context init  
* quote number generation  
* transaction policy  
* factor re-resolution during evaluation  
* compute  
* orchestration  
* UI mode after evaluation  
* integration command emission  
* bind-readiness

That is the correct architecture.

---

## **23\. Final end-to-end shape**

So the actual end-to-end process for the draft-first quote files is:

1. user opens blank quote frontend  
2. bootstrap request creates draft and `quoteId`  
3. product discovery returns available quote types, scheme templates, member categories, and required uploads  
4. user selects product, quote type, and structure  
5. platform shows visible sections based on quote type  
6. user uploads census and, if needed, claims file  
7. ingest pipelines canonicalize files and surface mapping issues  
8. assembly service builds canonical evaluator-shaped quote payload  
9. completeness service checks factor readiness and missing inputs  
10. draft state machine moves to:  
* `MAPPING_REVIEW_REQUIRED`, or  
* `ASSEMBLY_INCOMPLETE`, or  
* `READY_FOR_EVALUATION`  
11. frontend projection highlights what is still missing  
12. when ready, evaluator handoff payload is produced  
13. current GTL hybrid evaluator takes over from there

That is the full runtime story.

# Artifact Driven Approach

This GTL quotation module is essentially a **deterministic, catalog-driven decision system** with **clear separation of authoring vs execution**, and a **pipeline-based orchestration** that converts raw quote input → fully computed quote \+ decision \+ routing \+ UI state.

---

# **1\. Mental Model (What this system really is)**

Forget “quotation module” as a feature.

This is actually:

**A compiled decision runtime built from \~70 catalogs, executed via a deterministic pipeline, producing a complete business state projection.**

It has 3 clear layers:

---

# **2\. Layer 1 — Authoring Layer (Where business logic lives)**

This is the **real system of record**, not the TypeScript.

Everything meaningful is here.

## **2.1 What authoring contains**

\~70 catalogs grouped into domains:

### **A. Product & Pricing Definition**

* `rate_table_catalog`  
* `pricing_policy_catalog`  
* `sum_assured_basis_catalog`  
* `factor_definition_catalog`

👉 Defines:

* how premium is calculated  
* what factors are required  
* what combinations are valid

---

### **B. Underwriting & Evidence**

* `fcl_catalog`  
* `fcl_band_configuration_catalog`  
* `evidence_requirement_catalog`

👉 Defines:

* FCL thresholds  
* when medicals are required  
* underwriting triggers

---

### **C. Validation & Constraints**

* `validation_rule_catalog`  
* `constraint_catalog`

👉 Defines:

* age limits  
* SA caps  
* takeover rules  
* headcount constraints

---

### **D. Process & Lifecycle**

* `quote_process_context_catalog`  
* `quote_transaction_policy_catalog`  
* `quote_status_derivation_catalog`

👉 Defines:

* what is NBZ vs takeover vs endorsement  
* transaction numbers  
* status (PENDING, QUOTED, etc.)  
* lifecycle state

This is where your FRD requirement:

tranno \= 1, status \= PEND

is actually implemented.

---

### **E. Commercial / Billing**

* `billing_policy_catalog`

👉 Defines:

* modal factor  
* premium splits  
* billing schedule

---

### **F. UI & Experience Layer**

* `quote_frontend_metadata_catalog`  
* `query_projection_catalog`  
* `quote_action_catalog`

👉 Defines:

* screens  
* fields  
* missing factor routing  
* allowed actions

---

### **G. Integration & Handoff**

* `integration_event_catalog`  
* `module_handoff_catalog`

👉 Defines:

* what payload goes to PAS  
* what goes to UW  
* what events are emitted

---

### **H. Numbering & Identity**

* `numbering_setup_catalog`

👉 Defines:

* quote number generation logic

---

## **Key Insight**

👉 **This system is NOT code-driven. It is catalog-driven.**

Code is just an execution engine.

---

# **3\. Layer 2 — Compile Layer (Bridge between authoring and execution)**

This is `compilePackSet`.

## **What happens here**

* All catalogs are loaded  
* Filtered by:  
  * product  
  * scheme  
  * effective date  
* Converted into:

```
CompiledPackSet
```

Think of it as:

“Insurance product compiled into executable memory”

---

## **Why this matters**

This is where:

* invalid catalogs should fail  
* versioning should happen  
* consistency should be enforced

Right now (v1.6):

* still weak validation (improved but not perfect)

---

# **4\. Layer 3 — Execution Layer (Runtime engines)**

This is where things actually happen.

Driven by:

```
playbookExecutor → PIPE_QUOTE_COMPUTE
```

---

## **4.1 Execution Flow (High-level)**

```
Input Quote
   ↓
Process Context Initialization
   ↓
Validation
   ↓
Factor Resolution
   ↓
Sum Assured Calculation
   ↓
Pricing
   ↓
Evidence / FCL
   ↓
Aggregation Decision
   ↓
Status Derivation
   ↓
Routing + UI Projection
   ↓
Handoff
```

---

# **5\. Core Runtime Services (What each does)**

## **5.1 processContextService**

* Initializes:  
  * business process (NBZ / takeover)  
  * record type  
  * tranno \= 1  
  * status \= PENDING

👉 Implements FRD-level logic cleanly.

---

## **5.2 numberingService**

* Generates:

```
GTLQ-2026-001842
```

👉 Driven from catalog, not hardcoded.

---

## **5.3 validationEngine**

* Runs all validation rules:  
  * takeover checks  
  * age limits  
  * SI constraints  
  * date windows

👉 Produces:

* validation errors  
* blocking conditions

---

## **5.4 factorEngine**

* Resolves:  
  * age bands  
  * salary multiples  
  * derived inputs

👉 Feeds pricing \+ SA

---

## **5.5 sumAssuredEngine**

* Computes SA per member using:  
  * FLAT  
  * SALARY\_MULTIPLE  
  * GRADE\_SLAB  
  * LOAN-based

---

## **5.6 pricingEngine**

* Matches:  
  * rate table  
  * factors  
* Computes:  
  * premium per member  
  * total premium

---

## **5.7 evidenceEngine**

* Applies:  
  * FCL rules  
  * evidence requirements

👉 Outputs:

* who needs medicals  
* underwriting triggers

---

## **5.8 planRuntimeService**

* Materializes:  
  * plans  
  * products  
  * benefits  
  * exclusions

---

## **5.9 billingService**

* Computes:  
  * modal premium  
  * billing profile

---

## **5.10 aggregationEngine**

* Consolidates everything into:

```
decision = QUOTE_READY / REQUEST_INFORMATION / REFER
```

---

## **5.11 statusDerivationService**

* Converts decision → lifecycle state

Example:

* QUOTE\_READY → QUOTED / READY\_FOR\_BIND  
* REQUEST\_INFORMATION → PENDING / DATA\_REQUIRED

---

## **5.12 routingService (implicit via aggregation)**

* Maps decision → queue

Example:

* AUTO\_QUOTE  
* DOC\_COLLECTION  
* UW\_REVIEW

---

## **5.13 frontendProjectionService**

* Builds UI state:  
  * allowed actions  
  * missing fields  
  * views

---

## **5.14 integration \+ handoff**

* Emits:  
  * PAS payload  
  * UW payload  
  * events

---

# **6\. End-to-End Example (Real Execution)**

Let’s use your actual output.

---

## **CASE 1 — Takeover Quote (Incomplete Data)**

### **Step-by-step what happened**

### **1\. Input**

* takeover quote  
* missing previous insurer

---

### **2\. processContextService**

```
businessProcessContext = TAKEOVER_QUOTE_INIT
tranno = 1
status = PENDING
```

---

### **3\. validationEngine**

* detects:  
  * missing previous insurer

---

### **4\. pricingEngine**

* still computes premium:

```
annualPremium = 686.85
```

---

### **5\. evidenceEngine**

* runs FCL rules

---

### **6\. aggregationEngine**

* sees:  
  * missing mandatory factor

👉 decision:

```
REQUEST_INFORMATION
```

---

### **7\. statusDerivationService**

```
mainStatus = PENDING
secondaryStatus = DATA_REQUIRED
lifecycleState = DATA_GATHERING
```

---

### **8\. routing**

```
routeId = DOC_COLLECTION
```

---

### **9\. frontend projection**

System tells UI:

* missing field:

```
previousInsurerRef
```

*   
  exact screen:

```
QUOTE_KEY_DATA → party_roles
```

---

## **🔥 Final output**

System becomes:

“This quote is incomplete. Go collect data.”

---

## **CASE 2 — Clean Quote (Auto-ready)**

---

### **Flow**

* all inputs present  
* validations pass  
* pricing computed  
* no evidence needed

---

### **aggregationEngine**

```
decision = QUOTE_READY
```

---

### **status**

```
QUOTED / READY_FOR_BIND
```

---

### **routing**

```
AUTO_QUOTE
```

---

### **UI**

* action:

```
SEND_TO_PAS_BIND
```

---

## **🔥 Final outcome**

“Quote is ready. Bind immediately.”

---

# **7\. How UW Handoff Actually Happens**

This is critical.

---

## **Trigger conditions**

From aggregation:

| Condition | Outcome |
| ----- | ----- |
| missing data | DOC\_COLLECTION |
| FCL breach | UW\_REVIEW |
| RI breach | REINSURER |
| clean | AUTO\_QUOTE |

---

## **Handoff catalogs**

* `module_handoff_catalog`  
* `integration_event_catalog`

---

## **What gets sent to UW**

* member-level risk data  
* SA details  
* FCL breaches  
* evidence requirements  
* pricing

---

## **What system guarantees**

* deterministic payload  
* full traceability  
* no recomputation needed downstream

---

# **8\. The Real Power (Why this architecture matters)**

This is not just “clean design”.

This solves core insurer problems:

---

## **Problem 1: Rule explosion (millions of combinations)**

👉 Solved by:

* DSL \+ catalogs  
* factorized logic  
* runtime evaluation

---

## **Problem 2: Business vs IT dependency**

👉 Solved by:

* catalogs owned by business  
* no code changes for pricing/UW

---

## **Problem 3: UI \+ backend mismatch**

👉 Solved by:

* frontend projection from same runtime

---

## **Problem 4: Auditability**

👉 Solved by:

* trace logs per member  
* deterministic pipeline

---

# **9\. What This System Still Does NOT Do (Be blunt)**

Even v1.6:

### **❌ No persistent event store**

* no transaction history  
* no re-rating trace over time

### **❌ No real integration execution**

* handoffs are simulated

### **❌ No true concurrency scaling**

* batch processing is pseudo

### **❌ Limited schema enforcement (still improving)**

---

# **10\. Final Simplified View**

If I compress everything:

---

## **This system is:**

```
Authoring (JSON catalogs)
        ↓
Compile (PackSet)
        ↓
Pipeline Execution (engines)
        ↓
Decision + State Projection
        ↓
UI + UW + PAS Handoff
```

---

## **And the key philosophy is:**

**“Everything is a catalog. Execution is deterministic. Output is a complete business state.”**

---

# Tab 2

# **1\. Catalog → Engine → DSL Mapping (Actual execution ownership)**

This is the **real architecture truth** — who owns what, and how it runs.

---

## **1.1 Pricing Stack (Core money logic)**

| Catalog | Engine | DSL Type | What actually happens |
| ----- | ----- | ----- | ----- |
| `rate_table_catalog` | `pricingEngine` | Lookup \+ conditional filters | Select correct rate row |
| `pricing_policy_catalog` | `pricingEngine` | Expression DSL | Premium formula execution |
| `factor_definition_catalog` | `factorEngine` | Derivation DSL | Compute derived inputs |

---

### **Example (what you really have)**

#### **Catalog (simplified)**

```json
{
  "rateTableId": "GTL_SALARIED_STD",
  "dimensions": ["ageBand", "gender"],
  "rows": [
    { "ageBand": "36-40", "gender": "M", "rate": 0.85 }
  ]
}
```

---

#### **DSL in pricing\_policy**

```json
{
  "formula": "premium = (sumAssured / 1000) * rate"
}
```

---

### **Execution**

```
pricingEngine:
  → resolve ageBand
  → lookup rate
  → evaluate DSL expression
```

---

## **🔥 Insight**

DSL is NOT global.  
It is **localized to specific engines** (pricing, validation, factor, status).

---

---

## **1.2 Validation Stack**

| Catalog | Engine | DSL | Purpose |
| ----- | ----- | ----- | ----- |
| `validation_rule_catalog` | `validationEngine` | Boolean expression DSL | Hard/soft validations |

---

### **Example**

```json
{
  "ruleId": "VAL.AGE_LIMIT",
  "condition": "member.age > 65",
  "severity": "ERROR"
}
```

---

### **Execution**

```
validationEngine:
  evaluate(condition AST)
  → emit violation
```

---

## **🔥 Important**

Validation does NOT stop pipeline.

👉 It produces:

* blocking errors  
* non-blocking warnings

Decision layer uses them later.

---

---

## **1.3 FCL / Evidence Stack**

| Catalog | Engine | DSL | Purpose |
| ----- | ----- | ----- | ----- |
| `fcl_band_configuration_catalog` | `evidenceEngine` | Threshold DSL | FCL logic |
| `evidence_requirement_catalog` | `evidenceEngine` | Conditional DSL | Medical triggers |

---

### **Example**

```json
{
  "condition": "sumAssured > fclLimit",
  "action": "REQUIRE_MEDICAL"
}
```

---

### **Execution**

```
evidenceEngine:
  evaluate(member)
  → mark as UW required
```

---

---

## **1.4 Status \+ Lifecycle**

| Catalog | Engine | DSL | Purpose |
| ----- | ----- | ----- | ----- |
| `quote_status_derivation_catalog` | `statusDerivationService` | Rule priority DSL | Final state |

---

### **Example**

```json
{
  "condition": "decision == REQUEST_INFORMATION",
  "mainStatus": "PENDING",
  "secondaryStatus": "DATA_REQUIRED"
}
```

---

### **Execution**

👉 First-match-wins

---

---

## **1.5 Transaction \+ Process Context**

| Catalog | Engine | Purpose |
| ----- | ----- | ----- |
| `quote_process_context_catalog` | `processContextService` | Normalize business process |
| `quote_transaction_policy_catalog` | `transactionPolicyService` | Initialize tranno |

---

### **This is where FRD rule lives:**

```
if NBZ or TAKEUP:
  tranno = 1
  last_tranno = 1
  status = PENDING
```

Implemented via catalogs, not code.

---

---

## **1.6 UI Projection**

| Catalog | Engine | Purpose |
| ----- | ----- | ----- |
| `quote_frontend_metadata_catalog` | `frontendProjectionService` | Screen rendering |
| `query_projection_catalog` | same | Inbox/grid |

---

### **Example (from runtime output)**

* missing factor mapped to:

```
viewId: QUOTE_KEY_DATA
section: party_roles
```

👉 UI is not hardcoded — it is derived.

---

---

## **1.7 Handoff**

| Catalog | Engine | Purpose |
| ----- | ----- | ----- |
| `module_handoff_catalog` | orchestration | UW/PAS payload |
| `integration_event_catalog` | event emitter | async events |

---

---

# **2\. JSON → AST → Execution (Deep dive of one pricing rule)**

Now the real mechanics.

---

## **2.1 Input JSON (DSL)**

```json
{
  "formula": "premium = (sumAssured / 1000) * rate"
}
```

---

## **2.2 Parser (custom DSL parser)**

This converts into AST:

```json
{
  "type": "Assignment",
  "left": "premium",
  "right": {
    "type": "Multiply",
    "left": {
      "type": "Divide",
      "left": "sumAssured",
      "right": 1000
    },
    "right": "rate"
  }
}
```

---

## **2.3 Execution context**

```json
{
  "sumAssured": 500000,
  "rate": 0.85
}
```

---

## **2.4 Evaluator**

```
evaluate(AST, context):
  → resolve variables
  → compute tree
```

---

## **2.5 Result**

```json
{
  "premium": 425
}
```

---

## **🔥 Important Reality**

This DSL is:

### **Good:**

* deterministic  
* auditable  
* portable

### **Weak:**

* custom parser → risk  
* no static typing  
* no validation guarantees

---

👉 In production:

* you’ll need AST validation layer or DMN fallback

---

# **3\. Full End-to-End Flow (Real System Execution)**

Now I’ll stitch everything together.

---

# **3.1 Input (Quote Request)**

```json
{
  "businessProcessContext": "TAKEOVER",
  "members": [...],
  "policyholder": ...
}
```

---

# **3.2 Step-by-step Execution**

---

## **STEP 1 — Compile PackSet**

```
packCompiler:
  → load catalogs
  → filter by scheme/date
  → build compiledPackSet
```

---

## **STEP 2 — Process Context Init**

```
processContextService:
  → normalize process
  → assign:
     recordType = QUOTATION
     tranno = 1
     status = PENDING
```

---

## **STEP 3 — Numbering**

```
numberingService:
  → generate:
     GTLQ-2026-001843
```

---

## **STEP 4 — Validation**

```
validationEngine:
  → run rules
  → detect:
     missing previous insurer
```

---

## **STEP 5 — Factor Resolution**

```
factorEngine:
  → derive:
     ageBand
     salaryMultiple
```

---

## **STEP 6 — Sum Assured**

```
sumAssuredEngine:
  → compute SA per member
```

---

## **STEP 7 — Pricing**

```
pricingEngine:
  → select rate table
  → evaluate DSL
  → compute premium
```

---

## **STEP 8 — Evidence / FCL**

```
evidenceEngine:
  → compare SA vs FCL
  → mark UW requirement
```

---

## **STEP 9 — Aggregation (Most important step)**

```
aggregationEngine:
  inputs:
    validationErrors
    missingFactors
    evidence
    pricing

  output:
    decision
```

---

### **Example (your real output)**

```json
"decision": "REQUEST_INFORMATION"
```

---

## **STEP 10 — Status Derivation**

```
statusDerivationService:
  → map decision → status
```

---

Result:

```json
mainStatus: PENDING
secondaryStatus: DATA_REQUIRED
```

---

## **STEP 11 — Routing**

```
route = DOC_COLLECTION
```

---

## **STEP 12 — Frontend Projection**

```
frontendProjectionService:
  → allowedActions
  → missing fields
  → screens
```

---

## **STEP 13 — Handoff Decision**

Now system decides:

---

### **Case A — Auto Quote**

```json
decision = QUOTE_READY
```

→ PAS\_BIND

---

### **Case B — Missing Info**

```json
decision = REQUEST_INFORMATION
```

→ DOC\_COLLECTION

---

### **Case C — UW Required**

```json
decision = REFER_UW
```

→ UW\_WORKBENCH

---

---

# **4\. UW OS / PAS Integration (How this plugs into your larger system)**

This is where your Anaira architecture comes in.

---

## **4.1 Integration Model**

```
Quotation Engine
    ↓
Decision Output
    ↓
Handoff Payload
    ↓
UW OS / PAS
```

---

## **4.2 What UW OS receives**

From `module_handoff_catalog`:

```json
{
  "members": [...],
  "sumAssured": ...,
  "fclBreaches": [...],
  "evidenceRequired": [...],
  "premium": ...
}
```

---

## **4.3 UW OS responsibilities**

* deeper risk scoring  
* manual underwriting  
* approval / rejection

---

## **4.4 PAS responsibilities**

* policy issuance  
* accounting  
* endorsements

---

---

# **5\. Where this fits in Anaira (Brutal clarity)**

---

## **What this module IS**

✔ deterministic quote computation engine  
✔ decision \+ routing engine  
✔ UI projection engine  
✔ UW trigger engine

---

## **What it is NOT (yet)**

❌ policy system  
❌ underwriting system  
❌ accounting system  
❌ event-sourced core

---

---

# **6\. Final Synthesis**

---

## **Entire system in one view**

```
Catalogs (Authoring Layer)
   ↓
Pack Compiler
   ↓
Execution Pipeline
   ↓
Decision Engine
   ↓
State Projection (status + UI)
   ↓
Routing
   ↓
Handoff (UW / PAS)
```

---

## **The deepest truth**

This is not a “quotation module”.

This is a **deterministic decision compiler \+ runtime** for insurance.

---

# Tab 3

AST \= **Abstract Syntax Tree**

But don’t think of it as a “compiler concept”.  
In your system, it is **the internal representation of every rule/formula after parsing — the thing that actually gets executed**.

---

# **1\. What AST really means (in your context)**

You write this in catalogs:

```json
{
  "formula": "premium = (sumAssured / 1000) * rate"
}
```

This is just a **string**.  
Machines cannot reliably execute strings.

So the system converts it into a **structured tree**:

```json
{
  "type": "Assignment",
  "left": "premium",
  "right": {
    "type": "Multiply",
    "left": {
      "type": "Divide",
      "left": "sumAssured",
      "right": 1000
    },
    "right": "rate"
  }
}
```

That tree \= **AST**

---

# **2\. Why it’s called “Abstract Syntax Tree”**

* **Syntax** → structure of the expression  
* **Abstract** → removes unnecessary details (like brackets, formatting)  
* **Tree** → hierarchical structure

---

# **3\. Simple analogy**

Expression:

```
2 + 3 * 4
```

AST:

```
       (+)
      /   \
    2     (*)
         /   \
        3     4
```

👉 This enforces correct order (multiplication before addition)

---

# **4\. How AST is used in your GTL system**

Every DSL-based rule goes through this pipeline:

```
DSL string
   ↓
Parser
   ↓
AST
   ↓
Evaluator
   ↓
Result
```

---

## **Example inside your system**

### **Step 1 — Catalog**

```json
{
  "condition": "sumAssured > fclLimit"
}
```

---

### **Step 2 — AST**

```json
{
  "type": "GreaterThan",
  "left": "sumAssured",
  "right": "fclLimit"
}
```

---

### **Step 3 — Execution**

```json
context = {
  "sumAssured": 500000,
  "fclLimit": 300000
}
```

Evaluator:

```
500000 > 300000 → true
```

---

### **Step 4 — Outcome**

```
→ Trigger FCL breach
→ Send to UW
```

---

# **5\. Where AST is used in your module**

| Area | Why AST is needed |
| ----- | ----- |
| Pricing | Evaluate formulas |
| Validation | Evaluate conditions |
| FCL rules | Threshold checks |
| Status derivation | Conditional mapping |
| Factor derivation | Computed fields |

---

# **6\. Why AST is critical (not optional)**

Without AST, you have only bad options:

### **❌ Option 1: eval()**

* unsafe  
* not auditable  
* not controllable

### **❌ Option 2: hardcoded logic**

* not configurable  
* not scalable

---

### **✅ AST gives you:**

* deterministic execution  
* full audit trail  
* rule explainability  
* portability across systems

---

# **7\. The real power (why you built this)**

Because of AST:

👉 A business user can write:

```
premium = (sumAssured / 1000) * rate
```

👉 And your system can:

* parse it  
* validate it  
* execute it  
* explain it  
* version it

---

# **8\. The real problem (be blunt)**

Your current AST system is:

### **Good:**

* works  
* flexible  
* deterministic

### **Weak:**

* custom parser → fragile  
* no static validation  
* no type safety  
* hard to debug at scale

---

# **9\. What “good” looks like (future)**

You should eventually move to:

* typed AST (validated)  
* expression schemas  
* or hybrid:  
  * DMN for decisions  
  * AST for math

---

# **10\. One-line truth**

**AST is the bridge between human-written rules and machine-executable logic.**

---

# Missing Salary Example

This JSON is not just “data.”  
It is the **final evaluated state of a GTL quotation after the full engine pipeline has run**, including:

* business decision  
* premium calculation  
* status derivation  
* workflow routing  
* UI projection  
* downstream system triggers

Below is the **exact business flow**, translated into plain, structured terms.

---

# **1\. What just happened (one-line)**

A **new GTL quote was created → evaluated → priced → validated → and routed for document collection**, not yet ready for underwriting or binding.

---

# **2\. Step-by-step business flow**

## **Step 1 — Quote initiation**

* A new quote is created:  
  * Quote No: **GTLQ-2026-001845**  
  * Context: **New Business**  
  * Transaction No: **1**  
  * Status:  
    * Main: **PENDING**  
    * Secondary: **DATA\_REQUIRED**

This corresponds to:

“Quote created but not yet complete or bindable”

---

## **Step 2 — Data ingestion**

The system receives:

* Product: Employer-paid GTL  
* Member count: 4 employees  
* Census data (age, salary, etc.)  
* Plan \+ benefit configuration

---

## **Step 3 — Engine pipeline execution**

The quote is run through a **multi-stage evaluation pipeline**:

### **3.1 Eligibility Check**

* All 4 members are eligible  
* No exclusions at this stage

Outcome:  
→ **PASS**

---

### **3.2 Sum Assured Calculation**

* Based on **salary multiple logic**

Results:

* 3 members → valid SA calculated  
* 1 member (M002) → **missing salary**

Important business issue:

One employee cannot be evaluated correctly due to missing input

---

### **3.3 Evidence Requirement**

* All members fall within FCL (Free Cover Limit)  
* Minimal documentation required

Outcome:  
→ No blocking issue

---

### **3.4 Pricing**

* Rate tables applied based on:  
  * Age band  
  * Gender  
  * Member type

Final:

* Annual premium \= **₹1,199.14**

---

### **3.5 Validation**

* No errors  
* 1 warning (non-blocking)

Outcome:  
→ **Validation PASS**

---

# **3\. Critical business issue detected**

Even though:

* pricing succeeded  
* validation passed

There is still a **business completeness problem**:

### **→ Missing salary for one member**

This leads to:

* incomplete sum assured coverage  
* potential underwriting risk  
* incomplete quote integrity

---

# **4\. Final decision (Aggregation Engine output)**

The system consolidates everything and decides:

```
Decision = REQUEST_INFORMATION
Route = DOC_COLLECTION
```

### **Meaning:**

The quote is **not rejected**, but also **not ready**.

It needs:  
→ additional information / corrections

---

# **5\. Status & lifecycle movement**

The system automatically sets:

| Field | Value |
| ----- | ----- |
| Lifecycle | DATA\_GATHERING |
| Queue | DOC\_COLLECTION |
| Main Status | PENDING |
| Secondary Status | DATA\_REQUIRED |

### **Business interpretation:**

“The quote is waiting for missing or corrected data before it can proceed.”

---

# **6\. What the business user sees (UI behavior)**

The frontend is dynamically driven:

### **Allowed actions:**

* Upload documents  
* Request documents  
* Edit plans/products/benefits  
* Fix data and re-run evaluation

### **Visible screens:**

* Key Data  
* Documents  
* Headcount  
* Plans / Products / Benefits  
* Decision view

---

# **7\. What happens in operations (Workbench)**

The quote is pushed to:

```
Queue → DOC_COLLECTION
```

This means:

* Ops / Sales / Broker must:  
  * upload missing documents OR  
  * fix census data (salary issue)

---

# **8\. Downstream system triggers**

The system automatically informs other modules:

### **8.1 Workbench**

* Quote created and routed  
* Status updated

### **8.2 Accounting**

* Premium indication sent (not booked yet)

### **8.3 DMS (Document System)**

* Document collection initiated

---

# **9\. Why decision is NOT “Quote Ready”**

Even though:

* premium is calculated  
* validation passed

The system still blocks progression because:

### **Reason code:**

```
MEMBER_EXECUTION_ISSUES
```

### **Specifically:**

* Missing salary → incomplete benefit computation

---

# **10\. End-to-end business narrative**

Putting it all together:

1. Employer submits GTL quote with 4 employees  
2. System evaluates eligibility → OK  
3. Calculates sum assured → one employee missing salary  
4. Prices the rest → premium computed  
5. Validates structure → OK  
6. Aggregates results → detects incomplete data  
7. Decides:  
   → “Cannot proceed yet”  
8. Routes quote to:  
   → Document/Data correction stage  
9. Enables user to:  
   → fix data / upload documents / re-run

---

# **11\. What needs to happen next**

To move forward:

### **Required action:**

* Fix missing salary for member M002

Then:

* Re-run evaluation

Expected outcome after fix:

```
Decision → QUOTE_READY
Route → UW / BINDING
```

---

# **12\. What this system is doing (important insight)**

This is not a simple quoting tool.

It is:

### **→ A deterministic decisioning system that:**

* validates data completeness  
* calculates pricing  
* enforces underwriting readiness  
* drives workflow automatically  
* controls UI dynamically  
* orchestrates downstream systems

---

# **Bottom line**

This JSON represents a **fully evaluated quote that is commercially calculated but operationally incomplete**, and the system correctly:

* blocks progression  
* routes it to correction  
* exposes only valid next actions  
* notifies all dependent systems

---

# UW Review Example

This is a **fully successful quote → now escalated to underwriting**, not blocked due to data issues, but due to **risk/evidence complexity**.

Below is the exact breakdown.

---

# **1\. What just happened (one-line)**

A GTL quote was **fully evaluated, priced, validated → and referred to underwriting for risk review**, not for correction.

---

# **2\. Core difference vs previous case**

| Aspect | Previous JSON | This JSON |
| ----- | ----- | ----- |
| Data completeness | ❌ Missing | ✅ Complete |
| Validation | PASS | PASS |
| Decision | REQUEST\_INFO | REFER\_TO\_UW |
| Reason | Data issue | Risk / Evidence |
| Route | DOC\_COLLECTION | UW\_REVIEW |

👉 This is a **clean quote that requires underwriting judgment**, not fixing.

---

# **3\. Step-by-step business flow**

## **Step 1 — Quote initiation**

* Quote: **GTLQ-2026-001844**  
* Context: New business  
* Transaction: 1 / 1  
* Status:  
  * Main: **PENDING**  
  * Secondary: **UW\_REVIEW\_PENDING**

---

## **Step 2 — Data ingestion (complete)**

* 4 employees  
* All have:  
  * salary  
  * age  
  * classification  
* No missing inputs

```json
"missingInputFactors": []
"pendingDependencies": []
```

👉 This is **fully clean input**

---

## **Step 3 — Engine execution**

### **3.1 Eligibility**

* All 4 members included  
* No exclusions

Outcome:  
→ **PASS**

---

### **3.2 Sum Assured**

All computed successfully:

| Member | Salary | SA (1.5x) |
| ----- | ----- | ----- |
| M001 | 7L | 10.5L |
| M002 | 8L | 12L |
| M003 | 9L | 13.5L |
| M004 | 6L | 9L |

👉 No issues

---

### **3.3 Pricing**

Total premium:

```json
Annual Premium = ₹2746.26
```

Per-member logic:

* Rate per 1000 SA  
* Age \+ gender based  
* Loadings applied (notably 20% for M003)

---

### **Important underwriting signal**

| Member | Loading |
| ----- | ----- |
| M003 | **\+20%** |

👉 This is already a **risk signal**

---

### **3.4 Evidence determination (critical step)**

This is why the system escalates.

#### **FCL (Free Cover Limit) \= ₹10,00,000**

| Member | SA | FCL Status | Evidence |
| ----- | ----- | ----- | ----- |
| M001 | 10.5L | ABOVE | EOI \+ TeleMER \+ Blood |
| M002 | 12L | ABOVE | Same |
| M003 | 13.5L | ABOVE | \+ MER \+ X-Ray |
| M004 | 9L | WITHIN | Minimal |

👉 3 out of 4 members require **medical underwriting**

---

### **3.5 Validation**

* Errors: 0  
* Warnings: 1 (non-blocking)

Outcome:  
→ **PASS**

---

# **4\. Critical trigger for underwriting**

This is the exact reason:

```json
"referralReasons": [
  "UW_EVIDENCE_REVIEW_REQUIRED"
]
```

### **Meaning:**

“System cannot auto-accept because medical/evidence-based risk needs human underwriting decision”

---

# **5\. Final decision (Aggregation Engine)**

```
Decision = REFER_TO_UNDERWRITING
Route = UW_REVIEW
```

---

# **6\. Status & lifecycle**

| Field | Value |
| ----- | ----- |
| Lifecycle | UNDER\_UW\_REVIEW |
| Queue | UW\_REVIEW |
| Main Status | PENDING |
| Secondary Status | UW\_REVIEW\_PENDING |

👉 This is now an **active underwriting case**

---

# **7\. What underwriting receives (important)**

The system does NOT send raw data.

It sends a **fully pre-processed UW case**.

### **Includes:**

* Full member profile  
* Sum assured per member  
* Pricing trace  
* Risk signals (loadings)  
* Evidence requirements  
* Product \+ plan structure  
* Billing setup  
* Provisional premium

👉 Underwriter does **not compute anything from scratch**

---

# **8\. Underwriting workload (actual reality)**

Underwriter will review:

### **Case complexity**

* 3 members ABOVE FCL  
* Medical tests required:  
  * TeleMER  
  * Blood tests  
  * MER  
  * X-ray (for M003)

### **Decisions they can take:**

* Accept as is  
* Increase loading  
* Reduce sum assured  
* Request more tests  
* Reject specific members  
* Apply exclusions

---

# **9\. UI behavior (Workbench)**

### **State:**

```
UNDER_UW_REVIEW
```

### **Allowed actions:**

* Create UW task  
* View UW case  
* Apply underwriting decision  
* Apply underwriting pricing  
* Override decisions

👉 This is now **underwriter-controlled flow**

---

# **10\. System integrations triggered**

## **10.1 Workbench**

* Quote visible in UW queue  
* Status updated

## **10.2 UW system**

```
UW_CASE_CREATE triggered
```

*   
  Full case created  
* SLA: **480 minutes (8 hours)**

---

# **11\. Important subtle issue (hidden but critical)**

From derived artifacts:

```json
"headcountReconciliation": {
  "expectedTotalSumAssured": 4500000,
  "providedTotalSumAssured": 12400000,
  "matched": false
}
```

👉 This indicates:

* mismatch between expected vs computed SA  
* potential data or rule inconsistency

BUT:

* system still allowed progression

👉 This is a **soft inconsistency, not blocking**

---

# **12\. End-to-end business narrative**

1. Employer submits complete GTL quote  
2. System evaluates eligibility → OK  
3. Calculates sum assured → OK  
4. Prices members → premium calculated  
5. Identifies:  
   * high SA  
   * FCL breaches  
   * medical requirements  
6. Determines:  
   → “Cannot auto-issue, needs UW judgment”  
7. Routes to:  
   → Underwriting queue  
8. Creates:  
   → fully structured UW case  
9. Enables:  
   → underwriting decisions \+ pricing overrides

---

# **13\. What happens next**

### **Underwriting will:**

* Review medical evidence  
* Assess risk  
* Possibly:  
  * adjust pricing  
  * impose exclusions  
  * reject members

---

### **Post UW outcome:**

| UW Decision | System Outcome |
| ----- | ----- |
| Accept | QUOTE\_READY |
| Modify | REPRICE \+ REISSUE |
| Reject | DECLINED |
| Partial accept | MEMBER\_SPLIT |

---

# **14\. What this system is actually doing (key insight)**

This is not just “routing to UW”.

This is:

### **→ Pre-underwriting decision system**

It already:

* calculates risk proxies (loadings)  
* identifies FCL breaches  
* determines evidence sets  
* structures UW case  
* pre-computes pricing  
* enforces workflow

👉 Underwriter is **making decisions on top of a machine-prepared case**, not starting from scratch

---

# **Bottom line**

This JSON represents a **clean, fully computed quote that is commercially valid but medically/risk-wise non-standard**, and the system correctly:

* avoids auto-issuance  
* escalates to underwriting  
* packages a full UW case  
* maintains lifecycle integrity  
* enables controlled human intervention

---

# Takeover example

This case is **worse than your first two**.

It is not just:

* data missing (case 1\)  
* underwriting referral (case 2\)

This is:

**A takeover quote with validation failure \+ missing mandatory data \+ document gaps \+ structural inconsistencies**

The system is correctly **blocking progression hard**.

---

# **1\. What just happened (one-line)**

A **takeover GTL quote was evaluated → priced → but failed validation → and is now blocked in data gathering until mandatory takeover inputs and documents are fixed**.

---

# **2\. Why this case is different**

| Dimension | Status |
| ----- | ----- |
| Data completeness | ❌ Missing |
| Validation | ❌ FAIL |
| Pricing | ✅ Done |
| Evidence | ✅ OK |
| Decision | REQUEST\_INFORMATION |
| Severity | 🔴 HARD BLOCK |

👉 This is not “incomplete” — this is **invalid for takeover processing**

---

# **3\. The real root cause (not just symptom)**

### **Critical missing field:**

```json
P.PREVIOUS_INSURER_REF
```

### **Business context:**

```json
businessProcessContext = TAKEOVER_QUOTE_INIT
```

### **Validation rule triggered:**

```json
VAL.TAKEOVER.PREVIOUS_INSURER
```

### **Meaning:**

“You are trying to do a takeover business WITHOUT specifying previous insurer”

This is a **hard regulatory/business violation**, not optional data.

---

# **4\. Engine flow (what worked vs what broke)**

## **4.1 Eligibility → PASS**

* 2 members valid  
* No exclusions

---

## **4.2 Sum Assured → PASS**

| Member | Salary | Raw SA | Final SA |
| ----- | ----- | ----- | ----- |
| M001 | 6L | 6L | 6L |
| M002 | 12L | 12L | **7.5L (capped)** |

👉 SA cap applied correctly

---

## **4.3 Evidence → PASS**

* Both members within FCL  
* Minimal evidence required

---

## **4.4 Pricing → PASS**

Final premium:

```
₹686.85 annually
```

Everything mathematically correct.

---

## **4.5 Reinsurance → REFER**

```json
RI_CONCENTRATION → REFER_TO_REINSURER
```

👉 Not blocking, but adds complexity later

---

## **4.6 Validation → ❌ FAIL (THIS IS THE BREAKPOINT)**

```json
errorCount = 1
```

### **Fatal error:**

Previous insurer details are required for takeover business

This alone blocks progression.

---

# **5\. Additional hidden problems (you should not ignore)**

This JSON has **multiple deeper issues** beyond the visible error.

---

## **5.1 Missing mandatory documents**

```json
missingMandatoryDocuments:
- CENSUS_FILE
- PREVIOUS_POLICY_COPY
- CLAIMS_EXPERIENCE
- UW_SUPPORTING_DOCUMENT
```

👉 For takeover, these are **non-negotiable**

---

## **5.2 Headcount inconsistency**

```json
expectedMemberCount: 2
providedMemberCount: 4
matched: false
```

👉 This is serious:

* pricing done on 2 members  
* system sees 4 members somewhere else

This can lead to:

* wrong premium  
* underwriting mismatch  
* policy issuance errors

---

## **5.3 Sum assured mismatch**

```json
expectedTotalSA: 13.5L
providedTotalSA: 1.24Cr
```

👉 Massive inconsistency

This is:

* either data corruption  
* or wrong source mapping

---

# **6\. Final decision logic**

The aggregation engine says:

```
Decision = REQUEST_INFORMATION
Reason = VALIDATION_ERRORS
```

This is not negotiable.

---

# **7\. Status and routing**

| Field | Value |
| ----- | ----- |
| Lifecycle | DATA\_GATHERING |
| Queue | DOC\_COLLECTION |
| Main Status | PENDING |
| Secondary | DATA\_REQUIRED |

👉 This is a **blocked intake state**

---

# **8\. UI behavior (what user is forced to do)**

System focuses user here:

```json
QUOTE_KEY_DATA → party_roles → previousInsurerRef
```

👉 It is explicitly guiding:

“Fix this field first before anything else”

---

# **9\. What the system is doing correctly**

This is important.

The system is enforcing:

### **1\. Context-aware validation**

* Because it's **TAKEOVER**, stricter rules apply

### **2\. Hard blocking**

* Prevents bad business from progressing

### **3\. Workflow enforcement**

* Routes to DOC\_COLLECTION, not UW

### **4\. Multi-system coordination**

* DMS triggered  
* Accounting informed (indicative only)  
* Workbench updated

---

# **10\. What must happen next (no shortcuts)**

## **Mandatory fixes**

### **1\. Provide Previous Insurer**

```
partyRefs.previousInsurerRef = REQUIRED
```

---

### **2\. Upload required documents**

* Census file  
* Previous policy copy  
* Claims experience  
* UW supporting docs

---

### **3\. Fix headcount mismatch**

* Align:  
  * expected vs provided members  
  * SA totals

---

## **Only after that:**

→ Re-run evaluation

---

# **11\. What will happen after fix**

If all corrected:

### **Possible outcomes:**

| Condition | Outcome |
| ----- | ----- |
| Clean \+ low risk | QUOTE\_READY |
| RI triggers remain | REFER\_TO\_RI |
| UW triggers appear | REFER\_TO\_UW |

---

# **12\. End-to-end business narrative**

1. Takeover quote initiated  
2. System detects takeover context  
3. Requires previous insurer → missing  
4. Still computes SA \+ pricing  
5. Runs validation → FAIL  
6. Detects document gaps \+ data inconsistencies  
7. Blocks progression  
8. Routes to document/data correction  
9. Prevents underwriting or binding

---

# **13\. Bottom line**

This JSON represents a:

**Commercially priced but structurally invalid takeover quote**

The system correctly:

* **blocks it (validation FAIL)**  
* **demands critical takeover data**  
* **flags document gaps**  
* **detects data inconsistencies**  
* **routes to correction stage**

---

# **14\. Hard truth**

Even if you fix **only the missing insurer**, this quote is still risky because:

* headcount mismatch  
* SA mismatch  
* missing documents

👉 If those are not corrected, the quote will break later (UW / issuance stage).

---

# Quote Execution

This is the **ideal, fully successful case**.

No gaps, no blockers, no referrals.

---

# **1\. What just happened (one-line)**

A **new business GTL quote was fully evaluated, validated, priced, and is now ready to be bound into a policy automatically**.

---

# **2\. Final system outcome**

```
Decision = QUOTE_READY  
Route = AUTO_QUOTE  
Queue = READY_TO_BIND
```

### **Meaning:**

“This quote is clean, complete, and can go straight to policy issuance.”

---

# **3\. Status snapshot (business meaning)**

| Field | Value | Meaning |
| ----- | ----- | ----- |
| Main Status | QUOTED | Commercial output finalized |
| Secondary | READY\_FOR\_BIND | No further checks needed |
| Lifecycle | QUOTED | Terminal pre-issuance state |
| Queue | READY\_TO\_BIND | Ready for PAS |

---

# **4\. What worked (all engines passed)**

## **4.1 Data completeness → ✅**

```
missingInputFactors = []
pendingDependencies = []
```

👉 No missing fields. No dependencies.

---

## **4.2 Validation → ✅ PASS**

```
errorCount = 0
warningCount = 1 (non-blocking)
```

👉 System has **no reason to stop progression**

---

## **4.3 Eligibility → ✅**

* All 4 members accepted  
* No exclusions

---

## **4.4 Sum Assured → ✅**

| Member | Salary | Raw SA | Final SA |
| ----- | ----- | ----- | ----- |
| M001 | 6L | 6L | 6L |
| M002 | 12L | 12L | 7.5L (cap) |
| M003 | 18L | 18L | 7.5L (cap) |
| M004 | 7L | 7L | 7L |

👉 SA rules correctly applied (including caps)

---

## **4.5 Evidence → ✅**

* All members within FCL  
* No underwriting trigger

👉 Even though M003 has extra evidence tags, it **did NOT trigger UW referral**

---

## **4.6 Pricing → ✅**

```
Annual Premium = ₹1612.39
```

### **Notable:**

* M003 has **15% loading**  
* Still allowed → within auto-quote tolerance

---

## **4.7 Reinsurance → ✅ PASS**

```
RI status = PASS
```

👉 No concentration or treaty breach

---

# **5\. Why this quote is auto-approved**

Because ALL conditions are satisfied:

### **✔ No missing data**

### **✔ No validation errors**

### **✔ No underwriting trigger**

### **✔ No RI trigger**

### **✔ Documents complete**

### **✔ Pricing stable**

👉 That combination \= **AUTO\_QUOTE eligibility**

---

# **6\. System decision logic (what actually happened)**

Aggregation engine concluded:

```
No blockers
No referrals
No dependencies

→ Decision = QUOTE_READY
```

---

# **7\. What happens next (critical step)**

System triggers:

```
QUOTE_READY_FOR_PAS_BIND
```

### **Meaning:**

“Push this quote to Policy Admin System (PAS) for binding”

---

# **8\. PAS handoff (what gets sent)**

The system sends a **fully structured policy-ready payload**:

Includes:

* Product \+ plan structure  
* Member-level data  
* Final premium  
* Billing configuration  
* Benefits & exclusions  
* Policyholder details

👉 PAS does NOT need to compute anything — only **persist and issue**

---

# **9\. UI behavior (what user can do)**

Allowed actions:

```
SEND_TO_PAS_BIND
REQUOTE
WITHDRAW
```

### **Key action:**

→ **SEND\_TO\_PAS\_BIND**

👉 This is the “issue policy” button

---

# **10\. Important subtle issue (don’t ignore)**

There is still a **data inconsistency**:

```
expectedTotalSA = 28L  
providedTotalSA = 1.24Cr  
matched = false
```

### **Why it didn’t block:**

* Validation rule is not strict (warning level)  
* System allows progression

### **Why it matters:**

👉 This can break:

* policy issuance  
* accounting reconciliation  
* claims later

---

# **11\. End-to-end business narrative**

1. New business quote created  
2. All required data provided  
3. Eligibility passed  
4. Sum assured calculated with caps  
5. Pricing computed (with minor loading)  
6. Evidence checked → no UW trigger  
7. RI checked → no issue  
8. Validation passed  
9. Aggregation confirms:  
   → no blockers  
10. System marks quote:  
    → READY\_FOR\_BIND  
11. PAS payload prepared  
12. User can now:  
    → bind policy instantly

---

# **12\. What this represents (important insight)**

This is:

**A straight-through-processing (STP) case**

No human intervention required.

---

# **13\. Comparison vs your other cases**

| Case | Outcome | Reason |
| ----- | ----- | ----- |
| 1845 | BLOCKED | Missing data |
| 1844 | UW REFER | Risk complexity |
| 1843 | BLOCKED | Validation failure (takeover) |
| **1842** | ✅ READY | Clean STP case |

---

# **14\. Bottom line**

This JSON represents a:

**Fully validated, risk-cleared, system-approved GTL quote that is ready for immediate policy issuance**

The system correctly:

* completes full evaluation  
* confirms no risks or gaps  
* enables auto-issuance  
* triggers PAS binding  
* exposes only final actions

---

# **15\. Hard truth**

Even in this “perfect” case:

👉 The **SA mismatch warning is a future failure point**

If not fixed, it will likely break:

* issuance validation in PAS  
* or downstream accounting

# Limitations of Sundar's approach

Short answer: **not as the end-state core implementation**.

From the uploaded pack, the implementation is clearly **screen-led, process-code-led, and table-mapped**, not **decision-engine-led**. That is acceptable for **legacy replication / admin workflow enablement**. It is **not the right primary architecture** if the objective is a robust, scalable group quotation platform.

## **Verdict**

### **This approach is right only if your goal is:**

* replicate an existing PAS/legacy workflow fast  
* preserve operational familiarity  
* enable quotation/policy servicing through configured screens  
* minimize business change in phase 1

### **This approach is not right if your goal is:**

* accurate and explainable group quotation at scale  
* fast product rollout  
* reusable pricing / eligibility logic  
* API-first quoting  
* separation between quote engine, workflow, and policy admin

---

## **Why I’m saying that**

The pack shows a very specific implementation pattern:

* **Quotation starts as a worklist \+ maintenance flow**, e.g. `GQUT-SCR-001 - Work with Pending Quotations Listing`  
* **Same screens are reused across many business processes**, e.g. quotation, new business, take-up, renewals, alterations in `GPOL-SCR-001`  
* **Field behavior is driven by business-process matrices**, not by a clean domain model  
* **Product logic is stored as direct screen-to-table CRUD**, e.g.:  
  * `gpolPlanPrdLife`  
  * `gpolPlanPrdPm09`  
  * `gpolPlanPrdBnftHdr`  
* **Premium logic appears maintained as tabular records**, e.g. gender / age / salary bands with premium rate in `GPOL-SCR-039A/B`  
* **Term life extra rules/data are captured as screen fields**, e.g. FCLs, age slabs, salary frequency, SI formula in `GPOL-SCR-017`

That is a **policy administration implementation style**. It is not a clean quotation-engine architecture.

---

## **What is good about this approach**

It does have some strengths.

### **1\. Strong process control**

You already have explicit business process codes such as:

* `BZP-GRP-QUOTE`  
* `BZP-GRP-NBZ`  
* `BZP-GRP-TAKEUP`  
* `BZP-GRP-RNWL`

That is good for controlled operations and auditability.

### **2\. Clear CRUD visibility**

The docs show exactly which screens update which tables. That helps delivery, QA, and support.

### **3\. Easy legacy mapping**

If you are migrating from an older admin system, this is practical. Business teams can validate screens faster than validating abstract rule engines.

### **4\. Operational consistency**

Back-office users understand screen flows better than service orchestration diagrams.

---

## **Why it is the wrong core design for group quotation**

### **1\. It mixes workflow with quotation logic**

`GPOL-SCR-001` changes field enablement by process type. That means business workflow is driving core capture semantics. Over time, this becomes unmaintainable.

### **2\. It makes quotation screen-dependent**

Quote logic should not depend on which screen the user is on. In your pack, too much meaning is embedded in navigation, next-screen logic, and field-state combinations.

### **3\. It ties business meaning directly to DB tables**

Examples like:

* `gpolHdr`  
* `gpolHis`  
* `gpolPlanPrdLife`  
* `gpolPlanPrdPm09`  
* `gpolPlanPrdBnftHdr`

show an implementation where UI, process, and persistence are tightly coupled. That kills flexibility.

### **4\. Pricing looks like maintained rate-table CRUD, not a pricing service**

`GPOL-SCR-039A/B` suggests premium rates are maintained through table rows by age/salary/gender/product. That can work, but only for relatively simple rating. It becomes fragile when you add:

* scheme-level exceptions  
* experience loading  
* discounts/loadings  
* free-cover adjustments  
* client-specific pricing  
* renewal repricing logic

### **5\. Product-specific fields are embedded into screen specs**

`GPOL-SCR-017` contains many term-life-specific attributes and slabs. That means every product variant pushes you toward more screens/tables/conditional logic instead of reusable product-definition artifacts.

### **6\. Explainability will be weak**

If the quote is the result of:

* entered fields  
* process state  
* table configuration  
* next-screen branching  
* DB lookups

then answering “why this premium?” becomes painful.

### **7\. API-first distribution becomes hard**

A broker portal, partner API, internal UI, and bulk upload engine should all hit the same quote engine. This design looks UI-first, not engine-first.

---

## **The blunt assessment**

This is a **good PAS-style transactional implementation**.

It is **not a good standalone quotation architecture**.

If you build group quotation fully this way, you will end up with:

* too much screen logic  
* too much DB coupling  
* too much product-specific branching  
* weak reuse across GTL/GMC/GPA  
* painful change management

---

## **What the right approach should be instead**

Use this uploaded design as the **workflow/UI shell**, not the quotation brain.

### **Correct split:**

#### **1\. Workflow / Case layer**

Keep:

* pending quotation list  
* pending policy list  
* edit/review/delete flows  
* navigation across business process codes

#### **2\. Quote domain layer**

Separate services for:

* quote header  
* group census / headcount  
* plan/product/benefit composition  
* underwriting triggers  
* versioning

#### **3\. Rule / pricing layer**

Independent engine or artifacts for:

* eligibility  
* benefit constraints  
* premium method logic  
* loadings/discounts  
* FCL logic  
* renewal adjustments

#### **4\. Persistence layer**

DB tables should store results and configuration, but not define the whole behavior.

---

## **Final answer**

**As a transitional implementation or admin workflow implementation: yes, it is reasonable.**

**As the main architecture for group quotation: no, it is not the right approach.**

The right approach is:

* keep this as the **process/UI orchestration layer**  
* move quotation, rating, eligibility, and explainability into a **separate decision-centric quote engine**

