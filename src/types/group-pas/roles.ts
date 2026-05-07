// V1 demo role context. Backend has no auth in V1; the role is a UI-only switcher
// per docs/group-pas-v1-plan.md → Task 1.9 + context/CORE_MEMORY.md scope-locks.

export type Role = 'maker' | 'checker' | 'ops' | 'viewer';

export interface RoleContext {
  currentRole: Role;
  // Reserved for the post-V1 auth integration. Carries the user identity that
  // would otherwise come from a Keycloak token, so role-aware code already has
  // a slot to read once auth lands.
  userId?: string;
  displayName?: string;
}
