// Tiny coverage recorder shared by the narrative walkthrough specs.
//
// Each call to `recordBeat()` appends one JSONL line to
// `playwright-report/narrative-beats.jsonl`. The companion script
// `scripts/render-narrative-coverage.ts` aggregates that file into a
// Markdown report. Splitting the writer (per-worker, parallel-safe) from
// the renderer (one-shot) keeps the test code simple and avoids fs races.

import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'playwright-report');
const OUT_FILE = path.join(OUT_DIR, 'narrative-beats.jsonl');

let ensured = false;
function ensureDir(): void {
  if (ensured) return;
  mkdirSync(OUT_DIR, { recursive: true });
  ensured = true;
}

export type Lob = 'GTL' | 'GCL';
export type Outcome = 'pass' | 'fail' | 'gap';

export interface BeatRecord {
  lob: Lob;
  beat: string;
  description: string;
  outcome: Outcome;
  note?: string;
  ts: string;
}

export function recordBeat(
  lob: Lob,
  beat: string,
  description: string,
  outcome: Outcome,
  note?: string,
): void {
  ensureDir();
  const rec: BeatRecord = {
    lob,
    beat,
    description,
    outcome,
    note,
    ts: new Date().toISOString(),
  };
  appendFileSync(OUT_FILE, `${JSON.stringify(rec)}\n`, 'utf8');
}
