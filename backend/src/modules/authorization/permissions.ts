import { Role } from "@prisma/client";

export const Permission = {
  AdminOverviewRead: "admin:overview:read",
  UserDirectoryRead: "user-directory:read",
  JobCreate: "job:create",
  JobAssign: "job:assign",
  JobReadAny: "job:read:any",
  JobReadAssigned: "job:read:assigned",
  JobReadOwnClient: "job:read:own-client",
  JobStatusUpdateAny: "job-status:update:any",
  JobStatusUpdateAssigned: "job-status:update:assigned",
  JobNoteCreateAny: "job-note:create:any",
  JobNoteCreateVisible: "job-note:create:visible"
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const rolePermissions: Record<Role, readonly Permission[]> = {
  [Role.ADMIN]: [
    Permission.AdminOverviewRead,
    Permission.UserDirectoryRead,
    Permission.JobCreate,
    Permission.JobAssign,
    Permission.JobReadAny,
    Permission.JobStatusUpdateAny,
    Permission.JobNoteCreateAny
  ],
  [Role.TECHNICIAN]: [
    Permission.JobReadAssigned,
    Permission.JobStatusUpdateAssigned,
    Permission.JobNoteCreateVisible
  ],
  [Role.CLIENT]: [
    Permission.JobReadOwnClient,
    Permission.JobNoteCreateVisible
  ]
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
