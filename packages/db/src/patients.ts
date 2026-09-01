import type { Pool } from "pg";

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
