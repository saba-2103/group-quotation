// Standalone PolicyMember detail route.
//
// The existing route at /issuance/proposals/[id]/members/[memberId] requires
// callers to know the parent proposalId, but the Dashboard Inbox sections
// for member/uw/ops (PROP-0009) only know the policyMemberId. This route
// resolves the proposalId server-side from the policy-member payload, then
// renders policy-member-detail.json — same schema, same actions — so the
// UW approve/reject, member confirm-MAF, and ops repair-edit buttons all
// surface from the Inbox flow.

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { DetailPageSkeleton } from '@/components/layout/DetailPageSkeleton';
import { WidgetRenderer } from '@/components/registry/WidgetRenderer';
import { resolveSchemaRefs } from '@/lib/schemaResolver';
import type { WidgetConfig } from '@/types/widget';

export const dynamic = 'force-dynamic';

const VALID_ID = /^[A-Za-z0-9_-]+$/;

interface PolicyMemberDto {
  id?: string;
  proposalId?: string;
}

export default async function StandalonePolicyMemberDetailPage(props: {
  params: Promise<{ policyMemberId: string }>;
}) {
  const { policyMemberId } = await props.params;
  if (!VALID_ID.test(policyMemberId)) notFound();

  // Resolve proposalId via a same-origin fetch so the schema's `{{id}}`
  // placeholders (used by tabs, back-href, and action endpoints that pivot
  // off the parent proposal) substitute correctly. Mirrors the same pattern
  // the by-policy-member redirect route uses.
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const res = await fetch(
    `${base}/api/issuance/policy-members/${policyMemberId}`,
    { cache: 'no-store' },
  );
  if (!res.ok) notFound();
  const member = (await res.json()) as PolicyMemberDto;
  // If the backend omits proposalId on the response (older deployments),
  // fall back to '/' so the back-link still works rather than breaking.
  const proposalId = member.proposalId ?? '';

  const schemaFilePath = path.join(
    process.cwd(),
    'schemas',
    'policy-member-detail.json',
  );
  if (!existsSync(schemaFilePath)) notFound();

  const raw = JSON.parse(readFileSync(schemaFilePath, 'utf-8')) as object;
  const resolved = await resolveSchemaRefs(raw, process.cwd());
  const config = JSON.parse(
    JSON.stringify(resolved)
      .replaceAll('{{id}}', proposalId)
      .replaceAll('{{memberId}}', policyMemberId),
  ) as WidgetConfig;

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DetailPageSkeleton />}>
        <WidgetRenderer config={config} />
      </Suspense>
    </div>
  );
}
