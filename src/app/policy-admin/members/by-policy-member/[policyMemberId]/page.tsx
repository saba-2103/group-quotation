// Resolves a PolicyMember id (issuance-side) to a PAM Member id and redirects
// to the PAM detail page. Used by the policy-member-detail "Open in Policy
// Admin" deep link, which only knows the policyMemberId.

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

  // Hit the route handler directly via absolute URL so this works the same in
  // dev and in build-time SSR. Same-origin fetch.
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(
    `${base}/api/policy-admin/members/by-policy-member/${policyMemberId}`,
    { cache: 'no-store' },
  );
  if (!res.ok) notFound();

  const member = (await res.json()) as MemberLookupDto;
  if (!member?.id) notFound();

  redirect(`/policy-admin/members/${member.id}`);
}
