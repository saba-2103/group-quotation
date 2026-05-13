import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ActionBar } from '@/components/widgets/actions/ActionBar';
import type { ActionConfig, WidgetConfig } from '@/types/widget';
import type { Role } from '@/types/group-pas/roles';

function withQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

// Renamed in PROP-0009: V1 'maker' is now 'sales'; V1 'checker' is now 'mph'.
// The role-asymmetric awaitingApproval lock survives the rename — 'sales'
// is the locked side, 'mph' is the unlocking side.
let currentRole: Role = 'sales';
jest.mock('@/hooks/useRole', () => ({
  useRole: () => ({ role: currentRole, setRole: (r: Role) => (currentRole = r) }),
}));

const mockHandleAction = jest.fn();
jest.mock('@/hooks/useActionHandler', () => ({
  useActionHandler: () => mockHandleAction,
}));

// Stub the maker-checker helper so tests don't hit the network.
const mockSendForApproval = jest.fn().mockResolvedValue(undefined);
const mockClearApproval = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/maker-checker', () => ({
  sendForApproval: (...args: unknown[]) => mockSendForApproval(...args),
  clearApproval: (...args: unknown[]) => mockClearApproval(...args),
}));

beforeEach(() => {
  currentRole = 'sales';
  mockHandleAction.mockReset();
  mockSendForApproval.mockReset();
  mockClearApproval.mockReset();
});

const ACTIONS: ActionConfig[] = [
  { id: 'edit', label: 'Edit', type: 'open-modal', target: 'edit-quote' },
  {
    id: 'send-for-approval',
    label: 'Send for approval',
    type: 'trigger-event',
    target: 'send-for-approval',
  },
  {
    id: 'submit',
    label: 'Approve',
    type: 'api-mutation',
    api: { endpoint: '/api/quotation/quotes/Q1/submit', method: 'POST' },
  },
  {
    id: 'finalize',
    label: 'Finalize',
    type: 'api-mutation',
    api: { endpoint: '/api/quotation/quotes/Q1/finalize', method: 'POST' },
  },
  {
    // Backend-gap surfacing — disabledTooltip wins over state allow-list.
    id: 'request-price',
    label: 'Request price',
    type: 'api-mutation',
    api: { endpoint: '/api/quotation/quotes/Q1/request-price', method: 'POST' },
    disabledTooltip: 'Rule Engine not yet wired on backend',
  },
];

// Test fixture mirrors the real Quote workflow:
//   DRAFT  → Maker edits + sends for approval; Checker (after maker submits)
//            calls `submit` (Approve) which transitions DRAFT → SUBMITTED.
//   SUBMITTED is post-submit; Checker's next action would be 'send-to-client'
//   etc. — represented here by `finalize` for brevity.
//
// `submit` is special-cased in ActionBar: only visible to Checker when
// awaitingApproval=true (symmetric to the Maker lock).
const STATE_ACTIONS: Record<string, string[]> = {
  DRAFT: ['edit', 'send-for-approval', 'submit', 'request-price'],
  SUBMITTED: ['finalize'],
  ACCEPTED: ['finalize'],
};

const ROLE_ACTIONS: Record<string, string[]> = {
  sales: ['edit', 'send-for-approval', 'request-price'],
  partner_agent: [],
  mph: ['submit', 'finalize'],
  member: [],
  uw: [],
  ops: [],
};

function renderBar(overrides: Partial<{
  state: string;
  awaitingApproval: boolean;
  entityId: string;
}> = {}) {
  const config: WidgetConfig = {
    id: 'qte-actions',
    type: 'action-bar',
    props: {
      state: overrides.state ?? 'DRAFT',
      stateActions: STATE_ACTIONS,
      roleActions: ROLE_ACTIONS,
      actions: ACTIONS,
      awaitingApproval: overrides.awaitingApproval ?? false,
      entityType: 'quote',
      entityId: overrides.entityId ?? 'Q1',
    },
  } as unknown as WidgetConfig;
  return render(withQueryClient(<ActionBar config={config} />));
}

function buttonByLabel(label: string): HTMLButtonElement {
  const toolbar = screen.getByRole('toolbar');
  return within(toolbar).getByRole('button', { name: label }) as HTMLButtonElement;
}

describe('ActionBar', () => {
  it('Sales in DRAFT sees only Sales actions (Edit, Send for approval); MPH actions are HIDDEN', () => {
    currentRole = 'sales';
    renderBar({ state: 'DRAFT' });
    expect(buttonByLabel('Edit')).not.toBeDisabled();
    expect(buttonByLabel('Send for approval')).not.toBeDisabled();
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: 'Finalize' })).toBeNull();
  });

  it('MPH in DRAFT awaitingApproval=true sees Approve; Sales-only actions are HIDDEN', () => {
    currentRole = 'mph';
    renderBar({ state: 'DRAFT', awaitingApproval: true });
    expect(buttonByLabel('Approve')).not.toBeDisabled();
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('MPH in DRAFT awaitingApproval=false does NOT see Approve (symmetric to sales lock)', () => {
    currentRole = 'mph';
    renderBar({ state: 'DRAFT', awaitingApproval: false });
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  it('Sales DRAFT with awaitingApproval=true locks edit + send-for-approval ("Awaiting MPH approval")', () => {
    currentRole = 'sales';
    renderBar({ state: 'DRAFT', awaitingApproval: true });
    const edit = buttonByLabel('Edit');
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute(
      'data-disabled-reason',
      'Awaiting MPH approval',
    );
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  it('Action with disabledTooltip renders disabled with the supplied tooltip text, even when state-gating would allow it', () => {
    currentRole = 'sales';
    renderBar({ state: 'DRAFT' });
    const requestPrice = buttonByLabel('Request price');
    expect(requestPrice).toBeDisabled();
    expect(requestPrice).toHaveAttribute(
      'data-disabled-reason',
      'Rule Engine not yet wired on backend',
    );
  });

  it('Role with no roleActions entry (e.g. member here) sees no actions at all (role-hide rule applied to every action)', () => {
    currentRole = 'member';
    const { container } = renderBar({ state: 'DRAFT' });
    expect(container).toBeEmptyDOMElement();
  });

  it('MPH clicking Approve in DRAFT awaitingApproval=true dispatches the api-mutation through useActionHandler', async () => {
    currentRole = 'mph';
    renderBar({ state: 'DRAFT', awaitingApproval: true });
    await userEvent.click(buttonByLabel('Approve'));
    expect(mockHandleAction).toHaveBeenCalledTimes(1);
    expect(mockHandleAction.mock.calls[0][0].id).toBe('submit');
  });

  it('Sales clicking Send-for-approval calls maker-checker.sendForApproval(entityType, entityId)', async () => {
    currentRole = 'sales';
    renderBar({ state: 'DRAFT', entityId: 'Q42' });
    await userEvent.click(buttonByLabel('Send for approval'));
    expect(mockSendForApproval).toHaveBeenCalledWith('quote', 'Q42');
    expect(mockHandleAction).not.toHaveBeenCalled();
  });
});
