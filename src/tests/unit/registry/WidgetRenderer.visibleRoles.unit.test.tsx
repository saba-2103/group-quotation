import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { WidgetRegistry } from '@/components/registry/WidgetRegistry';
import type { WidgetConfig } from '@/types/widget';
import type { Role } from '@/types/group-pas/roles';

// `visibleRoles` is a renderer-level schema field added by PROP-0009. The
// renderer reads `useRole()` and short-circuits to null when the field is set
// and doesn't include the current role. When the field is omitted, the node
// renders for every role (the default).

function withQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

let currentRole: Role = 'sales';
jest.mock('@/hooks/useRole', () => ({
  useRole: () => ({ role: currentRole, setRole: (r: Role) => (currentRole = r) }),
}));

// Register a lightweight stub widget the tests can mount without pulling in
// the full data-table / section-group stack.
WidgetRegistry['visible-roles-test-stub'] = ({
  config,
}: { config: WidgetConfig }) => <div data-testid={config.id}>visible</div>;

beforeEach(() => {
  currentRole = 'sales';
});

function renderNode(visibleRoles?: Role[]) {
  const config: WidgetConfig = {
    id: 'node-x',
    type: 'visible-roles-test-stub',
    visibleRoles,
  };
  return render(withQuery(<WidgetRenderer config={config} />));
}

describe('WidgetRenderer visibleRoles gate', () => {
  it('renders the node when visibleRoles is omitted (default = visible to every role)', () => {
    currentRole = 'mph';
    renderNode(undefined);
    expect(screen.getByTestId('node-x')).toBeInTheDocument();
  });

  it('renders the node when the current role is in visibleRoles', () => {
    currentRole = 'sales';
    renderNode(['sales', 'partner_agent']);
    expect(screen.getByTestId('node-x')).toBeInTheDocument();
  });

  it('does NOT render the node when the current role is not in visibleRoles', () => {
    currentRole = 'mph';
    const { container } = renderNode(['sales', 'partner_agent']);
    expect(screen.queryByTestId('node-x')).toBeNull();
    // The renderer also doesn't leak its wrapping <div> when gated out.
    expect(container).toBeEmptyDOMElement();
  });

  it('treats visibleRoles: [] as an explicit empty allowlist — hidden from every role', () => {
    // The renderer treats [] as "no role is allowed" (no role can match an
    // empty list), so the node is hidden from everyone. This intentionally
    // inverts the "empty = no constraint" convention — see the WidgetConfig
    // .visibleRoles docs in src/types/widget.ts.
    currentRole = 'ops';
    const { container } = renderNode([]);
    expect(screen.queryByTestId('node-x')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});
