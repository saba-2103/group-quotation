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

import type { Role } from '@/types/role';

const STORAGE_KEY = 'keystone:current-role';
const DEFAULT_ROLE: Role = 'maker';

export interface RoleContextValue {
  role: Role;
  setRole: (next: Role) => void;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function readStoredRole(): Role {
  if (typeof window === 'undefined') return DEFAULT_ROLE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'maker' || stored === 'checker' || stored === 'ops' || stored === 'viewer') {
    return stored;
  }
  return DEFAULT_ROLE;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  // Hydration-safe: SSR sees DEFAULT_ROLE; effect upgrades to the stored value
  // on the first client render.
  const [role, setRoleState] = useState<Role>(DEFAULT_ROLE);

  useEffect(() => {
    setRoleState(readStoredRole());
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
