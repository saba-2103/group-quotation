'use client';

// RoleContext — thin bridge so existing useRole() consumers continue to work.
// Provides currentRole, salesLevel, userId, userName in addition to the legacy
// role/setRole pair.

import {
  createContext,
  type ReactNode,
} from 'react';

import type { UserRole, SalesLevel } from '@/types/group-pas/roles';
import type { Role } from '@/types/group-pas/roles';
import { MockAuthProvider, useAuth } from '@/contexts/AuthContext';

export interface RoleContextValue {
  role: Role;
  setRole: (next: Role) => void;
  // ── Extended fields (Group Quotation module) ──
  currentRole: UserRole;
  salesLevel: SalesLevel;
  userId: string;
  userName: string;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

// RoleBridge reads from the AuthContext and republishes via RoleContext so
// useRole() still works in existing widgets without changes.
function RoleBridge({ children }: { children: ReactNode }) {
  const { user, switchRole } = useAuth();
  const value: RoleContextValue = {
    role: user.role,
    setRole: (next) => switchRole(next),
    currentRole: user.role,
    salesLevel: (user.salesLevel ?? 0) as SalesLevel,
    userId: user.id,
    userName: user.name,
  };
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// RoleProvider now wraps MockAuthProvider + the bridge so the layout import
// doesn't need to change.
export function RoleProvider({ children }: { children: ReactNode }) {
  return (
    <MockAuthProvider>
      <RoleBridge>{children}</RoleBridge>
    </MockAuthProvider>
  );
}

