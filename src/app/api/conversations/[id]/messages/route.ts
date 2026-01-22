import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { maybeUpdateConversationSummary } from "@/lib/summarizeConversation";
import { corsOptionsResponse } from "@/lib/cors";
import { isNoiseText, buildTitle } from "@/lib/conversationUtils";
import { safeJson, requireString } from "@/lib/validate";
import { withApi } from "@/lib/api/withApi";
import { Prisma } from "@prisma/client";

export const POST = withApi(
  async (request: NextRequest, { userId }, context) => {
    const params = await Promise.resolve(context.params);
    const id = params?.id as string;

    const convo = await prisma.conversation.findFirst({
      where: { id, userId: userId as string },
      select: { id: true, title: true },
    });

    // If the provided conversationId is not owned/found, create a new one and return its id.
    // This preserves prior fallback behavior while avoiding cross-user access.
    const resolvedConvo =
      convo ??
      (await prisma.conversation.create({
        data: {
          userId: userId as string,
          lastMessageAt: new Date(),
        },
        select: { id: true, title: true },
      }));

    const body = safeJson(await request.json().catch(() => ({})));
    const role = body.role as Role;
    const text = requireString(body.text, "text");
    const toolName = typeof body.toolName === "string" ? body.toolName : null;
    const toolCallId = typeof body.toolCallId === "string" ? body.toolCallId : null;
    const toolArgsJson = body.toolArgsJson as Prisma.InputJsonValue | null | undefined;
    const toolResultJson = body.toolResultJson as Prisma.InputJsonValue | null | undefined;

    const allowedRoles: Role[] = [Role.user, Role.assistant, Role.tool];
    if (!allowedRoles.includes(role) || !text.trim()) {
      return { ok: false, error: "role and text required", status: 400 };
    }

    const titleUpdate =
      (!resolvedConvo.title || !resolvedConvo.title.trim()) &&
      (role === Role.user || role === Role.assistant) &&
      !isNoiseText(text)
        ? buildTitle(text)
        : null;

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: resolvedConvo.id,
          role,
          text: text.slice(0, 4000),
          toolName,
          toolCallId,
          toolArgsJson: toolArgsJson ?? Prisma.JsonNull,
          toolResultJson: toolResultJson ?? Prisma.JsonNull,
        },
      }),
      prisma.conversation.update({
        where: { id: resolvedConvo.id },
        data: {
          lastMessageAt: new Date(),
          ...(titleUpdate ? { title: titleUpdate } : {}),
        },
      }),
    ]);

    if (role === Role.assistant || role === Role.user) {
      void maybeUpdateConversationSummary(resolvedConvo.id);
    }

    return {
      message,
      conversationId: resolvedConvo.id,
    };
  },
  { auth: true, rateLimit: { key: "messages-write", limit: 120, windowMs: 60_000 } },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
