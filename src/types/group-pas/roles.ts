// Group PAS roles — new-business revamp.
// UserRole drives the AuthContext / useAuth system and the nav visibility rules.
// The legacy V1 lowercase roles are kept as an alias so existing pages
// (Issuance, Policy Admin, Accounting) continue to compile without changes.

export type UserRole =
  | 'SALES'
  | 'UNDERWRITER'
  | 'ACTUARY'
  | 'ACTUARIAL'    // alias to ACTUARY used in new Group Quotation module
  | 'OPS'
  | 'ADMIN'
  | 'BROKER'
  | 'MPH'
  | 'REINSURER'
  | 'PARTNER_AGENT';

export const USER_ROLES: UserRole[] = [
  'SALES',
  'UNDERWRITER',
  'ACTUARY',
  'ACTUARIAL',
  'OPS',
  'ADMIN',
  'BROKER',
  'MPH',
  'REINSURER',
  'PARTNER_AGENT',
];

/** Sales seniority ladder — only meaningful when role === 'SALES'. */
export type SalesLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Combined persona used in the role switcher and permission checks. */
export interface RoleSwitcherPersona {
  id: string;
  role: UserRole;
  salesLevel?: SalesLevel;
  label: string;
  name: string;
  email: string;
}

/** All personas available in the dev role switcher. */
export const ROLE_SWITCHER_PERSONAS: RoleSwitcherPersona[] = [
  { id: 'sales-l0', role: 'SALES', salesLevel: 0, label: 'Sales L0', name: 'Casey Sales', email: 'casey.l0@ins.com' },
  { id: 'sales-l1', role: 'SALES', salesLevel: 1, label: 'Sales L1', name: 'Alex Carter', email: 'alex.carter@ins.com' },
  { id: 'sales-l2', role: 'SALES', salesLevel: 2, label: 'Sales L2', name: 'Jordan Sales', email: 'jordan.l2@ins.com' },
  { id: 'sales-l3', role: 'SALES', salesLevel: 3, label: 'Sales L3', name: 'Morgan Sales', email: 'morgan.l3@ins.com' },
  { id: 'sales-l4', role: 'SALES', salesLevel: 4, label: 'Sales L4 (Supervisor)', name: 'Sam Supervisor', email: 'sam.l4@ins.com' },
  { id: 'sales-l5', role: 'SALES', salesLevel: 5, label: 'Sales L5 (Head)', name: 'Arjun Head', email: 'arjun.l5@ins.com' },
  { id: 'uw', role: 'UNDERWRITER', label: 'Underwriter', name: 'Jordan Lee', email: 'jordan.lee@ins.com' },
  { id: 'actuarial', role: 'ACTUARIAL', label: 'Actuarial', name: 'Sam Patel', email: 'sam.patel@ins.com' },
  { id: 'ops', role: 'OPS', label: 'Ops', name: 'Riley Ops', email: 'riley.ops@ins.com' },
  { id: 'admin', role: 'ADMIN', label: 'Admin', name: 'Chris Admin', email: 'chris.admin@ins.com' },
];

// Legacy alias — kept so existing code that imports `Role` continues to work.
export type Role = UserRole;
export const ROLES: Role[] = USER_ROLES;

export interface RoleContext {
  currentRole: Role;
  userId?: string;
  displayName?: string;
}
