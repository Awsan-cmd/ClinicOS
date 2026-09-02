import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createDbPool } from "@clinicos/db/client";
import type { Pool } from "pg";
import { requireAuthenticatedRequest } from "./auth.js";
import { createRequestContext } from "./context.js";
import { ApiError, toApiError } from "./errors.js";
import { sendError } from "./http.js";
import { handleHealth } from "./routes/health.js";
import { handleLogout, handleMe } from "./routes/me.js";
import {
  handleCreateStaff,
  handleStaff,
} from "./routes/staff.js";
import {
  handleCreateProvider,
  handleProviders,
} from "./routes/providers.js";
import {
  handleCreateService,
  handleServices,
} from "./routes/services.js";
import {
  handleCreateAppointmentType,
  handleAppointmentTypes,
} from "./routes/appointment-types.js";
import {
  handleAppointments,
  handleCancelAppointment,
  handleCompleteAppointment,
  handleConfirmAppointment,
  handleCreateAppointment,
  handleNoShowAppointment,
  handleRescheduleAppointment,
} from "./routes/appointments.js";
import {
  handleCreateResource,
  handleResources,
} from "./routes/resources.js";
import {
  handleAvailabilityRules,
  handleCreateAvailabilityRule,
} from "./routes/availability-rules.js";
import {
  handleCreatePatient,
  handlePatients,
} from "./routes/patient-access.js";
import {
  handleCreateHoliday,
  handleCreateScheduleBreak,
  handleCreateWorkingHours,
  handleHolidays,
  handleScheduleBreaks,
  handleWorkingHours,
} from "./routes/schedule.js";

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: ReturnType<typeof createRequestContext>,
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );

  response.setHeader("x-request-id", context.requestId);
  response.setHeader(
    "x-correlation-id",
    context.correlationId,
  );

  if (
    method === "GET" &&
    url.pathname === "/api/v1/health"
  ) {
    handleHealth(request, response, context);
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/patients"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreatePatient(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/patients"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handlePatients(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/staff"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleStaff(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/staff"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateStaff(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/providers"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleProviders(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/providers"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateProvider(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/appointments"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleAppointments(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/appointments"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateAppointment(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname.match(
      /^\/api\/v1\/appointments\/[^/]+\/(?:confirm|complete|cancel|no-show|reschedule)$/,
    )
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    if (url.pathname.endsWith("/confirm")) {
      await handleConfirmAppointment(
        request,
        response,
        pool,
        context,
      );
      return;
    }

    if (url.pathname.endsWith("/complete")) {
      await handleCompleteAppointment(
        request,
        response,
        pool,
        context,
      );
      return;
    }

    if (url.pathname.endsWith("/cancel")) {
      await handleCancelAppointment(
        request,
        response,
        pool,
        context,
      );
      return;
    }

    if (url.pathname.endsWith("/no-show")) {
      await handleNoShowAppointment(
        request,
        response,
        pool,
        context,
      );
      return;
    }

    await handleRescheduleAppointment(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/appointment-types"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleAppointmentTypes(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/appointment-types"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateAppointmentType(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/services"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleServices(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/services"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateService(
      request,
      response,
      pool,
      context,
    );
    return;
  }


  if (
    method === "GET" &&
    url.pathname === "/api/v1/resources"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleResources(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/resources"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateResource(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/availability-rules"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleAvailabilityRules(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/availability-rules"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateAvailabilityRule(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/working-hours"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleWorkingHours(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/working-hours"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateWorkingHours(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/schedule-breaks"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleScheduleBreaks(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/schedule-breaks"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateScheduleBreak(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/holidays"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleHolidays(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/holidays"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleCreateHoliday(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/logout"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    await handleLogout(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/me"
  ) {
    await requireAuthenticatedRequest(
      pool,
      request.headers,
      context,
    );

    handleMe(request, response, context);
    return;
  }

  throw new ApiError(
    404,
    "not_found",
    "The requested resource was not found.",
  );
}

export function createApiServer(pool: Pool = createDbPool()) {
  return createServer(async (request, response) => {
    const context = createRequestContext(request.headers);

    try {
      await route(request, response, pool, context);
    } catch (error) {
      const apiError = toApiError(error);

      sendError(
        response,
        apiError.statusCode,
        apiError.code,
        apiError.message,
        context.requestId,
        context.correlationId,
      );
    }
  });
}
