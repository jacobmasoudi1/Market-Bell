import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultUser } from "@/lib/user";

export async function listWatchlist(userId?: string) {
  const uid = userId || (await getOrCreateDefaultUser());
  return prisma.watchlistItem.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
  });
}

export async function addWatchlistItem(userId: string, ticker?: string, reason?: string) {
  const uid = userId || (await getOrCreateDefaultUser());
  const symbol = (ticker || "").toUpperCase();
  if (!symbol) throw new Error("ticker required");
  return prisma.watchlistItem.upsert({
    where: { userId_ticker: { userId: uid, ticker: symbol } },
    update: { reason: reason ?? null },
    create: { userId: uid, ticker: symbol, reason: reason ?? null },
  });
}

export async function removeWatchlistItem(userId: string, ticker?: string) {
  const uid = userId || (await getOrCreateDefaultUser());
  const symbol = (ticker || "").toUpperCase();
  if (!symbol) throw new Error("ticker required");
  await prisma.watchlistItem.deleteMany({ where: { userId: uid, ticker: symbol } });
  return symbol;
}
