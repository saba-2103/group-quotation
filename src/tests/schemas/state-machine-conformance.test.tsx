/**
 * STATE-MACHINE CONFORMANCE — UI state vocabulary ⇄ DSL state enums.
 *
 * Spec-first: the authoritative state vocabulary is the set of `enum` blocks in
 * the DSL `.data` files (e.g. `enum PolicyMemberState { ... }` in
 * docs/spec/issuance/IssuanceData.data). Per context/CORE_MEMORY.md
 * "Reference-doc precedence": DSL > blueprint > PRD. So the DSL enums win over
 * the blueprint's prose state tables wherever they differ.
 *
 * What this asserts:
 *   1. Each entity map in `src/components/widgets/state/state-map.ts` declares
 *      EXACTLY the members of its governing DSL enum (no UI-invented states, no
 *      missing states).
 *   2. Every detail/tab schema's `stateActions` keys are a SUBSET of the
 *      governing DSL enum (a schema need not handle every state, but must never
 *      key on a state the DSL doesn't define).
 *   3. A clearly-labelled assertion DOCUMENTING that the blueprint's
 *      ProposalMember state table (§4.2 of team_nb_blueprint_v3.md) is STALE
 *      relative to the DSL: it omits PRICED / SENT_FOR_ISSUANCE / ARCHIVED and
 *      uses REVIEW_PENDING where the DSL (and the shipped UI) use
 *      REFERRED_TO_UW. The DSL is authoritative; the blueprint is the stale doc.
 *
 * Note: the prior audit suspected the shipped policyMember states diverged from
 * the *blueprint*. They do — but the DSL (higher precedence) SANCTIONS the
 * shipped states. So the recorded backlog item here is "blueprint §4.2 is stale
 * vs the DSL", NOT "the UI must change".
 *
 * Per the task: do NOT edit production code/schemas to satisfy these. Reds are
 * the documented backlog.
 */

import {
  assert,
  parseDslEnums,
  parseStateMapKeys,
  STATE_MAP_CONSTS,
  blueprintStatesInSection,
  loadSchemaFiles,
  collectActionBars,
  SCHEMA_STATE_ENUM,
} from './_helpers/dsl';

const DSL_ENUMS = parseDslEnums();

describe('state-machine conformance: state-map.ts ⇄ DSL enums', () => {
  it('the DSL declares all expected state enums (sanity: parser works)', () => {
    for (const { dslEnum } of STATE_MAP_CONSTS) {
      assert(
        Array.isArray(DSL_ENUMS[dslEnum]) && DSL_ENUMS[dslEnum].length > 0,
        `DSL enum "${dslEnum}" not found in docs/spec/**.data`,
      );
      expect(DSL_ENUMS[dslEnum].length).toBeGreaterThan(0);
    }
  });

  for (const { constName, dslEnum } of STATE_MAP_CONSTS) {
    describe(`${constName} ⇄ enum ${dslEnum}`, () => {
      const ui = parseStateMapKeys(constName);
      const dsl = DSL_ENUMS[dslEnum] ?? [];

      it('declares no state that the DSL enum does not define', () => {
        const extra = ui.filter((s) => !dsl.includes(s));
        assert(
          extra.length === 0,
          `state-map.ts ${constName} declares state(s) ${JSON.stringify(extra)} ` +
            `not present in DSL enum ${dslEnum} [${dsl.join(', ')}].`,
        );
        expect(extra).toEqual([]);
      });

      it('covers every member of the DSL enum', () => {
        const missing = dsl.filter((s) => !ui.includes(s));
        assert(
          missing.length === 0,
          `state-map.ts ${constName} is missing DSL ${dslEnum} state(s) ${JSON.stringify(missing)}. ` +
            `Every enum member needs a label + variant or list/detail rendering falls back to "Unknown".`,
        );
        expect(missing).toEqual([]);
      });
    });
  }
});

describe('state-machine conformance: schema stateActions ⇄ DSL enums', () => {
  // Build a flat list of (schemaFile, actionBarIndex, stateKey[]) for every
  // detail/tab schema we have an enum mapping for.
  const schemas = loadSchemaFiles();

  for (const [rel, dslEnum] of Object.entries(SCHEMA_STATE_ENUM)) {
    const entry = schemas.find((s) => s.rel === rel);
    const dsl = DSL_ENUMS[dslEnum] ?? [];

    describe(`schemas/${rel} stateActions ⊆ ${dslEnum}`, () => {
      it('exists and maps to a known DSL enum', () => {
        assert(entry !== undefined, `expected schema file schemas/${rel} to exist`);
        expect(dsl.length).toBeGreaterThan(0);
      });

      it('every stateActions key is a member of the DSL enum', () => {
        if (!entry) return;
        const bars = collectActionBars(entry.json);
        const offenders: string[] = [];
        for (const bar of bars) {
          const sa = bar.props?.stateActions ?? {};
          for (const state of Object.keys(sa)) {
            if (!dsl.includes(state)) offenders.push(state);
          }
        }
        assert(
          offenders.length === 0,
          `schemas/${rel} keys stateActions on ${JSON.stringify(offenders)} ` +
            `which are not members of DSL enum ${dslEnum} [${dsl.join(', ')}].`,
        );
        expect(offenders).toEqual([]);
      });
    });
  }
});

// ── Blueprint §4.2 is STALE vs the DSL — documented divergence ────────────────
describe('blueprint ProposalMember states vs DSL PolicyMemberState (documented divergence)', () => {
  it('DOCUMENTS: blueprint §4.2 omits PRICED/SENT_FOR_ISSUANCE/ARCHIVED and uses REVIEW_PENDING (DSL uses REFERRED_TO_UW)', () => {
    const blueprint = blueprintStatesInSection('### 4.2 ProposalMember Aggregate');
    const dsl = DSL_ENUMS.PolicyMemberState ?? [];

    // Guard: both sources parsed.
    assert(blueprint.length > 0, 'failed to parse blueprint §4.2 ProposalMember states');
    assert(dsl.length > 0, 'failed to parse DSL PolicyMemberState enum');

    const dslOnly = dsl.filter((s) => !blueprint.includes(s)).sort();
    const blueprintOnly = blueprint.filter((s) => !dsl.includes(s)).sort();

    // The DSL is authoritative. These are the exact stale points in the
    // blueprint. If the blueprint is later updated to match the DSL, these
    // expectations change — that is the signal the doc was reconciled.
    expect(dslOnly).toEqual(['ARCHIVED', 'PRICED', 'REFERRED_TO_UW', 'SENT_FOR_ISSUANCE']);
    expect(blueprintOnly).toEqual(['REVIEW_PENDING']);

    console.info(
      `[state-machine] Blueprint §4.2 ProposalMember is STALE vs DSL PolicyMemberState. ` +
        `DSL-only (blueprint missing): ${dslOnly.join(', ')}. ` +
        `Blueprint-only (renamed to REFERRED_TO_UW in DSL): ${blueprintOnly.join(', ')}. ` +
        `Precedence: DSL wins; the shipped UI matches the DSL.`,
    );
  });

  it('the shipped UI policyMember states match the DSL (NOT the blueprint)', () => {
    const ui = parseStateMapKeys('POLICY_MEMBER_STATES').sort();
    const dsl = [...(DSL_ENUMS.PolicyMemberState ?? [])].sort();
    expect(ui).toEqual(dsl);
  });
});
