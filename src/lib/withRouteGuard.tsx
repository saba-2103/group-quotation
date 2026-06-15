'use client';

// Route guard HOC and hook for the Group PAS – Group Quotation module.
// All guards are client-enforced (per spec).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import type { UserRole, SalesLevel } from '@/types/group-pas/roles';
import { isInternalRole } from '@/lib/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteGuardConfig {
  /** Roles allowed to access this route. Empty array = all internal roles. */
  allowedRoles: UserRole[];
  /** Minimum sales level required (only checked when role === 'SALES'). */
  minSalesLevel?: SalesLevel;
  /** Where to redirect on failure. Defaults to /rfqs. */
  redirectTo?: string;
}

// ─── Route guard map ─────────────────────────────────────────────────────────

export const routeGuards: Record<string, RouteGuardConfig> = {
  '/rfqs': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/new': {
    allowedRoles: ['SALES', 'ADMIN'],
  },
  '/rfqs/[rfqId]': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/key-data': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/additional-info': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/subsidiaries': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/census-workbench': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/members': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/headcount': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/claims-experience': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/profile': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/versions': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/versions/[versionId]/freeze': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 2,
  },
  '/rfqs/[rfqId]/plans': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/commercial-rate-card': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/scenarios': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/sales-dispatch': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 1,
  },
  '/rfqs/[rfqId]/sales-dispatch/raise': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 1,
  },
  '/rfqs/[rfqId]/negotiation': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/negotiation/accept': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 2,
  },
  '/rfqs/[rfqId]/negotiation/decline': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 2,
  },
  '/rfqs/[rfqId]/policy-config': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/policy-details': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/policy-flags': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 2,
  },
  '/rfqs/[rfqId]/documents': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/quote-pack': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/quote-letter': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/issuance': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/rfqs/[rfqId]/final-placement': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/plan-templates': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/plan-templates/new': {
    allowedRoles: ['ADMIN'],
  },
  '/products': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/my-desk': {
    allowedRoles: ['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'OPS', 'ADMIN'],
  },
  '/sales-cockpit': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 5,
  },
  '/sales-cockpit/assignment': {
    allowedRoles: ['SALES', 'ADMIN'],
    minSalesLevel: 5,
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useRouteGuard — redirect if the current user is not authorized.
 *
 * @param allowedRoles   List of roles that may view this page.
 * @param minSalesLevel  Minimum sales level required (SALES only).
 * @param redirectTo     Destination on access denial. Defaults to /rfqs.
 */
export function useRouteGuard(
  allowedRoles: UserRole[],
  minSalesLevel?: SalesLevel,
  redirectTo = '/rfqs',
): void {
  const { currentRole, salesLevel } = useRole();
  const router = useRouter();

  useEffect(() => {
    // External roles are always redirected
    if (!isInternalRole(currentRole)) {
      router.replace(redirectTo);
      return;
    }
    if (!allowedRoles.includes(currentRole)) {
      router.replace(redirectTo);
      return;
    }
    if (
      currentRole === 'SALES' &&
      minSalesLevel !== undefined &&
      salesLevel < minSalesLevel
    ) {
      router.replace(redirectTo);
    }
  }, [currentRole, salesLevel, allowedRoles, minSalesLevel, redirectTo, router]);
}

// ─── HOC ──────────────────────────────────────────────────────────────────────

/**
 * withRouteGuard — wraps a page component with an access check.
 *
 * Usage:
 *   export default withRouteGuard(MyPage, { allowedRoles: ['SALES', 'ADMIN'] });
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>,
  config: RouteGuardConfig,
): React.FC<P> {
  const Guarded: React.FC<P> = (props) => {
    useRouteGuard(
      config.allowedRoles,
      config.minSalesLevel,
      config.redirectTo ?? '/rfqs',
    );
    return <Component {...props} />;
  };
  Guarded.displayName = `withRouteGuard(${Component.displayName ?? Component.name})`;
  return Guarded;
}
