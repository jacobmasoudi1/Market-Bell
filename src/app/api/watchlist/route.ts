/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { listWatchlist, addWatchlistItem, removeWatchlistItem } from "@/lib/watchlist";
import { requireUserId } from "@/lib/auth-session";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  try {
    const userId = await requireUserId();
    const items = await listWatchlist(userId);
    return corsResponse({ ok: true, items });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return corsResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    return corsResponse({ ok: false, error: err.message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = await requireUserId();
    const item = await addWatchlistItem(userId, body.ticker, body.reason);
    return corsResponse({ ok: true, item });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return corsResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    return corsResponse({ ok: false, error: err.message }, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker") ?? "";
    const userId = await requireUserId();
    const removed = await removeWatchlistItem(userId, ticker);
    return corsResponse({ ok: true, removed });
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
