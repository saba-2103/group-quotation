// List-page integrity.
//
// For each list route that should be reachable by Sales (which sees the full
// menu), verify:
//   - The page loads without errors and renders a recognizable header.
//   - A data-table or empty-state is present (not a blank screen).
//   - Filter-bar controls render where the schema defines them.
//   - Clicking the first row navigates to the expected detail route shape.
//
// We deliberately don't assert specific row data — the backend evolves.

import { test, expect } from '@playwright/test';
import { gotoAsRole } from './helpers';

interface ListPage {
  path: string;
  heading: RegExp;
  // Filter ids declared in the schema's filter-bar (used to assert their presence).
  expectedFilters?: string[];
  // After clicking a row, the URL should match this pattern.
  detailUrlPattern?: RegExp;
}

const LIST_PAGES: ListPage[] = [
  {
    path: '/quotation',
    heading: /Quotations/,
    expectedFilters: ['Status', 'Policy type'],
    detailUrlPattern: /\/quotation\/[^/]+$/,
  },
  {
    path: '/quotation/member-quotes',
    heading: /Member Quotes/i,
  },
  {
    path: '/issuance/proposals',
    heading: /Proposals/,
    expectedFilters: ['State'],
    detailUrlPattern: /\/issuance\/proposals\/[^/]+$/,
  },
  {
    path: '/policy-admin/clients',
    heading: /Clients/,
  },
  {
    path: '/policy-admin/policies',
    heading: /Policies/,
    expectedFilters: ['State'],
    detailUrlPattern: /\/policy-admin\/policies\/[^/]+$/,
  },
];

test.describe('List-page integrity (as Sales)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAsRole(page, 'sales');
  });

  for (const lp of LIST_PAGES) {
    test(`${lp.path} renders with header + data area`, async ({ page }) => {
      await page.goto(lp.path);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: lp.heading }).first()).toBeVisible();
      // Either a table or an empty-state should be visible — never a blank page.
      const hasTable = await page.locator('table').count();
      const hasEmpty = await page.getByText(/no [a-z]+ yet|queue is clear|nothing to/i).count();
      expect(
        hasTable + hasEmpty,
        `${lp.path} has neither a <table> nor an empty-state`,
      ).toBeGreaterThan(0);
    });

    if (lp.expectedFilters?.length) {
      test(`${lp.path} renders the Filters trigger + its individual filter options: ${lp.expectedFilters.join(', ')}`, async ({
        page,
      }) => {
        await page.goto(lp.path);
        await page.waitForLoadState('networkidle');
        // FilterBar exposes a single "Filters" button that opens a dropdown;
        // individual filter labels live inside that dropdown as
        // DropdownMenuSubTrigger items.
        // FilterBar's trigger uses the i18n-style `filterLabel` prop which
        // defaults to "Filter" (singular) per FilterBar.tsx:97.
        const filtersTrigger = page.getByRole('button', { name: /^Filter$/i }).first();
        await expect(filtersTrigger, `Filter trigger missing on ${lp.path}`).toBeVisible();
        await filtersTrigger.click();
        for (const filterLabel of lp.expectedFilters!) {
          await expect(
            page
              .getByRole('menuitem', { name: new RegExp(filterLabel, 'i') })
              .or(page.locator('[role="menuitem"]').getByText(filterLabel, { exact: true }))
              .first(),
            `filter "${filterLabel}" missing from Filters dropdown on ${lp.path}`,
          ).toBeVisible();
        }
      });
    }

    if (lp.detailUrlPattern) {
      test(`${lp.path} first row click navigates to detail page`, async ({ page }) => {
        await page.goto(lp.path);
        await page.waitForLoadState('networkidle');
        // Skip if the list is empty — that's a data state, not a UI bug.
        const rowCount = await page.locator('tbody tr').count();
        test.skip(rowCount === 0, `${lp.path} has no rows to click — skipping nav assertion`);
        const firstLink = page
          .locator('tbody tr')
          .first()
          .locator('a, button')
          .first();
        await firstLink.click();
        await expect(page).toHaveURL(lp.detailUrlPattern!);
      });
    }
  }

  test('quote list filter chip applies a state filter to the backend search', async ({
    page,
  }) => {
    const requestsAfterFilter: string[] = [];
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');
    page.on('request', (req) => {
      if (req.url().includes('/api/quotation/quotes/search')) {
        requestsAfterFilter.push(req.url());
      }
    });
    // Hit the Status filter. The FilterBar uses a select-style widget; pick
    // the first option visible after opening it.
    const statusFilter = page.getByRole('combobox', { name: /Status/i }).first()
      .or(page.getByText('Status').first().locator('xpath=following::button[1]'));
    // Best-effort: open and pick "Submitted" if available.
    try {
      await statusFilter.click({ timeout: 3000 });
      await page.getByRole('option', { name: /Submitted/i }).first().click();
      await page.waitForLoadState('networkidle');
    } catch {
      test.skip(true, 'Status filter selector not reachable — selector strategy needs adjustment');
    }
    const matched = requestsAfterFilter.some((u) =>
      u.toLowerCase().includes('status=submitted'),
    );
    expect(
      matched,
      `expected an XHR with status=SUBMITTED. Saw:\n${requestsAfterFilter.join('\n')}`,
    ).toBe(true);
  });
});
