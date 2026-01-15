import { getOrCreateProfile, sanitizeProfile } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { corsOptionsResponse } from "@/lib/cors";
import { safeJson } from "@/lib/validate";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi(
  async (_req, { userId }, _context) => {
    const profile = await getOrCreateProfile(userId as string);
    return { profile };
  },
  { auth: true },
);

export const POST = withApi(
  async (request, { userId }, _context) => {
    const body = safeJson(await request.json().catch(() => ({})));
    const data = sanitizeProfile(body);
    await getOrCreateProfile(userId as string);
    const updated = await prisma.userProfile.update({
      where: { userId: userId as string },
      data,
    });
    return { profile: updated };
  },
  { auth: true, rateLimit: { key: "profile-write", limit: 20, windowMs: 60_000 } },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
