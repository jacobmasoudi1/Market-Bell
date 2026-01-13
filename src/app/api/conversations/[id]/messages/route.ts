/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireUserId } from "@/lib/auth-session";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

const buildTitle = (text: string) => {
  const sanitized = text.replace(/\s+/g, " ").trim();
  if (!sanitized) return null;
  const max = 80;
  return sanitized.length > max ? sanitized.slice(0, max - 1) + "…" : sanitized;
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    const convo = await prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true, title: true },
    });
    if (!convo) {
      return corsResponse({ ok: false, error: "Conversation not found" }, 404);
    }

    const body = await req.json();
    const role = body.role as Role;
    const text = body.text as string;

    if (!role || !text) {
      return corsResponse({ ok: false, error: "role and text required" }, 400);
    }

    const titleUpdate =
      role === Role.user && (!convo.title || !convo.title.trim()) ? buildTitle(text) : null;

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: convo.id,
          role,
          text,
          toolName: body.toolName ?? null,
          toolCallId: body.toolCallId ?? null,
          toolArgsJson: body.toolArgsJson ?? null,
          toolResultJson: body.toolResultJson ?? null,
        },
      }),
      prisma.conversation.update({
        where: { id: convo.id },
        data: {
          lastMessageAt: new Date(),
          ...(titleUpdate ? { title: titleUpdate } : {}),
        },
      }),
    ]);

    return corsResponse({ ok: true, message });
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
