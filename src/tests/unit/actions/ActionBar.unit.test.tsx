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

beforeEach(() => {
  currentRole = 'maker';
  mockHandleAction.mockReset();
});

const ACTIONS: ActionConfig[] = [
  { id: 'edit', label: 'Edit', type: 'open-modal', target: 'edit-quote' },
  {
    // Visible-but-disabled per disabledTooltip — surfaces a backend gap
    // without simulating the missing behavior in mock.
    id: 'send-for-approval',
    label: 'Send for approval',
    type: 'api-mutation',
    api: { endpoint: '/api/quotation/quotes/Q1/submit', method: 'POST' },
    disabledTooltip: 'Quote-level approval not yet wired on backend',
  },
  {
    id: 'submit',
    label: 'Submit',
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
  DRAFT: ['edit', 'send-for-approval', 'submit'],
  SUBMITTED: ['finalize'],
  ACCEPTED: ['finalize'],
};

const ROLE_ACTIONS: Record<string, string[]> = {
  maker: ['edit', 'send-for-approval', 'submit'],
  checker: ['submit', 'finalize'],
  ops: [],
  viewer: [],
};

function renderBar(overrides: Partial<{ state: string }> = {}) {
  const config: WidgetConfig = {
    id: 'qte-actions',
    type: 'action-bar',
    props: {
      state: overrides.state ?? 'DRAFT',
      stateActions: STATE_ACTIONS,
      roleActions: ROLE_ACTIONS,
      actions: ACTIONS,
    },
  } as unknown as WidgetConfig;
  return render(withQueryClient(<ActionBar config={config} />));
}

function buttonByLabel(label: string): HTMLButtonElement {
  const toolbar = screen.getByRole('toolbar');
  return within(toolbar).getByRole('button', { name: label }) as HTMLButtonElement;
}

describe('ActionBar', () => {
  it('Maker in DRAFT sees their actions; Checker-only actions are HIDDEN', () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT' });
    expect(buttonByLabel('Edit')).not.toBeDisabled();
    expect(buttonByLabel('Submit')).not.toBeDisabled();
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Finalize' })).toBeNull();
  });

  it('Checker in DRAFT sees only their submit; Maker-only actions are HIDDEN', () => {
    currentRole = 'checker';
    renderBar({ state: 'DRAFT' });
    expect(buttonByLabel('Submit')).not.toBeDisabled();
    const toolbar = screen.getByRole('toolbar');
    expect(within(toolbar).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: 'Send for approval' })).toBeNull();
  });

  it('Action with disabledTooltip renders disabled with the supplied tooltip text, regardless of state allow-list', () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT' });
    const sendForApproval = buttonByLabel('Send for approval');
    expect(sendForApproval).toBeDisabled();
    expect(sendForApproval).toHaveAttribute(
      'data-disabled-reason',
      'Quote-level approval not yet wired on backend',
    );
  });

  it('State-gated action (no disabledTooltip) renders disabled with the standard "Not available in <state>" tooltip', () => {
    currentRole = 'maker';
    renderBar({ state: 'SUBMITTED' });
    // submit is in maker roleActions but not in SUBMITTED stateActions.
    const submit = buttonByLabel('Submit');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute(
      'data-disabled-reason',
      'Not available in SUBMITTED',
    );
  });

  it('Viewer sees no actions at all (role-hide rule applied to every action)', () => {
    currentRole = 'viewer';
    const { container } = renderBar({ state: 'DRAFT' });
    expect(container).toBeEmptyDOMElement();
  });

  it('Clicking an enabled action dispatches through useActionHandler', async () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT' });
    await userEvent.click(buttonByLabel('Submit'));
    expect(mockHandleAction).toHaveBeenCalledTimes(1);
    expect(mockHandleAction.mock.calls[0][0].id).toBe('submit');
  });

  it('Disabled-by-tooltip action does not dispatch when wrapper is clicked', async () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT' });
    await userEvent.click(buttonByLabel('Send for approval'));
    expect(mockHandleAction).not.toHaveBeenCalled();
  });
});
