export const ROLES = {
  OWNER: 'owner',
  EMPLOYEE: 'employee',
  TENANT: 'tenant',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  employee: 2,
  tenant: 1,
};
