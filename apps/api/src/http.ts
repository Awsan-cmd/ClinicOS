import type { ServerResponse } from "node:http";

export interface JsonResponse<T> {
  data: T;
  requestId: string;
  correlationId: string;
}

export function sendJson<T>(
  response: ServerResponse,
  statusCode: number,
  body: T,
  requestId: string,
  correlationId: string,
): void {
  const payload: JsonResponse<T> = {
    data: body,
    requestId,
    correlationId,
  };

  const serialized = JSON.stringify(payload);

  response.statusCode = statusCode;
  response.setHeader(
    "content-type",
    "application/json; charset=utf-8",
  );
  response.setHeader(
    "content-length",
    Buffer.byteLength(serialized),
  );
  response.end(serialized);
}

export function sendError(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  correlationId: string,
): void {
  sendJson(
    response,
    statusCode,
    {
      error: {
        code,
        message,
      },
    },
    requestId,
    correlationId,
  );
}
