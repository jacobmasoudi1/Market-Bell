import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { corsOptionsResponse } from "@/lib/cors";
import { safeJson, optionalString } from "@/lib/validate";
import { withApi } from "@/lib/api/withApi";

type TranscriptEntry = { role?: string; text?: string; at?: string };

const ALLOWED_ROLES: Role[] = [Role.user, Role.assistant, Role.tool];
const MAX_MESSAGES = 200;
const MAX_TEXT_LENGTH = 4000;

export const POST = withApi(
  async (request: NextRequest, { userId }, _context) => {
    const body = safeJson(await request.json().catch(() => ({})));

    const rawTranscript = Array.isArray(body.transcript) ? body.transcript.slice(0, MAX_MESSAGES) : [];
    const transcript: TranscriptEntry[] = rawTranscript.map((m: TranscriptEntry) => ({
      role: typeof m?.role === "string" ? m.role : undefined,
      text: typeof m?.text === "string" ? m.text : "",
      at: typeof m?.at === "string" ? m.at : undefined,
    }));

    const invalidEntry = transcript.find((m) => !m.text);
    if (invalidEntry) {
      return { ok: false, error: "Transcript entries must include text.", status: 400 };
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: userId as string,
        title: optionalString(body.title, { maxLength: 200 }) ?? null,
        summary: optionalString(body.summary, { maxLength: 4000 }) ?? null,
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

    return { conversationId: conversation.id };
  },
  { auth: true, rateLimit: { key: "save-conversation", limit: 20, windowMs: 60_000 } },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
