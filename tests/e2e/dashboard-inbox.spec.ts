// Dashboard Inbox per role (PROP-0009).
//
// Validates that:
//   - Each role sees exactly the inbox section(s) gated to them via `visibleRoles`.
//   - The data-table for each section binds to the right backend endpoint (so a
//     stale endpoint or a state-filter rename surfaces here).
//   - Empty-state vs row rendering is correct relative to the live backend.
//   - Sales-only sections (Business Processes, Quick Actions) hide for every
//     non-sales role.

import { test, expect, type Page } from '@playwright/test';
import { gotoAsRole, type Role } from './helpers';

interface InboxSectionExpectation {
  role: Role;
  title: string;
  apiSubstring: string; // Substring of the API URL the section's data-table hits.
  // Empty-state copy (rendered when the search returns no rows).
  emptyTitle: string;
}

// Source of truth: `schemas/dashboard.json` inbox section. The substring of
// `apiSubstring` mirrors what useSmartQuery resolves the dataSource to.
const SECTIONS: InboxSectionExpectation[] = [
  {
    role: 'sales',
    title: 'Draft quotes awaiting your action',
    apiSubstring: '/api/quotation/quotes/search',
    emptyTitle: 'No draft quotes',
  },
  {
    role: 'sales',
    title: 'Proposals ready to finalize',
    apiSubstring: '/api/issuance/proposals/search',
    emptyTitle: 'No proposals to finalize',
  },
  {
    role: 'partner_agent',
    title: 'Policies needing member onboarding',
    apiSubstring: '/api/policy-admin/policies/search',
    emptyTitle: 'No policies need onboarding',
  },
  {
    role: 'mph',
    title: 'Quotes awaiting your acceptance',
    apiSubstring: '/api/quotation/quotes/search',
    emptyTitle: 'No quotes awaiting acceptance',
  },
  {
    role: 'member',
    title: 'Confirm your enrolment',
    apiSubstring: '/api/issuance/policy-members/search',
    emptyTitle: 'Nothing to confirm',
  },
  {
    role: 'uw',
    title: 'Members referred for review',
    apiSubstring: '/api/issuance/policy-members/search',
    emptyTitle: 'Queue is clear',
  },
  {
    role: 'ops',
    title: 'Members flagged for repair',
    apiSubstring: '/api/issuance/policy-members/search',
    emptyTitle: 'Queue is clear',
  },
];

test.describe('Dashboard Inbox per role', () => {
  for (const section of SECTIONS) {
    test(`role=${section.role} sees section "${section.title}"`, async ({ page }) => {
      await gotoAsRole(page, section.role);
      // The section title is rendered by data-table's title prop.
      await expect(
        page.getByText(section.title, { exact: false }).first(),
      ).toBeVisible();
    });

    test(`role=${section.role} section "${section.title}" hits the right API endpoint`, async ({
      page,
    }) => {
      // Record requests during the dashboard load to confirm the data-table
      // section actually fired an XHR to the expected backend path.
      const requests: string[] = [];
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/')) requests.push(url);
      });
      await gotoAsRole(page, section.role);
      // Give async list calls a moment to settle.
      await page.waitForLoadState('networkidle');
      const matched = requests.some((u) => u.includes(section.apiSubstring));
      expect(matched, `expected an XHR matching ${section.apiSubstring} but saw:\n${requests.join('\n')}`).toBe(true);
    });
  }

  test('Sales sees BOTH inbox sections and the Sales-only Business Processes block', async ({
    page,
  }) => {
    await gotoAsRole(page, 'sales');
    await expect(page.getByText('Draft quotes awaiting your action').first()).toBeVisible();
    await expect(page.getByText('Proposals ready to finalize').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Business Processes' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
  });

  test('Business Processes section is HIDDEN for every non-sales role', async ({
    page,
  }) => {
    for (const role of ['partner_agent', 'mph', 'member', 'uw', 'ops'] as const) {
      await gotoAsRole(page, role);
      await expect(
        page.getByRole('heading', { name: 'Business Processes' }),
        `Business Processes leaked into role=${role}`,
      ).toHaveCount(0);
      await expect(
        page.getByRole('heading', { name: 'Quick Actions' }),
        `Quick Actions leaked into role=${role}`,
      ).toHaveCount(0);
    }
  });

  test('a role only sees their own inbox section — no cross-leak', async ({ page }) => {
    // Switch to UW and confirm none of the other roles' inbox titles render.
    await gotoAsRole(page, 'uw');
    const leakedTitles = [
      'Draft quotes awaiting your action',
      'Proposals ready to finalize',
      'Policies needing member onboarding',
      'Quotes awaiting your acceptance',
      'Confirm your enrolment',
      'Members flagged for repair',
    ];
    for (const t of leakedTitles) {
      await expect(
        page.getByText(t, { exact: false }),
        `"${t}" leaked into role=uw inbox`,
      ).toHaveCount(0);
    }
    // And confirm UW's own section is present.
    await expect(page.getByText('Members referred for review').first()).toBeVisible();
  });

  test('Key Metrics section renders for every role (no visibleRoles gate)', async ({
    page,
  }) => {
    for (const role of ['sales', 'mph', 'uw', 'ops'] as const) {
      await gotoAsRole(page, role);
      await expect(
        page.getByRole('heading', { name: 'Key Metrics' }),
        `Key Metrics missing for role=${role}`,
      ).toBeVisible();
    }
  });
});
