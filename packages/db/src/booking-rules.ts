import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type { BookingRuleRecord } from "@clinicos/types/booking-rule";
import { createAuditEvent } from "./audit.js";

export type FindBookingRulesOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateBookingRuleInput = {
  id: string;
  tenantId: string;
  branchId?: string;
  providerId?: string;
  serviceId?: string;
  appointmentTypeId?: string;
  resourceId?: string;
  advanceBookingDays?: number;
  minimumNoticeMinutes?: number;
  isActive?: boolean;
  userId: string;
};

export async function findBookingRules(
  pool: Pool,
  options: FindBookingRulesOptions,
): Promise<BookingRuleRecord[]> {
  const result = await pool.query<BookingRuleRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        provider_id AS "providerId",
        service_id AS "serviceId",
        appointment_type_id AS "appointmentTypeId",
        resource_id AS "resourceId",
        advance_booking_days AS "advanceBookingDays",
        minimum_notice_minutes AS "minimumNoticeMinutes",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM booking_rules
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY id ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createBookingRule(
  pool: Pool,
  input: CreateBookingRuleInput,
): Promise<BookingRuleRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (input.branchId) {
      const result = await client.query(
        `
          SELECT 1
          FROM branches
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.branchId],
      );

      if (result.rowCount !== 1) {
        throw new Error("booking_rule_branch_not_found");
      }
    }

    if (input.providerId) {
      const result = await client.query(
        `
          SELECT 1
          FROM providers
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.providerId],
      );

      if (result.rowCount !== 1) {
        throw new Error("booking_rule_provider_not_found");
      }
    }

    if (input.serviceId) {
      const result = await client.query(
        `
          SELECT 1
          FROM services
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.serviceId],
      );

      if (result.rowCount !== 1) {
        throw new Error("booking_rule_service_not_found");
      }
    }

    if (input.appointmentTypeId) {
      const result = await client.query(
        `
          SELECT 1
          FROM appointment_types
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.appointmentTypeId],
      );

      if (result.rowCount !== 1) {
        throw new Error("booking_rule_appointment_type_not_found");
      }
    }

    if (input.resourceId) {
      const result = await client.query(
        `
          SELECT 1
          FROM resources
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.resourceId],
      );

      if (result.rowCount !== 1) {
        throw new Error("booking_rule_resource_not_found");
      }
    }

    const result = await client.query<BookingRuleRecord>(
      `
        INSERT INTO booking_rules (
          id,
          tenant_id,
          branch_id,
          provider_id,
          service_id,
          appointment_type_id,
          resource_id,
          advance_booking_days,
          minimum_notice_minutes,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          provider_id AS "providerId",
          service_id AS "serviceId",
          appointment_type_id AS "appointmentTypeId",
          resource_id AS "resourceId",
          advance_booking_days AS "advanceBookingDays",
          minimum_notice_minutes AS "minimumNoticeMinutes",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.providerId ?? null,
        input.serviceId ?? null,
        input.appointmentTypeId ?? null,
        input.resourceId ?? null,
        input.advanceBookingDays ?? 0,
        input.minimumNoticeMinutes ?? 0,
        input.isActive ?? true,
      ],
    );

    const bookingRule = result.rows[0];

    if (!bookingRule) {
      throw new Error("booking_rule_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "booking_rule.created",
      resource: "booking_rule",
      resourceId: bookingRule.id,
      metadata: {
        advanceBookingDays: bookingRule.advanceBookingDays,
        minimumNoticeMinutes: bookingRule.minimumNoticeMinutes,
      },
    });

    await client.query("COMMIT");

    return bookingRule;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type FindApplicableBookingRuleInput = {
  tenantId: string;
  branchId?: string;
  providerId: string;
  serviceId: string;
  appointmentTypeId?: string;
  resourceId?: string;
};

export async function findApplicableBookingRule(
  pool: Pool,
  input: FindApplicableBookingRuleInput,
): Promise<BookingRuleRecord | null> {
  const result = await pool.query<BookingRuleRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        provider_id AS "providerId",
        service_id AS "serviceId",
        appointment_type_id AS "appointmentTypeId",
        resource_id AS "resourceId",
        advance_booking_days AS "advanceBookingDays",
        minimum_notice_minutes AS "minimumNoticeMinutes",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM booking_rules
      WHERE tenant_id = $1
        AND is_active = TRUE
        AND (branch_id = $2 OR branch_id IS NULL)
        AND (provider_id = $3 OR provider_id IS NULL)
        AND (service_id = $4 OR service_id IS NULL)
        AND (
          ($5::uuid IS NULL AND appointment_type_id IS NULL)
          OR (
            $5::uuid IS NOT NULL
            AND (appointment_type_id = $5 OR appointment_type_id IS NULL)
          )
        )
        AND (
          ($6::uuid IS NULL AND resource_id IS NULL)
          OR (
            $6::uuid IS NOT NULL
            AND (resource_id = $6 OR resource_id IS NULL)
          )
        )
      ORDER BY
        (
          CASE WHEN branch_id IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN service_id IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN appointment_type_id IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN resource_id IS NOT NULL THEN 1 ELSE 0 END
        ) DESC,
        id ASC
      LIMIT 1
    `,
    [
      input.tenantId,
      input.branchId ?? null,
      input.providerId,
      input.serviceId,
      input.appointmentTypeId ?? null,
      input.resourceId ?? null,
    ],
  );

  return result.rows[0] ?? null;
}
