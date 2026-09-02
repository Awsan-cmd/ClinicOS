import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import type {
  AvailabilityRuleRecord,
  ResourceRecord,
  ResourceType,
} from "@clinicos/types/calendar";
import { createAuditEvent } from "./audit.js";

export type FindResourcesOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateResourceInput = {
  id: string;
  tenantId: string;
  branchId?: string;
  code: string;
  name: string;
  resourceType: ResourceType;
  isActive?: boolean;
  userId: string;
};

export type FindAvailabilityRulesOptions = {
  tenantId: string;
  branchId?: string;
  providerId?: string;
  resourceId?: string;
};

export type CreateAvailabilityRuleInput = {
  id: string;
  tenantId: string;
  branchId?: string;
  providerId?: string;
  resourceId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  userId: string;
};

export async function findResources(
  pool: Pool,
  options: FindResourcesOptions,
): Promise<ResourceRecord[]> {
  const result = await pool.query<ResourceRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        code,
        name,
        resource_type AS "resourceType",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM resources
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY name ASC, code ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createResource(
  pool: Pool,
  input: CreateResourceInput,
): Promise<ResourceRecord> {
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
        throw new Error("resource_branch_not_found");
      }
    }

    const result = await client.query<ResourceRecord>(
      `
        INSERT INTO resources (
          id,
          tenant_id,
          branch_id,
          code,
          name,
          resource_type,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          code,
          name,
          resource_type AS "resourceType",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.code,
        input.name,
        input.resourceType,
        input.isActive ?? true,
      ],
    );

    const resource = result.rows[0];

    if (!resource) {
      throw new Error("resource_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "resource.created",
      resource: "resource",
      resourceId: resource.id,
      metadata: {
        code: resource.code,
        name: resource.name,
        resourceType: resource.resourceType,
      },
    });

    await client.query("COMMIT");

    return resource;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findAvailabilityRules(
  pool: Pool,
  options: FindAvailabilityRulesOptions,
): Promise<AvailabilityRuleRecord[]> {
  const result = await pool.query<AvailabilityRuleRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        provider_id AS "providerId",
        resource_id AS "resourceId",
        day_of_week AS "dayOfWeek",
        start_time AS "startTime",
        end_time AS "endTime",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM availability_rules
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
        AND ($3::uuid IS NULL OR provider_id = $3)
        AND ($4::uuid IS NULL OR resource_id = $4)
      ORDER BY day_of_week ASC, start_time ASC, id ASC
    `,
    [
      options.tenantId,
      options.branchId ?? null,
      options.providerId ?? null,
      options.resourceId ?? null,
    ],
  );

  return result.rows;
}

export async function createAvailabilityRule(
  pool: Pool,
  input: CreateAvailabilityRuleInput,
): Promise<AvailabilityRuleRecord> {
  if (!input.providerId && !input.resourceId) {
    throw new Error("availability_rule_target_required");
  }

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
        throw new Error("availability_rule_branch_not_found");
      }
    }

    if (input.providerId) {
      const providerResult = await client.query(
        `
          SELECT id
          FROM providers
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.providerId],
      );

      if (providerResult.rowCount === 0) {
        throw new Error("availability_rule_provider_not_found");
      }
    }

    if (input.resourceId) {
      const resourceResult = await client.query(
        `
          SELECT id
          FROM resources
          WHERE tenant_id = $1
            AND id = $2
        `,
        [input.tenantId, input.resourceId],
      );

      if (resourceResult.rowCount === 0) {
        throw new Error("availability_rule_resource_not_found");
      }
    }

    const result = await client.query<AvailabilityRuleRecord>(
      `
        INSERT INTO availability_rules (
          id,
          tenant_id,
          branch_id,
          provider_id,
          resource_id,
          day_of_week,
          start_time,
          end_time,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          provider_id AS "providerId",
          resource_id AS "resourceId",
          day_of_week AS "dayOfWeek",
          start_time AS "startTime",
          end_time AS "endTime",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.providerId ?? null,
        input.resourceId ?? null,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.isActive ?? true,
      ],
    );

    const rule = result.rows[0];

    if (!rule) {
      throw new Error("availability_rule_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "availability_rule.created",
      resource: "availability_rule",
      resourceId: rule.id,
      metadata: {
        providerId: rule.providerId,
        resourceId: rule.resourceId,
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
      },
    });

    await client.query("COMMIT");

    return rule;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
