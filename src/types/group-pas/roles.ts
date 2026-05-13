// V1 demo role context. Backend has no auth in V1; the role is a UI-only switcher
// per docs/group-pas-v1-plan.md → Task 1.9 + context/CORE_MEMORY.md scope-locks.
//
// The 6 personas come from docs/planning/DEMO_NARRATIVE_GTL_GCL.md.
// Stopgap posture (PROP-0009): all 6 are selectable inside this portal until
// each gets its own portal (PROP-0010..PROP-0013); the role itself stays in
// the enum after each portal lands.

export type Role =
  | 'sales'
  | 'partner_agent'
  | 'mph'
  | 'member'
  | 'uw'
  | 'ops';

export const ROLES: Role[] = [
  'sales',
  'partner_agent',
  'mph',
  'member',
  'uw',
  'ops',
];

export interface RoleContext {
  currentRole: Role;
  // Reserved for the post-V1 auth integration. Carries the user identity that
  // would otherwise come from a Keycloak token, so role-aware code already has
  // a slot to read once auth lands.
  userId?: string;
  displayName?: string;
}
