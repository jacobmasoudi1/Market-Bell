"/* eslint-disable @typescript-eslint/no-explicit-any */"
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth-session";
import { getOrCreateProfile, sanitizeProfile } from "@/lib/profile";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await requireUserId();
    const profile = await getOrCreateProfile(userId);
    return NextResponse.json({ ok: true, profile });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const data = sanitizeProfile(body);
    const profile = await getOrCreateProfile(userId);
    const updated = await prisma.userProfile.update({
      where: { userId },
      data,
    });
    return NextResponse.json({ ok: true, profile: updated });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
