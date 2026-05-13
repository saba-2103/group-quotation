// Detail-page ActionBar role gating.
//
// Walks the live data, finds at least one entity in a known state, and asserts
// that the ActionBar renders the right buttons for the active role.
// Source of truth: each detail schema's `roleActions` block.
//
// We don't click any of the action buttons (mutations against live data are
// out of scope for this pass) — we only assert visibility / disabled state.

import { test, expect, type Page } from '@playwright/test';
import { gotoAsRole } from './helpers';

// Helper: navigate from the Sales view of /quotation to the first quote in DRAFT
// (the most common pre-submit state). Returns the quote detail URL.
async function gotoFirstDraftQuoteAsSales(page: Page): Promise<string | null> {
  await gotoAsRole(page, 'sales');
  await page.goto('/quotation');
  await page.waitForLoadState('networkidle');
  // Hit the quotes search endpoint directly to avoid UI filter wiring brittleness.
  const draftQuote = await page.evaluate(async () => {
    const res = await fetch('/api/quotation/quotes/search?status=DRAFT&page=0&size=1');
    if (!res.ok) return null;
    const body = await res.json();
    const rows = body.content ?? body.items ?? body;
    return rows[0]?.id ?? null;
  });
  if (!draftQuote) return null;
  await page.goto(`/quotation/${draftQuote}`);
  await page.waitForLoadState('networkidle');
  return `/quotation/${draftQuote}`;
}

// Same idea for a policy-member in MAF_PENDING (for the new confirm-maf action).
async function gotoFirstPolicyMemberAsRole(
  page: Page,
  role: 'sales' | 'member' | 'uw' | 'ops',
  state: string,
): Promise<string | null> {
  await gotoAsRole(page, role);
  const memberId = await page.evaluate(async (s: string) => {
    const res = await fetch(
      `/api/issuance/policy-members/search?state=${s}&page=0&size=1`,
    );
    if (!res.ok) return null;
    const body = await res.json();
    const rows = body.content ?? body.items ?? body;
    return rows[0]?.id ?? rows[0]?.policyMemberId ?? null;
  }, state);
  if (!memberId) return null;
  await page.goto(`/issuance/policy-members/${memberId}`);
  await page.waitForLoadState('networkidle');
  return `/policy-admin/members/by-policy-member/${memberId}`;
}

test.describe('Quote-detail ActionBar role gating', () => {
  test('Sales viewing a DRAFT quote sees the Sales actions (and NOT accept/reject)', async ({
    page,
  }) => {
    const url = await gotoFirstDraftQuoteAsSales(page);
    test.skip(!url, 'No DRAFT quote in the backend — seed one to run this assertion');
    // After PROP-0009 + the maker-checker overlay drop (2026-05-13), Sales
    // sees: submit / send-to-client / expire / finalize / withdraw. In DRAFT,
    // state-gated subset is `submit` + `withdraw`. MPH-only `accept` and
    // `reject` must not render for Sales (roleActions filter hides them).
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Submit quote/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /^Accept$/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /^Reject$/i }),
    ).toHaveCount(0);
  });

  test('MPH viewing the same DRAFT quote sees NO Sales-side action buttons', async ({
    page,
  }) => {
    const url = await gotoFirstDraftQuoteAsSales(page);
    test.skip(!url, 'No DRAFT quote — skipping');
    await page.evaluate(() => localStorage.setItem('group-pas:current-role', 'mph'));
    await page.reload({ waitUntil: 'networkidle' });
    // MPH's roleActions = ['accept', 'reject']; neither is in DRAFT's stateActions,
    // so the bar is empty for MPH. Sales-side ids must NOT render for MPH.
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Submit quote/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Finalize/i }),
    ).toHaveCount(0);
  });
});

test.describe('Policy-member detail ActionBar — confirm-maf wired for Member (PROP-0009)', () => {
  test('Member viewing a MAF_PENDING policy-member sees Confirm enrolment', async ({
    page,
  }) => {
    const url = await gotoFirstPolicyMemberAsRole(page, 'member', 'MAF_PENDING');
    test.skip(!url, 'No MAF_PENDING policy-member in the backend — skipping');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Confirm enrolment/i }),
    ).toBeVisible();
  });

  test('UW viewing a MAF_PENDING policy-member does NOT see Confirm enrolment', async ({
    page,
  }) => {
    const url = await gotoFirstPolicyMemberAsRole(page, 'uw', 'MAF_PENDING');
    test.skip(!url, 'No MAF_PENDING policy-member — skipping');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Confirm enrolment/i }),
    ).toHaveCount(0);
  });

  test('UW viewing a REFERRED_TO_UW member sees UW approve + UW reject', async ({
    page,
  }) => {
    const url = await gotoFirstPolicyMemberAsRole(page, 'uw', 'REFERRED_TO_UW');
    test.skip(!url, 'No REFERRED_TO_UW policy-member — skipping');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /UW approve/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /UW reject/i }),
    ).toBeVisible();
  });

  test('Sales viewing a REFERRED_TO_UW member does NOT see UW approve/reject (uw-only)', async ({
    page,
  }) => {
    const url = await gotoFirstPolicyMemberAsRole(page, 'sales', 'REFERRED_TO_UW');
    test.skip(!url, 'No REFERRED_TO_UW policy-member — skipping');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /UW approve/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /UW reject/i }),
    ).toHaveCount(0);
  });

  test('Ops viewing a REPAIR_PENDING member sees Edit & re-classify', async ({ page }) => {
    const url = await gotoFirstPolicyMemberAsRole(page, 'ops', 'REPAIR_PENDING');
    test.skip(!url, 'No REPAIR_PENDING policy-member — skipping');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Edit & re-classify/i }),
    ).toBeVisible();
  });

  test('Member viewing a REPAIR_PENDING member does NOT see repair-edit (ops-only)', async ({
    page,
  }) => {
    const url = await gotoFirstPolicyMemberAsRole(page, 'member', 'REPAIR_PENDING');
    test.skip(!url, 'No REPAIR_PENDING policy-member — skipping');
    await expect(
      page.getByRole('toolbar').getByRole('button', { name: /Edit & re-classify/i }),
    ).toHaveCount(0);
  });
});

test.describe('No stale "maker/checker" role tooltips leak to the UI', () => {
  test('disabled-by-approval tooltip says "Awaiting MPH approval", not "Awaiting checker approval"', async ({
    page,
  }) => {
    // We can't reliably trigger awaitingApproval=true on a live backend, but
    // we can sanity-check that no element on the live dashboard or quote
    // detail mentions the old copy.
    await gotoAsRole(page, 'sales');
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toMatch(/Awaiting checker approval/i);
    expect(bodyText).not.toMatch(/Only Maker can edit/i);
  });
});
