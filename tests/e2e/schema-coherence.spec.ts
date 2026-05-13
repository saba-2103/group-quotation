// Schema-coherence audits.
//
// These tests don't touch the browser — they load the JSON schemas off disk
// and assert structural rules. Catches the kind of mistake that a code review
// or compiler would in a static-typed codebase but that JSON schemas don't
// enforce: e.g. a role being granted both halves of a two-sided handshake.
//
// Driven by feedback (2026-05-13): "why does Sales have both Send-for-approval
// AND Submit? it doesn't make sense." — that's exactly the kind of incoherence
// the schema sweep can introduce silently.

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCHEMAS = path.join(ROOT, 'schemas');

interface RoleActions {
  [role: string]: string[];
}

interface StateActions {
  [state: string]: string[];
}

interface Schema {
  id?: string;
  type?: string;
  props?: {
    roleActions?: RoleActions;
    stateActions?: StateActions;
    actions?: Array<{ id?: string }>;
  };
  children?: Schema[];
}

// Walk a schema tree and collect every action-bar node.
function collectActionBars(node: Schema, out: Schema[] = []): Schema[] {
  if (!node) return out;
  if (node.type === 'action-bar' && node.props) out.push(node);
  for (const child of node.children ?? []) collectActionBars(child, out);
  return out;
}

function loadSchema(file: string): Schema {
  return JSON.parse(readFileSync(file, 'utf-8')) as Schema;
}

// Recursive helper: a list of schema files we expect to have roleActions
// somewhere in their tree.
const SCHEMA_FILES = [
  'quote-detail.json',
  'proposal-detail.json',
  'policy-detail.json',
  'policy-member-detail.json',
  'member-quote-detail.json',
  'tabs/quote/key-data.json',
  'tabs/quote/plans.json',
  'tabs/quote/census.json',
  'tabs/quote/member-mapping.json',
  'tabs/quote/pricing.json',
];

const NARRATIVE_ROLES = new Set([
  'sales',
  'partner_agent',
  'mph',
  'member',
  'uw',
  'ops',
]);

// Pairs of action ids that represent two SIDES of one workflow handshake.
// A single role holding both sides is incoherent — there's nobody on the
// other end of the handshake. The maker-checker overlay's `send-for-approval`
// + `submit` pair is the canonical example; expand this list as new
// two-sided workflows arrive.
const HANDSHAKE_PAIRS: Array<[string, string, string]> = [
  // [actionA, actionB, description]
  ['send-for-approval', 'submit', 'maker-checker approval overlay'],
  // Cross-org accept/reject is paired with the sender's send-to-client.
  // But accept/reject are MPH-side, send-to-client is sales-side — different
  // roles by design. We don't gate on this pair.
];

for (const rel of SCHEMA_FILES) {
  const full = path.join(SCHEMAS, rel);
  if (!existsSync(full)) continue;
  test.describe(`schema: ${rel}`, () => {
    test('every roleActions key is in the narrative-role enum', () => {
      const schema = loadSchema(full);
      const bars = collectActionBars(schema);
      for (const bar of bars) {
        const keys = Object.keys(bar.props?.roleActions ?? {});
        for (const k of keys) {
          expect(
            NARRATIVE_ROLES.has(k),
            `schema ${rel} action-bar uses stale role key "${k}". Allowed: ${[...NARRATIVE_ROLES].join(', ')}`,
          ).toBe(true);
        }
      }
    });

    test('no role holds both sides of a two-sided handshake', () => {
      const schema = loadSchema(full);
      const bars = collectActionBars(schema);
      for (const bar of bars) {
        const ra = bar.props?.roleActions ?? {};
        for (const [a, b, label] of HANDSHAKE_PAIRS) {
          for (const [role, actions] of Object.entries(ra)) {
            if (actions.includes(a) && actions.includes(b)) {
              throw new Error(
                `schema ${rel}: role "${role}" holds BOTH sides of the ${label} (${a} + ${b}). ` +
                  `One of them must belong to a different role, or both must be removed.`,
              );
            }
          }
        }
      }
    });

    test('every action id in roleActions has a matching action definition', () => {
      const schema = loadSchema(full);
      const bars = collectActionBars(schema);
      for (const bar of bars) {
        const declared = new Set((bar.props?.actions ?? []).map((a) => a.id));
        const ra = bar.props?.roleActions ?? {};
        for (const [role, ids] of Object.entries(ra)) {
          for (const id of ids) {
            expect(
              declared.has(id),
              `schema ${rel}: role "${role}" includes action id "${id}" but no action with that id is declared.`,
            ).toBe(true);
          }
        }
      }
    });

    test('every action id in stateActions has a matching action definition', () => {
      const schema = loadSchema(full);
      const bars = collectActionBars(schema);
      for (const bar of bars) {
        const declared = new Set((bar.props?.actions ?? []).map((a) => a.id));
        const sa = bar.props?.stateActions ?? {};
        for (const [state, ids] of Object.entries(sa)) {
          for (const id of ids) {
            expect(
              declared.has(id),
              `schema ${rel}: state "${state}" includes action id "${id}" but no action with that id is declared.`,
            ).toBe(true);
          }
        }
      }
    });

    test('every declared action is reachable by at least one role AND in at least one state', () => {
      // A declared action that no role can ever press is dead code in the
      // schema. Same if no state lists it. Either is a sign the schema sweep
      // left an orphan.
      const schema = loadSchema(full);
      const bars = collectActionBars(schema);
      for (const bar of bars) {
        const declared = (bar.props?.actions ?? []).map((a) => a.id).filter(Boolean) as string[];
        const allRoleIds = new Set(
          Object.values(bar.props?.roleActions ?? {}).flat(),
        );
        const allStateIds = new Set(
          Object.values(bar.props?.stateActions ?? {}).flat(),
        );
        for (const id of declared) {
          expect(
            allRoleIds.has(id),
            `schema ${rel}: action "${id}" is declared but no role lists it — dead action.`,
          ).toBe(true);
          expect(
            allStateIds.has(id),
            `schema ${rel}: action "${id}" is declared but no state lists it — dead action.`,
          ).toBe(true);
        }
      }
    });
  });
}

test.describe('dashboard.json — Inbox section sanity', () => {
  test('every Inbox child sets visibleRoles, and those roles are in the narrative enum', () => {
    const dash = loadSchema(path.join(SCHEMAS, 'dashboard.json'));
    type Node = Schema & { visibleRoles?: string[] };
    const findSection = (node: Schema): Node | null => {
      const n = node as Node;
      if (n.id === 'inbox-section') return n;
      for (const child of n.children ?? []) {
        const hit = findSection(child);
        if (hit) return hit;
      }
      return null;
    };
    const inbox = findSection(dash);
    expect(inbox, 'inbox-section missing from dashboard.json').not.toBeNull();
    expect(inbox!.children?.length, 'inbox should have at least one section').toBeGreaterThanOrEqual(1);
    for (const child of inbox!.children ?? []) {
      const c = child as Node;
      expect(
        c.visibleRoles,
        `inbox child "${c.id}" missing visibleRoles — would render for every role and leak.`,
      ).toBeDefined();
      for (const r of c.visibleRoles!) {
        expect(
          NARRATIVE_ROLES.has(r),
          `inbox child "${c.id}" uses stale role "${r}".`,
        ).toBe(true);
      }
    }
  });

  test('every narrative role has at least one Inbox section dedicated to them', () => {
    // If a role has no inbox section, switching to that role lands you on a
    // dashboard with just metrics — no actionable content. That's the
    // workbench guarantee PROP-0009 is supposed to deliver.
    const dash = loadSchema(path.join(SCHEMAS, 'dashboard.json'));
    type Node = Schema & { visibleRoles?: string[] };
    const findSection = (node: Schema): Node | null => {
      const n = node as Node;
      if (n.id === 'inbox-section') return n;
      for (const child of n.children ?? []) {
        const hit = findSection(child);
        if (hit) return hit;
      }
      return null;
    };
    const inbox = findSection(dash)!;
    const rolesWithSections = new Set<string>();
    for (const child of inbox.children ?? []) {
      const c = child as Node;
      for (const r of c.visibleRoles ?? []) rolesWithSections.add(r);
    }
    for (const r of NARRATIVE_ROLES) {
      expect(
        rolesWithSections.has(r),
        `role "${r}" has no dedicated Inbox section — empty workbench for that persona.`,
      ).toBe(true);
    }
  });
});
