import { NextRequest } from 'next/server';
import { getStore } from '../store';
import type { MPHUser, MPHRole } from '../types';

export interface AuthContext {
  user: MPHUser;
  organizationId: string;
  role: MPHRole;
  policyScope: string[];
}

export function getAuthContext(req: NextRequest): AuthContext | null {
  const store = getStore();

  // Dev mock mode: resolve user from header, then cookie, then default to super-admin
  const userId =
    req.headers.get('x-mph-user') ??
    req.cookies.get('mph-dev-user')?.value;
  const user = userId
    ? store.users.find((u) => u.id === userId)
    : store.users.find((u) => u.role === 'super-admin');

  if (!user || user.status !== 'Active') return null;

  return {
    user,
    organizationId: user.organizationId,
    role: user.role,
    policyScope: user.policyScope,
  };
}

export function requireAuth(req: NextRequest): AuthContext {
  const ctx = getAuthContext(req);
  if (!ctx) throw new AuthError(401, 'Unauthorized');
  return ctx;
}

export function requireRole(ctx: AuthContext, ...roles: MPHRole[]): void {
  if (!roles.includes(ctx.role)) {
    throw new AuthError(403, `Forbidden: requires role ${roles.join(' or ')}`);
  }
}

export function requirePolicyAccess(ctx: AuthContext, policyId: string): void {
  if (!ctx.policyScope.includes(policyId)) {
    throw new AuthError(403, 'Forbidden: policy not in scope');
  }
}

export function canWrite(role: MPHRole): boolean {
  return role === 'super-admin' || role === 'maker';
}

export function canApprove(role: MPHRole): boolean {
  return role === 'super-admin' || role === 'approver';
}

export function isMakerCheckerValid(makerId: string, approverId: string): boolean {
  return makerId !== approverId;
}

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
