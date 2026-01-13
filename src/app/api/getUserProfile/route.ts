import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

async function ensureUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });
  return DEMO_USER_ID;
}

export async function GET() {
  try {
    const userId = await ensureUser();
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, summary: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      profile,
      conversationHistory: conversations,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
