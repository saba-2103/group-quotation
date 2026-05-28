// Phase B — State-matrix seeder.
//
// Drives the portal (no API calls) to leave entities in specific workflow
// states so QA can browse each state through every role. SEED_COUNT
// controls how many copies per state (default 3). Each iteration is
// intentionally truncated at the desired stage:
//
//   Quote DRAFT                — create only
//   Quote SENT_TO_CLIENT       — through Sales submit
//   Quote ACCEPTED             — MPH accept
//   Proposal DRAFT             — Quote.finalize, leave proposal alone
//   Policy PENDING (GTL)       — finalize proposal, no census
//   Policy ACTIVE (GCL, empty) — finalize proposal, no census
//   PolicyMember MAF_PENDING   — GCL census, no OTP
//   PolicyMember REFERRED_TO_UW — census with "force UW" rows
//   PolicyMember REPAIR_PENDING — census with malformed rows
//   PolicyMember ACTIVE        — GCL full path
//
// Each iteration appends one row to playwright-report/seeded-entities.jsonl
// which scripts/render-seeded-state.ts compiles into SEEDED_STATE_<date>.md.

import { test } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  createQuote,
  submitAndSendToClient,
  mphAccept,
  finalizeQuote,
  finalizeProposal,
  uploadCensus,
  confirmMaf,
  switchRole,
  type Lob,
} from './helpers/portal-actions';
import { gotoAsRole } from './helpers';

const SEED_COUNT = Number(process.env.SEED_COUNT ?? '3');
const OUT = path.resolve(process.cwd(), 'playwright-report', 'seeded-entities.jsonl');
mkdirSync(path.dirname(OUT), { recursive: true });

interface SeedRow {
  kind: 'quote' | 'proposal' | 'policy' | 'policy-member';
  state: string;
  id: string;
  lob?: Lob;
  note?: string;
  ts: string;
}

function record(row: Omit<SeedRow, 'ts'>): void {
  appendFileSync(OUT, `${JSON.stringify({ ...row, ts: new Date().toISOString() })}\n`, 'utf8');
}

test.describe.configure({ mode: 'serial' });

test.describe(`Seed ${SEED_COUNT} entities per workflow state`, () => {
  for (let i = 0; i < SEED_COUNT; i += 1) {
    test(`#${i + 1}: Quote DRAFT (GTL)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GTL');
      record({ kind: 'quote', state: 'DRAFT', id: quoteId, lob: 'GTL' });
    });

    test(`#${i + 1}: Quote DRAFT (GCL)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GCL');
      record({ kind: 'quote', state: 'DRAFT', id: quoteId, lob: 'GCL' });
    });

    test(`#${i + 1}: Quote SENT_TO_CLIENT (GTL)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GTL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const r = await submitAndSendToClient(page);
      record({
        kind: 'quote',
        state: r.sent ? 'SENT_TO_CLIENT' : r.submitted ? 'SUBMITTED' : 'DRAFT',
        id: quoteId,
        lob: 'GTL',
        note: r.note,
      });
    });

    test(`#${i + 1}: Quote ACCEPTED + Proposal DRAFT + Policy PENDING (GTL)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GTL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const submit = await submitAndSendToClient(page);
      if (!submit.sent) {
        record({ kind: 'quote', state: submit.submitted ? 'SUBMITTED' : 'DRAFT', id: quoteId, lob: 'GTL', note: submit.note });
        return;
      }
      await switchRole(page, 'mph');
      const acc = await mphAccept(page, quoteId);
      record({ kind: 'quote', state: acc.accepted ? 'ACCEPTED' : 'SENT_TO_CLIENT', id: quoteId, lob: 'GTL', note: acc.note });
      if (!acc.accepted) return;
      await switchRole(page, 'sales');
      const fin = await finalizeQuote(page, quoteId);
      if (fin.proposalId) record({ kind: 'proposal', state: 'DRAFT', id: fin.proposalId, lob: 'GTL', note: fin.note });
      if (!fin.proposalId) return;
      const fp = await finalizeProposal(page, fin.proposalId);
      if (fp.policyId) record({ kind: 'policy', state: 'PENDING', id: fp.policyId, lob: 'GTL', note: fp.note });
    });

    test(`#${i + 1}: Policy ACTIVE (GCL, empty)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GCL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const submit = await submitAndSendToClient(page);
      if (!submit.sent) {
        record({ kind: 'quote', state: submit.submitted ? 'SUBMITTED' : 'DRAFT', id: quoteId, lob: 'GCL', note: submit.note });
        return;
      }
      await switchRole(page, 'mph');
      const acc = await mphAccept(page, quoteId);
      if (!acc.accepted) {
        record({ kind: 'quote', state: 'SENT_TO_CLIENT', id: quoteId, lob: 'GCL', note: acc.note });
        return;
      }
      await switchRole(page, 'sales');
      const fin = await finalizeQuote(page, quoteId);
      if (!fin.proposalId) {
        record({ kind: 'quote', state: 'ACCEPTED', id: quoteId, lob: 'GCL', note: fin.note });
        return;
      }
      const fp = await finalizeProposal(page, fin.proposalId);
      record({
        kind: 'policy',
        state: fp.policyId ? 'ACTIVE' : 'PENDING',
        id: fp.policyId ?? fin.proposalId,
        lob: 'GCL',
        note: fp.note,
      });
    });

    test(`#${i + 1}: PolicyMember MAF_PENDING (GCL census)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GCL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const submit = await submitAndSendToClient(page);
      if (!submit.sent) {
        record({ kind: 'quote', state: 'DRAFT', id: quoteId, lob: 'GCL', note: submit.note });
        return;
      }
      await switchRole(page, 'mph');
      const acc = await mphAccept(page, quoteId);
      if (!acc.accepted) return;
      await switchRole(page, 'sales');
      const fin = await finalizeQuote(page, quoteId);
      if (!fin.proposalId) return;
      await finalizeProposal(page, fin.proposalId);
      await switchRole(page, 'partner_agent');
      const up = await uploadCensus(page, fin.proposalId, 'census-gcl.csv', 'STANDARD_GCL');
      record({ kind: 'policy-member', state: up.uploaded ? 'MAF_PENDING' : 'NOT_CREATED', id: fin.proposalId, lob: 'GCL', note: up.note });
    });

    test(`#${i + 1}: PolicyMember REFERRED_TO_UW (force-UW census)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GTL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const submit = await submitAndSendToClient(page);
      if (!submit.sent) return;
      await switchRole(page, 'mph');
      const acc = await mphAccept(page, quoteId);
      if (!acc.accepted) return;
      await switchRole(page, 'sales');
      const fin = await finalizeQuote(page, quoteId);
      if (!fin.proposalId) return;
      await finalizeProposal(page, fin.proposalId);
      await switchRole(page, 'partner_agent');
      const up = await uploadCensus(page, fin.proposalId, 'census-with-uw-row.csv', 'STANDARD_GTL');
      record({ kind: 'policy-member', state: up.uploaded ? 'REFERRED_TO_UW' : 'NOT_CREATED', id: fin.proposalId, lob: 'GTL', note: up.note });
    });

    test(`#${i + 1}: PolicyMember REPAIR_PENDING (malformed census)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GTL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const submit = await submitAndSendToClient(page);
      if (!submit.sent) return;
      await switchRole(page, 'mph');
      const acc = await mphAccept(page, quoteId);
      if (!acc.accepted) return;
      await switchRole(page, 'sales');
      const fin = await finalizeQuote(page, quoteId);
      if (!fin.proposalId) return;
      await finalizeProposal(page, fin.proposalId);
      await switchRole(page, 'partner_agent');
      const up = await uploadCensus(page, fin.proposalId, 'census-with-repair-row.csv', 'STANDARD_GTL');
      record({ kind: 'policy-member', state: up.uploaded ? 'REPAIR_PENDING' : 'NOT_CREATED', id: fin.proposalId, lob: 'GTL', note: up.note });
    });

    test(`#${i + 1}: PolicyMember ACTIVE (GCL full path with OTP)`, async ({ page }) => {
      await gotoAsRole(page, 'sales');
      const { quoteId } = await createQuote(page, 'GCL');
      await page.goto(`/quotation/${quoteId}`);
      await page.waitForLoadState('networkidle');
      const submit = await submitAndSendToClient(page);
      if (!submit.sent) return;
      await switchRole(page, 'mph');
      const acc = await mphAccept(page, quoteId);
      if (!acc.accepted) return;
      await switchRole(page, 'sales');
      const fin = await finalizeQuote(page, quoteId);
      if (!fin.proposalId) return;
      await finalizeProposal(page, fin.proposalId);
      await switchRole(page, 'partner_agent');
      await uploadCensus(page, fin.proposalId, 'census-gcl.csv', 'STANDARD_GCL');
      await switchRole(page, 'member');
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const row = page.getByRole('row').filter({ hasNotText: /header|Action|Member ref/i }).first();
      if (!(await row.isVisible().catch(() => false))) {
        record({ kind: 'policy-member', state: 'MAF_PENDING', id: fin.proposalId, lob: 'GCL', note: 'no member-inbox rows visible' });
        return;
      }
      await row.click();
      await page.waitForLoadState('networkidle');
      const r = await confirmMaf(page);
      record({ kind: 'policy-member', state: r.confirmed ? 'ACTIVE' : 'MAF_PENDING', id: fin.proposalId, lob: 'GCL', note: r.note });
    });
  }
});
