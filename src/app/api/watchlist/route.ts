import { NextRequest, NextResponse } from "next/server";
import { listWatchlist, addWatchlistItem, removeWatchlistItem } from "@/lib/watchlist";

const DEMO_USER_ID = "demo-user";

export async function GET() {
  try {
    const items = await listWatchlist(DEMO_USER_ID);
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await addWatchlistItem(DEMO_USER_ID, body.ticker, body.reason);
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker") ?? "";
    const removed = await removeWatchlistItem(DEMO_USER_ID, ticker);
    return NextResponse.json({ ok: true, removed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
