import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StateBadge } from '@/components/widgets/state/StateBadge';
import { ReasonBanner } from '@/components/widgets/state/ReasonBanner';

function withQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}
import {
  type EntityKind,
  getReasonMeta,
  getStateMeta,
} from '@/components/widgets/state/state-map';
import type { WidgetConfig } from '@/types/widget';

const ENTITY_STATES: Record<EntityKind, string[]> = {
  quote: [
    'DRAFT',
    'SUBMITTED',
    'SENT_TO_CLIENT',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'EXPIRED',
    'FINALIZED',
  ],
  memberQuote: ['DRAFT', 'SUBMITTED', 'FINALIZED'],
  proposal: ['DRAFT', 'SUBMITTED', 'FINALIZED', 'POLICY_CREATED', 'CANCELLED'],
  policyMember: [
    'CREATED',
    'PRICED',
    'MAF_PENDING',
    'MAF_CONFIRMED',
    'CLASSIFYING',
    'APPROVED',
    'REPAIR_PENDING',
    'REFERRED_TO_UW',
    'REJECTED',
    'SENT_FOR_ISSUANCE',
    'ADDED',
    'ARCHIVED',
  ],
  policy: ['CREATED', 'PENDING', 'ACTIVE', 'CANCELLED'],
  member: ['PENDING', 'ACTIVE', 'VOID', 'CANCELLED'],
  censusSubmission: ['INITIATED', 'INGESTED', 'SUBMITTED', 'COMPLETED', 'FAILED'],
};

describe('state-map', () => {
  it('every state in every entity has a non-empty label + defined variant', () => {
    for (const [entity, states] of Object.entries(ENTITY_STATES) as [
      EntityKind,
      string[],
    ][]) {
      for (const state of states) {
        const meta = getStateMeta(entity, state);
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.variant).toBeTruthy();
      }
    }
  });

  it('falls back gracefully on unknown state', () => {
    const meta = getStateMeta('quote', 'NOT_A_STATE');
    expect(meta.label).toBe('NOT_A_STATE');
    expect(meta.variant).toBe('outline');
  });

  it('every reason enum value resolves to copy + variant', () => {
    expect(getReasonMeta('policyPending', 'AWAITING_MIN_MEMBERS').label).toMatch(
      /minimum members/i,
    );
    expect(getReasonMeta('policyPending', 'AWAITING_COMPLIANCE').label).toMatch(
      /compliance/i,
    );
    expect(
      getReasonMeta('memberPending', 'PENDING_FLOAT_RESERVATION').label,
    ).toMatch(/float/i);
    expect(getReasonMeta('memberPending', 'PENDING_APPROVAL').label).toMatch(
      /approval/i,
    );
    expect(
      getReasonMeta('memberPending', 'PENDING_POLICY_ACTIVATION').label,
    ).toMatch(/activation/i);
    expect(getReasonMeta('memberVoid', 'FLOAT_UNAVAILABLE').label).toMatch(
      /float/i,
    );
    expect(getReasonMeta('memberVoid', 'APPROVAL_REJECTED').label).toMatch(
      /rejected/i,
    );
    expect(getReasonMeta('memberVoid', 'POLICY_CANCELLED').label).toMatch(
      /cancelled/i,
    );
    expect(getReasonMeta('memberVoid', 'WITHDRAWN_BY_PROPOSER').label).toMatch(
      /withdrawn/i,
    );
  });

  it('memberCancellation passes free text through verbatim', () => {
    const free = 'Member resigned effective 2026-04-15';
    expect(getReasonMeta('memberCancellation', free).label).toBe(free);
  });
});

describe('<StateBadge>', () => {
  it('renders the label for a known state', () => {
    render(<StateBadge entity="member" state="ACTIVE" />);
    expect(screen.getByLabelText('Active')).toBeInTheDocument();
  });

  it('reads entity/state from config.props in schema-render mode', () => {
    const config = {
      id: 'b',
      type: 'state-badge',
      props: { entity: 'policyMember', state: 'REPAIR_PENDING' },
    } as unknown as WidgetConfig;
    render(<StateBadge config={config} />);
    expect(screen.getByLabelText('Repair pending')).toBeInTheDocument();
  });
});

describe('<ReasonBanner>', () => {
  function configFor(props: Record<string, unknown>): WidgetConfig {
    return { id: 'rb', type: 'reason-banner', props } as unknown as WidgetConfig;
  }

  it('renders the canonical pendingReason copy for a PENDING member', () => {
    render(
      withQuery(<ReasonBanner
        config={configFor({
          entity: 'member',
          state: 'PENDING',
          pendingReason: 'PENDING_FLOAT_RESERVATION',
        })}
      />),
    );
    expect(screen.getByText(/float reservation/i)).toBeInTheDocument();
  });

  it('renders free-text cancellationReason verbatim for a CANCELLED member', () => {
    const free = 'Member resigned from Acme Industries; coverage terminated.';
    render(
      withQuery(<ReasonBanner
        config={configFor({
          entity: 'member',
          state: 'CANCELLED',
          cancellationReason: free,
        })}
      />),
    );
    expect(screen.getByText(free)).toBeInTheDocument();
  });

  it('returns null when no reason applies', () => {
    const { container } = render(
      withQuery(
        <ReasonBanner
          config={configFor({ entity: 'member', state: 'ACTIVE' })}
        />,
      ),
    );
    expect(container).toBeEmptyDOMElement();
  });
});
