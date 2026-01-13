"/* eslint-disable @typescript-eslint/no-explicit-any */"
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import { getOrCreateProfile } from "@/lib/profile";

export async function GET() {
  try {
    const userId = await requireUserId();
    const finalProfile = await getOrCreateProfile(userId);

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, summary: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      profile: finalProfile,
      conversationHistory: conversations,
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
