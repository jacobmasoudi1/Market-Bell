import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

type PendingRecord = {
  toolName: string;
  ticker: string;
  args: Prisma.JsonValue;
  userId: string;
  expiresAt: Date;
};



export async function storePendingConfirmation(
  conversationId: string,
  toolName: string,
  ticker: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS);
  
  await prisma.pendingConfirmation.upsert({
    where: {
      conversationId_toolName_ticker: {
        conversationId,
        toolName,
        ticker,
      },
    },
    update: {
      args: args as Prisma.InputJsonValue,
      userId,
      expiresAt,
    },
    create: {
      conversationId,
      toolName,
      ticker,
      args: args as Prisma.InputJsonValue,
      userId,
      expiresAt,
    },
  });
}

export async function getPendingConfirmation(
  conversationId: string,
  toolName: string,
  ticker?: string,
): Promise<PendingRecord | null> {
  const now = new Date();
  if (ticker) {
    const pending = await prisma.pendingConfirmation.findUnique({
      where: {
        conversationId_toolName_ticker: {
          conversationId,
          toolName,
          ticker,
        },
      },
    });
    if (pending && pending.expiresAt > now) {
      return pending;
    }
    if (pending) {
      await prisma.pendingConfirmation.delete({
        where: {
          conversationId_toolName_ticker: {
            conversationId,
            toolName,
            ticker,
          },
        },
      });
    }
    return null;
  }

  const pending = await prisma.pendingConfirmation.findFirst({
    where: {
      conversationId,
      toolName,
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: "desc" },
  });
  return pending ? pending : null;
}

export async function clearPendingConfirmation(conversationId: string, toolName: string, ticker: string): Promise<void> {
  await prisma.pendingConfirmation.deleteMany({
    where: { conversationId, toolName, ticker },
  });
}

export function isAffirmativeResponse(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return ["yes", "y", "yeah", "yep", "sure", "ok", "okay", "confirm", "correct", "right"].includes(normalized);
}

export function extractConfirmFlag(text: string | undefined | null): boolean | undefined {
  if (!text || typeof text !== "string") return undefined;

  const normalized = text.trim().toLowerCase();

  const affirmative = [
    "yes",
    "y",
    "yeah",
    "yep",
    "sure",
    "ok",
    "okay",
    "confirm",
    "correct",
    "right",
    "proceed",
    "go ahead",
    "do it",
  ];
  if (affirmative.some((aff) => normalized === aff || normalized.startsWith(aff + " ") || normalized.endsWith(" " + aff))) {
    return true;
  }

  const negative = ["no", "n", "nope", "cancel", "stop", "don't", "dont", "never", "abort"];
  if (negative.some((neg) => normalized === neg || normalized.startsWith(neg + " ") || normalized.endsWith(" " + neg))) {
    return false;
  }

  return undefined;
}
