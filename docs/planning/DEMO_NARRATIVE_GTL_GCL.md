# Demo narrative — GTL and GCL, screen + action level

LoB chosen at quote creation. Same setup screens, different terminal state on the Master Policy page.

## 1. Setup — Quote to Master Policy

Steps 1–5 are identical for both. Step 6 is where GTL and GCL diverge.

1. **Sales** opens **Quotations** → **New Quote** → picks MPH (or adds one inline) → **picks LoB: GTL or GCL**.
2. **Sales** fills the **Quote** page:
   - Policy Details
   - Plans (with rate-card / FCL / member-to-plan uploads)
   - Census Schema
   - Aggregate Census
   - Clicks **Request Pricing** → premium shows.
3. **Sales** clicks **Submit and Send to Client**.
4. **Partner** switches in → **MPH Portal** → **Accept**.
5. **Sales** switches back → **Proposal** → **Finalize**.

### 1A. GTL — Master Policy lands in PENDING

6. **Master Policy** page opens — POL-001, state badge = **`PENDING`** with reason **`AWAITING_MIN_MEMBERS`**, threshold counter visible (e.g., `0/10`), Members tab empty.
7. Policy stays PENDING. **Will move to Active only after enough members are added** (covered in §2A).

### 1B. GCL — Master Policy lands in ACTIVE

6. **Master Policy** page opens — POL-001, state badge = **`ACTIVE`** immediately. **No threshold counter** on the page.
7. Members can now be added one-by-one, each activating independently (covered in §2B).

## 2. Member onboarding — STP path

### 2A. GTL — threshold-gated, no MAF

1. **Partner Agent / Sales** → Master Policy → **Members** tab → **Upload Census**.
2. Members auto-classify (mostly STP, some UW, some Repair).
3. STP members move to **`PENDING`** with reason **`PENDING_POLICY_ACTIVATION`** — no MAF step.
4. Threshold counter ticks up as classification completes.
5. Threshold met → **Policy badge flips to `ACTIVE`** → all STP members flip to **`ACTIVE`** in one batch.

### 2B. GCL — per-member activation with MAF

1. **Partner Agent / Sales** → Master Policy → **Members** tab → **Upload Census**.
2. Members auto-classify.
3. STP members auto-receive **MAF**.
4. **Member** switches in via the MAF link → enters any OTP → **Confirm**.
5. Member flips to **`ACTIVE`** immediately — policy stays `ACTIVE` throughout, member count grows.

## 3. Non-STP — UW workbench (same UI for GTL and GCL)

1. **UW** switches in → **UW Workbench**.
2. Opens a case → reviews flagged reason → **Accept**.
3. Member rejoins its LoB path:
   - **GTL** → `PENDING` / `PENDING_POLICY_ACTIVATION`, waits for the policy itself to activate.
   - **GCL** → MAF sent → member confirms OTP → `ACTIVE`.

## 4. Non-STP — Ops repair (same UI for GTL and GCL)

1. **Ops** switches in → **Ops Workbench**.
2. Opens the case → fixes flagged fields → **Submit**.
3. Member re-classifies → STP → continues on its LoB path.

## 5. Float check — a few members stuck on insufficient float (both GTL and GCL)

Mock trigger: any member whose name matches a chosen pattern (e.g., starts with `"Float"`) hits insufficient-float on `ReserveFloatCommand`.

1. During member onboarding (§2A or §2B), one or two census rows — the float-test members — move to **`PENDING`** with reason **`PENDING_FLOAT_RESERVATION`** instead of progressing.
2. State badge on those members shows the hook clearly: the workflow is waiting on a `FloatTopUpReceived` signal.
3. Demo stops here for these members — top-up action (signal emission) is not wired yet, so members remain visibly stuck. Resume path is a follow-up once the mock is extended.

## What's mocked

- PC plan catalog
- Quote-level pricing
- STP / UW / Repair classifier distribution
- MAF notification
- OTP confirmation
- MPH Portal
- FCL band routing
