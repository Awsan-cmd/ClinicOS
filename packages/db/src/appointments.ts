import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  AppointmentRecord,
  AppointmentStatus,
  AppointmentType,
} from "@clinicos/types/appointment";
import { createAuditEvent } from "./audit.js";

export type FindAppointmentsInput = {
  tenantId: string;
  branchId?: string;
  patientId?: string;
  providerId?: string;
  resourceId?: string;
};

export type CreateAppointmentInput = {
  id: string;
  tenantId: string;
  branchId?: string | null;
  patientId: string;
  providerId: string;
  serviceId: string;
  resourceId?: string | null;
  appointmentType?: AppointmentType;
  status?: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  notes?: string | null;
  actorUserId: string;
};

function mapAppointment(row: {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  patient_id: string;
  provider_id: string;
  service_id: string;
  resource_id: string | null;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  starts_at: Date;
  ends_at: Date;
  notes: string | null;
  created_at: Date;
}): AppointmentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    patientId: row.patient_id,
    providerId: row.provider_id,
    serviceId: row.service_id,
    resourceId: row.resource_id,
    appointmentType: row.appointment_type,
    status: row.status,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

export async function findAppointments(
  pool: Pool,
  input: FindAppointmentsInput,
): Promise<AppointmentRecord[]> {
  const values: unknown[] = [input.tenantId];
  const conditions = ["tenant_id = $1"];

  if (input.branchId) {
    values.push(input.branchId);
    conditions.push(`branch_id = $${values.length}`);
  }

  if (input.patientId) {
    values.push(input.patientId);
    conditions.push(`patient_id = $${values.length}`);
  }

  if (input.providerId) {
    values.push(input.providerId);
    conditions.push(`provider_id = $${values.length}`);
  }

  if (input.resourceId) {
    values.push(input.resourceId);
    conditions.push(`resource_id = $${values.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        id,
        tenant_id,
        branch_id,
        patient_id,
        provider_id,
        service_id,
        resource_id,
        appointment_type,
        status,
        starts_at,
        ends_at,
        notes,
        created_at
      FROM appointments
      WHERE ${conditions.join(" AND ")}
      ORDER BY starts_at ASC, id ASC
    `,
    values,
  );

  return result.rows.map(mapAppointment);
}

export async function createAppointment(
  pool: Pool,
  input: CreateAppointmentInput,
): Promise<AppointmentRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (input.branchId) {
      const branchResult = await client.query(
        `
          SELECT 1
          FROM branches
          WHERE tenant_id = $1 AND id = $2
        `,
        [input.tenantId, input.branchId],
      );

      if (branchResult.rowCount !== 1) {
        throw new Error("appointment_branch_not_found");
      }
    }

    const patientResult = await client.query(
      `
        SELECT 1
        FROM patients
        WHERE tenant_id = $1 AND id = $2
      `,
      [input.tenantId, input.patientId],
    );

    if (patientResult.rowCount !== 1) {
      throw new Error("appointment_patient_not_found");
    }

    const providerResult = await client.query(
      `
        SELECT 1
        FROM providers
        WHERE tenant_id = $1 AND id = $2
      `,
      [input.tenantId, input.providerId],
    );

    if (providerResult.rowCount !== 1) {
      throw new Error("appointment_provider_not_found");
    }

    const serviceResult = await client.query(
      `
        SELECT 1
        FROM services
        WHERE tenant_id = $1 AND id = $2
      `,
      [input.tenantId, input.serviceId],
    );

    if (serviceResult.rowCount !== 1) {
      throw new Error("appointment_service_not_found");
    }

    if (input.resourceId) {
      const resourceResult = await client.query(
        `
          SELECT 1
          FROM resources
          WHERE tenant_id = $1 AND id = $2
        `,
        [input.tenantId, input.resourceId],
      );

      if (resourceResult.rowCount !== 1) {
        throw new Error("appointment_resource_not_found");
      }
    }

    const result = await client.query(
      `
        INSERT INTO appointments (
          id,
          tenant_id,
          branch_id,
          patient_id,
          provider_id,
          service_id,
          resource_id,
          appointment_type,
          status,
          starts_at,
          ends_at,
          notes
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12
        )
        RETURNING
          id,
          tenant_id,
          branch_id,
          patient_id,
          provider_id,
          service_id,
          resource_id,
          appointment_type,
          status,
          starts_at,
          ends_at,
          notes,
          created_at
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.patientId,
        input.providerId,
        input.serviceId,
        input.resourceId ?? null,
        input.appointmentType ?? "standard",
        input.status ?? "scheduled",
        input.startsAt,
        input.endsAt,
        input.notes ?? null,
      ],
    );

    const appointment = mapAppointment(result.rows[0]);

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.actorUserId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      action: "appointment.created",
      resource: "appointment",
      resourceId: appointment.id,
    });

    await client.query("COMMIT");

    return appointment;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
