"/* eslint-disable @typescript-eslint/no-explicit-any */"
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    const convo = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!convo) {
      return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conversation: convo });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
