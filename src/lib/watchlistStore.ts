import { WatchItem, ToolResponse } from "@/lib/types";

const store: WatchItem[] = [
  { ticker: "AAPL", reason: "Demo watch" },
  { ticker: "NVDA", reason: "AI leader" },
];

export function addToWatchlist(ticker?: string, reason?: string): ToolResponse<{ added: string }> {
  const symbol = (ticker || "").toUpperCase();
  if (!symbol) return { ok: false, error: "ticker required" };
  const exists = store.find((w) => w.ticker === symbol);
  if (!exists) store.push({ ticker: symbol, reason });
  return { ok: true, data: { added: symbol } };
}

export function getWatchlist(): ToolResponse<{ items: WatchItem[] }> {
  return { ok: true, data: { items: store } };
}

export function removeFromWatchlist(ticker?: string): ToolResponse<{ removed: string; existed: boolean }> {
  const symbol = (ticker || "").toUpperCase();
  const before = store.length;
  const remaining = store.filter((w) => w.ticker !== symbol);
  const existed = before !== remaining.length;
  store.length = 0;
  store.push(...remaining);
  return { ok: true, data: { removed: symbol, existed } };
}
