import type { Pool } from "pg";

import type {
  AvailabilityQuery,
  AvailabilityResult,
} from "@clinicos/types/availability";

type AvailabilityRow = {
  starts_at: Date;
  ends_at: Date;
};

export async function findAvailability(
  pool: Pool,
  tenantId: string,
  input: AvailabilityQuery,
): Promise<AvailabilityResult> {
  const result = await pool.query<AvailabilityRow>(
    `
      WITH service AS (
        SELECT duration_minutes
        FROM services
        WHERE tenant_id = $1
          AND id = $3
          AND is_active = TRUE
          AND (branch_id IS NULL OR branch_id = $2)
      ),
      provider AS (
        SELECT 1
        FROM providers p
        JOIN staff_members sm
          ON sm.tenant_id = p.tenant_id
         AND sm.id = p.staff_member_id
        WHERE p.tenant_id = $1
          AND p.id = $4
          AND sm.branch_id = $2
      ),
      booking_rule AS (
        SELECT
          advance_booking_days,
          minimum_notice_minutes
        FROM booking_rules
        WHERE tenant_id = $1
          AND is_active = TRUE
          AND (branch_id = $2 OR branch_id IS NULL)
          AND (provider_id = $4 OR provider_id IS NULL)
          AND (service_id = $3 OR service_id IS NULL)
          AND (
            ($5::uuid IS NULL AND appointment_type_id IS NULL)
            OR (
              $5::uuid IS NOT NULL
              AND (
                appointment_type_id = $5
                OR appointment_type_id IS NULL
              )
            )
          )
          AND (
            ($6::uuid IS NULL AND resource_id IS NULL)
            OR (
              $6::uuid IS NOT NULL
              AND (
                resource_id = $6
                OR resource_id IS NULL
              )
            )
          )
        ORDER BY
          (
            CASE WHEN branch_id IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN provider_id IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN service_id IS NOT NULL THEN 1 ELSE 0 END +
            CASE
              WHEN appointment_type_id IS NOT NULL THEN 1 ELSE 0
            END +
            CASE WHEN resource_id IS NOT NULL THEN 1 ELSE 0 END
          ) DESC,
          id ASC
        LIMIT 1
      ),
      calendar_days AS (
        SELECT generate_series(
          $7::date,
          $8::date,
          INTERVAL '1 day'
        )::date AS calendar_date
      ),
      valid_days AS (
        SELECT
          calendar_date,
          EXTRACT(DOW FROM calendar_date)::integer AS day_of_week
        FROM calendar_days
        WHERE NOT EXISTS (
          SELECT 1
          FROM holidays h
          WHERE h.tenant_id = $1
            AND h.holiday_date = calendar_date
            AND h.is_active = TRUE
            AND h.is_full_day = TRUE
            AND (h.branch_id = $2 OR h.branch_id IS NULL)
        )
      ),
      working_windows AS (
        SELECT
          d.calendar_date,
          w.start_time,
          w.end_time,
          s.duration_minutes
        FROM valid_days d
        JOIN working_hours w
          ON w.tenant_id = $1
         AND w.branch_id = $2
         AND w.day_of_week = d.day_of_week
         AND w.is_active = TRUE
        CROSS JOIN service s
        CROSS JOIN provider p
      ),
      stepped_slots AS (
        SELECT
          (
            (
              calendar_date + start_time
            ) + (step * make_interval(mins => duration_minutes))
          ) AT TIME ZONE 'UTC' AS starts_at,
          (
            (
              calendar_date + start_time
            ) +
            ((step + 1) * make_interval(mins => duration_minutes))
          ) AT TIME ZONE 'UTC' AS ends_at
        FROM working_windows
        CROSS JOIN LATERAL generate_series(
          0,
          FLOOR(
            EXTRACT(
              EPOCH FROM (
                (
                  calendar_date + end_time
                ) -
                (
                  calendar_date + start_time
                )
              )
            ) / 60 / duration_minutes
          )::integer - 1
        ) AS step
      ),
      slots_without_breaks AS (
        SELECT s.starts_at, s.ends_at
        FROM stepped_slots s
        WHERE NOT EXISTS (
          SELECT 1
          FROM schedule_breaks b
          WHERE b.tenant_id = $1
            AND b.branch_id = $2
            AND b.day_of_week = EXTRACT(DOW FROM s.starts_at AT TIME ZONE 'UTC')
            AND b.is_active = TRUE
            AND (s.starts_at AT TIME ZONE 'UTC')::time < b.end_time
            AND (s.ends_at AT TIME ZONE 'UTC')::time > b.start_time
        )
      )
      SELECT
        s.starts_at,
        s.ends_at
      FROM slots_without_breaks s
      LEFT JOIN booking_rule rule
        ON TRUE
      WHERE s.starts_at >= $9::timestamptz
        AND s.ends_at <= $10::timestamptz
        AND (
          rule.minimum_notice_minutes IS NULL
          OR s.starts_at >=
            NOW() + make_interval(mins => rule.minimum_notice_minutes)
        )
        AND (
          rule.advance_booking_days IS NULL
          OR s.starts_at <=
            NOW() + make_interval(days => rule.advance_booking_days)
        )
        AND NOT EXISTS (
          SELECT 1
          FROM appointments a
          WHERE a.tenant_id = $1
            AND a.provider_id = $4
            AND a.status IN ('scheduled', 'confirmed')
            AND a.starts_at < s.ends_at
            AND a.ends_at > s.starts_at
        )
        AND (
          $6::uuid IS NULL
          OR (
            EXISTS (
              SELECT 1
              FROM resources r
              WHERE r.tenant_id = $1
                AND r.id = $6
                AND r.is_active = TRUE
                AND r.branch_id = $2
            )
            AND NOT EXISTS (
              SELECT 1
              FROM appointments a
              WHERE a.tenant_id = $1
                AND a.resource_id = $6
                AND a.status IN ('scheduled', 'confirmed')
                AND a.starts_at < s.ends_at
                AND a.ends_at > s.starts_at
            )
          )
        )
      ORDER BY s.starts_at ASC
    `,
    [
      tenantId,
      input.branchId,
      input.serviceId,
      input.providerId,
      input.appointmentTypeId ?? null,
      input.resourceId ?? null,
      input.startDate,
      input.endDate,
      `${input.startDate}T00:00:00Z`,
      `${input.endDate}T23:59:59.999Z`,
    ],
  );

  return {
    slots: result.rows.map((row) => ({
      startsAt: row.starts_at.toISOString(),
      endsAt: row.ends_at.toISOString(),
    })),
  };
}
