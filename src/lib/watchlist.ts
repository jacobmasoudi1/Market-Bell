import { isValidTicker, normalizeTicker } from "@/lib/ticker";
import { prisma } from "@/lib/prisma";

function assertUserId(userId?: string): string {
  if (!userId) {
    throw new Error("userId required");
  }
  return userId;
}

export const listWatchlist = async (userId?: string) => {
  const uid = assertUserId(userId);
  return prisma.watchlistItem.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
  });
};

export const addWatchlistItem = async (userId: string, ticker?: string, reason?: string) => {
  const uid = assertUserId(userId);
  const symbol = normalizeTicker(ticker);
  if (!symbol) throw new Error("ticker required");
  if (!isValidTicker(symbol)) throw new Error("invalid ticker");
  return prisma.watchlistItem.upsert({
    where: { userId_ticker: { userId: uid, ticker: symbol } },
    update: { reason: reason ?? null },
    create: { userId: uid, ticker: symbol, reason: reason ?? null },
  });
};

export const removeWatchlistItem = async (userId: string, ticker?: string) => {
  const uid = assertUserId(userId);
  const symbol = normalizeTicker(ticker);
  if (!symbol) throw new Error("ticker required");
  if (!isValidTicker(symbol)) throw new Error("invalid ticker");
  await prisma.watchlistItem.deleteMany({ where: { userId: uid, ticker: symbol } });
  return symbol;
};

export const clearWatchlist = async (userId?: string) => {
  const uid = assertUserId(userId);
  const result = await prisma.watchlistItem.deleteMany({ where: { userId: uid } });
  return result.count;
};
