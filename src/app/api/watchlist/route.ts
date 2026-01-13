import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

async function ensureUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });
  return DEMO_USER_ID;
}

export async function GET() {
  try {
    const userId = await ensureUser();
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await ensureUser();
    const body = await request.json();
    const ticker = String(body.ticker ?? "").toUpperCase();
    if (!ticker) {
      return NextResponse.json({ ok: false, error: "ticker required" }, { status: 400 });
    }
    const item = await prisma.watchlistItem.upsert({
      where: { userId_ticker: { userId, ticker } },
      update: { reason: body.reason ?? null },
      create: { userId, ticker, reason: body.reason ?? null },
    });
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await ensureUser();
    const { searchParams } = new URL(req.url);
    const ticker = String(searchParams.get("ticker") ?? "").toUpperCase();
    if (!ticker) {
      return NextResponse.json({ ok: false, error: "ticker required" }, { status: 400 });
    }
    await prisma.watchlistItem.deleteMany({ where: { userId, ticker } });
    return NextResponse.json({ ok: true, removed: ticker });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
