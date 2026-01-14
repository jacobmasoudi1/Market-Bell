import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireUserId } from "@/lib/auth-session";
import { maybeUpdateConversationSummary } from "@/lib/summarizeConversation";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";
import { isNoiseText, buildTitle } from "@/lib/conversationUtils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await requireUserId();
    let convo = await prisma.conversation.findFirst({
      where: { id, userId },
      select: { id: true, title: true },
    });
    
    if (!convo) {
      convo = await prisma.conversation.create({
        data: {
          userId,
          lastMessageAt: new Date(),
        },
        select: { id: true, title: true },
      });
    }

    const body = await req.json();
    const role = body.role as Role;
    const text = body.text as string;

    if (!role || !text) {
      return corsResponse({ ok: false, error: "role and text required" }, 400);
    }

    const titleUpdate =
      (!convo.title || !convo.title.trim()) &&
      (role === Role.user || role === Role.assistant) &&
      !isNoiseText(text)
        ? buildTitle(text)
        : null;

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

    if (role === Role.assistant || role === Role.user) {
      void maybeUpdateConversationSummary(convo.id);
    }

    return corsResponse({ 
      ok: true, 
      message,
      conversationId: convo.id,
    });
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
