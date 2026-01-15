import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { corsOptionsResponse } from "@/lib/cors";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi(
  async (_req: NextRequest, { userId }, _context) => {
    const conversations = await prisma.conversation.findMany({
      where: { userId: userId as string },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
        lastMessageAt: true,
      },
    });
    return { conversations };
  },
  { auth: true },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}

export const POST = withApi(
  async (request: NextRequest, { userId }, _context) => {
    const body = await request.json().catch(() => ({}));
    const convo = await prisma.conversation.create({
      data: {
        userId: userId as string,
        title: body.title ?? null,
        summary: body.summary ?? null,
        lastMessageAt: new Date(),
      },
      select: { id: true, title: true, summary: true, createdAt: true, lastMessageAt: true },
    });
    return { conversation: convo };
  },
  { auth: true },
);
