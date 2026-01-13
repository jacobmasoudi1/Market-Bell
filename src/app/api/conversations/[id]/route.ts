/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth-session";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

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
      return corsResponse({ ok: false, error: "Conversation not found" }, 404);
    }
    return corsResponse({ ok: true, conversation: convo });
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
