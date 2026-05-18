// Generic role enum used by RoleProvider / RoleSwitcher / ActionBar.
// Add new roles here; the read-from-storage guard, the role-switcher chip set,
// and any `roleActions` schema entries will all pick up the new value
// automatically.

export const ROLES = ['maker', 'checker', 'ops', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

// Future Keycloak claims shape — slot for the post-V1 auth migration. Not
// imported anywhere today; kept here so role-aware code already has a target
// type when the real token-driven identity lands. Renamed from `RoleContext`
// to avoid collision with the React context object of the same name.
export interface RoleClaimPayload {
  currentRole: Role;
  userId?: string;
  displayName?: string;
}
