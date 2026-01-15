import { NextResponse } from "next/server";

const allowlist = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function getCorsHeaders(origin?: string) {
  const isAllowed = origin && allowlist.length > 0 && allowlist.includes(origin);
  const allowOrigin = isAllowed ? origin : allowlist.length ? "null" : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    // Allow custom headers used for user tokens/dev hints; browsers need these declared.
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Mb-User-Token, X-From-Browser, X-Allow-Demo, X-User-Id, X-Userid, X-User",
    ...(allowOrigin !== "*" ? { "Access-Control-Allow-Credentials": "true", Vary: "Origin" } : {}),
  };
}

export function corsResponse(data: any, status = 200, origin?: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status,
    headers: { ...getCorsHeaders(origin), ...(extraHeaders || {}) },
  });
}

export function corsOptionsResponse() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
