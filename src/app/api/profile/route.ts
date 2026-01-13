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
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (profile) return NextResponse.json({ ok: true, profile });
    const created = await prisma.userProfile.create({
      data: {
        userId,
        riskTolerance: "medium",
        horizon: "long",
      },
    });
    return NextResponse.json({ ok: true, profile: created });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

const riskSet = new Set(["low", "medium", "high"]);
const horizonSet = new Set(["day", "swing", "long"]);
const briefSet = new Set(["bullet", "narrative", "numbers_first"]);
const expSet = new Set(["beginner", "intermediate", "advanced"]);

function sanitizeProfile(input: any) {
  const risk = riskSet.has(input?.riskTolerance) ? input.riskTolerance : "medium";
  const horizon = horizonSet.has(input?.horizon) ? input.horizon : "long";
  const brief = briefSet.has(input?.briefStyle) ? input.briefStyle : "bullet";
  const experience = expSet.has(input?.experience) ? input.experience : "intermediate";
  return {
    riskTolerance: risk,
    horizon,
    briefStyle: brief,
    experience,
    sectors: input?.sectors?.trim() || null,
    constraints: input?.constraints?.trim() || null,
  };
}

export async function POST(request: Request) {
  try {
    const userId = await ensureUser();
    const body = await request.json();
    const data = sanitizeProfile(body);
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return NextResponse.json({ ok: true, profile });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
