'use client';

import { useContext } from 'react';

import { RoleContext, type RoleContextValue } from '@/contexts/RoleContext';

// Fallback identity for widgets that render outside the RoleProvider tree.
// PROP-0009 added useRole() inside WidgetRenderer; any widget that mounts
// via a portal (Radix Dialog/Dropdown content, Toaster slot, etc.) can land
// outside the provider subtree even though the rest of the page is inside
// it. Throwing here would crash the whole modal — we'd rather degrade
// gracefully to a default identity that hides role-gated content.
const FALLBACK: RoleContextValue = {
  role: 'sales',
  setRole: () => {
    // No-op: a portal-mounted widget has no business mutating the active
    // role. The real provider's setRole is reachable through useRole calls
    // that happen inside the provider tree (which is the 99% case).
  },
};

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  return ctx ?? FALLBACK;
}
