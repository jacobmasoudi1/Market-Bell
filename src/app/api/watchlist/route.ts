import { NextRequest, NextResponse } from "next/server";
import { listWatchlist, addWatchlistItem, removeWatchlistItem } from "@/lib/watchlist";
import { getOrCreateDefaultUser } from "@/lib/user";

export async function GET() {
  try {
    const userId = await getOrCreateDefaultUser();
    const items = await listWatchlist(userId);
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = await getOrCreateDefaultUser();
    const item = await addWatchlistItem(userId, body.ticker, body.reason);
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker") ?? "";
    const userId = await getOrCreateDefaultUser();
    const removed = await removeWatchlistItem(userId, ticker);
    return NextResponse.json({ ok: true, removed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
