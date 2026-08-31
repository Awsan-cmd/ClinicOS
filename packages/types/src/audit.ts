import type { BranchId, TenantId, UserId } from "./tenant.js";

export type AuditEventId = string & {
  readonly __brand: "AuditEventId";
};

export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "revoke";

export type AuditResource =
  | "tenant"
  | "branch"
  | "user"
  | "session"
  | "patient"
  | "appointment"
  | "clinical"
  | "billing"
  | "device"
  | "auth";

export interface AuditEvent {
  eventId: AuditEventId;
  tenantId: TenantId;
  userId?: UserId;
  branchId?: BranchId;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
