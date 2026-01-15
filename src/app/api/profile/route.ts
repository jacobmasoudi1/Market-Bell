import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-session";
import { getOrCreateProfile, sanitizeProfile } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await getOrCreateProfile(userId);
    return corsResponse({ ok: true, profile });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return corsResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    return corsResponse({ ok: false, error: err.message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => ({}));
    const data = sanitizeProfile(body);
    const profile = await getOrCreateProfile(userId);
    const updated = await prisma.userProfile.update({
      where: { userId },
      data,
    });
    return corsResponse({ ok: true, profile: updated });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return corsResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    return corsResponse({ ok: false, error: err.message }, 500);
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
