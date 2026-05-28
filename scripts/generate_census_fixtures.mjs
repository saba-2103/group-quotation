#!/usr/bin/env node
// Generates large census fixtures for manual bulk-upload testing.
//
// Output files (under tests/e2e/fixtures/):
//   - census-gtl-big-mixed.csv   200 rows, 180 valid + 20 intentional errors
//   - census-gcl-big-mixed.csv   200 rows, 180 valid + 20 intentional errors
//   - census-gtl-big-clean.csv   200 valid rows
//   - census-gcl-big-clean.csv   200 valid rows
//
// Deterministic — re-running yields byte-identical output (seeded PRNG, fixed pools).
// Re-run via `node scripts/generate_census_fixtures.mjs` whenever the pools or schema change.

import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'tests', 'e2e', 'fixtures');

// Deterministic LCG. Same seed → same sequence on every run.
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohit', 'Sneha', 'Vikram', 'Anjali', 'Karan', 'Neha',
  'Devika', 'Sundar', 'Raghav', 'Meera', 'Arjun', 'Pooja', 'Sahil', 'Ritika',
  'Amit', 'Divya', 'Manav', 'Tara', 'Yash', 'Kavya', 'Nikhil', 'Aditi',
  'Pranav', 'Ishita', 'Rahul', 'Shreya', 'Aniket', 'Sara', 'Tanvi', 'Harsh',
  'Riya', 'Aryan', 'Lavanya', 'Dhruv', 'Trisha', 'Ayaan', 'Pari', 'Kabir',
];
const LAST_NAMES = [
  'Mehta', 'Iyer', 'Sharma', 'Kapoor', 'Khan', 'Rao', 'Pillai', 'Nair',
  'Joshi', 'Bansal', 'Singh', 'Patel', 'Reddy', 'Gupta', 'Verma', 'Saxena',
  'Banerjee', 'Chatterjee', 'Mukherjee', 'Sen', 'Das', 'Bose', 'Roy',
  'Kulkarni', 'Deshpande', 'Naidu', 'Krishnan', 'Subramanian', 'Menon',
];
const OCCUPATIONS_GTL = [
  'Software Engineer', 'Product Manager', 'Data Analyst', 'Designer',
  'QA Engineer', 'Project Manager', 'HR Business Partner', 'Finance Analyst',
  'DevOps Engineer', 'Customer Success', 'Sales Associate', 'Marketing Manager',
  'Solutions Architect', 'Engineering Manager', 'Operations Lead',
];
const OCCUPATIONS_GCL = [
  'Loan Officer', 'Branch Manager', 'Credit Analyst', 'Mortgage Specialist',
  'Personal Banker', 'Relationship Manager', 'Recovery Agent', 'Underwriter',
  'Customer Service Executive', 'Operations Associate', 'Compliance Officer',
];

function genRow(rng, idx, prefix, occupations, planChoices) {
  const memberId = `${prefix}-${String(idx).padStart(4, '0')}`;
  const planNo = pick(rng, planChoices);
  const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
  const year = 1965 + Math.floor(rng() * 35); // 1965..1999
  const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0');
  const dob = `${year}-${month}-${day}`;
  const gender = rng() < 0.5 ? 'M' : 'F';
  const salary = 600_000 + Math.floor(rng() * 2_400_000); // 6L..30L
  const occupation = pick(rng, occupations);
  const sumInsured = salary * (2 + Math.floor(rng() * 3)); // 2x..4x salary
  return { memberId, planNo, name, dob, gender, salary, occupation, sumInsured };
}

function corruptRow(row, kind, variantIndex) {
  const r = { ...row };
  switch (kind) {
    case 'bad-dob':
      // Slashed format with 2-digit year — backend's ROW_DOB_FMT.
      r.dob = `${r.dob.slice(8)}/${r.dob.slice(5, 7)}/${r.dob.slice(2, 4)}`;
      break;
    case 'bad-salary': {
      // No commas — embedded commas would break the row-shape rather than
      // exercise salary-numeric validation specifically.
      const variants = ['twelvelakh', 'N/A', '1.2L', 'TBD', 'unknown'];
      r.salary = variants[variantIndex % variants.length];
      break;
    }
    case 'unknown-plan':
      r.planNo = 'PLAN-XYZ';
      break;
    case 'missing-name':
      r.name = '';
      break;
    case 'duplicate-id':
      // Caller assigns the colliding id explicitly.
      break;
  }
  return r;
}

function toCsv(rows) {
  const header = 'memberId,planNo,name,dob,gender,salary,occupation,sumInsured';
  const lines = rows.map(
    (r) =>
      `${r.memberId},${r.planNo},${r.name},${r.dob},${r.gender},${r.salary},${r.occupation},${r.sumInsured}`,
  );
  return [header, ...lines].join('\n') + '\n';
}

function build({ seed, count, prefix, occupations, planChoices, errors }) {
  const rng = makeRng(seed);
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push(genRow(rng, i, prefix, occupations, planChoices));
  }
  if (!errors) return rows;

  // Sprinkle a fixed mix of intentional errors at predictable row numbers so
  // the manual test script can call them out individually.
  const errorPlan = [
    { row: 7, kind: 'bad-dob' },
    { row: 19, kind: 'bad-dob' },
    { row: 33, kind: 'bad-dob' },
    { row: 51, kind: 'bad-dob' },
    { row: 77, kind: 'bad-dob' },
    { row: 12, kind: 'bad-salary' },
    { row: 41, kind: 'bad-salary' },
    { row: 88, kind: 'bad-salary' },
    { row: 122, kind: 'bad-salary' },
    { row: 161, kind: 'bad-salary' },
    { row: 25, kind: 'unknown-plan' },
    { row: 64, kind: 'unknown-plan' },
    { row: 111, kind: 'unknown-plan' },
    { row: 188, kind: 'unknown-plan' },
    { row: 49, kind: 'missing-name' },
    { row: 103, kind: 'missing-name' },
    { row: 175, kind: 'missing-name' },
    { row: 90, kind: 'duplicate-id', copyOf: 7 },
    { row: 145, kind: 'duplicate-id', copyOf: 19 },
    { row: 199, kind: 'duplicate-id', copyOf: 33 },
  ];

  let saltyIdx = 0;
  for (const e of errorPlan) {
    const idx = e.row - 1;
    if (e.kind === 'duplicate-id') {
      rows[idx].memberId = rows[e.copyOf - 1].memberId;
    } else if (e.kind === 'bad-salary') {
      rows[idx] = corruptRow(rows[idx], e.kind, saltyIdx++);
    } else {
      rows[idx] = corruptRow(rows[idx], e.kind, 0);
    }
  }
  return rows;
}

function writeFile(name, rows) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const fullPath = path.join(OUT_DIR, name);
  fs.writeFileSync(fullPath, toCsv(rows));
  console.log(`  wrote ${fullPath}  (${rows.length} rows)`);
}

console.log('Generating census fixtures…');

writeFile(
  'census-gtl-big-clean.csv',
  build({
    seed: 1,
    count: 200,
    prefix: 'GTL',
    occupations: OCCUPATIONS_GTL,
    planChoices: ['P1', 'P2'],
    errors: false,
  }),
);

writeFile(
  'census-gtl-big-mixed.csv',
  build({
    seed: 2,
    count: 200,
    prefix: 'GTL',
    occupations: OCCUPATIONS_GTL,
    planChoices: ['P1', 'P2'],
    errors: true,
  }),
);

writeFile(
  'census-gcl-big-clean.csv',
  build({
    seed: 3,
    count: 200,
    prefix: 'GCL',
    occupations: OCCUPATIONS_GCL,
    planChoices: ['P1', 'P2'],
    errors: false,
  }),
);

writeFile(
  'census-gcl-big-mixed.csv',
  build({
    seed: 4,
    count: 200,
    prefix: 'GCL',
    occupations: OCCUPATIONS_GCL,
    planChoices: ['P1', 'P2'],
    errors: true,
  }),
);

console.log('Done.');
