'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  USER_ROLES,
  ROLE_SWITCHER_PERSONAS,
  type UserRole,
  type SalesLevel,
  type RoleSwitcherPersona,
} from '@/types/group-pas/roles';
import { useWidgetState } from '@/hooks/useWidgetState';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  salesLevel?: SalesLevel;
  avatar?: string;
}

export interface AuthContextValue {
  user: AuthUser;
  setUser: (next: AuthUser) => void;
  switchRole: (role: UserRole) => void;
  switchPersona: (persona: RoleSwitcherPersona) => void;
}

// ── Mock users ────────────────────────────────────────────────────────────────

export const MOCK_USERS: Record<string, AuthUser> = {
  SALES: {
    id: 'usr-sales-l2',
    name: 'Jordan Sales',
    email: 'jordan.l2@ins.com',
    role: 'SALES',
    salesLevel: 2,
  },
  UNDERWRITER: {
    id: 'usr-uw-001',
    name: 'Jordan Lee',
    email: 'jordan.lee@ins.com',
    role: 'UNDERWRITER',
  },
  ACTUARY: {
    id: 'usr-act-001',
    name: 'Sam Patel',
    email: 'sam.patel@ins.com',
    role: 'ACTUARY',
  },
  ACTUARIAL: {
    id: 'usr-act-001',
    name: 'Sam Patel',
    email: 'sam.patel@ins.com',
    role: 'ACTUARIAL',
  },
  OPS: {
    id: 'usr-ops-001',
    name: 'Riley Ops',
    email: 'riley.ops@ins.com',
    role: 'OPS',
  },
  ADMIN: {
    id: 'usr-adm-001',
    name: 'Chris Admin',
    email: 'chris.admin@ins.com',
    role: 'ADMIN',
  },
  BROKER: {
    id: 'usr-brk-001',
    name: 'Priya Broker',
    email: 'priya@brokerco.com',
    role: 'BROKER',
  },
  MPH: {
    id: 'usr-mph-001',
    name: 'Vimal MPH',
    email: 'vimal@mph.com',
    role: 'MPH',
  },
  REINSURER: {
    id: 'usr-rei-001',
    name: 'Ravi Reinsurer',
    email: 'ravi@reinco.com',
    role: 'REINSURER',
  },
  PARTNER_AGENT: {
    id: 'usr-pa-001',
    name: 'Morgan Kim',
    email: 'morgan.kim@partnerco.com',
    role: 'PARTNER_AGENT',
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'group-pas:auth-role';
const STORAGE_LEVEL_KEY = 'group-pas:auth-sales-level';
const ROLE_STATE_KEY = 'global:current-role';
const DEFAULT_ROLE: UserRole = 'SALES';
const DEFAULT_SALES_LEVEL: SalesLevel = 2;

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredRole(): UserRole {
  if (typeof window === 'undefined') return DEFAULT_ROLE;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (USER_ROLES as string[]).includes(stored)) {
    return stored as UserRole;
  }
  return DEFAULT_ROLE;
}

function readStoredSalesLevel(): SalesLevel {
  if (typeof window === 'undefined') return DEFAULT_SALES_LEVEL;
  const stored = window.localStorage.getItem(STORAGE_LEVEL_KEY);
  const n = Number(stored);
  if ([0, 1, 2, 3, 4, 5].includes(n)) return n as SalesLevel;
  return DEFAULT_SALES_LEVEL;
}

function personaToUser(p: RoleSwitcherPersona): AuthUser {
  return { id: p.id, name: p.name, email: p.email, role: p.role, salesLevel: p.salesLevel };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser>({
    ...MOCK_USERS[DEFAULT_ROLE],
    salesLevel: DEFAULT_SALES_LEVEL,
  });

  // Hydration-safe: SSR sees DEFAULT_ROLE; effect upgrades to stored value.
  useEffect(() => {
    const storedRole = readStoredRole();
    const storedLevel = readStoredSalesLevel();
    const base = MOCK_USERS[storedRole] ?? MOCK_USERS[DEFAULT_ROLE];
    const hydrated: AuthUser = {
      ...base,
      salesLevel: storedRole === 'SALES' ? storedLevel : base.salesLevel,
    };
    setUserState(hydrated);
    useWidgetState.getState().setValue(ROLE_STATE_KEY, storedRole);
  }, []);

  const setUser = useCallback((next: AuthUser) => {
    setUserState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next.role);
      if (next.salesLevel !== undefined) {
        window.localStorage.setItem(STORAGE_LEVEL_KEY, String(next.salesLevel));
      }
    }
    useWidgetState.getState().setValue(ROLE_STATE_KEY, next.role);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    const base = MOCK_USERS[role] ?? MOCK_USERS[DEFAULT_ROLE];
    setUser(base);
  }, [setUser]);

  const switchPersona = useCallback((persona: RoleSwitcherPersona) => {
    setUser(personaToUser(persona));
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, setUser, switchRole, switchPersona }),
    [user, setUser, switchRole, switchPersona],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const FALLBACK: AuthContextValue = {
  user: { ...MOCK_USERS[DEFAULT_ROLE], salesLevel: DEFAULT_SALES_LEVEL },
  setUser: () => {},
  switchRole: () => {},
  switchPersona: () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  return ctx ?? FALLBACK;
}

