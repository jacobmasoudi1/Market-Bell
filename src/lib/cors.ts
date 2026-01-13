import { NextResponse } from "next/server";

export function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
