// BACKEND CONTRACT — live backend ⇄ DSL-declared response shapes.
//
// Spec-first: every expectation is derived from the DSL query specs under
// `docs/spec/**​/*.query` (the source of truth per context/CORE_MEMORY.md
// "Reference-doc precedence"). This suite embodies "the backend exists": it
// hits the DSL-declared GET list/search endpoints (which need no entity IDs)
// against the LIVE backend and asserts the response conforms to the
// DSL-declared shape — the top-level collection envelope plus the key fields
// each Summary/Dto declares.
//
// READ-ONLY. No mutations, no seeding. Tolerant of an empty backend: a 2xx with
// zero rows still proves the contract (shape is only checked on present rows).
//
// ── How to run ────────────────────────────────────────────────────────────────
// The app proxies /api/{issuance,policy-admin,quotation,accounting} to
// GROUP_PAS_BACKEND_URL (src/app/api/**​/[[...path]]/route.ts). Start the app in
// proxy mode and point Playwright at it — same model as the CI `e2e` job:
//
//   GROUP_PAS_BACKEND_URL=https://group-pas-dev.anairacloud.com npm run dev &
//   # wait for http://localhost:3000/ to answer
//   PLAYWRIGHT_BASE_URL=http://localhost:3000 \
//     npx playwright test tests/e2e/backend-contract.spec.ts
//
// This spec is deliberately NOT wired into the ci-cd.yml `e2e` job: a live
// backend that is empty/slow/contract-drifted should surface as a documented
// finding here, not redden the deploy gate.

import { test, expect, type APIRequestContext } from '@playwright/test';

// Whether we are actually running against the live backend via the proxy. The
// proxy serves in-memory mocks unless GROUP_PAS_BACKEND_URL is set, so without
// it these assertions would test the mock, not the backend contract. We still
// run (the mocks also follow the DSL shape) but annotate the distinction.
const PROXY_BACKEND = process.env.GROUP_PAS_BACKEND_URL ?? '';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

// A collection endpoint contract derived from the DSL .query specs.
interface CollectionContract {
  // Path under the app origin (the proxy forwards it 1:1 to the backend).
  path: string;
  // Query string (list/search endpoints declare page/size + optional filters).
  query?: Record<string, string | number>;
  // DSL return DTO name (for messages).
  dto: string;
  // Key fields the DSL declares on each row. Asserted present when rows exist.
  // Kept to the stable identity/state fields so the test tolerates additive
  // backend changes (extra fields are fine; missing declared fields are not).
  requiredKeys: string[];
  // The DSL state/status field name on this DTO (Quote uses `status`).
  stateKey: 'state' | 'status';
}

// Source of truth: docs/spec/{issuance,policy-admin,quotation,accounting}/*Query.query
const CONTRACTS: CollectionContract[] = [
  // ── Issuance ──
  {
    path: '/api/issuance/proposals/list',
    query: { page: 0, size: 20 },
    dto: 'ProposalSummaryDto',
    requiredKeys: ['id', 'state'],
    stateKey: 'state',
  },
  {
    path: '/api/issuance/proposals/search',
    query: { page: 0, size: 20 },
    dto: 'ProposalSummaryDto',
    requiredKeys: ['id', 'state'],
    stateKey: 'state',
  },
  {
    path: '/api/issuance/policy-members/search',
    query: { page: 0, size: 20 },
    dto: 'PolicyMemberSummaryDto',
    requiredKeys: ['id', 'state'],
    stateKey: 'state',
  },
  // ── Policy Admin ──
  {
    path: '/api/policy-admin/clients/list',
    query: { page: 0, size: 20 },
    dto: 'ClientSummaryDto',
    requiredKeys: ['id', 'clientNumber', 'name', 'state'],
    stateKey: 'state',
  },
  {
    path: '/api/policy-admin/clients/search',
    query: { page: 0, size: 20 },
    dto: 'ClientSummaryDto',
    requiredKeys: ['id', 'state'],
    stateKey: 'state',
  },
  {
    path: '/api/policy-admin/policies/list',
    query: { page: 0, size: 20 },
    dto: 'PolicySummaryDto',
    requiredKeys: ['id', 'policyNumber', 'state'],
    stateKey: 'state',
  },
  {
    path: '/api/policy-admin/policies/search',
    query: { page: 0, size: 20 },
    dto: 'PolicySummaryDto',
    requiredKeys: ['id', 'state'],
    stateKey: 'state',
  },
  // ── Quotation ── (NB: Quote DTO uses `status`, not `state`)
  {
    path: '/api/quotation/quotes/list',
    query: { page: 0, size: 20 },
    dto: 'QuoteSummaryDto',
    requiredKeys: ['id', 'status'],
    stateKey: 'status',
  },
  {
    path: '/api/quotation/quotes/search',
    query: { page: 0, size: 20 },
    dto: 'QuoteSummaryDto',
    requiredKeys: ['id', 'status'],
    stateKey: 'status',
  },
  // ── Accounting ──
  {
    path: '/api/accounting/events/list',
    query: { page: 0, size: 20 },
    dto: 'AccountingEventSummaryResponse',
    requiredKeys: ['id', 'state'],
    stateKey: 'state',
  },
  {
    path: '/api/accounting/posting-rules/list',
    query: { page: 0, size: 20 },
    dto: 'PostingRuleResponse',
    requiredKeys: ['ruleId'],
    stateKey: 'state',
  },
];

// Resolve the rows array out of whatever top-level envelope the backend uses.
// The DSL declares the logical return as `list<Dto>`; a real paginated backend
// may wrap it. We accept a bare array OR a single well-known collection field,
// and RECORD which shape was seen so envelope drift is visible.
function extractRows(body: unknown): { rows: unknown[] | null; envelope: string } {
  if (Array.isArray(body)) return { rows: body, envelope: 'bare-array' };
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['content', 'data', 'items', 'results', 'rows']) {
      if (Array.isArray(obj[key])) return { rows: obj[key] as unknown[], envelope: `{ ${key}: [...] }` };
    }
  }
  return { rows: null, envelope: 'unknown' };
}

async function getJson(
  request: APIRequestContext,
  path: string,
  query?: Record<string, string | number>,
): Promise<{ status: number; body: unknown; text: string }> {
  const qs = query
    ? '?' + Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
    : '';
  const res = await request.get(`${BASE}${path}${qs}`, {
    headers: { Accept: 'application/json' },
  });
  const text = await res.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  return { status: res.status(), body, text };
}

test.beforeAll(() => {
  // Make the run-mode explicit in the report.
  console.info(
    PROXY_BACKEND
      ? `[backend-contract] Proxying to live backend: ${PROXY_BACKEND} (via ${BASE})`
      : `[backend-contract] GROUP_PAS_BACKEND_URL is unset — hitting the app's in-memory mocks via ${BASE}. ` +
          `Set GROUP_PAS_BACKEND_URL to exercise the real backend contract.`,
  );
});

for (const c of CONTRACTS) {
  test.describe(`contract: GET ${c.path} → list<${c.dto}>`, () => {
    test('responds 2xx and resolves to a collection envelope', async ({ request }) => {
      const { status, body, text } = await getJson(request, c.path, c.query);
      expect(
        status,
        `GET ${c.path} returned ${status}. The DSL declares this list/search endpoint; ` +
          `a non-2xx means the backend does not expose it as specified (or the proxy is misconfigured). Body: ${text.slice(0, 300)}`,
      ).toBeGreaterThanOrEqual(200);
      expect(status, `GET ${c.path} returned ${status}`).toBeLessThan(300);

      const { rows, envelope } = extractRows(body);
      expect(
        rows,
        `GET ${c.path} body is neither a bare array nor a known collection envelope ` +
          `({content|data|items|results|rows}: [...]). Got: ${text.slice(0, 300)}`,
      ).not.toBeNull();

      console.info(`[backend-contract] ${c.path}: ${rows!.length} row(s), envelope=${envelope}`);
    });

    test(`each row conforms to ${c.dto} key fields (when rows exist)`, async ({ request }) => {
      const { status, body } = await getJson(request, c.path, c.query);
      test.skip(status < 200 || status >= 300, `endpoint not 2xx (${status}); covered by the status test`);
      const { rows } = extractRows(body);
      if (!rows) {
        // Shape failure already asserted in the envelope test; nothing to add.
        test.skip(true, 'no resolvable rows array; covered by the envelope test');
        return;
      }
      if (rows.length === 0) {
        // Empty backend is acceptable — the contract is only checkable on rows.
        console.info(`[backend-contract] ${c.path}: 0 rows — shape not exercised (empty backend OK).`);
        return;
      }
      const sample = rows[0] as Record<string, unknown>;
      for (const key of c.requiredKeys) {
        expect(
          Object.prototype.hasOwnProperty.call(sample, key),
          `Row from ${c.path} is missing DSL-declared ${c.dto} field "${key}". ` +
            `Row keys: [${Object.keys(sample).join(', ')}]. This is backend↔DSL contract drift.`,
        ).toBe(true);
      }
      // The state/status field must be a string when present (enum-valued).
      if (Object.prototype.hasOwnProperty.call(sample, c.stateKey)) {
        expect(
          typeof sample[c.stateKey],
          `Row from ${c.path} field "${c.stateKey}" should be a string enum value.`,
        ).toBe('string');
      }
    });
  });
}
