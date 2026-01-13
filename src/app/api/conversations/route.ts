"/* eslint-disable @typescript-eslint/no-explicit-any */"
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";

export async function GET() {
  try {
    const userId = await requireUserId();
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
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
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
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
