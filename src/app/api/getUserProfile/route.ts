import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";
import { getOrCreateProfile } from "@/lib/profile";

export async function GET() {
  try {
    const userId = await getOrCreateDefaultUser();
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
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
