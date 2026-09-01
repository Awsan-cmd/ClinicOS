import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { ProviderType } from "@clinicos/types/staff";

import { createAuditEvent } from "./audit.js";

export interface StaffRecord {
  id: string;
  tenantId: string;
  userId: string;
  branchId?: string;
  displayName: string;
  jobTitle?: string;
  phone?: string;
  createdAt: string;
}

export interface ProviderRecord {
  id: string;
  tenantId: string;
  staffMemberId: string;
  providerType: ProviderType;
  specialty?: string;
  licenseNumber?: string;
  createdAt: string;
}

export async function findStaff(
  pool: Pool,
  input: {
    tenantId: string;
    branchId?: string;
  },
): Promise<StaffRecord[]> {
  const result = await pool.query(
    `
      SELECT
        id,
        tenant_id,
        user_id,
        branch_id,
        display_name,
        job_title,
        phone,
        created_at
      FROM staff_members
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY created_at DESC, id DESC
    `,
    [input.tenantId, input.branchId ?? null],
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    ...(row.branch_id
      ? { branchId: row.branch_id as string }
      : {}),
    displayName: row.display_name as string,
    ...(row.job_title
      ? { jobTitle: row.job_title as string }
      : {}),
    ...(row.phone ? { phone: row.phone as string } : {}),
    createdAt: String(row.created_at),
  }));
}

export async function createStaff(
  pool: Pool,
  input: {
    id: string;
    tenantId: string;
    userId: string;
    actorUserId: string;
    branchId?: string;
    displayName: string;
    jobTitle?: string;
    phone?: string;
  },
): Promise<StaffRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
          AND tenant_id = $2
          AND is_active = TRUE
        LIMIT 1
      `,
      [input.userId, input.tenantId],
    );

    if (userResult.rowCount !== 1) {
      const error = new Error(
        "Staff user does not belong to the tenant.",
      );
      Object.assign(error, { code: "staff_user_not_found" });
      throw error;
    }

    if (input.branchId) {
      const branchResult = await client.query(
        `
          SELECT id
          FROM branches
          WHERE id = $1
            AND tenant_id = $2
          LIMIT 1
        `,
        [input.branchId, input.tenantId],
      );

      if (branchResult.rowCount !== 1) {
        const error = new Error(
          "Staff branch does not belong to the tenant.",
        );
        Object.assign(error, { code: "staff_branch_not_found" });
        throw error;
      }
    }

    const result = await client.query(
      `
        INSERT INTO staff_members (
          id,
          tenant_id,
          user_id,
          branch_id,
          display_name,
          job_title,
          phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id,
          user_id,
          branch_id,
          display_name,
          job_title,
          phone,
          created_at
      `,
      [
        input.id,
        input.tenantId,
        input.userId,
        input.branchId ?? null,
        input.displayName,
        input.jobTitle ?? null,
        input.phone ?? null,
      ],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Staff creation returned no row.");
    }

    const staff: StaffRecord = {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      ...(row.branch_id
        ? { branchId: row.branch_id as string }
        : {}),
      displayName: row.display_name as string,
      ...(row.job_title
        ? { jobTitle: row.job_title as string }
        : {}),
      ...(row.phone ? { phone: row.phone as string } : {}),
      createdAt: String(row.created_at),
    };

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.actorUserId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "staff.created",
      resource: "staff",
      resourceId: staff.id,
      metadata: {
        staffUserId: staff.userId,
        displayName: staff.displayName,
      },
    });

    await client.query("COMMIT");

    return staff;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
