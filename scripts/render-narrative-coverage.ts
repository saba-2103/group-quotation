#!/usr/bin/env tsx
/**
 * Render `playwright-report/narrative-beats.jsonl` (written by the narrative
 * walkthrough specs via `recordBeat`) into a Markdown coverage report at
 * `tests/e2e/NARRATIVE_COVERAGE_<YYYY-MM-DD>.md`.
 *
 * Usage: `npx tsx scripts/render-narrative-coverage.ts`
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface BeatRecord {
  lob: 'GTL' | 'GCL';
  beat: string;
  description: string;
  outcome: 'pass' | 'fail' | 'gap';
  note?: string;
  ts: string;
}

const SRC = path.resolve(process.cwd(), 'playwright-report', 'narrative-beats.jsonl');
const date = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(process.cwd(), 'tests', 'e2e', `NARRATIVE_COVERAGE_${date}.md`);

if (!existsSync(SRC)) {
  console.error(`No coverage file at ${SRC}. Run Phase A first.`);
  process.exit(1);
}

// Last-write-wins: a flaky beat that ran twice should reflect its latest
// outcome. Key by `${lob}/${beat}`.
const latest = new Map<string, BeatRecord>();
for (const line of readFileSync(SRC, 'utf8').trim().split('\n')) {
  if (!line.trim()) continue;
  const rec = JSON.parse(line) as BeatRecord;
  const key = `${rec.lob}/${rec.beat}`;
  const existing = latest.get(key);
  if (!existing || existing.ts < rec.ts) latest.set(key, rec);
}

const all = [...latest.values()].sort((a, b) => {
  if (a.lob !== b.lob) return a.lob.localeCompare(b.lob);
  return a.beat.localeCompare(b.beat, undefined, { numeric: true });
});

const tally = { pass: 0, gap: 0, fail: 0 };
for (const r of all) tally[r.outcome] += 1;

const outcomeIcon = (o: BeatRecord['outcome']): string =>
  o === 'pass' ? '✅' : o === 'gap' ? '🟡' : '❌';

const lines: string[] = [];
lines.push(`# Narrative coverage — ${date}`);
lines.push('');
lines.push(`Generated from \`playwright-report/narrative-beats.jsonl\` (${all.length} beats recorded).`);
lines.push('');
lines.push(`**Bottom line: ${tally.pass}/${all.length} beats walkable, ${tally.gap} gaps, ${tally.fail} failures.**`);
lines.push('');
lines.push('Compare against [`docs/planning/DEMO_NARRATIVE_GTL_GCL.md`](../../docs/planning/DEMO_NARRATIVE_GTL_GCL.md).');
lines.push('');

for (const lob of ['GTL', 'GCL'] as const) {
  const rows = all.filter((r) => r.lob === lob);
  if (rows.length === 0) continue;
  lines.push(`## ${lob}`);
  lines.push('');
  lines.push('| Beat | Description | Outcome | Note |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    const note = (r.note ?? '').replace(/\|/g, '\\|').slice(0, 200);
    lines.push(`| ${r.beat} | ${r.description} | ${outcomeIcon(r.outcome)} ${r.outcome} | ${note} |`);
  }
  lines.push('');
}

lines.push('## Gap summary');
lines.push('');
const gaps = all.filter((r) => r.outcome !== 'pass');
if (gaps.length === 0) {
  lines.push('_None — narrative walks end-to-end._');
} else {
  for (const g of gaps) {
    lines.push(`- **${g.lob} ${g.beat}** — ${g.description}: ${g.note ?? '(no note)'}`);
  }
}
lines.push('');

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`Pass=${tally.pass} Gap=${tally.gap} Fail=${tally.fail}`);
