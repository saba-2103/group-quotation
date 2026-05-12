'use client';

// V1 demo role context. Backend-enforced auth is out of V1 (CORE_MEMORY scope-locks);
// the active role is held in React state + persisted to localStorage so a refresh
// keeps the demoer's chosen role. Replace with Keycloak-driven role claims post-V1.

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ROLES, type Role } from '@/types/role';
import { useWidgetState } from '@/hooks/useWidgetState';

const STORAGE_KEY = 'keystone:current-role';
// Schemas can subscribe via `stateDependencies: ['global:current-role']` and
// gate on `{ "==": [{ "var": "global:current-role" }, "maker"] }` without each
// widget having to consume React context directly.
const ROLE_STATE_KEY = 'global:current-role';
const DEFAULT_ROLE: Role = 'maker';

export interface RoleContextValue {
  role: Role;
  setRole: (next: Role) => void;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function readStoredRole(): Role {
  if (typeof window === 'undefined') return DEFAULT_ROLE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  // Validate against ROLES so adding a new role to @/types/role automatically
  // extends what we accept from localStorage — no hand-rolled string union
  // to keep in sync.
  return (ROLES as readonly string[]).includes(stored ?? '')
    ? (stored as Role)
    : DEFAULT_ROLE;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  // Hydration-safe: SSR sees DEFAULT_ROLE; effect upgrades to the stored value
  // on the first client render.
  const [role, setRoleState] = useState<Role>(DEFAULT_ROLE);

  useEffect(() => {
    const stored = readStoredRole();
    setRoleState(stored);
    // Publish into useWidgetState so schemas can subscribe via the
    // `global:current-role` key (see comment by ROLE_STATE_KEY).
    useWidgetState.getState().setValue(ROLE_STATE_KEY, stored);
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    useWidgetState.getState().setValue(ROLE_STATE_KEY, next);
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
