'use client';

import { useContext } from 'react';

import { RoleContext, type RoleContextValue } from '@/contexts/RoleContext';

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used inside <RoleProvider>');
  }
  return ctx;
}
