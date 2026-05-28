// Spec-first test helpers.
//
// These parse the DSL canon under `docs/spec/**` (the source of truth per
// context/CORE_MEMORY.md "Reference-doc precedence") and the UI schemas under
// `schemas/**`, so the conformance tests can be written "as if the production
// code does not exist" — every expectation is derived from the spec, and the
// UI is asserted against it.
//
// Nothing here imports application code. The DSL files use a `.api` / `.data` /
// `.workflow` grammar that isn't JSON, so we parse the small slices we need
// (endpoint declarations, enum members) with focused regexes rather than a full
// grammar. The shapes we read are stable and simple.

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';

export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const SPEC_DIR = path.join(REPO_ROOT, 'docs', 'spec');
export const SCHEMAS_DIR = path.join(REPO_ROOT, 'schemas');
export const OPENAPI_PATH = path.join(REPO_ROOT, 'docs', 'planning', 'openapi.json');
export const BLUEPRINT_PATH = path.join(
  REPO_ROOT,
  'docs',
  'planning',
  'team_nb_blueprint_v3.md',
);

// Extract the backtick-wrapped UPPER_SNAKE state tokens from a markdown section
// of the blueprint, bounded by a start heading and the next `## ` or `### `
// heading. Used to read the blueprint's documented state machines so the DSL
// can be asserted as the higher-precedence source where they diverge.
export function blueprintStatesInSection(startHeading: string): string[] {
  if (!existsSync(BLUEPRINT_PATH)) return [];
  const text = readFileSync(BLUEPRINT_PATH, 'utf-8');
  const start = text.indexOf(startHeading);
  if (start === -1) return [];
  const after = text.slice(start + startHeading.length);
  // Stop at the next same-or-higher-level heading (## or ###). The #### States
  // and #### Commands subsections belong to this section and are included.
  const stopMatch = after.search(/\n#{2,3}\s/);
  const section = stopMatch === -1 ? after : after.slice(0, stopMatch);
  const tokens = new Set<string>();
  const re = /`([A-Z][A-Z0-9_]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) tokens.add(m[1]);
  return [...tokens].sort();
}

// ── Assertion helper ──────────────────────────────────────────────────────────
// Jest's built-in `expect(value, message)` does NOT accept a second message
// argument (that's a Vitest / Playwright-expect idiom). To attach a rich,
// actionable failure message — important here because each red IS a backlog
// item — throw an Error with the message when the condition fails. Jest reports
// the thrown message verbatim.
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ── Filesystem walk ─────────────────────────────────────────────────────────

export function walk(dir: string, predicate: (file: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

// ── Endpoint normalization ────────────────────────────────────────────────────
// The UI uses `{{memberId}}` mustache placeholders and ad-hoc `:id` params;
// the DSL uses `:clientId`; openapi uses `{clientId}`. To compare endpoints by
// SHAPE rather than by parameter spelling, collapse every path segment that is
// a placeholder to a single sentinel `:_`, and drop any query string.
export function normalizeEndpoint(raw: string): string {
  let p = raw.trim();
  // Strip protocol+host for absolute URLs (external endpoints).
  p = p.replace(/^https?:\/\/[^/]+/i, '');
  // Drop query string.
  p = p.split('?')[0];
  // Drop trailing slash (except root).
  if (p.length > 1) p = p.replace(/\/$/, '');
  // Collapse placeholder segments to a sentinel.
  const segs = p.split('/').map((seg) => {
    if (seg.startsWith('{{') && seg.endsWith('}}')) return ':_';
    if (seg.startsWith('{') && seg.endsWith('}')) return ':_';
    if (seg.startsWith(':')) return ':_';
    return seg;
  });
  return segs.join('/');
}

export interface EndpointRef {
  method: string;
  endpoint: string; // raw, as written
  normalized: string; // method + normalized path key
  source: string; // file it came from
}

export function endpointKey(method: string, normalizedPath: string): string {
  return `${method.toUpperCase()} ${normalizedPath}`;
}

// ── DSL .api parsing ──────────────────────────────────────────────────────────
// Grammar slice:
//   api ClientAPI base "/api/policy-admin" {
//       POST("/clients") createClient(...) : Resp { command X; }
//       GET("/clients/:clientId") getClientById(...) : ClientDto { query Y; }
//   }
// Some api blocks (Accounting) omit the `base "..."` — those endpoints are
// declared with absolute paths in the UI under a known module prefix, so we
// allow callers to supply a fallback base per file.

const API_BLOCK_RE = /\bapi\s+(\w+)\s*(?:base\s+"([^"]*)")?\s*\{/g;
const METHOD_RE = /\b(GET|POST|PUT|DELETE|PATCH)\s*\(\s*"([^"]*)"\s*\)/g;

export interface DslApiEndpoint {
  method: string;
  path: string; // base + path
  normalized: string;
  apiBlock: string;
  base: string;
  file: string;
}

// Per-file fallback base for api blocks that omit `base "..."`.
const API_FALLBACK_BASE: Record<string, string> = {
  // Accounting api blocks declare paths like "/events", "/journals" with no
  // base; the platform mounts them under /api/accounting.
  'AccountingApi.api': '/api/accounting',
};

export function parseDslApiEndpoints(): DslApiEndpoint[] {
  const files = walk(SPEC_DIR, (f) => f.endsWith('.api'));
  const out: DslApiEndpoint[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    const fallback = API_FALLBACK_BASE[path.basename(file)] ?? '';
    // Find each api block and its byte range so we can attribute methods to it.
    const blocks: Array<{ name: string; base: string; start: number; end: number }> = [];
    API_BLOCK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const headers: Array<{ name: string; base: string; braceAt: number }> = [];
    while ((m = API_BLOCK_RE.exec(text)) !== null) {
      headers.push({ name: m[1], base: m[2] ?? fallback, braceAt: m.index + m[0].length - 1 });
    }
    // Determine each block's body span by matching braces from the opening `{`.
    for (const h of headers) {
      let depth = 0;
      let i = h.braceAt;
      for (; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      blocks.push({ name: h.name, base: h.base, start: h.braceAt, end: i });
    }
    for (const b of blocks) {
      const body = text.slice(b.start, b.end);
      METHOD_RE.lastIndex = 0;
      let mm: RegExpExecArray | null;
      while ((mm = METHOD_RE.exec(body)) !== null) {
        const method = mm[1];
        const rawPath = mm[2];
        const full = `${b.base}${rawPath}`;
        out.push({
          method,
          path: full,
          normalized: normalizeEndpoint(full),
          apiBlock: b.name,
          base: b.base,
          file: path.relative(REPO_ROOT, file),
        });
      }
    }
  }
  return out;
}

// Set of normalized "METHOD path" keys declared by the DSL.
export function dslEndpointKeySet(): Set<string> {
  const set = new Set<string>();
  for (const e of parseDslApiEndpoints()) set.add(endpointKey(e.method, e.normalized));
  return set;
}

// ── DSL .data enum parsing ────────────────────────────────────────────────────
// Grammar slice:
//   enum PolicyMemberState {
//       CREATED
//       PRICED
//       ...
//   }
export function parseDslEnums(): Record<string, string[]> {
  const files = walk(SPEC_DIR, (f) => f.endsWith('.data'));
  const enums: Record<string, string[]> = {};
  const ENUM_RE = /\benum\s+(\w+)\s*\{([^}]*)\}/g;
  for (const file of files) {
    const text = readFileSync(file, 'utf-8');
    ENUM_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ENUM_RE.exec(text)) !== null) {
      const name = m[1];
      const members = m[2]
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => /^[A-Z][A-Z0-9_]*$/.test(s));
      enums[name] = members;
    }
  }
  return enums;
}

// ── UI schema parsing ─────────────────────────────────────────────────────────

export interface SchemaNode {
  id?: string;
  type?: string;
  target?: string;
  api?: { endpoint?: string; method?: string };
  endpoint?: string;
  method?: string;
  dataSource?: { api?: { endpoint?: string; method?: string } };
  props?: {
    stateActions?: Record<string, string[]>;
    roleActions?: Record<string, string[]>;
    actions?: SchemaNode[];
    [k: string]: unknown;
  };
  children?: SchemaNode[];
  [k: string]: unknown;
}

export function loadSchemaFiles(): Array<{ rel: string; json: SchemaNode }> {
  return walk(SCHEMAS_DIR, (f) => f.endsWith('.json')).map((f) => ({
    rel: path.relative(SCHEMAS_DIR, f),
    json: JSON.parse(readFileSync(f, 'utf-8')) as SchemaNode,
  }));
}

// Recursively collect every (method, endpoint, sourceFile) the UI references —
// from `dataSource.api`, inline `api`, and bare `endpoint`/`method` pairs.
export function collectUiEndpoints(node: unknown, file: string, out: EndpointRef[] = []): EndpointRef[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) collectUiEndpoints(n, file, out);
    return out;
  }
  const obj = node as Record<string, unknown>;
  const consider = (api: { endpoint?: string; method?: string } | undefined) => {
    if (api && typeof api.endpoint === 'string') {
      const method = (api.method ?? 'GET').toUpperCase();
      out.push({
        method,
        endpoint: api.endpoint,
        normalized: endpointKey(method, normalizeEndpoint(api.endpoint)),
        source: file,
      });
    }
  };
  consider(obj.api as { endpoint?: string; method?: string });
  consider((obj.dataSource as { api?: { endpoint?: string; method?: string } })?.api);
  if (typeof obj.endpoint === 'string') {
    const method = (typeof obj.method === 'string' ? obj.method : 'GET').toUpperCase();
    out.push({
      method,
      endpoint: obj.endpoint,
      normalized: endpointKey(method, normalizeEndpoint(obj.endpoint)),
      source: file,
    });
  }
  for (const v of Object.values(obj)) collectUiEndpoints(v, file, out);
  return out;
}

// Walk a schema collecting every action-bar node (mirrors schema-coherence.spec).
export function collectActionBars(node: SchemaNode | undefined, out: SchemaNode[] = []): SchemaNode[] {
  if (!node) return out;
  if (node.type === 'action-bar' && node.props) out.push(node);
  for (const child of node.children ?? []) collectActionBars(child, out);
  return out;
}

// Which DSL enum governs the stateActions of a given detail/tab schema.
// Derived from the entity each schema renders (per docs/spec domain).
export const SCHEMA_STATE_ENUM: Record<string, string> = {
  'quote-detail.json': 'QuoteStatus',
  'tabs/quote/key-data.json': 'QuoteStatus',
  'tabs/quote/plans.json': 'QuoteStatus',
  'tabs/quote/census.json': 'QuoteStatus',
  'tabs/quote/member-mapping.json': 'QuoteStatus',
  'tabs/quote/pricing.json': 'QuoteStatus',
  'member-quote-detail.json': 'MemberQuoteStatus',
  'proposal-detail.json': 'ProposalState',
  'policy-member-detail.json': 'PolicyMemberState',
  'policy-detail.json': 'PolicyState',
  'tabs/policy/members.json': 'PolicyState',
  'views/census-submission-detail.json': 'CensusSubmissionStatus',
};

// The UI's API namespaces that the Group PAS DSL actually covers. Everything
// else (payouts/moneyout, dashboard, claims, external) is out of the DSL's
// scope and is reported as an explicit "no DSL coverage" gap rather than a
// failure.
export const DSL_COVERED_PREFIXES = [
  '/api/issuance/',
  '/api/policy-admin/',
  '/api/quotation/',
  '/api/accounting/',
];

export function isDslCovered(endpoint: string): boolean {
  const p = normalizeEndpoint(endpoint);
  return DSL_COVERED_PREFIXES.some((pre) => p.startsWith(pre));
}

// ── UI state-map parsing ──────────────────────────────────────────────────────
// Per #57's framework↔domain seam, `state-map.ts` is the generic empty registry
// and each domain ships a `state-map.<domain>.ts` module that self-registers
// its data. The GP entity maps live in `src/lib/state-maps/group-pas.ts`.
// We parse that file WITHOUT importing it (importing pulls in the React/badge
// dependency chain), grabbing the `const X_STATES: Record<...> = { KEY: {...} }`
// object literals to compare the UI state vocab against the DSL enums.
export const STATE_MAP_PATH = path.join(
  REPO_ROOT,
  'src',
  'lib',
  'state-maps',
  'group-pas.ts',
);

// Map of the `const NAME_STATES` identifier in state-map.ts → the EntityKind it
// serves and the DSL enum that governs it.
export const STATE_MAP_CONSTS: Array<{ constName: string; entity: string; dslEnum: string }> = [
  { constName: 'MEMBER_QUOTE_STATES', entity: 'memberQuote', dslEnum: 'MemberQuoteStatus' },
  { constName: 'QUOTE_STATES', entity: 'quote', dslEnum: 'QuoteStatus' },
  { constName: 'PROPOSAL_STATES', entity: 'proposal', dslEnum: 'ProposalState' },
  { constName: 'POLICY_MEMBER_STATES', entity: 'policyMember', dslEnum: 'PolicyMemberState' },
  { constName: 'POLICY_STATES', entity: 'policy', dslEnum: 'PolicyState' },
  { constName: 'MEMBER_STATES', entity: 'member', dslEnum: 'MemberState' },
  { constName: 'CENSUS_SUBMISSION_STATES', entity: 'censusSubmission', dslEnum: 'CensusSubmissionStatus' },
];

// Extract the top-level keys of a given `const NAME ... = { ... }` object literal.
export function parseStateMapKeys(constName: string): string[] {
  const text = readFileSync(STATE_MAP_PATH, 'utf-8');
  const start = text.indexOf(`const ${constName}`);
  if (start === -1) return [];
  const braceOpen = text.indexOf('{', start);
  if (braceOpen === -1) return [];
  // Balance braces to find the literal's end.
  let depth = 0;
  let i = braceOpen;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = text.slice(braceOpen + 1, i);
  // Capture only top-level keys: an UPPER_SNAKE identifier followed by `:` that
  // sits at depth 0 of the object body (depth tracked via nested braces).
  const keys: string[] = [];
  let d = 0;
  let mm: RegExpExecArray | null;
  const reKey = /([A-Z][A-Z0-9_]*)\s*:|[{}]/g;
  while ((mm = reKey.exec(body)) !== null) {
    const tok = mm[0];
    if (tok === '{') d++;
    else if (tok === '}') d--;
    else if (d === 0 && mm[1]) keys.push(mm[1]);
  }
  return keys;
}
