export type Role = 'maker' | 'checker' | 'ops' | 'viewer';

export interface RoleContext {
  currentRole: Role;
  userId?: string;
  displayName?: string;
}
