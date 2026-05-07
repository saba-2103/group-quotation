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

// Mock the role hook so each test can pin the active role.
let currentRole: Role = 'maker';
jest.mock('@/hooks/useRole', () => ({
  useRole: () => ({ role: currentRole, setRole: (r: Role) => (currentRole = r) }),
}));

// Stub the action handler — we only verify dispatch happens, not its effects.
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
  currentRole = 'maker';
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
];

const STATE_ACTIONS: Record<string, string[]> = {
  DRAFT: ['edit', 'send-for-approval'],
  SUBMITTED: ['submit'],
  ACCEPTED: ['finalize'],
};

const ROLE_ACTIONS: Record<string, string[]> = {
  maker: ['edit', 'send-for-approval'],
  checker: ['submit', 'finalize'],
  ops: [],
  viewer: [],
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
  it('Maker in DRAFT sees only Maker actions (Edit, Send for approval); Checker actions are HIDDEN', () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT' });
    expect(buttonByLabel('Edit')).not.toBeDisabled();
    expect(buttonByLabel('Send for approval')).not.toBeDisabled();
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: 'Finalize' })).toBeNull();
  });

  it('Checker in SUBMITTED sees Approve enabled; role-only actions for Maker (Edit) are HIDDEN, not disabled', () => {
    currentRole = 'checker';
    renderBar({ state: 'SUBMITTED' });
    // Approve is allowed in SUBMITTED for checker.
    expect(buttonByLabel('Approve')).not.toBeDisabled();
    // Edit is Maker-only — Checker doesn't see it at all (deck v2 spec).
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('Maker DRAFT with awaitingApproval=true locks edit + send-for-approval ("Awaiting checker approval")', () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT', awaitingApproval: true });
    const edit = buttonByLabel('Edit');
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute(
      'data-disabled-reason',
      'Awaiting checker approval',
    );
    // Approve is Checker-only — Maker doesn't see it at all under the
    // role-hide rule (deck v2). The button is absent from the toolbar.
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  it('Viewer sees no actions at all (role-hide rule applied to every action)', () => {
    currentRole = 'viewer';
    const { container } = renderBar({ state: 'DRAFT' });
    // No actions allowed for viewer → ActionBar returns null.
    expect(container).toBeEmptyDOMElement();
  });

  it('Checker clicking Approve in SUBMITTED dispatches the api-mutation through useActionHandler', async () => {
    currentRole = 'checker';
    renderBar({ state: 'SUBMITTED' });
    await userEvent.click(buttonByLabel('Approve'));
    expect(mockHandleAction).toHaveBeenCalledTimes(1);
    expect(mockHandleAction.mock.calls[0][0].id).toBe('submit');
  });

  it('Maker clicking Send-for-approval calls maker-checker.sendForApproval(entityType, entityId)', async () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT', entityId: 'Q42' });
    await userEvent.click(buttonByLabel('Send for approval'));
    expect(mockSendForApproval).toHaveBeenCalledWith('quote', 'Q42');
    expect(mockHandleAction).not.toHaveBeenCalled();
  });
});
