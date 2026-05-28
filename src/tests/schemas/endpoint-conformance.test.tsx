/**
 * ENDPOINT CONFORMANCE — UI schemas ⇄ DSL API specs.
 *
 * Spec-first: every expectation is derived from the DSL canon under
 * `docs/spec/**​/*.api` (the source of truth per context/CORE_MEMORY.md
 * "Reference-doc precedence": DSL > blueprint > PRD > openapi.json [STALE]).
 *
 * What this asserts:
 *   1. Every API endpoint the UI schemas reference, within a DSL-covered
 *      namespace (/api/{issuance,policy-admin,quotation,accounting}), is
 *      DECLARED by some `.api` block in the DSL. Endpoints outside those
 *      namespaces (payouts/moneyout, dashboard, claims, external) are reported
 *      as an explicit "no DSL coverage" gap, not a failure — there is no DSL
 *      module for them.
 *   2. A clearly-labelled, standalone assertion documenting that
 *      `docs/planning/openapi.json` is STALE where it diverges from the DSL —
 *      the canonical example is `/api/issuance/proposal-members/*` (openapi)
 *      vs `/api/issuance/policy-members/*` (DSL + UI). This keeps the
 *      stale-openapi finding visible in the suite without treating the UI as
 *      the thing that must change.
 *
 * Per the task: do NOT edit production schemas/code to make these pass. Where a
 * test goes RED, that red is the documented backlog — each failure names the
 * exact UI endpoint and the DSL fact it violates.
 */

import { readFileSync, existsSync } from 'fs';
import {
  assert,
  dslEndpointKeySet,
  loadSchemaFiles,
  collectUiEndpoints,
  isDslCovered,
  normalizeEndpoint,
  OPENAPI_PATH,
  type EndpointRef,
} from './_helpers/dsl';

// Collect & de-duplicate every endpoint the UI references, keyed by normalized
// "METHOD /path" with placeholder segments collapsed.
function allUiEndpoints(): Map<string, EndpointRef> {
  const byKey = new Map<string, EndpointRef>();
  for (const { rel, json } of loadSchemaFiles()) {
    const refs: EndpointRef[] = [];
    collectUiEndpoints(json, rel, refs);
    for (const r of refs) {
      // Keep the first-seen source for a stable message; accumulate others.
      if (!byKey.has(r.normalized)) byKey.set(r.normalized, r);
    }
  }
  return byKey;
}

const DSL = dslEndpointKeySet();
const UI = allUiEndpoints();

const dslCoveredUi = [...UI.values()].filter((r) => isDslCovered(r.endpoint));
const outsideDslUi = [...UI.values()].filter((r) => !isDslCovered(r.endpoint));

describe('endpoint conformance: UI schemas ⇄ DSL .api specs', () => {
  it('the DSL exposes a non-trivial set of endpoints (sanity: parser works)', () => {
    expect(DSL.size).toBeGreaterThan(50);
  });

  it('the UI references a non-trivial set of endpoints (sanity: collector works)', () => {
    expect(UI.size).toBeGreaterThan(50);
  });

  // One test PER DSL-covered UI endpoint. Green where the DSL declares it; red
  // where it doesn't. The red set IS the documented endpoint backlog.
  describe('every DSL-covered UI endpoint is declared in the DSL', () => {
    for (const ref of dslCoveredUi.sort((a, b) => a.normalized.localeCompare(b.normalized))) {
      it(`${ref.normalized}  (schemas/${ref.source})`, () => {
        assert(
          DSL.has(ref.normalized),
          `UI references "${ref.normalized}" (raw "${ref.method} ${ref.endpoint}" in schemas/${ref.source}) ` +
            `but no docs/spec/**.api block declares it. Either the DSL is missing this endpoint, ` +
            `or the UI is calling a surface the backend does not expose per the spec.`,
        );
        expect(DSL.has(ref.normalized)).toBe(true);
      });
    }
  });

  // Visibility: endpoints with no DSL module at all. Not a failure — there is
  // no Group-PAS DSL for payouts/moneyout, dashboard, claims, or external URLs.
  it('reports UI endpoints that fall outside any DSL namespace (informational gap)', () => {
    const list = outsideDslUi
      .map((r) => `${r.method} ${normalizeEndpoint(r.endpoint)}  (schemas/${r.source})`)
      .sort();
    // Assert the bucket is captured (non-empty in this app) and print it so the
    // gap is recorded in test output. These are NOT spec violations.
    expect(list.length).toBeGreaterThan(0);
    console.info(
      `[endpoint-conformance] ${list.length} UI endpoints have no DSL coverage (out of spec scope):\n  ` +
        list.join('\n  '),
    );
  });
});

// ── openapi.json is STALE — documented divergence, not a UI defect ────────────
describe('openapi.json staleness vs DSL (documented divergence)', () => {
  const hasOpenapi = existsSync(OPENAPI_PATH);

  // Parse the openapi paths once.
  function openapiPaths(): string[] {
    if (!hasOpenapi) return [];
    const doc = JSON.parse(readFileSync(OPENAPI_PATH, 'utf-8')) as {
      paths?: Record<string, unknown>;
    };
    return Object.keys(doc.paths ?? {});
  }

  (hasOpenapi ? it : it.skip)(
    'CANONICAL DRIFT: openapi uses /api/issuance/proposal-members/* while the DSL + UI use /api/issuance/policy-members/*',
    () => {
      const paths = openapiPaths();
      const openapiProposalMembers = paths.filter((p) =>
        p.startsWith('/api/issuance/proposal-members'),
      );
      const openapiPolicyMembers = paths.filter((p) =>
        p.startsWith('/api/issuance/policy-members'),
      );

      // DSL truth: policy-members is declared; proposal-members is NOT.
      const dslHasPolicyMembers = [...DSL].some((k) =>
        k.includes('/api/issuance/policy-members'),
      );
      const dslHasProposalMembers = [...DSL].some((k) =>
        k.includes('/api/issuance/proposal-members'),
      );

      // UI truth: schemas reference policy-members, never proposal-members.
      const uiHasPolicyMembers = [...UI.keys()].some((k) =>
        k.includes('/api/issuance/policy-members'),
      );
      const uiHasProposalMembers = [...UI.keys()].some((k) =>
        k.includes('/api/issuance/proposal-members'),
      );

      // The DSL is authoritative: policy-members exists, proposal-members does not.
      assert(dslHasPolicyMembers, 'DSL should declare /api/issuance/policy-members/* (it does in IssuanceApi.api)');
      assert(!dslHasProposalMembers, 'DSL should NOT declare /api/issuance/proposal-members/* (only openapi does)');
      expect(dslHasPolicyMembers).toBe(true);
      expect(dslHasProposalMembers).toBe(false);

      // The UI conforms to the DSL, not to openapi.
      assert(uiHasPolicyMembers, 'UI schemas should reference /api/issuance/policy-members/*');
      assert(!uiHasProposalMembers, 'UI schemas should NOT reference /api/issuance/proposal-members/*');
      expect(uiHasPolicyMembers).toBe(true);
      expect(uiHasProposalMembers).toBe(false);

      // openapi is the stale outlier: it carries proposal-members and lacks
      // policy-members. This assertion DOCUMENTS the staleness; if a future
      // openapi regen aligns with the DSL (drops proposal-members, adds
      // policy-members), this test will go red and should be updated to reflect
      // that openapi is no longer stale on this point.
      assert(
        openapiProposalMembers.length > 0,
        `Expected openapi.json to still carry the stale /api/issuance/proposal-members/* paths. ` +
          `If this is now empty, openapi may have been regenerated to match the DSL — update this test.`,
      );
      assert(
        openapiPolicyMembers.length === 0,
        `openapi.json unexpectedly declares /api/issuance/policy-members/* — that would mean it has ` +
          `been aligned with the DSL. Update this staleness test.`,
      );
      expect(openapiProposalMembers.length).toBeGreaterThan(0);
      expect(openapiPolicyMembers.length).toBe(0);

      console.info(
        `[openapi-staleness] openapi declares ${openapiProposalMembers.length} stale ` +
          `proposal-members path(s): ${openapiProposalMembers.join(', ')}; ` +
          `DSL + UI use policy-members. Precedence: DSL wins; openapi is stale.`,
      );
    },
  );
});
