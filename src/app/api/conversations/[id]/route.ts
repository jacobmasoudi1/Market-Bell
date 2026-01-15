import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsOptionsResponse } from "@/lib/cors";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi(
  async (_req: NextRequest, { userId }, context) => {
    const params = await Promise.resolve(context.params);
    const { id } = params;
    const convo = await prisma.conversation.findFirst({
      where: { id, userId: userId as string },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!convo) {
      return { ok: false, error: "Conversation not found", status: 404 };
    }
    return { conversation: convo };
  },
  { auth: true },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
