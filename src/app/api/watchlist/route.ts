import { NextRequest } from "next/server";
import { listWatchlist, addWatchlistItem, removeWatchlistItem } from "@/lib/watchlist";
import { corsOptionsResponse } from "@/lib/cors";
import { safeJson, optionalString, requireString } from "@/lib/validate";
import { withApi } from "@/lib/api/withApi";

export const GET = withApi(
  async (_req, { userId }, _context) => {
    const items = await listWatchlist(userId);
    return { items };
  },
  { auth: true },
);

export const POST = withApi(
  async (request, { userId }, _context) => {
    const body = safeJson(await request.json().catch(() => ({})));
    const ticker = requireString(body.ticker, "ticker", { maxLength: 8 }).toUpperCase();
    const reason = optionalString(body.reason, { maxLength: 280 });
    const item = await addWatchlistItem(userId as string, ticker, reason);
    return { item };
  },
  { auth: true, rateLimit: { key: "watchlist-write", limit: 30, windowMs: 60_000 } },
);

export const DELETE = withApi(
  async (req: NextRequest, { userId }, _context) => {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker") ?? "";
    if (!ticker) {
      return { ok: false, error: "ticker required", status: 400 };
    }
    const removed = await removeWatchlistItem(userId as string, ticker);
    return { removed };
  },
  { auth: true, rateLimit: { key: "watchlist-write", limit: 30, windowMs: 60_000 } },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
