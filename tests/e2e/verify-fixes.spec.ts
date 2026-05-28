// Spot-check spec for the two fixes:
//   1. Member Quotes (GCL) tab must show on GCL quote detail and be hidden on
//      GTL quote detail.
//   2. Request Pricing button must be enabled (not gated by disabledTooltip).

import { test, expect } from '@playwright/test';
import { createQuote } from './helpers/portal-actions';
import { gotoAsRole } from './helpers';

test.describe('Two-fix verification', () => {
  test('GTL quote detail: Member Quotes (GCL) tab is HIDDEN', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    const { quoteId } = await createQuote(page, 'GTL');
    await page.goto(`/quotation/${quoteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const tabs = await page.getByRole('tab').allInnerTexts();
    const hasGclTab = tabs.some((t) => /Member Quotes \(GCL\)/.test(t));
    expect(hasGclTab, `GTL quote should not show "Member Quotes (GCL)" tab. Got: ${tabs.join(' | ')}`).toBeFalsy();
  });

  test('GCL quote detail: Member Quotes (GCL) tab is SHOWN', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    const { quoteId } = await createQuote(page, 'GCL');
    await page.goto(`/quotation/${quoteId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const tabs = await page.getByRole('tab').allInnerTexts();
    const hasGclTab = tabs.some((t) => /Member Quotes \(GCL\)/.test(t));
    expect(hasGclTab, `GCL quote should show "Member Quotes (GCL)" tab. Got: ${tabs.join(' | ')}`).toBeTruthy();
  });

  test('Pricing tab: Request price button is ENABLED on DRAFT quote', async ({ page }) => {
    await gotoAsRole(page, 'sales');
    const { quoteId } = await createQuote(page, 'GTL');
    await page.goto(`/quotation/${quoteId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /^Pricing$/i }).click();
    await page.waitForTimeout(300);

    const btn = page.getByRole('button', { name: /Request price/i }).first();
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });
});
