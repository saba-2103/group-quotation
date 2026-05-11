// Resolves a PolicyMember id (issuance-side) to a PAM Member id and redirects
// to the PAM detail page. Used by the policy-member-detail "Open in Policy
// Admin" deep link, which only knows the policyMemberId.

import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const VALID_ID = /^[A-Za-z0-9_-]+$/;

interface MemberLookupDto {
  id?: string;
}

export default async function ByPolicyMemberRedirectPage(props: {
  params: Promise<{ policyMemberId: string }>;
}) {
  const { policyMemberId } = await props.params;
  if (!VALID_ID.test(policyMemberId)) notFound();

  // Same-origin fetch to our own route handler. Node's server-side fetch has
  // no default origin, so we derive it from the incoming request headers —
  // works in dev, in Docker, and behind an ALB (which sets x-forwarded-proto).
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base = `${proto}://${host}`;
  const res = await fetch(
    `${base}/api/policy-admin/members/by-policy-member/${policyMemberId}`,
    { cache: 'no-store' },
  );
  if (!res.ok) notFound();

  const member = (await res.json()) as MemberLookupDto;
  if (!member?.id) notFound();

  redirect(`/policy-admin/members/${member.id}`);
}
