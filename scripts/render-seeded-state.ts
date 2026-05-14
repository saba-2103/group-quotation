#!/usr/bin/env tsx
/**
 * Render `playwright-report/seeded-entities.jsonl` (written by
 * `tests/e2e/seed-portal.spec.ts`) into a Markdown click-through index at
 * `tests/e2e/SEEDED_STATE_<YYYY-MM-DD>.md`.
 *
 * Usage: `npx tsx scripts/render-seeded-state.ts`
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface Row {
  kind: 'quote' | 'proposal' | 'policy' | 'policy-member';
  state: string;
  id: string;
  lob?: 'GTL' | 'GCL';
  note?: string;
  ts: string;
}

const SRC = path.resolve(process.cwd(), 'playwright-report', 'seeded-entities.jsonl');
const date = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(process.cwd(), 'tests', 'e2e', `SEEDED_STATE_${date}.md`);

if (!existsSync(SRC)) {
  console.error(`No seed file at ${SRC}. Run Phase B first.`);
  process.exit(1);
}

const rows: Row[] = readFileSync(SRC, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Row);

const routeFor = (r: Row): string => {
  switch (r.kind) {
    case 'quote':
      return `/quotation/${r.id}`;
    case 'proposal':
      return `/issuance/proposals/${r.id}`;
    case 'policy':
      return `/policy-admin/policies/${r.id}`;
    case 'policy-member':
      return `/issuance/proposals/${r.id}/census`;
  }
};

const lines: string[] = [];
lines.push(`# Seeded state matrix — ${date}`);
lines.push('');
lines.push(`${rows.length} entities seeded via the portal against [keystone-ui-dev.anairacloud.com](https://keystone-ui-dev.anairacloud.com).`);
lines.push('');
lines.push('Switch to the listed role in the role-switcher, then click the link to land on the entity in its captured state.');
lines.push('');

// Group by kind + state
const groups = new Map<string, Row[]>();
for (const r of rows) {
  const key = `${r.kind} / ${r.state}${r.lob ? ` (${r.lob})` : ''}`;
  const list = groups.get(key) ?? [];
  list.push(r);
  groups.set(key, list);
}

for (const [key, list] of [...groups.entries()].sort()) {
  lines.push(`## ${key} — ${list.length} entit${list.length === 1 ? 'y' : 'ies'}`);
  lines.push('');
  for (const r of list) {
    const route = routeFor(r);
    lines.push(`- [\`${r.id}\`](https://keystone-ui-dev.anairacloud.com${route})${r.note ? ` — ${r.note}` : ''}`);
  }
  lines.push('');
}

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`Seeded: ${rows.length} rows in ${groups.size} state groups`);
