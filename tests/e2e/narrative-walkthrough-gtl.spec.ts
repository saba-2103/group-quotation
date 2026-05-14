// Phase A — GTL walkthrough.
//
// Each test is one beat from docs/planning/DEMO_NARRATIVE_GTL_GCL.md. Tests
// share state through `state` and run in declared order (serial). When a
// beat blocks on a portal gap (button missing/disabled, no inbox rows,
// etc.) we record the gap via `recordBeat` and continue with whatever the
// next beat can do — we do NOT use `test.skip` because the goal of this
// suite is to *measure* how walkable the narrative is end-to-end.

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
  switchRole,
} from './helpers/portal-actions';
import { gotoAsRole } from './helpers';
import { recordBeat } from './lib/coverage';

const state: {
  quoteId?: string;
  proposalId?: string;
  policyId?: string;
} = {};

test.describe('GTL walkthrough — narrative §1 / §1A / §2A', () => {
  test.describe.configure({ mode: 'serial' });
  test('beat 1.1 — Sales opens /quotation and sees New Quote', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');
    const newQuoteBtn = page.getByRole('button', { name: /New Quote/i }).first();
    const visible = await newQuoteBtn.isVisible().catch(() => false);
    recordBeat('GTL', '1.1', 'Sales reaches /quotation and sees New Quote', visible ? 'pass' : 'fail', visible ? undefined : '"New Quote" button missing');
    expect(visible).toBeTruthy();
  });

  test('beat 1.2 — Sales creates a GTL DRAFT quote via the modal', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    try {
      const r = await createQuote(page, 'GTL');
      state.quoteId = r.quoteId;
      recordBeat('GTL', '1.2', 'Create GTL DRAFT quote via modal', 'pass', `quoteId=${r.quoteId}`);
    } catch (e) {
      recordBeat('GTL', '1.2', 'Create GTL DRAFT quote via modal', 'gap', (e as Error).message);
      throw e;
    }
  });

  test('beat 1.3 — Quote detail exposes all 5 tabs', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId — prior beat blocked');
    await gotoAsRole(page, 'sales');
    await page.goto(`/quotation/${state.quoteId}`);
    await page.waitForLoadState('networkidle');
    const tabs = await visitAllQuoteTabs(page);
    const ok = tabs.length === 5;
    recordBeat('GTL', '1.3', '5 tabs present on quote detail', ok ? 'pass' : 'gap', `tabs found: ${tabs.join(', ')}`);
    expect(tabs.length).toBeGreaterThanOrEqual(4);
  });

  test('beat 1.4 — Request Pricing returns a premium', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await gotoAsRole(page, 'sales');
    await page.goto(`/quotation/${state.quoteId}`);
    await page.waitForLoadState('networkidle');
    const r = await requestPricing(page);
    const outcome = r.success ? 'pass' : 'gap';
    recordBeat('GTL', '1.4', 'Request Pricing returns a premium', outcome, r.note);
  });

  test('beat 1.5 — Sales submits and sends to client', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await gotoAsRole(page, 'sales');
    await page.goto(`/quotation/${state.quoteId}`);
    await page.waitForLoadState('networkidle');
    const r = await submitAndSendToClient(page);
    const outcome = r.submitted && r.sent ? 'pass' : 'gap';
    recordBeat('GTL', '1.5', 'Submit and Send to Client', outcome, r.note);
  });

  test('beat 1.6 — MPH accepts the quote', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await switchRole(page, 'mph');
    const r = await mphAccept(page, state.quoteId!);
    recordBeat('GTL', '1.6', 'MPH accepts the quote', r.accepted ? 'pass' : 'gap', r.note);
  });

  test('beat 1.7 — Sales finalizes quote → proposal created', async ({ page }) => {
    test.skip(!state.quoteId, 'no quoteId');
    await switchRole(page, 'sales');
    const r = await finalizeQuote(page, state.quoteId!);
    if (r.proposalId) state.proposalId = r.proposalId;
    const outcome = r.finalized && r.proposalId ? 'pass' : r.finalized ? 'gap' : 'fail';
    recordBeat('GTL', '1.7', 'Quote.finalize creates a Proposal', outcome, r.note ?? (r.proposalId ? `proposalId=${r.proposalId}` : undefined));
  });

  test('beat 1.8 — Sales finalizes proposal → policy created', async ({ page }) => {
    test.skip(!state.proposalId, 'no proposalId');
    await switchRole(page, 'sales');
    const r = await finalizeProposal(page, state.proposalId!);
    if (r.policyId) state.policyId = r.policyId;
    const outcome = r.finalized && r.policyId ? 'pass' : r.finalized ? 'gap' : 'fail';
    recordBeat('GTL', '1.8', 'Proposal.finalize creates a Policy', outcome, r.note ?? (r.policyId ? `policyId=${r.policyId}` : undefined));
  });

  test('beat 1A.1 — GTL Policy lands in PENDING with AWAITING_MIN_MEMBERS', async ({ page }) => {
    test.skip(!state.policyId, 'no policyId');
    await switchRole(page, 'sales');
    await openPolicyDetail(page, state.policyId!);
    const s = await readPolicyState(page);
    const ok = /pending/i.test(s.badgeText ?? '') && s.hasReasonAwaitingMinMembers;
    recordBeat(
      'GTL',
      '1A.1',
      'PENDING badge + AWAITING_MIN_MEMBERS reason on Master Policy',
      ok ? 'pass' : 'gap',
      `badge=${s.badgeText} reason=${s.hasReasonAwaitingMinMembers} counter=${s.hasThresholdCounter}`,
    );
  });

  test('beat 2A.1 — Partner Agent opens Members tab and uploads census', async ({ page }) => {
    test.skip(!state.proposalId, 'no proposalId');
    await switchRole(page, 'partner_agent');
    const r = await uploadCensus(page, state.proposalId!, 'census-gtl.csv', 'STANDARD_GTL');
    recordBeat('GTL', '2A.1', 'Partner Agent uploads census on GTL', r.uploaded ? 'pass' : 'gap', r.note);
  });

  test('beat 2A.2 — STP members appear PENDING_POLICY_ACTIVATION on the policy', async ({ page }) => {
    test.skip(!state.policyId, 'no policyId');
    await switchRole(page, 'sales');
    await openPolicyDetail(page, state.policyId!);
    const tab = page.getByRole('tab', { name: /Members/i }).first();
    const visible = await tab.isVisible().catch(() => false);
    if (visible) await tab.click();
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerText);
    const ok = /PENDING_POLICY_ACTIVATION|Pending policy activation|Pending/i.test(body);
    recordBeat(
      'GTL',
      '2A.2',
      'STP members visible as pending policy activation',
      ok ? 'pass' : 'gap',
      ok ? undefined : 'no PENDING_POLICY_ACTIVATION rows in Members tab',
    );
  });

});

// Independent reachability checks — don't depend on the linear story above
// so they still run if the setup chain breaks early.
test.describe('GTL workbench reachability — narrative §3 / §4', () => {
  test('beat 3 — UW workbench: open a referred member and approve', async ({ page }) => {
    await switchRole(page, 'uw');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const inbox = page.getByText(/Members referred for review|Referred to UW/i).first();
    if (!(await inbox.isVisible().catch(() => false))) {
      recordBeat('GTL', '3', 'UW workbench shows referred members', 'gap', 'UW inbox section not visible');
      return;
    }
    // Click first row.
    const row = page.getByRole('row').filter({ hasNotText: /header|Action|Member ref/i }).first();
    if (!(await row.isVisible().catch(() => false))) {
      recordBeat('GTL', '3', 'UW workbench shows referred members', 'gap', 'No REFERRED_TO_UW rows');
      return;
    }
    await row.click();
    await page.waitForLoadState('networkidle');
    const btn = page.getByRole('button', { name: /^UW approve$/i }).first();
    const ok = await btn.isVisible().catch(() => false);
    recordBeat('GTL', '3', 'UW approve action reachable', ok ? 'pass' : 'gap', ok ? undefined : 'detail route stripped UW actions (PROP-0010 gap)');
  });

  test('beat 4 — Ops repair: open a repair member and submit fix', async ({ page }) => {
    await switchRole(page, 'ops');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const inbox = page.getByText(/Members flagged for repair|Repair pending/i).first();
    if (!(await inbox.isVisible().catch(() => false))) {
      recordBeat('GTL', '4', 'Ops workbench shows repair members', 'gap', 'Ops inbox section not visible');
      return;
    }
    const row = page.getByRole('row').filter({ hasNotText: /header|Action|Member ref/i }).first();
    if (!(await row.isVisible().catch(() => false))) {
      recordBeat('GTL', '4', 'Ops workbench shows repair members', 'gap', 'No REPAIR_PENDING rows');
      return;
    }
    await row.click();
    await page.waitForLoadState('networkidle');
    const btn = page.getByRole('button', { name: /Edit & re-classify/i }).first();
    const ok = await btn.isVisible().catch(() => false);
    recordBeat('GTL', '4', 'Ops "Edit & re-classify" reachable', ok ? 'pass' : 'gap');
  });
});
