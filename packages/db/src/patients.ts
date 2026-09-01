import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { createAuditEvent } from "./audit.js";

export interface PatientRecord {
  id: string;
  tenantId: string;
  branchId?: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  createdAt: string;
}

export async function findPatients(
  pool: Pool,
  input: {
    tenantId: string;
    branchId?: string;
  },
): Promise<PatientRecord[]> {
  const result = await pool.query(
    `
      SELECT
        id,
        tenant_id,
        branch_id,
        medical_record_number,
        first_name,
        last_name,
        date_of_birth,
        phone,
        created_at
      FROM patients
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY created_at DESC, id DESC
    `,
    [input.tenantId, input.branchId ?? null],
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    ...(row.branch_id
      ? { branchId: row.branch_id as string }
      : {}),
    medicalRecordNumber: row.medical_record_number as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    ...(row.date_of_birth
      ? { dateOfBirth: String(row.date_of_birth) }
      : {}),
    ...(row.phone ? { phone: row.phone as string } : {}),
    createdAt: String(row.created_at),
  }));
}


export async function createPatient(
  pool: Pool,
  input: {
    id: string;
    tenantId: string;
    userId: string;
    branchId?: string;
    medicalRecordNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phone?: string;
  },
): Promise<PatientRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO patients (
          id,
          tenant_id,
          branch_id,
          medical_record_number,
          first_name,
          last_name,
          date_of_birth,
          phone
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING
          id,
          tenant_id,
          branch_id,
          medical_record_number,
          first_name,
          last_name,
          date_of_birth,
          phone,
          created_at
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.medicalRecordNumber,
        input.firstName,
        input.lastName,
        input.dateOfBirth ?? null,
        input.phone ?? null,
      ],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Patient creation returned no row.");
    }

    const patient: PatientRecord = {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ...(row.branch_id
        ? { branchId: row.branch_id as string }
        : {}),
      medicalRecordNumber:
        row.medical_record_number as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      ...(row.date_of_birth
        ? { dateOfBirth: String(row.date_of_birth) }
        : {}),
      ...(row.phone
        ? { phone: row.phone as string }
        : {}),
      createdAt: String(row.created_at),
    };

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "patient.created",
      resource: "patient",
      resourceId: patient.id,
      metadata: {
        medicalRecordNumber: patient.medicalRecordNumber,
      },
    });

    await client.query("COMMIT");

    return patient;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
