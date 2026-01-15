import { NextResponse } from "next/server";

export function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    // Allow custom headers used for user tokens/dev hints; browsers need these declared.
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Mb-User-Token, X-From-Browser, X-Allow-Demo, X-User-Id, X-Userid, X-User",
  };
}

export function corsResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(),
  });
}

export function corsOptionsResponse() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}
