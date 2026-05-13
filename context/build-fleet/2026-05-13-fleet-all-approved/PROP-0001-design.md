---
proposal: PROP-0001
run_id: 2026-05-13-fleet-all-approved
goal: Drive the full census-submission lifecycle from the proposal-detail UI — initiate → upload → ingest → review row-level errors → submit, against the dev backend's `_dev/census-uploads/{fileRef}` controller (no mock-mode build).
golden_path: From the proposal detail page, click "Bulk upload census" → land on `/issuance/proposals/{id}/census` → click "Upload census" → pick a CSV → form submits POST initiate → keystone PUTs file to backend's `_dev/census-uploads/{fileRef}` (proxied) → form's onSuccess navigates to `/issuance/proposals/{id}/census/{submissionId}` → page polls GET submission status, transitions INITIATED → INGESTED automatically after backend `/ingest` call dispatched on entry → row table loads with status filter chips (VALID/INVALID/WARNING) → user clicks "Submit submission" → polls until COMPLETED → success toast.
golden_path_route: /issuance/proposals/[id]/census
files_touched:
  - src/lib/api/issuance.ts                                                   # verify the 6 census wrappers are exported; add if any missing
  - src/components/widgets/forms/formContainer/FieldRenderer.tsx              # add `file` field type that renders <input type="file"> and yields a Blob to the form value
  - src/components/widgets/forms/formContainer/FormContainer.tsx              # if necessary, intercept the file field for two-step submit (initiate JSON → PUT file → call onSuccess); keep changes minimal
  - schemas/forms/upload-census-form.json                                     # new: single-step form with file field + template-format select; api-mutation calls POST /api/issuance/policies/{policyId}/census-submissions then PUT the file then POST /ingest in onSuccess[]
  - schemas/tabs/proposal/census.json                                         # new: tab-panel with submissions history data-table + "Upload census" headerAction
  - schemas/tabs/proposal/members.json                                        # add "Bulk upload" headerAction next to existing "Add member"
  - schemas/views/census-submission-detail.json                               # new: status badge banner, rows data-table with status filter, action-bar with "Submit submission"
  - schemas/tables/census-submission-rows.json                                # new: paginated row table — row number, status badge, ingestionErrors[] (truncated)
  - src/app/issuance/proposals/[id]/census/page.tsx                           # new: route renders schemas/tabs/proposal/census.json with proposalId substitution
  - src/app/issuance/proposals/[id]/census/[submissionId]/page.tsx            # new: route renders schemas/views/census-submission-detail.json with both ids
out_of_scope:
  - Mock-mode upload PUT handler (per user directive; fleet builds and verifies proxy-mode only)
  - S3 presigner wiring for generic /files/upload-url
  - Census file template editor
---

# PROP-0001 — Census Submission UI

## Decisions made by orchestrator (in lieu of CLARIFY)

1. **File-upload field type lives on FieldRenderer**, not a custom widget. Add a `'file'` case to the FieldRenderer switch that renders an `<input type="file">`, holds the selected `File` object in form state, and shows the filename + size after pick. This is a reusable primitive future schemas can use.
2. **Two-step submit semantics** baked into the api-mutation action via an `uploadField` pointer in the action config. When set, the form (a) POSTs JSON to `endpoint`, expects a response with `uploadUrl` and the entity id, (b) PUTs the named file field to `uploadUrl`, (c) runs `onSuccess[]`. This keeps the schema declarative and the engine generic — future forms with the same pattern reuse it.
3. **Onsuccess chain** for upload-census-form:
   - `{ type: "api-mutation", endpoint: "/api/issuance/census-submissions/{submissionId}/ingest", method: "POST" }`
   - `{ type: "navigate", to: "/issuance/proposals/{proposalId}/census/{submissionId}" }`
4. **Submission detail page** uses `useSmartQuery` with `pollSchedule: STANDARD_POLL_SCHEDULE` and a `stopWhen` matcher that resolves when `status` is `COMPLETED` or `FAILED`. Status badge uses the existing `state-badge` cell type.
5. **Rows table** uses the existing data-table with status filter chips — VALID, INVALID, WARNING. No new widget.
6. **No mock-mode work.** Verification happens against `GROUP_PAS_BACKEND_URL=https://group-pas-dev.anairacloud.com`.

## Reuse anchors

- Polling: `STANDARD_POLL_SCHEDULE` at [src/lib/polling.ts:14–19](src/lib/polling.ts)
- Existing form mutation + `onSuccess[]` pattern (2026-05-11 form-success-transitions commit)
- Existing data-table + filter-bar + state-badge
- Issuance proxy catch-all at [src/app/api/issuance/[[...path]]/route.ts](src/app/api/issuance/[[...path]]/route.ts) — automatically forwards `_dev/census-uploads/{fileRef}` PUT to the backend in proxy mode
