# Manual test script — Issuance bulk-upload (census submissions)

A step-by-step walkthrough for both **GTL** and **GCL** flows on the
proposal-stage census upload screen. Designed to be runnable end-to-end
against the live dev backend at `https://group-pas-dev.anairacloud.com`
via either local dev (`http://localhost:3000`) or the deployed UI
(`https://keystone-ui-dev.anairacloud.com`).

Fixtures live under [tests/e2e/fixtures/](fixtures/) and are regenerated
deterministically by `node scripts/generate_census_fixtures.mjs`.

---

## Test fixtures

| File | Rows | Purpose |
|---|---:|---|
| [census-gtl-big-clean.csv](fixtures/census-gtl-big-clean.csv) | 200 | GTL happy path. All rows valid. Use for "does it scale + complete?". |
| [census-gtl-big-mixed.csv](fixtures/census-gtl-big-mixed.csv) | 200 | GTL validation pipeline. 180 valid + 20 intentional errors, see "Error map" below. |
| [census-gcl-big-clean.csv](fixtures/census-gcl-big-clean.csv) | 200 | GCL happy path (borrower-flavored names + occupations). |
| [census-gcl-big-mixed.csv](fixtures/census-gcl-big-mixed.csv) | 200 | GCL validation pipeline, same error mix as GTL. |

All fixtures use the column contract from
[docs/spec/issuance/IssuanceApi.api](../../docs/spec/issuance/IssuanceApi.api)
(`CreatePolicyMemberRequest`):

```
memberId, planNo, name, dob, gender, salary, occupation, sumInsured
```

Plan codes used: `P1`, `P2` (and `PLAN-XYZ` as the deliberately-invalid plan
for error rows). **Pick a proposal whose plans include `P1` and `P2`** —
otherwise every valid row will reject with "Plan does not exist on this
proposal". See "Preflight" below.

### Error map (mixed files)

Identical error layout in both `census-gtl-big-mixed.csv` and `census-gcl-big-mixed.csv`. Row numbers below count from 1 (header is row 0).

| Row # | Error kind | Expected error |
|---:|---|---|
| 7, 19, 33, 51, 77 | `dob` written as `dd/mm/yy` instead of ISO `YYYY-MM-DD` | `ROW_DOB_FMT` — invalid date format |
| 12, 41, 88, 122, 161 | `salary` non-numeric (`twelvelakh`, `N/A`, `1.2L`, `1,200,000.00rs`, `TBD`) | `ROW_NUM` — salary must be numeric |
| 25, 64, 111, 188 | `planNo = PLAN-XYZ` (not on the proposal) | `ROW_REF` — plan does not exist on this proposal |
| 49, 103, 175 | `name` blank | required-field error |
| 90, 145, 199 | `memberId` duplicates row 7, 19, 33 respectively | uniqueness error within submission |

Total: **20 rows expected to reject, 180 expected to accept**.

---

## Preflight (do this once before either run)

1. Sign in at the chosen frontend origin and switch the role to **Sales**
   (top-right menu).
2. Open **Issuance → Proposals**.
3. Pick a proposal whose **plans are `P1` and `P2`**. If you don't have one
   handy, create one from a finalized quote and add plans `P1` and `P2`
   before continuing. (Plan list is shown on the proposal-detail "Plans"
   tab.)
4. Note the proposal id from the URL — you'll come back to it.
5. Sanity check the backend CORS allowlist is still live:
   ```
   curl -i -X OPTIONS \
     "https://group-pas-dev.anairacloud.com/api/issuance/_dev/census-uploads/probe" \
     -H "Origin: https://keystone-ui-dev.anairacloud.com" \
     -H "Access-Control-Request-Method: PUT" \
     -H "Access-Control-Request-Headers: content-type"
   ```
   Expected: `HTTP/2 200` with `access-control-allow-origin`, `access-control-allow-methods`, `access-control-allow-headers`. If you get `403 Invalid CORS request`, the backend regressed — see [PROP-0017](../../proposals/PROP-0017-backend-cors-census-upload.md) and re-open.

---

## Test 1 — GTL happy path (200 valid rows)

**Goal:** confirm the full pipeline (initiate → upload → ingest →
materialise members) works end-to-end at non-trivial size.

1. From the proposal detail, click **Census** in the tab strip (or open
   `/issuance/proposals/<id>/census` directly).
2. **Expected:** page renders with header "Census submissions — Proposal
   `<id>`", a "Census submission history" table with prior runs (if any),
   and an **Upload census** button top-right. **No** "Unknown Widget"
   error.
3. Click **Upload census**. URL becomes `/issuance/proposals/<id>/census/new`.
4. **Expected:** "Upload census — Proposal `<id>`" page with three sections:
   1. *Start from a template* — two download-card buttons (GTL, GCL).
      Clicking either downloads `census-{gtl,gcl}-template.csv` (3 sample rows).
   2. Upload form on the left — **Census file** (file picker) and
      **Template format** (dropdown: Standard GTL census / Standard GCL census).
   3. *Expected columns* reference table on the right — 8 columns, each
      with a Required / Optional badge.
5. Click **Choose file** and pick
   [tests/e2e/fixtures/census-gtl-big-clean.csv](fixtures/census-gtl-big-clean.csv).
6. In **Template format**, select **Standard GTL census**.
7. Click **Start upload**.
8. **Expected:** toast "Census uploaded; parsing now…". URL changes to
   `/issuance/proposals/<id>/census/<submissionId>`.
9. On the submission-detail page:
   - **Status** badge cycles `Initiated → Ingested` within ~5s.
   - **Total rows** = `200`, **Accepted** climbs to `200`, **Rejected** = `0`.
   - Below the summary the **Census rows** table lists rows with the
     `Ingested` badge. Pagination is visible at the bottom.
10. Click **Submit submission** (visible only when status is `Ingested`).
11. **Expected:** Status flips `Ingested → Submitted`, and after the
    workflow runtime materialises members (≤30s on dev), it lands at
    `Completed` with **Members created** = `200`.
12. Back-link "Back to census history" returns to the list — your run
    appears at the top with all-green totals.

**Pass criteria:** every step's "Expected" matches. No "Unknown Widget",
no `Failed to fetch` toasts, no rows ending up `Unknown` status.

---

## Test 2 — GTL validation surface (200 rows, 20 errors)

**Goal:** confirm the per-row validation UI shows the right counts and
the right error messages.

1. Repeat Test 1 steps 1–4 (don't have to redo if you stayed on the page).
2. Pick [tests/e2e/fixtures/census-gtl-big-mixed.csv](fixtures/census-gtl-big-mixed.csv).
3. **Template format:** Standard GTL census.
4. **Start upload**, wait for status to settle.
5. **Expected counts:**
   - **Total rows** = `200`
   - **Accepted** = `180`
   - **Rejected** = `20`
6. Use the **Row status** filter to switch the table to **Rejected**.
7. **Expected:** 20 rows visible. Cross-check a few against the
   ["Error map" table above](#error-map-mixed-files):
   - Row #7 → DOB-format error
   - Row #12 → salary-non-numeric error
   - Row #25 → plan-does-not-exist (`PLAN-XYZ`)
   - Row #49 → missing-name error
   - Row #90 → duplicate of row #7's memberId
8. Switch the filter to **Ingested** — should show 0 (all valid rows
   resolved past Ingested into Accepted) or close to it, depending on
   timing.
9. Switch to **Accepted** — should show 180 rows.
10. (Optional) Click **Submit submission** to verify the workflow
    correctly materialises only the 180 accepted members and leaves the
    20 rejected rows behind. Status should settle on `Completed` with
    **Members created** = `180`.

**Pass criteria:** counts match exactly. Each rejected row's `Errors`
column shows the correct error code/message from the [error map](#error-map-mixed-files).

---

## Test 3 — GCL happy path (200 valid rows)

Identical to Test 1 but with:

- File: [tests/e2e/fixtures/census-gcl-big-clean.csv](fixtures/census-gcl-big-clean.csv)
- Template format: **Standard GCL census**
- Names / occupations are borrower-flavored (Loan Officer, Branch
  Manager, etc.) so it's easy to eyeball the data in the rows table.

If the test proposal's `policyType` is `GCL`, the workflow runtime
should drive members through the GCL `MemberLifecycleFlow` (per-loan-
disbursement context). For a GTL proposal you can still upload the GCL
fixture — it'll succeed at the upload layer, but downstream member
processing is the GTL path.

---

## Test 4 — GCL validation surface (200 rows, 20 errors)

Identical to Test 2 but with [census-gcl-big-mixed.csv](fixtures/census-gcl-big-mixed.csv) and **Standard GCL census** template format. Same error map, same expected counts.

---

## Test 5 — Negative edge cases (5 min, do once at the end)

| Case | How to trigger | Expected |
|---|---|---|
| Empty file | Create a 0-byte `.csv` locally and upload | Either the form validation rejects pre-upload, or initiate succeeds and `Total rows = 0` on the detail page. Either is acceptable — **what's not acceptable is a silent failure**. |
| Wrong file extension | Rename `census-gtl-big-clean.csv` → `.txt` and try to upload | File picker should ignore it (accept attribute `.csv,.xlsx`); if forced via "All files", the form should not submit (file-input validation fails). |
| Missing template format | Upload a clean CSV without picking a template format | Backend should still parse (templateFormat is optional per spec). Confirm `Accepted = 200`. |
| Refresh mid-ingest | Upload a big file, refresh the browser within 2s of landing on the detail page | The polling hook (`pollSchedule.initialIntervalMs: 2000`) should re-sync. Status badge transitions back to whatever the backend currently has. **No console errors.** |
| Two uploads in parallel | Open two browser tabs on the same proposal, kick off both `census-gtl-big-clean.csv` uploads at roughly the same time | Both should produce distinct `submissionId`s, both should ingest cleanly. |

---

## What to capture if anything fails

1. Browser console errors (F12 → Console tab).
2. Failed network requests (F12 → Network tab, filter to "Failed"). Note
   the URL, method, status code, response body.
3. The submission id from the URL (or whichever step failed).
4. Screenshot of the screen state at the time of failure.
5. The role you were in (Sales / Ops / Admin) and the originating route.

File the report against the issuance area; tag it with the test number
(Test 1.7, Test 2.5, etc.) so it's clear where in the script it broke.

---

## Regenerating fixtures

Edit `scripts/generate_census_fixtures.mjs` (pools, error map, count, plan
codes) and run:

```
node scripts/generate_census_fixtures.mjs
```

Output is deterministic — re-running with no changes yields byte-identical
files. Commit the regenerated CSVs alongside the script change so the
manual test stays reproducible.
