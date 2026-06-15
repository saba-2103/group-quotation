'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useBreadcrumbStore } from '@/stores/breadcrumbStore';

/** Sub-pages that live directly under /rfq2/ and are NOT rfq detail pages. */
const KNOWN_SUBPAGES = new Set([
  'quotes', 'dashboard', 'workbench', 'approvals', 'referrals',
  'member-quotes', 'proposals', 'issuance', 'documents',
  'analytics', 'reports', 'health', 'clients', 'products', 'plan-templates',
]);

export default function Rfq2Layout({ children }: { children: React.ReactNode }) {
  const setLabel = useBreadcrumbStore((s) => s.setLabel);
  const setInsertAfter = useBreadcrumbStore((s) => s.setInsertAfter);
  const clearInsertAfter = useBreadcrumbStore((s) => s.clearInsertAfter);
  const pathname = usePathname();

  useEffect(() => {
    setLabel('rfq2', 'Policy');
  }, [setLabel]);

  useEffect(() => {
    // For rfq/version detail pages (/rfq2/[rfqId] or /rfq2/[rfqId]/[versionId])
    // inject a virtual "Quotes" crumb between "Policy" and the rfqId.
    const segments = pathname.split('/').filter(Boolean);
    const afterRfq2 = segments[1]; // segment immediately after 'rfq2'
    if (afterRfq2 && !KNOWN_SUBPAGES.has(afterRfq2)) {
      setInsertAfter('rfq2', { label: 'Quotes', href: '/rfq2/quotes' });
    } else {
      clearInsertAfter('rfq2');
    }
  }, [pathname, setInsertAfter, clearInsertAfter]);

  return <>{children}</>;
}
