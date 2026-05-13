// Smoke: every reachable page route loads as Sales (the role with the broadest
// menu access) without a console error of severity 'error' and without leaving
// a blank `<main>`.
//
// This is the wide-net catch — anything weirder (e.g. a missing schema, a
// hydration mismatch, an uncaught fetch rejection) shows up here even if the
// per-page targeted tests don't think to look.

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { gotoAsRole } from './helpers';

interface Route {
  path: string;
  expectMainContent: RegExp | string; // Text that must appear in <main> after load.
}

const ROUTES: Route[] = [
  { path: '/', expectMainContent: 'Dashboard' },
  { path: '/quotation', expectMainContent: 'Quotations' },
  { path: '/quotation/member-quotes', expectMainContent: /Member Quotes/i },
  { path: '/issuance/proposals', expectMainContent: 'Proposals' },
  { path: '/policy-admin/clients', expectMainContent: /Clients/i },
  { path: '/policy-admin/policies', expectMainContent: /Policies/i },
];

interface ConsoleError {
  text: string;
  url: string;
}

async function recordErrors(page: Page): Promise<ConsoleError[]> {
  const errors: ConsoleError[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out third-party / dev-tool noise that's outside our control:
      //   - Next.js dev hot-update logs in production should never appear, but
      //     other devtools warnings sometimes show. Tighten this list only if
      //     a real signal gets drowned out.
      if (text.includes('Failed to load resource: net::ERR_FAILED')) return;
      errors.push({ text, url: page.url() });
    }
  });
  page.on('pageerror', (err) => {
    errors.push({ text: `pageerror: ${err.message}`, url: page.url() });
  });
  return errors;
}

test.describe('Smoke — every route loads as Sales without console errors', () => {
  for (const route of ROUTES) {
    test(`${route.path}`, async ({ page }) => {
      const errors = await recordErrors(page);
      await gotoAsRole(page, 'sales');
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // <main> should contain the expected anchor copy.
      const main = page.locator('main');
      await expect(main).toContainText(route.expectMainContent);

      // No console errors during load.
      expect(
        errors,
        `console errors on ${route.path}:\n${errors.map((e) => e.text).join('\n')}`,
      ).toHaveLength(0);
    });
  }
});

test.describe('Smoke — dashboard works for every role', () => {
  // Quick gate: any role that can't render the dashboard at all is fatal.
  for (const role of ['sales', 'partner_agent', 'mph', 'member', 'uw', 'ops'] as const) {
    test(`dashboard renders for role=${role}`, async ({ page }) => {
      const errors = await recordErrors(page);
      await gotoAsRole(page, role);
      await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible();
      // Every role must show at least its inbox section (no role has zero
      // inbox sections in the current dashboard schema).
      await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
      expect(
        errors,
        `console errors on dashboard as role=${role}:\n${errors.map((e) => e.text).join('\n')}`,
      ).toHaveLength(0);
    });
  }
});

test.describe('Smoke — backend reachability via the proxy', () => {
  // Direct proxy checks. If these fail the whole demo is on fire.
  const endpoints = [
    '/api/quotation/quotes/search?page=0&size=1',
    '/api/issuance/proposals/search?page=0&size=1',
    '/api/policy-admin/policies/search?page=0&size=1',
    '/api/policy-admin/clients/search?page=0&size=1',
    '/api/policy-admin/members/search?page=0&size=1',
    '/api/issuance/policy-members/search?page=0&size=1',
  ];
  for (const ep of endpoints) {
    test(`backend proxy reachable: ${ep}`, async ({ request }) => {
      const res = await request.get(ep);
      expect(
        res.ok(),
        `${ep} returned HTTP ${res.status()} — backend or proxy is wrong`,
      ).toBe(true);
    });
  }
});
