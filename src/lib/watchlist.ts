import { prisma } from "@/lib/prisma";

const DEFAULT_USER_ID = "demo-user";

async function ensureUser(userId: string = DEFAULT_USER_ID) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });
  return userId;
}

export async function listWatchlist(userId: string = DEFAULT_USER_ID) {
  const uid = await ensureUser(userId);
  return prisma.watchlistItem.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
  });
}

export async function addWatchlistItem(userId: string, ticker?: string, reason?: string) {
  const uid = await ensureUser(userId);
  const symbol = (ticker || "").toUpperCase();
  if (!symbol) throw new Error("ticker required");
  return prisma.watchlistItem.upsert({
    where: { userId_ticker: { userId: uid, ticker: symbol } },
    update: { reason: reason ?? null },
    create: { userId: uid, ticker: symbol, reason: reason ?? null },
  });
}

export async function removeWatchlistItem(userId: string, ticker?: string) {
  const uid = await ensureUser(userId);
  const symbol = (ticker || "").toUpperCase();
  if (!symbol) throw new Error("ticker required");
  await prisma.watchlistItem.deleteMany({ where: { userId: uid, ticker: symbol } });
  return symbol;
}
