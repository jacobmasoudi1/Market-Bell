import { signUserToken } from "@/lib/userToken";
import { corsOptionsResponse } from "@/lib/cors";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi(
  async (_req, { userId }, _context) => {
    const userToken = signUserToken(userId as string, 60 * 30);
    return { userToken };
  },
  { auth: true, rateLimit: { key: "vapi-user-token", limit: 60, windowMs: 60_000 } },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
