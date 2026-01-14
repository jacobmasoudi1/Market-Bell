import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-session";
import { signUserToken } from "@/lib/userToken";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  try {
    const userId = await requireUserId();
    const userToken = signUserToken(userId, 60 * 30);
    return NextResponse.json({ ok: true, userToken }, { headers: getCorsHeaders() });
  } catch (err: any) {
    const message = err?.message === "Unauthorized" ? "Unauthorized" : err?.message || "Error issuing token";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status, headers: getCorsHeaders() });
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
