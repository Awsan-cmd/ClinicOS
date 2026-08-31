import type { Pool } from "pg";

export interface CreateAuditEventRecord {
  id: string;
  tenantId: string;
  userId?: string;
  branchId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditEvent(
  pool: Pool,
  event: CreateAuditEventRecord,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO audit_events (
        id,
        tenant_id,
        user_id,
        branch_id,
        action,
        resource,
        resource_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      event.id,
      event.tenantId,
      event.userId ?? null,
      event.branchId ?? null,
      event.action,
      event.resource,
      event.resourceId ?? null,
      event.metadata ?? null,
    ],
  );
}
