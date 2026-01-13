"/* eslint-disable @typescript-eslint/no-explicit-any */"
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const DEMO_USER_ID = "demo-user";

async function ensureUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID },
  });
  return DEMO_USER_ID;
}

type TranscriptEntry = { role: string; text: string; at?: string };

export async function POST(req: Request) {
  try {
    const userId = await ensureUser();
    const body = await req.json();
    const transcript: TranscriptEntry[] = body.transcript ?? [];

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: body.title ?? null,
        summary: body.summary ?? null,
        lastMessageAt: new Date(),
      },
    });

    if (transcript.length) {
      await prisma.message.createMany({
        data: transcript.map((m) => ({
          conversationId: conversation.id,
          role: (m.role as Role) ?? Role.user,
          text: m.text ?? "",
          createdAt: m.at ? new Date(m.at) : undefined,
        })),
      });
    }

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
