// Interaction tests — the confrontational layer.
//
// Read-mostly tests miss whole classes of bugs: a button that's rendered but
// crashes on click, a tab that throws when activated, a form-modal that
// renders outside RoleProvider. This suite drives the UI as a user would —
// clicking, switching tabs, opening modals — and fails on ANY page-error or
// 4xx/5xx during the interaction.
//
// The signal we care about is `page.on('pageerror')` and HTTP >= 400 — those
// are uncaught exceptions and broken backend calls, the kinds of regressions
// that reach humans before tests do.

import { test, expect, type Page, type Request, type Response } from '@playwright/test';
import { gotoAsRole, ROLES, type Role } from './helpers';

interface ErrorLog {
  errors: string[];
  failedRequests: string[];
}

// Install error capture hooks before any interaction. Returns mutating arrays
// so callers can assert on them after their interaction completes.
function captureErrors(page: Page): ErrorLog {
  const log: ErrorLog = { errors: [], failedRequests: [] };
  page.on('pageerror', (err) => {
    // Uncaught exceptions thrown during render or event handlers. ALWAYS a bug.
    log.errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Chromium emits a synthetic "Failed to load resource" console.error for
    // every HTTP >= 400. We already track those via the `response` listener
    // below; ignore this duplicate message to avoid double-counting.
    if (text.startsWith('Failed to load resource')) return;
    log.errors.push(`console.error: ${text}`);
  });
  page.on('response', (resp: Response) => {
    const status = resp.status();
    // 4xx-5xx on app routes are bugs. We exclude 4xx on the dev backend's
    // optional endpoints (e.g. /api/dev/reset) to avoid noise.
    if (status >= 400) {
      const url = resp.url();
      if (url.includes('/api/dev/')) return;
      log.failedRequests.push(`HTTP ${status} ${resp.request().method()} ${url}`);
    }
  });
  page.on('requestfailed', (req: Request) => {
    const errText = req.failure()?.errorText ?? '';
    // `net::ERR_ABORTED` is what Chromium reports when a navigation cancels
    // an in-flight request. This happens naturally when our test helpers do
    // back-to-back goto()s (e.g. setRole reload then page.goto). It's NOT a
    // product bug, so we filter it out — anything else is real.
    if (errText.includes('ERR_ABORTED')) return;
    log.failedRequests.push(`requestfailed ${req.method()} ${req.url()} — ${errText}`);
  });
  return log;
}

function assertClean(log: ErrorLog, where: string) {
  // Combined assertion so a single failure surfaces both kinds of issue.
  expect(
    log.errors,
    `${where}: page errors / console errors:\n  ${log.errors.join('\n  ')}`,
  ).toHaveLength(0);
  expect(
    log.failedRequests,
    `${where}: failed requests:\n  ${log.failedRequests.join('\n  ')}`,
  ).toHaveLength(0);
}

test.describe('Clicking primary CTAs does not crash the page', () => {
  test('Sales clicking "New Quote" on /quotation opens the create form without errors', async ({
    page,
  }) => {
    const log = captureErrors(page);
    await gotoAsRole(page, 'sales');
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /New Quote/i }).first().click();
    // Modal should mount within a beat. We're not asserting its content yet —
    // the bar is just "render the modal without throwing".
    await page.waitForTimeout(1500);
    // The Radix Dialog content lands as role=dialog.
    const dialog = page.getByRole('dialog');
    await expect(dialog, 'New Quote modal failed to mount').toBeVisible();
    assertClean(log, 'click New Quote → open modal');
  });

  // Mirror tests for the other primary creation/action buttons on lists.
  // Each one opens a modal — confirming that modal-rendered widgets don't
  // crash on initial paint is the cheapest correctness signal we have.
  // Pending PROP-0014: the Proposal Members tab + Add Member form wire to
  // `/api/issuance/proposals/{id}/members` which 404s on the live backend.
  // Repoint to `/api/issuance/policy-members/search?proposalId=...` and
  // `/api/issuance/policies/{policyId}/members`.
  test.fixme('Sales clicking "Add member" on a proposal opens a form (or shows the action) without errors', async ({
    page,
  }) => {
    const log = captureErrors(page);
    await gotoAsRole(page, 'sales');
    // Find any proposal that exists; skip if none.
    const proposalId = await page.evaluate(async () => {
      const res = await fetch('/api/issuance/proposals/search?page=0&size=1');
      if (!res.ok) return null;
      const body = await res.json();
      return (body.content ?? body.items ?? body)[0]?.id ?? null;
    });
    test.skip(!proposalId, 'No proposal in the backend — skipping add-member modal test');
    await page.goto(`/issuance/proposals/${proposalId}`);
    await page.waitForLoadState('networkidle');
    // The Add member CTA exists on the members tab.
    const membersTab = page.getByRole('tab', { name: /Members/i }).first();
    if (await membersTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await membersTab.click();
      await page.waitForTimeout(500);
    }
    const addButton = page
      .getByRole('button', { name: /Add member|Add Member/i })
      .first();
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1500);
    }
    assertClean(log, 'open proposal detail + tab + click Add member');
  });
});

test.describe('Tabbed detail pages — every tab activates cleanly', () => {
  test('Quote detail: clicking each tab does not throw', async ({ page }) => {
    const log = captureErrors(page);
    await gotoAsRole(page, 'sales');
    const quoteId = await page.evaluate(async () => {
      const res = await fetch('/api/quotation/quotes/search?status=DRAFT&page=0&size=1');
      if (!res.ok) return null;
      const body = await res.json();
      return (body.content ?? body.items ?? body)[0]?.id ?? null;
    });
    test.skip(!quoteId, 'No DRAFT quote — skipping tab clicks');
    await page.goto(`/quotation/${quoteId}`);
    await page.waitForLoadState('networkidle');
    const tabs = page.getByRole('tab');
    const count = await tabs.count();
    expect(count, 'expected at least 2 tabs on quote detail').toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const label = await tabs.nth(i).innerText();
      await tabs.nth(i).click();
      await page.waitForLoadState('networkidle');
      // Brief pause so any lazy widget gets to throw if it's going to.
      await page.waitForTimeout(300);
      expect(
        log.errors,
        `clicking tab "${label}" raised errors:\n  ${log.errors.join('\n  ')}`,
      ).toHaveLength(0);
    }
    assertClean(log, 'cycle every quote-detail tab');
  });
});

test.describe('Dashboard inbox — first-row click does not crash for any role', () => {
  // Each role has at least one inbox section. Clicking the first row should
  // navigate to a detail page that mounts cleanly. This is where GAP 2 from
  // the previous report should surface as a page-render error.
  for (const role of ROLES) {
    test(`role=${role}: clicking the first inbox row navigates without crash`, async ({
      page,
    }) => {
      const log = captureErrors(page);
      await gotoAsRole(page, role);
      await page.waitForLoadState('networkidle');
      // Anchor on a row that actually has an anchor element — that filters
      // out loading-skeleton rows (which render <tr> with no inner link).
      const firstLink = page.locator('tbody tr a').first();
      if (!(await firstLink.isVisible({ timeout: 4000 }).catch(() => false))) {
        test.skip(true, `role=${role} has no inbox rows with links in the live backend right now`);
      }
      await firstLink.click();
      await page.waitForLoadState('networkidle');
      assertClean(log, `inbox row click as role=${role}`);
    });
  }
});

test.describe('Menu navigation — every menu item is clickable without crash', () => {
  test('Sales clicks each menu item in turn — no errors', async ({ page }) => {
    const log = captureErrors(page);
    await gotoAsRole(page, 'sales');
    // Read menu items, click each, watch for crashes.
    const items = await page
      .locator('aside, nav')
      .getByRole('link')
      .all();
    expect(items.length, 'expected at least 3 menu items for sales').toBeGreaterThanOrEqual(3);
    for (const item of items) {
      const label = (await item.innerText()).trim();
      if (!label) continue;
      await item.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
      expect(
        log.errors,
        `navigation to "${label}" raised errors:\n  ${log.errors.join('\n  ')}`,
      ).toHaveLength(0);
    }
    assertClean(log, 'click every menu item as sales');
  });
});

test.describe('Filter dropdown opens cleanly on every list page', () => {
  for (const path of ['/quotation', '/issuance/proposals', '/policy-admin/policies']) {
    test(`Sales: opening Filter on ${path} does not crash`, async ({ page }) => {
      const log = captureErrors(page);
      await gotoAsRole(page, 'sales');
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const trigger = page.getByRole('button', { name: /^Filter$/i }).first();
      // Filter trigger might be absent on a route that has no filters wired —
      // skip rather than fail.
      if (!(await trigger.isVisible({ timeout: 2000 }).catch(() => false))) {
        test.skip(true, `${path} has no Filter trigger`);
      }
      await trigger.click();
      await page.waitForTimeout(500);
      assertClean(log, `open Filter on ${path}`);
    });
  }
});
