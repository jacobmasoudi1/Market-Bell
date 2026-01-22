import { NextRequest } from "next/server";
import crypto from "crypto";
import { corsResponse } from "@/lib/cors";
import { requireUserId } from "@/lib/auth-session";
import { rateLimitHeaders, rateLimitRequest } from "@/lib/rateLimit";
import { createLogger, Logger } from "@/lib/logger";

export type ApiSuccess<T = unknown> = { ok: true; data?: T; status?: number };
export type ApiError = { ok: false; status?: number; error: { code: string; message: string; details?: unknown } };
export type ApiResult<T = unknown> = ApiSuccess<T> | ApiError | Record<string, unknown>;

export function ok<T>(data?: T, status?: number): ApiSuccess<T> {
  return { ok: true, data, ...(status ? { status } : {}) };
}

export function fail(code: string, message: string, status = 400, details?: unknown): ApiError {
  return { ok: false, status, error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

type HandlerCtx = { userId?: string; requestId: string; log: Logger };
type NextRouteContext = { params?: any };
type Handler = (req: NextRequest, ctx: HandlerCtx, context: NextRouteContext) => Promise<ApiResult>;

type WithApiOptions = {
  auth?: boolean;
  rateLimit?: { key: string; limit: number; windowMs: number };
  raw?: boolean;
};

export function withApi(handler: Handler, opts: WithApiOptions = {}) {
  return async (req: NextRequest, context: NextRouteContext = {}) => {
    const requestId = crypto.randomUUID();
    const baseLog = createLogger({ requestId });
    const responseHeaders: Record<string, string> = {};
    if (process.env.NODE_ENV !== "production") {
      responseHeaders["x-request-id"] = requestId;
    }

    try {
      const origin = req.headers.get("origin") || undefined;

      if (opts.rateLimit) {
        const allowed = rateLimitRequest(req, opts.rateLimit.key, opts.rateLimit.limit, opts.rateLimit.windowMs);
        if (!allowed) {
          const headers = rateLimitHeaders(req, opts.rateLimit.key, opts.rateLimit.limit);

          if (opts.raw) {
            return corsResponse(
              { results: [{ toolCallId: "unknown", result: "Too many requests" }] },
              429,
              origin,
              { ...headers, ...responseHeaders },
            );
          }

          return corsResponse({ ok: false, error: "Too many requests" }, 429, origin, { ...headers, ...responseHeaders });
        }
      }

      let userId: string | undefined;
      if (opts.auth) userId = await requireUserId();

      const result = await handler(req, { userId, requestId, log: baseLog }, context);
      const { status: handlerStatus, ok: handlerOk, ...rest } = (result ?? {}) as any;

      const okFlag = handlerOk ?? true;
      const status = typeof handlerStatus === "number" ? handlerStatus : okFlag ? 200 : 400;

      // For ok=true, include both data and flattened fields to avoid breaking existing consumers.
      if (opts.raw) return corsResponse(rest, status, origin, responseHeaders);
      if (okFlag) {
        const data = "data" in rest ? (rest as any).data : rest;
        const payload =
          data && typeof data === "object" && !Array.isArray(data)
            ? { ok: true, data, ...data }
            : { ok: true, data };
        return corsResponse(payload, status, origin, responseHeaders);
      }

      const errorObj =
        (rest as any).error && typeof (rest as any).error === "object"
          ? (rest as any).error
          : { code: "error", message: (rest as any).error ?? "Error" };
      return corsResponse({ ok: false, error: errorObj }, status, origin, responseHeaders);
    } catch (err: any) {
      const origin = req.headers.get("origin") || undefined;
      const message = err?.message || "Unexpected error";
      const msgStr = typeof message === "string" ? message.toLowerCase() : "";
      const isUnauthorized = message === "Unauthorized";
      const isValidation = msgStr.includes("required") || msgStr.includes("invalid");
      const status = isUnauthorized ? 401 : isValidation ? 400 : 500;
      baseLog.error("API handler failed", { error: message });
      return corsResponse({ ok: false, error: { code: "error", message } }, status, origin, responseHeaders);
    }
  };
}
