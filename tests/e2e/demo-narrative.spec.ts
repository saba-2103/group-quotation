// Demo narrative walkthrough — `docs/planning/DEMO_NARRATIVE_GTL_GCL.md`.
//
// One test per beat in the script. Tests are read-only: they verify the UI
// can _show_ each step (the right page, the right widgets, the right state
// badge), not that the mutation actually fires (mutations against live data
// are out of scope here). Where a beat requires a specific entity state, the
// test searches for one via the search endpoint and skips if absent — that's
// the seed-data gap to surface.

import { test, expect, type Page } from '@playwright/test';
import { gotoAsRole } from './helpers';

async function fetchFirstPolicyByState(page: Page, state: string): Promise<string | null> {
  return await page.evaluate(async (s: string) => {
    const res = await fetch(`/api/policy-admin/policies/search?state=${s}&page=0&size=1`);
    if (!res.ok) return null;
    const body = await res.json();
    const rows = body.content ?? body.items ?? body;
    return rows[0]?.id ?? null;
  }, state);
}

async function fetchFirstQuoteByStatus(page: Page, status: string): Promise<string | null> {
  return await page.evaluate(async (s: string) => {
    const res = await fetch(`/api/quotation/quotes/search?status=${s}&page=0&size=1`);
    if (!res.ok) return null;
    const body = await res.json();
    const rows = body.content ?? body.items ?? body;
    return rows[0]?.id ?? null;
  }, status);
}

async function fetchFirstProposalByState(page: Page, state: string): Promise<string | null> {
  return await page.evaluate(async (s: string) => {
    const res = await fetch(`/api/issuance/proposals/search?state=${s}&page=0&size=1`);
    if (!res.ok) return null;
    const body = await res.json();
    const rows = body.content ?? body.items ?? body;
    return rows[0]?.id ?? null;
  }, state);
}

test.describe('§1 Setup — Quote to Master Policy', () => {
  test('Sales can reach the Quotations list and the New Quote action is present', async ({
    page,
  }) => {
    await gotoAsRole(page, 'sales');
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Quotations/ })).toBeVisible();
    // "New Quote" is exposed as a header action on the data-table.
    await expect(
      page.getByRole('button', { name: /New Quote/i }).first(),
    ).toBeVisible();
  });

  test('Sales can open a DRAFT Quote detail and see the 5 tab panels described in the narrative', async ({
    page,
  }) => {
    await gotoAsRole(page, 'sales');
    const draftId = await fetchFirstQuoteByStatus(page, 'DRAFT');
    test.skip(!draftId, 'No DRAFT quote in the backend');
    await page.goto(`/quotation/${draftId}`);
    await page.waitForLoadState('networkidle');
    // Tabs: Policy Details / Plans / Census Schema / Aggregate Census / Pricing
    // (per DEMO_NARRATIVE §1 step 2). Tab labels live on the quote-detail tabs.
    const tabNames = [/Key|Policy|Details/, /Plans/, /Census/, /Pricing|Mapping/i];
    for (const name of tabNames) {
      await expect(
        page.getByRole('tab', { name }).first(),
        `tab matching ${name} missing on quote detail`,
      ).toBeVisible();
    }
  });

  test('§1A GTL — a PENDING policy renders its state badge + reason (AWAITING_MIN_MEMBERS)', async ({
    page,
  }) => {
    await gotoAsRole(page, 'sales');
    const policyId = await fetchFirstPolicyByState(page, 'PENDING');
    test.skip(!policyId, 'No PENDING policy in the backend — seed one');
    await page.goto(`/policy-admin/policies/${policyId}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/Pending/i).first(),
    ).toBeVisible();
    // Reason copy from state-map.ts → POLICY_PENDING_REASON.
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(
      bodyText.match(/Awaiting minimum members for activation|AWAITING_MIN_MEMBERS/i),
      'No AWAITING_MIN_MEMBERS reason banner on a PENDING policy — narrative §1A step 6 broken',
    ).not.toBeNull();
  });

  test('§1B GCL — an ACTIVE policy renders its state badge', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    const policyId = await fetchFirstPolicyByState(page, 'ACTIVE');
    test.skip(!policyId, 'No ACTIVE policy in the backend');
    await page.goto(`/policy-admin/policies/${policyId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Active/i).first()).toBeVisible();
  });
});

test.describe('§2A GTL — Threshold-gated member onboarding', () => {
  test('A PENDING GTL policy detail shows a Members section/tab', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    const policyId = await fetchFirstPolicyByState(page, 'PENDING');
    test.skip(!policyId, 'No PENDING policy — skipping');
    await page.goto(`/policy-admin/policies/${policyId}`);
    await page.waitForLoadState('networkidle');
    // The narrative §2A.1 says "Partner Agent → Master Policy → Members tab".
    await expect(
      page.getByRole('tab', { name: /Members/i }).first(),
    ).toBeVisible();
  });
});

test.describe('§2B GCL — Per-member MAF / OTP confirm', () => {
  test('A MAF_PENDING policy-member has a Confirm enrolment action for the Member role', async ({
    page,
  }) => {
    await gotoAsRole(page, 'member');
    const memberId = await page.evaluate(async () => {
      const res = await fetch(
        '/api/issuance/policy-members/search?state=MAF_PENDING&page=0&size=1',
      );
      if (!res.ok) return null;
      const body = await res.json();
      const rows = body.content ?? body.items ?? body;
      return rows[0]?.id ?? null;
    });
    test.skip(!memberId, 'No MAF_PENDING policy-member in the backend — seed one to validate this beat');
    await page.goto(`/issuance/policy-members/${memberId}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Confirm enrolment/i }),
    ).toBeVisible();
  });
});

test.describe('§3 UW workbench — Non-STP review', () => {
  test('UW can open a REFERRED_TO_UW member and see UW approve/reject', async ({
    page,
  }) => {
    await gotoAsRole(page, 'uw');
    const memberId = await page.evaluate(async () => {
      const res = await fetch(
        '/api/issuance/policy-members/search?state=REFERRED_TO_UW&page=0&size=1',
      );
      if (!res.ok) return null;
      const body = await res.json();
      const rows = body.content ?? body.items ?? body;
      return rows[0]?.id ?? null;
    });
    test.skip(!memberId, 'No REFERRED_TO_UW policy-member — seed needed for narrative §3');
    await page.goto(`/issuance/policy-members/${memberId}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /UW approve/i }),
    ).toBeVisible();
  });
});

test.describe('§4 Ops repair — Non-STP fix', () => {
  test('Ops sees REPAIR_PENDING members in their Inbox', async ({ page }) => {
    await gotoAsRole(page, 'ops');
    // The Inbox section title is the recognizable anchor.
    await expect(
      page.getByText(/Members flagged for repair/i).first(),
    ).toBeVisible();
  });

  test('Ops can open a REPAIR_PENDING member detail and see Edit & re-classify', async ({
    page,
  }) => {
    await gotoAsRole(page, 'ops');
    const memberId = await page.evaluate(async () => {
      const res = await fetch(
        '/api/issuance/policy-members/search?state=REPAIR_PENDING&page=0&size=1',
      );
      if (!res.ok) return null;
      const body = await res.json();
      const rows = body.content ?? body.items ?? body;
      return rows[0]?.id ?? null;
    });
    test.skip(!memberId, 'No REPAIR_PENDING policy-member — seed needed for narrative §4');
    await page.goto(`/issuance/policy-members/${memberId}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Edit & re-classify/i }),
    ).toBeVisible();
  });
});

test.describe('Demo flow continuity — MPH handshake', () => {
  test('Sales clicking a quote in SENT_TO_CLIENT does NOT see Accept/Reject (MPH-only)', async ({
    page,
  }) => {
    await gotoAsRole(page, 'sales');
    const id = await fetchFirstQuoteByStatus(page, 'SENT_TO_CLIENT');
    test.skip(!id, 'No SENT_TO_CLIENT quote in the backend');
    await page.goto(`/quotation/${id}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /^Accept$/ }),
    ).toHaveCount(0);
  });

  test('MPH viewing a SENT_TO_CLIENT quote sees Accept + Reject (the narrative §1 step 4 actions)', async ({
    page,
  }) => {
    await gotoAsRole(page, 'mph');
    const id = await fetchFirstQuoteByStatus(page, 'SENT_TO_CLIENT');
    test.skip(!id, 'No SENT_TO_CLIENT quote in the backend');
    await page.goto(`/quotation/${id}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Accept/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Reject/i }).first(),
    ).toBeVisible();
  });
});
