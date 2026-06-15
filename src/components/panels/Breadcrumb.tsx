'use client';

// P-CRUMB — breadcrumb panel component for the Group Quotation module.
// Reads the current pathname and renders a human-readable trail.
// Dynamic segments (rfqId, memberNumber, etc.) are resolved to labels where
// a bundle context is available; otherwise the raw segment is shown.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

// ─── Segment → label map ──────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  rfqs: 'RFQs',
  'key-data': 'Quote Key Data',
  'additional-info': 'MPH Categorisation',
  subsidiaries: 'Subsidiaries',
  'census-workbench': 'Census Workbench',
  members: 'Members',
  headcount: 'Headcount',
  'claims-experience': 'Claims Experience',
  'large-losses': 'Large Losses',
  profile: 'Deal Profile',
  versions: 'Quote Versions',
  plans: 'Plans',
  'commercial-rate-card': 'Commercial Rate Card',
  scenarios: 'Scenarios',
  'sales-dispatch': 'Sales Dispatch',
  negotiation: 'Negotiation',
  'policy-config': 'Policy Config',
  'policy-details': 'Policy Details',
  'policy-flags': 'Policy Flags',
  documents: 'Documents',
  'quote-pack': 'Quote Pack',
  'quote-letter': 'Quote Letter',
  issuance: 'Sign & Issue',
  'final-placement': 'Final Placement',
  new: 'New',
  freeze: 'Freeze Version',
  accept: 'Accept & Align',
  decline: 'Decline',
  mapping: 'Column Mapping',
  'bulk-repair': 'Bulk Repair',
  raise: 'Raise Request',
  master: 'Member Record',
  coverages: 'Coverages',
  paste: 'Paste Members',
  upload: 'Upload',
  edit: 'Edit',
  delete: 'Delete',
  'my-desk': 'My Desk',
  'plan-templates': 'Plan Templates',
  products: 'Products',
  'sales-cockpit': 'Sales Cockpit',
  assignment: 'Assignment',
};

/** Resolve a single URL segment to a human-readable label. */
function segmentLabel(segment: string, employerName?: string): string {
  // If we have an employer name from the bundle context, use it for rfqId segments
  if (employerName && segment.startsWith('rfq-')) return employerName;
  return SEGMENT_LABELS[segment] ?? segment;
}

export interface BreadcrumbProps {
  /** Optional employer name resolved from the RFQ bundle context. */
  employerName?: string;
}

interface Crumb {
  label: string;
  href: string;
  current: boolean;
}

export function Breadcrumb({ employerName }: BreadcrumbProps) {
  const pathname = usePathname();

  // Strip leading slash, split on '/', filter empties
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);

  const crumbs: Crumb[] = segments.map((seg, idx) => {
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const label = segmentLabel(seg, seg.startsWith('rfq-') ? employerName : undefined);
    return { label, href, current: idx === segments.length - 1 };
  });

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {idx > 0 && <ChevronRight className="size-3 text-muted-foreground/50" />}
          {crumb.current ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
