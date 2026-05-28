import { expect, type Page } from '@playwright/test';

// The 6 narrative personas the role-switcher exposes after PROP-0009.
// Order matches `ROLE_ORDER` in `src/components/widgets/role/RoleSwitcher.tsx`.
export const ROLES = [
  'sales',
  'partner_agent',
  'mph',
  'member',
  'uw',
  'ops',
] as const;
export type Role = (typeof ROLES)[number];

// Human-facing labels for each role as rendered in the switcher.
// Source: `RoleSwitcher.tsx` ROLE_META.
export const ROLE_LABEL: Record<Role, string> = {
  sales: 'Sales',
  partner_agent: 'Partner Agent',
  mph: 'MPH',
  member: 'Member',
  uw: 'Underwriter',
  ops: 'Ops',
};

// Menu items expected to appear for each role after the `/api/config/app`
// server-side filter runs. Source of truth:
// `src/mocks/original/group-insurance/config/app-config-mock.ts`.
// 'Home' has no `allowedRoles` and is therefore visible to every role.
export const EXPECTED_MENU: Record<Role, string[]> = {
  sales: ['Home', 'Quotation', 'Issuance', 'Policy Admin', 'Accounting'],
  partner_agent: ['Home', 'Quotation', 'Policy Admin'],
  mph: ['Home', 'Quotation', 'Issuance'],
  member: ['Home', 'Policy Admin'],
  uw: ['Home', 'Issuance'],
  ops: ['Home', 'Policy Admin'],
};

// Set role in localStorage and hard-reload so RoleProvider picks it up.
// Avoids interacting with the switcher dropdown which is harder to drive in
// headless mode (it's a Radix dropdown that uses portals).
export async function setRole(page: Page, role: Role): Promise<void> {
  // Need a page context already loaded so localStorage is the right origin.
  await page.evaluate((r) => {
    localStorage.setItem('group-pas:current-role', r);
  }, role);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    page.getByRole('button', { name: new RegExp(`Active role: ${ROLE_LABEL[role]}`) }),
  ).toBeVisible();
}

// Visit the home page, set the role, then return when the dashboard is loaded.
export async function gotoAsRole(page: Page, role: Role): Promise<void> {
  await page.goto('/');
  await setRole(page, role);
}

// Read the top-level menu items (rail buttons) currently rendered. Order matters
// because we also assert order against the config.
export async function readRailMenu(page: Page): Promise<string[]> {
  // The icon-rail nav is rendered as a list of <a> inside the sidebar. We rely
  // on visible text accessible names; icons-only items still expose an
  // accessible name via aria-label.
  const items = await page
    .locator('aside, nav, [role="navigation"]')
    .locator('a, button[role="menuitem"]')
    .allInnerTexts();
  // Strip empties + dedupe while preserving order.
  const seen = new Set<string>();
  return items
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

// Quick wait: the dashboard finished its initial set of API requests so
// queries have either resolved or rejected. The Inbox sections use
// `useSmartQuery` and render their empty state when the result is 0 rows.
export async function waitForDashboardReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // The Dashboard heading is the most stable anchor.
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 }).or(
    page.getByRole('heading', { name: 'Dashboard' }).first(),
  )).toBeVisible();
}
