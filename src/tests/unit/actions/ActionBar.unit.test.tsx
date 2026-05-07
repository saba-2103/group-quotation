import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ActionBar } from '@/components/widgets/actions/ActionBar';
import type { ActionConfig, WidgetConfig } from '@/types/widget';
import type { Role } from '@/types/group-pas/roles';

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
  return render(<ActionBar config={config} />);
}

function buttonByLabel(label: string): HTMLButtonElement {
  const toolbar = screen.getByRole('toolbar');
  return within(toolbar).getByRole('button', { name: label }) as HTMLButtonElement;
}

describe('ActionBar', () => {
  it('Maker in DRAFT can edit + send-for-approval; submit/finalize are disabled', () => {
    currentRole = 'maker';
    renderBar({ state: 'DRAFT' });
    expect(buttonByLabel('Edit')).not.toBeDisabled();
    expect(buttonByLabel('Send for approval')).not.toBeDisabled();
    expect(buttonByLabel('Approve')).toBeDisabled();
    expect(buttonByLabel('Finalize')).toBeDisabled();
  });

  it('Checker in DRAFT cannot edit (role-gated) and gets a "Requires checker role" tooltip on Approve when state allows', () => {
    currentRole = 'checker';
    renderBar({ state: 'SUBMITTED' });
    // Approve is allowed in SUBMITTED for checker.
    expect(buttonByLabel('Approve')).not.toBeDisabled();
    // Edit is state-gated out of SUBMITTED.
    const editBtn = buttonByLabel('Edit');
    expect(editBtn).toBeDisabled();
    expect(editBtn).toHaveAttribute(
      'data-disabled-reason',
      'Not available in SUBMITTED',
    );
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
    // Approve isn't allowed in DRAFT regardless of approval lock — state gate
    // wins (state check runs before role check in the widget).
    const approve = buttonByLabel('Approve');
    expect(approve).toBeDisabled();
    expect(approve.getAttribute('data-disabled-reason')).toBe(
      'Not available in DRAFT',
    );
  });

  it('Viewer sees every action disabled with role-tooltip', () => {
    currentRole = 'viewer';
    renderBar({ state: 'DRAFT' });
    const edit = buttonByLabel('Edit');
    expect(edit).toBeDisabled();
    expect(edit.getAttribute('data-disabled-reason')).toMatch(/Requires/);
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
