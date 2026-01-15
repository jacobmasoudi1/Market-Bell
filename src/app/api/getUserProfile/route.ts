import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { corsOptionsResponse } from "@/lib/cors";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi(
  async (_req, { userId }, _context) => {
    const finalProfile = await getOrCreateProfile(userId as string);

    const conversations = await prisma.conversation.findMany({
      where: { userId: userId as string },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, summary: true, createdAt: true },
    });
    return {
      profile: finalProfile,
      conversationHistory: conversations,
    };
  },
  { auth: true },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
