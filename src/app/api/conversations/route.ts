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
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
        lastMessageAt: true,
      },
    });
    return NextResponse.json({ ok: true, conversations });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await ensureUser();
    const body = await request.json().catch(() => ({}));
    const convo = await prisma.conversation.create({
      data: {
        userId,
        title: body.title ?? null,
        summary: body.summary ?? null,
        lastMessageAt: new Date(),
      },
      select: { id: true, title: true, summary: true, createdAt: true, lastMessageAt: true },
    });
    return NextResponse.json({ ok: true, conversation: convo });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
