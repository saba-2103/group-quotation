---
id: PROP-0017
title: "Backend: enable CORS on census-upload dev endpoint"
status: done
resolved: 2026-05-14
resolution: backend team deployed CORS allowlist on group-pas-dev.anairacloud.com — preflight now returns 200 with Access-Control-Allow-Origin matching both http://localhost:3000 and https://keystone-ui-dev.anairacloud.com, plus Allow-Methods PUT/OPTIONS and Allow-Headers content-type. Full end-to-end census upload verified through the UI: form → initiate → cross-origin PUT 204 → ingest → detail page renders Total/Accepted rows and per-row Ingested badges.
proposer: agent:propose
created: 2026-05-14
category: spec
impact: high
effort: xs
evidence:
  - docs/spec/issuance/IssuanceApi.api:201-232
  - src/app/issuance/proposals/[id]/census/new/page.tsx
  - schemas/forms/upload-census-form.json
  - "browser preflight: OPTIONS https://group-pas-dev.anairacloud.com/api/issuance/_dev/census-uploads/<fileRef> → 200 with access-control-allow-origin + allow-methods + allow-headers (verified 2026-05-14)"
related: [PROP-0001]
pr: null
---

## Problem

The census bulk-upload screen at `/issuance/proposals/:id/census/new` is broken end-to-end. The frontend follows the contract in [docs/spec/issuance/IssuanceApi.api:201-232](../docs/spec/issuance/IssuanceApi.api): `POST /api/issuance/policies/:policyId/census-submissions` to initiate, then `PUT` the file body to the returned `uploadUrl`, then `POST .../ingest`.

In dev the backend returns `uploadUrl: https://group-pas-dev.anairacloud.com/api/issuance/_dev/census-uploads/{fileRef}`. The browser issues a CORS preflight before the `PUT`, and the backend rejects it:

```
curl -i -X OPTIONS \
  "https://group-pas-dev.anairacloud.com/api/issuance/_dev/census-uploads/test" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type"
# HTTP/2 403
# vary: Origin
# Invalid CORS request
```

No `Access-Control-Allow-*` headers come back — Spring's `CorsConfigurationSource` doesn't have an allowlist entry for `/api/issuance/_dev/census-uploads/**`. The `PUT` is then blocked by the browser and the whole upload silently aborts after the initiate call. Demo-blocking for the bulk-upload journey on the issuance proposal screen.

The surrounding UI work (templates, expected-columns reference panel, ACCEPTED/INGESTED/REJECTED badge mapping, helper-text copy, polished form layout) is already shipped on `feat/new-buisiness`. Nothing on the frontend changes once CORS lands.

## Proposed change

Backend: add CORS config for `/api/issuance/_dev/census-uploads/**` (or `/api/issuance/**` if it's intended to be CORS-enabled wholesale in dev):

- `Access-Control-Allow-Origin`: explicit allowlist — at minimum `http://localhost:3000` and the deployed UI origin. Do not use `*` (these are authenticated calls).
- `Access-Control-Allow-Methods: PUT, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- `Access-Control-Max-Age: 600`
- `OPTIONS` preflight returns `204` (or `200`), not `403`.

Verification: re-run the curl above with `-H "Origin: http://localhost:3000"` and confirm `204` plus the `Access-Control-Allow-*` response headers. Then resume `/issuance/proposals/:id/census/new`, upload a sample CSV from the in-page template, and confirm the flow lands on the submission detail page with parsed rows.

## Alternatives considered

- **Server-side proxy through Next.js** (`src/app/api/issuance/[[...path]]/route.ts`): rewrite `uploadUrl` to a same-origin path and stream the PUT body through a local forwarder. Working prototype existed and was reverted at user request — keeping a binary-streaming forwarder in sync with whatever shape the real presigned URLs eventually take is dead weight.
- **Wildcard `Access-Control-Allow-Origin: *`**: rejected — the upload PUT is authenticated and `*` cannot be combined with credentials.
- **Wait for real presigned URLs (S3/GCS)**: those carry CORS on the bucket itself and the concern goes away, but until that ships the dev `_dev/census-uploads/**` endpoint blocks the demo.

---

## Project-context fit

- Closes the loop on PROP-0001 (done): all FE pieces of the census-upload journey landed on `feat/new-buisiness`, but the demo flow is dead at the browser preflight. Verified 403 in the proposal's own evidence block.
- This is a **cross-repo** ask — `/execute-proposal` cannot ship it from `keystone-ui`. The change lives in the `group-pas` Spring backend's `CorsConfigurationSource`.
- Aligns with the "API-driven scope" feedback memory inversely: FE was built honestly against the documented contract, backend now needs to honor it for browser callers.

## Pros
- Demo-blocking and high-impact: bulk-upload is the headline of PROP-0001 and cannot be walked end-to-end today.
- xs effort: a Spring CORS allowlist entry, not a behavior change.
- All FE work already shipped; nothing in this repo changes once CORS lands. Verification is a single curl + a manual upload.
- The Next.js proxy alternative was already prototyped and reverted at user request — the right fix is at the backend boundary, not a forwarder we'd later rip out.

## Cons
- Out-of-repo execution: needs backend team to action; can't be auto-shipped from this proposal queue.
- Dev-only endpoint (`/api/issuance/_dev/census-uploads/**`) — the eventual real fix is presigned S3/GCS URLs that carry CORS on the bucket. Risk that backend deprioritises this as "temporary," even though the temporary state is the only thing currently demo-able.

## Recommendation
escalate to user — high-impact and unambiguous, but this can't be executed inside `keystone-ui`. Specific question for the user: **do you want this filed as a ticket against the `group-pas` backend team (and if so, by whom), or held until presigned-URL uploads ship?** If filed, set `status: approved` and add a tracking link; otherwise set `status: deferred` with the trigger "revisit when presigned-URL uploads land."

---

<!-- Filled by /execute-proposal. -->

## Implementation notes
