import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type { ServiceRecord } from "@clinicos/types/service";
import { createAuditEvent } from "./audit.js";

export type FindServicesOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateServiceInput = {
  id: string;
  tenantId: string;
  branchId?: string;
  code: string;
  name: string;
  description?: string;
  durationMinutes: number;
  isActive?: boolean;
  userId: string;
};

export async function findServices(
  pool: Pool,
  options: FindServicesOptions,
): Promise<ServiceRecord[]> {
  const result = await pool.query<ServiceRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        code,
        name,
        description,
        duration_minutes AS "durationMinutes",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM services
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY name ASC, code ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createService(
  pool: Pool,
  input: CreateServiceInput,
): Promise<ServiceRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (input.branchId) {
      const branchResult = await client.query(
        `
          SELECT id
          FROM branches
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.branchId],
      );

      if (branchResult.rowCount === 0) {
        throw new Error("service_branch_not_found");
      }
    }

    const result = await client.query<ServiceRecord>(
      `
        INSERT INTO services (
          id,
          tenant_id,
          branch_id,
          code,
          name,
          description,
          duration_minutes,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          code,
          name,
          description,
          duration_minutes AS "durationMinutes",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.code,
        input.name,
        input.description ?? null,
        input.durationMinutes,
        input.isActive ?? true,
      ],
    );

    const service = result.rows[0];

    if (!service) {
      throw new Error("service_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "service.created",
      resource: "service",
      resourceId: service.id,
      metadata: {
        code: service.code,
        name: service.name,
      },
    });

    await client.query("COMMIT");

    return service;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
