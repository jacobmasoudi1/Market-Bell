import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

async function ensureUser() {
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });
  return user.id;
}

export async function GET() {
  try {
    const userId = await ensureUser();
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });
    return NextResponse.json({ ok: true, profile });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await ensureUser();
    const body = await request.json();
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        riskTolerance: body.riskTolerance,
        horizon: body.horizon,
        sectors: body.sectors ?? null,
        constraints: body.constraints ?? null,
      },
      create: {
        userId,
        riskTolerance: body.riskTolerance,
        horizon: body.horizon,
        sectors: body.sectors ?? null,
        constraints: body.constraints ?? null,
      },
    });
    return NextResponse.json({ ok: true, profile });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
