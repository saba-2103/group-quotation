// Portal-driven verbs for the GTL/GCL demo narrative.
// Every helper here clicks, fills, or switches role — never `fetch`. The
// narrative walkthrough specs compose these. Selectors are pulled from the
// schemas under /schemas (form ids, action labels) and are stable enough to
// survive cosmetic re-renders.

import { expect, type Page } from '@playwright/test';
import { ROLE_LABEL, type Role, setRole } from '../helpers';
import path from 'node:path';

const FIXTURE_DIR = path.resolve(__dirname, '..', 'fixtures');

export type Lob = 'GTL' | 'GCL';

export interface CreatedQuote {
  quoteId: string;
}

// Settle: network idle + a short tick so role-gated actions finish
// reconciling. The action buttons live in a plain div (no role=toolbar),
// so we don't query a toolbar role here.
async function waitForToolbarReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
}

// Click a Radix-style dropdown trigger that opens a select listbox, then
// pick an option by accessible name. Used for the Client + Policy type
// dropdowns in the create-quote modal (both are `<select>`-like comboboxes).
async function pickFromCombobox(page: Page, triggerName: RegExp, optionPattern: RegExp): Promise<void> {
  const trigger = page.getByRole('combobox', { name: triggerName }).first();
  await trigger.click();
  const option = page.getByRole('option', { name: optionPattern }).first();
  await option.click();
}

// Read the entity id off the current quote-detail page. The URL is the
// authoritative source — `/quotation/<uuid>`. Used by every step that
// captures an id for later assertions.
export function extractIdFromUrl(page: Page, prefix: RegExp): string {
  const url = page.url();
  const match = url.match(prefix);
  if (!match) throw new Error(`URL ${url} did not match ${prefix}`);
  return match[1];
}

// ─────────────────────────── Quote lifecycle ───────────────────────────

// Returns the id of the newly created DRAFT quote. Expects at least one
// Client to exist in the directory — if the live DB is fully scrubbed and
// no Client exists, this throws with a clear message so the walkthrough
// can record the gap.
export async function createQuote(page: Page, lob: Lob): Promise<CreatedQuote> {
  await page.goto('/quotation');
  await page.waitForLoadState('networkidle');

  const newQuoteBtn = page.getByRole('button', { name: /New Quote/i }).first();
  await expect(newQuoteBtn, '"New Quote" button missing on /quotation').toBeVisible();
  await newQuoteBtn.click();

  // The modal lives in a Radix portal — its accessible name is "Form
  // Modal" (the page's form-container heading), not "New Quote". Look for
  // the dialog plus the Client/Policy-type fields inside it.
  const modal = page.getByRole('dialog').filter({ has: page.getByText(/Policy type/i) }).first();
  await expect(modal, 'Create-quote modal did not open').toBeVisible({ timeout: 10_000 });

  // Client dropdown is data-driven; if the live directory is empty the
  // listbox has zero options. Detect that and fail with the seed gap.
  const clientTrigger = modal.getByRole('combobox').first();
  await clientTrigger.click();
  const firstClientOption = page.getByRole('option').first();
  if (!(await firstClientOption.isVisible({ timeout: 5_000 }).catch(() => false))) {
    throw new Error('No clients in directory — run `npm run seed:backend` to bootstrap');
  }
  await firstClientOption.click();

  // Policy type — second combobox in the modal.
  const lobTrigger = modal.getByRole('combobox').nth(1);
  await lobTrigger.click();
  await page.getByRole('option', { name: new RegExp(`^${lob}\\b`) }).first().click();

  // Submit. The current schema's onSuccess closes the modal and refreshes
  // the list but does NOT navigate to detail (an issue tracked in
  // schemas/forms/create-quote-form.json — only `trigger-event` on success).
  // Capture the quoteId off the POST response and navigate manually.
  const submitBtn = modal.getByRole('button', { name: /^Create quote$/i });
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 });

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/quotation/quotes') && r.request().method() === 'POST', { timeout: 15_000 }),
    submitBtn.click(),
  ]);
  const body = await resp.json();
  const quoteId = body?.quoteId ?? body?.id;
  if (!quoteId) throw new Error(`Quote-create POST returned no id: ${JSON.stringify(body).slice(0, 200)}`);

  await page.goto(`/quotation/${quoteId}`);
  await page.waitForLoadState('networkidle');
  return { quoteId };
}

// Open Plans tab, then move through Census Schema / Aggregate Census /
// Pricing. We don't fully fill every form (the demo flow is "tabs render
// and Request Pricing button is reachable"); the walkthrough records what
// it finds rather than what it produces.
export async function visitAllQuoteTabs(page: Page): Promise<string[]> {
  // Schema tab ids: key-data, plans, census, member-mapping, pricing
  const tabs: Array<{ id: string; label: RegExp }> = [
    { id: 'key-data', label: /Key Data/i },
    { id: 'plans', label: /^Plans$/i },
    { id: 'census', label: /^Census$/i },
    { id: 'member-mapping', label: /Member-to-Plan Mapping|Mapping/i },
    { id: 'pricing', label: /^Pricing$/i },
  ];
  const found: string[] = [];
  for (const t of tabs) {
    const tab = page.getByRole('tab', { name: t.label }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(200);
      found.push(t.id);
    }
  }
  return found;
}

// Click "Request Pricing" if it's present and enabled. The narrative
// expects a premium to come back. Returns { clicked, enabled, success }
// so the spec can record the outcome instead of failing the whole walk.
export async function requestPricing(
  page: Page,
): Promise<{ clicked: boolean; enabled: boolean; success: boolean; note?: string }> {
  const tab = page.getByRole('tab', { name: /^Pricing$/i }).first();
  if (await tab.isVisible().catch(() => false)) await tab.click();
  await page.waitForLoadState('networkidle');

  const btn = page.getByRole('button', { name: /Request Pricing|Request price/i }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    return { clicked: false, enabled: false, success: false, note: 'Request Pricing button not rendered' };
  }
  const disabled = await btn.isDisabled();
  if (disabled) {
    return { clicked: false, enabled: false, success: false, note: 'Request Pricing rendered disabled (Rule Engine not wired?)' };
  }
  await btn.click();
  // Success: a toast/banner mentions "premium" OR a premium field becomes
  // populated. Loose check — narrative just says "premium shows".
  try {
    await expect(
      page.getByText(/premium|priced|estimated/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    return { clicked: true, enabled: true, success: true };
  } catch {
    return { clicked: true, enabled: true, success: false, note: 'clicked but no premium copy appeared in 10s' };
  }
}

// Walk a quote through Submit → Send to client. The backend currently
// rejects Quote.submit unless a premium has been calculated (Rule Engine
// not wired) — when that happens the toast surfaces an error and state
// stays DRAFT, leaving "Send to client" disabled with
// data-disabled-reason="Not available in DRAFT". We detect that and
// return a note rather than failing the test.
export async function submitAndSendToClient(page: Page): Promise<{ submitted: boolean; sent: boolean; note?: string }> {
  await waitForToolbarReady(page);
  const submit = page.getByRole('button', { name: /^Submit quote$/i }).first();
  if (!(await submit.isVisible().catch(() => false))) {
    return { submitted: false, sent: false, note: '"Submit quote" not visible' };
  }
  if (await submit.isDisabled()) {
    const reason = await submit.getAttribute('data-disabled-reason');
    return { submitted: false, sent: false, note: `"Submit quote" disabled: ${reason ?? 'unknown'}` };
  }
  await submit.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const send = page.getByRole('button', { name: /^Send to client$/i }).first();
  if (!(await send.isVisible().catch(() => false))) {
    return { submitted: true, sent: false, note: 'Submitted, but "Send to client" not visible' };
  }
  if (await send.isDisabled()) {
    const reason = await send.getAttribute('data-disabled-reason');
    // "Not available in DRAFT" means the submit POST silently failed and
    // state didn't advance (likely the backend pricing prerequisite).
    return { submitted: false, sent: false, note: `Submit click did not advance state — "Send to client" still: ${reason ?? 'disabled'}` };
  }
  await send.click();
  await page.waitForLoadState('networkidle');
  return { submitted: true, sent: true };
}

// MPH accepts a quote on /quotation/<id>. Caller is responsible for
// switching role to 'mph' first.
export async function mphAccept(page: Page, quoteId: string): Promise<{ accepted: boolean; note?: string }> {
  await page.goto(`/quotation/${quoteId}`);
  await waitForToolbarReady(page);
  const accept = page.getByRole('button', { name: /^Mark accepted$|^Accept$/i }).first();
  if (!(await accept.isVisible().catch(() => false))) {
    return { accepted: false, note: '"Mark accepted" not visible to MPH' };
  }
  if (await accept.isDisabled()) {
    const reason = await accept.getAttribute('data-disabled-reason');
    return { accepted: false, note: `"Mark accepted" disabled: ${reason ?? 'unknown'} (quote state likely not SENT_TO_CLIENT)` };
  }
  await accept.click();
  await page.waitForLoadState('networkidle');
  return { accepted: true };
}

// Sales clicks Finalize on the quote → proposal is server-created.
// Returns the proposal id once the app surfaces it (toast link, or
// proposal-listed-on-page). Best-effort id capture.
export async function finalizeQuote(page: Page, quoteId: string): Promise<{ finalized: boolean; proposalId?: string; note?: string }> {
  await page.goto(`/quotation/${quoteId}`);
  await waitForToolbarReady(page);
  const finalizeBtn = page.getByRole('button', { name: /^Finalize/i }).first();
  if (!(await finalizeBtn.isVisible().catch(() => false))) {
    return { finalized: false, note: '"Finalize" not visible on quote toolbar' };
  }
  if (await finalizeBtn.isDisabled()) {
    const reason = await finalizeBtn.getAttribute('data-disabled-reason');
    return { finalized: false, note: `"Finalize" disabled: ${reason ?? 'unknown'}` };
  }
  await finalizeBtn.click();
  await page.waitForLoadState('networkidle');

  // Look up the freshly-created proposal by quoteId via the issuance list.
  await page.goto('/issuance/proposals');
  await page.waitForLoadState('networkidle');
  const row = page.getByRole('row').filter({ hasText: new RegExp(quoteId.slice(0, 8), 'i') }).first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await page.waitForURL(/\/issuance\/proposals\/[^/]+$/, { timeout: 10_000 });
    return { finalized: true, proposalId: extractIdFromUrl(page, /\/issuance\/proposals\/([^/?#]+)/) };
  }
  return { finalized: true, note: 'Quote finalized but no matching proposal row found in /issuance/proposals' };
}

export async function finalizeProposal(page: Page, proposalId: string): Promise<{ finalized: boolean; policyId?: string; note?: string }> {
  await page.goto(`/issuance/proposals/${proposalId}`);
  await waitForToolbarReady(page);

  const submit = page.getByRole('button', { name: /^Submit proposal$/i }).first();
  if ((await submit.isVisible().catch(() => false)) && !(await submit.isDisabled())) {
    await submit.click();
    await page.waitForLoadState('networkidle');
  }

  const fin = page.getByRole('button', { name: /^Finalize.*create policy/i }).first();
  if (!(await fin.isVisible().catch(() => false))) {
    return { finalized: false, note: '"Finalize → create policy" not visible on proposal toolbar' };
  }
  if (await fin.isDisabled()) {
    const reason = await fin.getAttribute('data-disabled-reason');
    return { finalized: false, note: `"Finalize → create policy" disabled: ${reason ?? 'unknown'}` };
  }
  await fin.click();
  await page.waitForLoadState('networkidle');

  // Detail page shows the linked policyId in proposal-state-summary.
  // Read it back by polling the visible text.
  for (let i = 0; i < 10; i += 1) {
    const policyCell = page.getByText(/POL-[0-9A-Z-]+|policy[^\n]{0,40}/i).first();
    const text = await policyCell.textContent().catch(() => null);
    const m = text?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (m) return { finalized: true, policyId: m[0] };
    await page.waitForTimeout(500);
  }
  return { finalized: true, note: 'Proposal finalized but policyId not yet surfaced on page' };
}

// ─────────────────────────── Master Policy ───────────────────────────

export async function openPolicyDetail(page: Page, policyId: string): Promise<void> {
  await page.goto(`/policy-admin/policies/${policyId}`);
  await page.waitForLoadState('networkidle');
}

export interface PolicyState {
  badgeText: string | null;
  hasThresholdCounter: boolean;
  hasReasonAwaitingMinMembers: boolean;
}

export async function readPolicyState(page: Page): Promise<PolicyState> {
  // State badge is the first prominent badge on the page summary.
  const badgeText = await page
    .locator('[data-slot="badge"], [class*="badge"]')
    .first()
    .textContent()
    .catch(() => null);
  const body = await page.evaluate(() => document.body.innerText);
  return {
    badgeText: badgeText?.trim() ?? null,
    hasThresholdCounter: /awaiting|threshold|of\s+\d+/i.test(body),
    hasReasonAwaitingMinMembers: /AWAITING_MIN_MEMBERS|awaiting minimum members/i.test(body),
  };
}

// ─────────────────────────── Census upload ───────────────────────────

export async function uploadCensus(
  page: Page,
  proposalId: string,
  fixtureName: string,
  templateFormat: 'STANDARD_GTL' | 'STANDARD_GCL',
): Promise<{ uploaded: boolean; note?: string }> {
  await page.goto(`/issuance/proposals/${proposalId}/census/new`);
  await page.waitForLoadState('networkidle');

  const fileInput = page.locator('input[type="file"]').first();
  if (!(await fileInput.isVisible().catch(() => false))) {
    return { uploaded: false, note: 'No file input on census/new page' };
  }
  await fileInput.setInputFiles(path.join(FIXTURE_DIR, fixtureName));

  // Template format selector — only set if visible.
  const tplTrigger = page.getByRole('combobox', { name: /Template format/i }).first();
  if (await tplTrigger.isVisible().catch(() => false)) {
    await tplTrigger.click();
    await page.getByRole('option', { name: new RegExp(templateFormat === 'STANDARD_GTL' ? 'Standard GTL' : 'Standard GCL', 'i') }).first().click();
  }

  const start = page.getByRole('button', { name: /^Start upload$/i }).first();
  if (!(await start.isVisible().catch(() => false))) {
    return { uploaded: false, note: '"Start upload" button missing' };
  }
  await start.click();
  await page.waitForLoadState('networkidle');
  return { uploaded: true };
}

// ─────────────────────────── PolicyMember actions ───────────────────────────

export async function openFirstInboxRow(page: Page, _role: Role, sectionTitle: RegExp): Promise<{ opened: boolean; note?: string }> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const section = page.locator('section, div').filter({ has: page.getByText(sectionTitle).first() }).first();
  if (!(await section.isVisible().catch(() => false))) {
    return { opened: false, note: `Inbox section matching ${sectionTitle} not found` };
  }
  const row = section.getByRole('row').nth(1); // first data row after header
  if (!(await row.isVisible().catch(() => false))) {
    return { opened: false, note: `No data rows under "${sectionTitle}"` };
  }
  await row.click();
  await page.waitForLoadState('networkidle');
  return { opened: true };
}

export async function uwApprove(page: Page): Promise<{ approved: boolean; note?: string }> {
  await waitForToolbarReady(page);
  const btn = page.getByRole('button', { name: /^UW approve$/i }).first();
  if (!(await btn.isVisible().catch(() => false))) return { approved: false, note: '"UW approve" not visible' };
  if (await btn.isDisabled()) {
    const reason = await btn.getAttribute('data-disabled-reason');
    return { approved: false, note: `"UW approve" disabled: ${reason ?? 'unknown'}` };
  }
  await btn.click();
  await page.waitForLoadState('networkidle');
  return { approved: true };
}

export async function opsRepair(page: Page): Promise<{ repaired: boolean; note?: string }> {
  await waitForToolbarReady(page);
  const btn = page.getByRole('button', { name: /Edit & re-classify/i }).first();
  if (!(await btn.isVisible().catch(() => false))) return { repaired: false, note: '"Edit & re-classify" not visible' };
  if (await btn.isDisabled()) {
    return { repaired: false, note: '"Edit & re-classify" disabled' };
  }
  await btn.click();
  // Form modal opens. Submit without changes (re-classify).
  const submit = page.getByRole('button', { name: /Save & re-classify/i }).first();
  if (!(await submit.isVisible().catch(() => false))) return { repaired: false, note: 'Repair modal did not open' };
  await submit.click();
  await page.waitForLoadState('networkidle');
  return { repaired: true };
}

export async function confirmMaf(page: Page): Promise<{ confirmed: boolean; note?: string }> {
  await waitForToolbarReady(page);
  const btn = page.getByRole('button', { name: /^Confirm enrolment$/i }).first();
  if (!(await btn.isVisible().catch(() => false))) return { confirmed: false, note: '"Confirm enrolment" not visible' };
  if (await btn.isDisabled()) {
    return { confirmed: false, note: '"Confirm enrolment" disabled' };
  }
  await btn.click();
  await page.waitForLoadState('networkidle');
  return { confirmed: true };
}

// ─────────────────────────── Convenience ───────────────────────────

export async function switchRole(page: Page, role: Role): Promise<void> {
  // setRole reads localStorage on the *current* origin, which only works
  // once a page in the live app is loaded. If the caller hasn't navigated
  // yet, bounce off `/` first.
  if (!page.url().startsWith('http')) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  }
  await setRole(page, role);
  await page.waitForLoadState('networkidle');
}

export function roleLabel(role: Role): string {
  return ROLE_LABEL[role];
}
