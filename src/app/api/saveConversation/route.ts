import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";
import { requireUserId } from "@/lib/auth-session";

type TranscriptEntry = { role?: string; text?: string; at?: string };

const ALLOWED_ROLES: Role[] = [Role.user, Role.assistant, Role.tool];
const MAX_MESSAGES = 200;
const MAX_TEXT_LENGTH = 4000;

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));

    const rawTranscript = Array.isArray(body.transcript) ? body.transcript.slice(0, MAX_MESSAGES) : [];
    const transcript: TranscriptEntry[] = rawTranscript.map((m: TranscriptEntry) => ({
      role: typeof m?.role === "string" ? m.role : undefined,
      text: typeof m?.text === "string" ? m.text : "",
      at: typeof m?.at === "string" ? m.at : undefined,
    }));

    const invalidEntry = transcript.find((m) => !m.text);
    if (invalidEntry) {
      return corsResponse({ ok: false, error: "Transcript entries must include text." }, 400);
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: typeof body.title === "string" ? body.title : null,
        summary: typeof body.summary === "string" ? body.summary : null,
        lastMessageAt: new Date(),
      },
    });

    if (transcript.length) {
      const data = transcript.map((m) => ({
        conversationId: conversation.id,
        role: ALLOWED_ROLES.includes(m.role as Role) ? (m.role as Role) : Role.user,
        text: m.text!.slice(0, MAX_TEXT_LENGTH),
        createdAt: m.at ? new Date(m.at) : undefined,
      }));
      await prisma.message.createMany({ data });
    }

    return corsResponse({ ok: true, conversationId: conversation.id });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return corsResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    return corsResponse({ ok: false, error: err.message || "Unable to save conversation" }, 500);
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
