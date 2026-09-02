import type { Pool } from "pg";
import { randomUUID } from "node:crypto";

import type {
  HolidayRecord,
  ScheduleBreakRecord,
  WorkingHoursRecord,
} from "@clinicos/types/schedule";

import { createAuditEvent } from "./audit.js";

export type FindWorkingHoursOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateWorkingHoursInput = {
  id: string;
  tenantId: string;
  branchId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  userId: string;
};

export type FindScheduleBreaksOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateScheduleBreakInput = {
  id: string;
  tenantId: string;
  branchId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
  userId: string;
};

export type FindHolidaysOptions = {
  tenantId: string;
  branchId?: string;
};

export type CreateHolidayInput = {
  id: string;
  tenantId: string;
  branchId?: string;
  holidayDate: string;
  name?: string;
  isFullDay?: boolean;
  isActive?: boolean;
  userId: string;
};

async function assertBranch(
  client: {
    query: Pool["query"];
  },
  tenantId: string,
  branchId: string,
  errorCode: string,
): Promise<void> {
  const result = await client.query(
    `
      SELECT id
      FROM branches
      WHERE tenant_id = $1
        AND id = $2
    `,
    [tenantId, branchId],
  );

  if (result.rowCount === 0) {
    throw new Error(errorCode);
  }
}

export async function findWorkingHours(
  pool: Pool,
  options: FindWorkingHoursOptions,
): Promise<WorkingHoursRecord[]> {
  const result = await pool.query<WorkingHoursRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        day_of_week AS "dayOfWeek",
        start_time AS "startTime",
        end_time AS "endTime",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM working_hours
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY day_of_week ASC, start_time ASC, id ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createWorkingHours(
  pool: Pool,
  input: CreateWorkingHoursInput,
): Promise<WorkingHoursRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await assertBranch(
      client,
      input.tenantId,
      input.branchId,
      "working_hours_branch_not_found",
    );

    const result = await client.query<WorkingHoursRecord>(
      `
        INSERT INTO working_hours (
          id,
          tenant_id,
          branch_id,
          day_of_week,
          start_time,
          end_time,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          day_of_week AS "dayOfWeek",
          start_time AS "startTime",
          end_time AS "endTime",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.isActive ?? true,
      ],
    );

    const workingHours = result.rows[0];

    if (!workingHours) {
      throw new Error("working_hours_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      branchId: input.branchId,
      action: "working_hours.created",
      resource: "working_hours",
      resourceId: workingHours.id,
      metadata: {
        dayOfWeek: workingHours.dayOfWeek,
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
      },
    });

    await client.query("COMMIT");

    return workingHours;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findScheduleBreaks(
  pool: Pool,
  options: FindScheduleBreaksOptions,
): Promise<ScheduleBreakRecord[]> {
  const result = await pool.query<ScheduleBreakRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        day_of_week AS "dayOfWeek",
        start_time AS "startTime",
        end_time AS "endTime",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM schedule_breaks
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2)
      ORDER BY day_of_week ASC, start_time ASC, id ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createScheduleBreak(
  pool: Pool,
  input: CreateScheduleBreakInput,
): Promise<ScheduleBreakRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await assertBranch(
      client,
      input.tenantId,
      input.branchId,
      "schedule_break_branch_not_found",
    );

    const result = await client.query<ScheduleBreakRecord>(
      `
        INSERT INTO schedule_breaks (
          id,
          tenant_id,
          branch_id,
          day_of_week,
          start_time,
          end_time,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          day_of_week AS "dayOfWeek",
          start_time AS "startTime",
          end_time AS "endTime",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.isActive ?? true,
      ],
    );

    const scheduleBreak = result.rows[0];

    if (!scheduleBreak) {
      throw new Error("schedule_break_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      branchId: input.branchId,
      action: "schedule_break.created",
      resource: "schedule_break",
      resourceId: scheduleBreak.id,
      metadata: {
        dayOfWeek: scheduleBreak.dayOfWeek,
        startTime: scheduleBreak.startTime,
        endTime: scheduleBreak.endTime,
      },
    });

    await client.query("COMMIT");

    return scheduleBreak;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findHolidays(
  pool: Pool,
  options: FindHolidaysOptions,
): Promise<HolidayRecord[]> {
  const result = await pool.query<HolidayRecord>(
    `
      SELECT
        id,
        tenant_id AS "tenantId",
        branch_id AS "branchId",
        holiday_date AS "holidayDate",
        name,
        is_full_day AS "isFullDay",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM holidays
      WHERE tenant_id = $1
        AND ($2::uuid IS NULL OR branch_id = $2 OR branch_id IS NULL)
      ORDER BY holiday_date ASC, id ASC
    `,
    [options.tenantId, options.branchId ?? null],
  );

  return result.rows;
}

export async function createHoliday(
  pool: Pool,
  input: CreateHolidayInput,
): Promise<HolidayRecord> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (input.branchId) {
      await assertBranch(
        client,
        input.tenantId,
        input.branchId,
        "holiday_branch_not_found",
      );
    }

    const result = await client.query<HolidayRecord>(
      `
        INSERT INTO holidays (
          id,
          tenant_id,
          branch_id,
          holiday_date,
          name,
          is_full_day,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          tenant_id AS "tenantId",
          branch_id AS "branchId",
          holiday_date AS "holidayDate",
          name,
          is_full_day AS "isFullDay",
          is_active AS "isActive",
          created_at AS "createdAt"
      `,
      [
        input.id,
        input.tenantId,
        input.branchId ?? null,
        input.holidayDate,
        input.name ?? null,
        input.isFullDay ?? true,
        input.isActive ?? true,
      ],
    );

    const holiday = result.rows[0];

    if (!holiday) {
      throw new Error("holiday_create_failed");
    }

    await createAuditEvent(client, {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      ...(input.branchId
        ? { branchId: input.branchId }
        : {}),
      action: "holiday.created",
      resource: "holiday",
      resourceId: holiday.id,
      metadata: {
        holidayDate: holiday.holidayDate,
        name: holiday.name,
        isFullDay: holiday.isFullDay,
      },
    });

    await client.query("COMMIT");

    return holiday;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
