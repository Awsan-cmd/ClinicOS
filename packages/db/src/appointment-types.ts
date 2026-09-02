import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type { AppointmentTypeRecord } from "@clinicos/types/appointment-type";
import { createAuditEvent } from "./audit.js";

export type FindAppointmentTypesOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateAppointmentTypeInput = {
  id: string;
  tenantId: string;
  branchId?: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  userId: string;
};

export async function findAppointmentTypes(
  pool: Pool,
  options: FindAppointmentTypesOptions,
): Promise<AppointmentTypeRecord[]> {
  const result = await pool.query<AppointmentTypeRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        code,
        name,
        description,
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM appointment_types
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY name ASC, code ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createAppointmentType(
  pool: Pool,
  input: CreateAppointmentTypeInput,
): Promise<AppointmentTypeRecord> {
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
        throw new Error("appointment_type_branch_not_found");
      }
    }

    const result = await client.query<AppointmentTypeRecord>(
      `
        INSERT INTO appointment_types (
          id,
          tenant_id,
          branch_id,
          code,
          name,
          description,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          code,
          name,
          description,
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
        input.isActive ?? true,
      ],
    );

    const appointmentType = result.rows[0];

    if (!appointmentType) {
      throw new Error("appointment_type_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "appointment_type.created",
      resource: "appointment_type",
      resourceId: appointmentType.id,
      metadata: {
        code: appointmentType.code,
        name: appointmentType.name,
      },
    });

    await client.query("COMMIT");

    return appointmentType;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
