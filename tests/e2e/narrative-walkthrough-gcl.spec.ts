// Phase A — GCL walkthrough.
//
// Mirror of the GTL spec. Beats §1B (lands ACTIVE), §2B (per-member MAF /
// OTP), and the shared §3 / §4 paths.

import { test, expect } from '@playwright/test';
import {
  createQuote,
  visitAllQuoteTabs,
  requestPricing,
  submitAndSendToClient,
  mphAccept,
  finalizeQuote,
  finalizeProposal,
  openPolicyDetail,
  readPolicyState,
  uploadCensus,
  confirmMaf,
  switchRole,
} from './helpers/portal-actions';
import { gotoAsRole } from './helpers';
import { recordBeat } from './lib/coverage';

const state: {
  quoteId?: string;
  proposalId?: string;
  policyId?: string;
} = {};

test.describe('GCL walkthrough — narrative §1 / §1B / §2B', () => {
  test.describe.configure({ mode: 'serial' });
  test('beat 1.1 — Sales reaches /quotation', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');
    const ok = await page.getByRole('button', { name: /New Quote/i }).first().isVisible().catch(() => false);
    recordBeat('GCL', '1.1', 'Sales reaches /quotation', ok ? 'pass' : 'fail');
    expect(ok).toBeTruthy();
  });

  test('beat 1.2 — Sales creates a GCL DRAFT quote', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    try {
      const r = await createQuote(page, 'GCL');
      state.quoteId = r.quoteId;
      recordBeat('GCL', '1.2', 'Create GCL DRAFT quote', 'pass', `quoteId=${r.quoteId}`);
    } catch (e) {
      recordBeat('GCL', '1.2', 'Create GCL DRAFT quote', 'gap', (e as Error).message);
      throw e;
    }
  });

  test('beat 1.3 — Quote detail tabs render', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await gotoAsRole(page, 'sales');
    await page.goto(`/quotation/${state.quoteId}`);
    await page.waitForLoadState('networkidle');
    const tabs = await visitAllQuoteTabs(page);
    recordBeat('GCL', '1.3', '5 tabs render on GCL quote detail', tabs.length === 5 ? 'pass' : 'gap', `tabs found: ${tabs.join(', ')}`);
  });

  test('beat 1.4 — Request Pricing returns a premium', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await gotoAsRole(page, 'sales');
    await page.goto(`/quotation/${state.quoteId}`);
    await page.waitForLoadState('networkidle');
    const r = await requestPricing(page);
    recordBeat('GCL', '1.4', 'Request Pricing returns a premium', r.success ? 'pass' : 'gap', r.note);
  });

  test('beat 1.5 — Submit and Send to Client', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await gotoAsRole(page, 'sales');
    await page.goto(`/quotation/${state.quoteId}`);
    await page.waitForLoadState('networkidle');
    const r = await submitAndSendToClient(page);
    recordBeat('GCL', '1.5', 'Submit and Send to Client', r.submitted && r.sent ? 'pass' : 'gap', r.note);
  });

  test('beat 1.6 — MPH accepts', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await switchRole(page, 'mph');
    const r = await mphAccept(page, state.quoteId!);
    recordBeat('GCL', '1.6', 'MPH accepts the GCL quote', r.accepted ? 'pass' : 'gap', r.note);
  });

  test('beat 1.7 — Quote.finalize creates a Proposal', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await switchRole(page, 'sales');
    const r = await finalizeQuote(page, state.quoteId!);
    if (r.proposalId) state.proposalId = r.proposalId;
    recordBeat('GCL', '1.7', 'Quote.finalize creates a GCL Proposal', r.finalized && r.proposalId ? 'pass' : 'gap', r.note);
  });

  test('beat 1.8 — Proposal.finalize creates a Policy', async ({ page }) => {
    test.skip(!state.proposalId, 'no proposalId');
    await switchRole(page, 'sales');
    const r = await finalizeProposal(page, state.proposalId!);
    if (r.policyId) state.policyId = r.policyId;
    recordBeat('GCL', '1.8', 'Proposal.finalize creates a GCL Policy', r.finalized && r.policyId ? 'pass' : 'gap', r.note);
  });

  test('beat 1B.1 — GCL Policy lands in ACTIVE immediately', async ({ page }) => {
    test.skip(!state.policyId, 'no policyId');
    await switchRole(page, 'sales');
    await openPolicyDetail(page, state.policyId!);
    const s = await readPolicyState(page);
    const ok = /active/i.test(s.badgeText ?? '');
    recordBeat(
      'GCL',
      '1B.1',
      'GCL Policy lands ACTIVE, no threshold counter',
      ok && !s.hasThresholdCounter ? 'pass' : 'gap',
      `badge=${s.badgeText} counter=${s.hasThresholdCounter}`,
    );
  });

  test('beat 2B.1 — Partner Agent uploads census, members go MAF_PENDING', async ({ page }) => {
    test.skip(!state.proposalId, 'no proposalId');
    await switchRole(page, 'partner_agent');
    const r = await uploadCensus(page, state.proposalId!, 'census-gcl.csv', 'STANDARD_GCL');
    recordBeat('GCL', '2B.1', 'Census upload on GCL → MAF_PENDING members', r.uploaded ? 'pass' : 'gap', r.note);
  });

});

// Independent reachability check — doesn't depend on the linear story.
test.describe('GCL workbench reachability — narrative §2B', () => {
  test('beat 2B.2 — Member confirms enrolment', async ({ page }) => {
    await switchRole(page, 'member');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const inbox = page.getByText(/Confirm your enrolment|MAF pending/i).first();
    if (!(await inbox.isVisible().catch(() => false))) {
      recordBeat('GCL', '2B.2', 'Member confirm-enrolment reachable', 'gap', 'Member inbox section not visible');
      return;
    }
    const row = page.getByRole('row').filter({ hasNotText: /header|Action|Member ref/i }).first();
    if (!(await row.isVisible().catch(() => false))) {
      recordBeat('GCL', '2B.2', 'Member confirm-enrolment reachable', 'gap', 'No MAF_PENDING rows for Member');
      return;
    }
    await row.click();
    await page.waitForLoadState('networkidle');
    const r = await confirmMaf(page);
    recordBeat('GCL', '2B.2', 'Member confirm-enrolment reachable', r.confirmed ? 'pass' : 'gap', r.note);
  });
});
