import { NextRequest } from "next/server";
import { corsResponse } from "@/lib/cors";
import { requireUserId } from "@/lib/auth-session";
import { rateLimitHeaders, rateLimitRequest } from "@/lib/rateLimit";
type HandlerCtx = { userId?: string };
type NextRouteContext = { params?: any };
type Handler = (req: NextRequest, ctx: HandlerCtx, context: NextRouteContext) => Promise<Record<string, unknown>>;

type WithApiOptions = {
  auth?: boolean;
  rateLimit?: { key: string; limit: number; windowMs: number };
  raw?: boolean;
};

export function withApi(handler: Handler, opts: WithApiOptions = {}) {
  return async (req: NextRequest, context: NextRouteContext = {}) => {
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
              headers,
            );
          }

          return corsResponse({ ok: false, error: "Too many requests" }, 429, origin, headers);
        }
      }

      let userId: string | undefined;
      if (opts.auth) userId = await requireUserId();

      const result = await handler(req, { userId }, context);
      const { status: handlerStatus, ok: handlerOk, ...payload } = (result ?? {}) as any;

      const ok = handlerOk ?? true;
      const status = typeof handlerStatus === "number" ? handlerStatus : ok ? 200 : 400;

      if (opts.raw) return corsResponse(payload, status, origin);
      return corsResponse({ ok, ...payload }, status, origin);
    } catch (err: any) {
      const origin = req.headers.get("origin") || undefined;
      const message = err?.message || "Unexpected error";
      const msgStr = typeof message === "string" ? message.toLowerCase() : "";
      const isUnauthorized = message === "Unauthorized";
      const isValidation = msgStr.includes("required") || msgStr.includes("invalid");
      const status = isUnauthorized ? 401 : isValidation ? 400 : 500;
      return corsResponse({ ok: false, error: message }, status, origin);
    }
  };
}
