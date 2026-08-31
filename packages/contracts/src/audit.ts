import type {
  AuditAction,
  AuditEventId,
  AuditResource,
} from "@clinicos/types/audit";
import type { BranchId, TenantId, UserId } from "@clinicos/types/tenant";

export interface CreateAuditEventRequest {
  tenantId: TenantId;
  userId?: UserId;
  branchId?: BranchId;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEventResponse {
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
