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

import { ROLES, type Role } from '@/types/group-pas/roles';
import { useWidgetState } from '@/hooks/useWidgetState';

const STORAGE_KEY = 'group-pas:current-role';
// Schemas can subscribe via `stateDependencies: ['global:current-role']` and
// gate on `{ "==": [{ "var": "global:current-role" }, "sales"] }` without each
// widget having to consume React context directly. Documented in
// docs/STATE_MANAGEMENT_GUIDE.md + docs/schema-design-reference/07.
const ROLE_STATE_KEY = 'global:current-role';
const DEFAULT_ROLE: Role = 'sales';

export interface RoleContextValue {
  role: Role;
  setRole: (next: Role) => void;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function readStoredRole(): Role {
  if (typeof window === 'undefined') return DEFAULT_ROLE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (ROLES as string[]).includes(stored)) {
    return stored as Role;
  }
  return DEFAULT_ROLE;
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
