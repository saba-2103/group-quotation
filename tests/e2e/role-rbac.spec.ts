// Role-workbench RBAC — PROP-0009 regression suite.
//
// This is the highest-priority suite: it locks in the just-shipped behavior of
//   1. the role switcher exposing all 6 narrative personas,
//   2. the server-side menu filter (/api/config/app?role=X) returning the right
//      menu shape for each role,
//   3. localStorage persistence of the active role across reloads,
//   4. the Dashboard re-rendering when role changes.
// Any failure here means the workbench framing of the demo is broken — flag
// loudly.

import { test, expect } from '@playwright/test';
import {
  ROLES,
  ROLE_LABEL,
  EXPECTED_MENU,
  setRole,
  gotoAsRole,
  type Role,
} from './helpers';

test.describe('Role-workbench RBAC (PROP-0009)', () => {
  test('default role on a fresh visit is Sales', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    // localStorage starts empty for a new browser context.
    const stored = await page.evaluate(() =>
      localStorage.getItem('group-pas:current-role'),
    );
    expect(stored).toBeNull();
    await expect(
      page.getByRole('button', { name: /Active role: Sales/ }),
    ).toBeVisible();
  });

  test('role switcher dropdown lists all 6 narrative personas in canonical order', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Active role:/ }).click();
    const dropdownItems = page.locator('[role="menuitem"]');
    await expect(dropdownItems).toHaveCount(6);
    // Each menuitem renders the label as its first line; descriptions follow.
    // We anchor on the LABEL only (regex with start-of-line + word boundary)
    // to avoid false matches like "Member" hitting "Onboards members" in the
    // partner_agent description.
    const texts = await dropdownItems.allInnerTexts();
    const labelRegex = (label: string) => new RegExp(`(^|\\n)\\s*${label}\\b`);
    const indices = ROLES.map((r) =>
      texts.findIndex((t) => labelRegex(ROLE_LABEL[r]).test(t)),
    );
    for (const i of indices)
      expect(i, `one of the labels was not found uniquely; indices=${JSON.stringify(indices)}`)
        .toBeGreaterThanOrEqual(0);
    // Each label should land on a different index — no two roles share a slot.
    const unique = new Set(indices);
    expect(unique.size, `expected 6 unique indices; got ${JSON.stringify(indices)}`).toBe(6);
    // Canonical order matches ROLES iteration.
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  test('role persists across reload (localStorage-backed)', async ({ page }) => {
    await page.goto('/');
    await setRole(page, 'mph');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(
      page.getByRole('button', { name: /Active role: MPH/ }),
    ).toBeVisible();
  });

  test('invalid stored role falls back to Sales (validator guard)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('group-pas:current-role', 'maker' /* legacy */),
    );
    await page.reload({ waitUntil: 'networkidle' });
    // The validator in src/contexts/RoleContext.tsx falls back to DEFAULT_ROLE = 'sales'.
    await expect(
      page.getByRole('button', { name: /Active role: Sales/ }),
    ).toBeVisible();
  });

  // One test per role asserting the server-side menu filter returns exactly the
  // expected items. Hits /api/config/app?role=X directly so we catch backend-shape
  // regressions independently of the UI render path.
  for (const role of ROLES) {
    test(`/api/config/app filters menu correctly for role=${role}`, async ({
      request,
    }) => {
      const res = await request.get(`/api/config/app?appId=group-insurance&role=${role}`);
      expect(res.ok()).toBe(true);
      const body = await res.json();
      const labels = body.navigation.menuItems.map((m: { label: string }) => m.label);
      expect(labels).toEqual(EXPECTED_MENU[role]);
    });
  }

  // One UI-level test per role confirming the icon rail / submenu render the
  // filtered menu. Catches the wiring between AppContextProvider and
  // DualPanelNav — i.e. menu re-fetch on role change.
  for (const role of ROLES) {
    test(`UI rail shows correct menu items for role=${role}`, async ({ page }) => {
      await gotoAsRole(page, role);
      const expected = EXPECTED_MENU[role];
      for (const label of expected) {
        // Each rail item exposes its label via aria-label or visible text.
        await expect(
          page.locator('aside, nav, [role="navigation"]').getByText(label, { exact: true }).first(),
        ).toBeVisible();
      }
      // Negative-space check: roles that don't get Accounting must NOT see it.
      const disallowed = ['Home', 'Quotation', 'Issuance', 'Policy Admin', 'Accounting'].filter(
        (l) => !expected.includes(l),
      );
      for (const label of disallowed) {
        await expect(
          page.locator('aside, nav, [role="navigation"]').getByText(label, { exact: true }),
        ).toHaveCount(0);
      }
    });
  }

  test('switching role at runtime re-fetches the menu (queryKey wiring)', async ({
    page,
  }) => {
    await page.goto('/');
    await setRole(page, 'sales');
    // Sales sees Accounting.
    await expect(
      page.locator('aside, nav').getByText('Accounting', { exact: true }).first(),
    ).toBeVisible();
    await setRole(page, 'uw');
    // UW must NOT see Accounting.
    await expect(
      page.locator('aside, nav').getByText('Accounting', { exact: true }),
    ).toHaveCount(0);
    // UW sees Issuance instead.
    await expect(
      page.locator('aside, nav').getByText('Issuance', { exact: true }).first(),
    ).toBeVisible();
  });

  test('every role label in the switcher exists in our enum (no stale "maker/checker/viewer")', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Active role:/ }).click();
    const texts = (await page.locator('[role="menuitem"]').allInnerTexts()).join('\n');
    expect(texts).not.toMatch(/maker/i);
    expect(texts).not.toMatch(/checker/i);
    expect(texts).not.toMatch(/viewer/i);
  });
});
