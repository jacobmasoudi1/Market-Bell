import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const DEMO_USER_ID = "demo-user";

async function ensureUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });
  return DEMO_USER_ID;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await ensureUser();
    const convo = await prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!convo) {
      return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
    }

    const body = await req.json();
    const role = body.role as Role;
    const text = body.text as string;

    if (!role || !text) {
      return NextResponse.json({ ok: false, error: "role and text required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: convo.id,
        role,
        text,
        toolName: body.toolName ?? null,
        toolCallId: body.toolCallId ?? null,
        toolArgsJson: body.toolArgsJson ?? null,
        toolResultJson: body.toolResultJson ?? null,
      },
    });

    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ ok: true, message });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
