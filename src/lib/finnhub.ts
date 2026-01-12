import { Headline, Mover, QuoteData, ToolResponse } from "@/lib/types";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const DEFAULT_UNIVERSE = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA", "GOOGL", "AVGO"];

export const isValidTicker = (value?: string) =>
  !!value && /^[A-Z.\-]{1,10}$/.test(value.trim().toUpperCase());

async function finnhubFetch<T>(path: string, params: Record<string, any>): Promise<T> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    throw new Error("Missing FINNHUB_API_KEY");
  }
  const url = new URL(`${FINNHUB_BASE}${path}`);
  Object.entries({ ...params, token }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Finnhub ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getQuote(symbol: string): Promise<ToolResponse<QuoteData>> {
  const ticker = symbol.toUpperCase();
  if (!isValidTicker(ticker)) {
    return { ok: false, error: "Invalid ticker" };
  }
  try {
    const data = await finnhubFetch<{ c: number; d: number; dp: number }>("/quote", { symbol: ticker });
    if (!data || data.c <= 0) {
      return { ok: false, error: "Quote not found" };
    }
    return {
      ok: true,
      data: {
        ticker,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
      },
    };
  } catch (err) {
    const price = 120 + Math.random() * 10;
    const change = (Math.random() - 0.5) * 4;
    return {
      ok: false,
      error: (err as Error)?.message || "Quote fetch failed",
      fallback: {
        ticker,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(((change / price) * 100).toFixed(2)),
      },
    };
  }
}

export async function getMovers(params: {
  direction: "gainers" | "losers";
  limit?: number;
}): Promise<ToolResponse<{ direction: string; movers: Mover[] }>> {
  const direction = params.direction === "losers" ? "losers" : "gainers";
  const limit = Math.min(Math.max(Number(params.limit ?? 5), 1), 20);
  const symbols = DEFAULT_UNIVERSE;
  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const q = await finnhubFetch<{ c: number; pc: number; dp?: number }>("/quote", { symbol });
          const changePercent =
            q.dp !== undefined ? q.dp : ((q.c - q.pc) / (q.pc || q.c || 1)) * 100;
          return { ticker: symbol, price: q.c, changePercent };
        } catch {
          return null;
        }
      }),
    );
    const valid = quotes.filter(Boolean) as Mover[];
    if (!valid.length) throw new Error("No quotes returned");
    const sorted =
      direction === "gainers"
        ? valid.sort((a, b) => b.changePercent - a.changePercent)
        : valid.sort((a, b) => a.changePercent - b.changePercent);
    return { ok: true, data: { direction, movers: sorted.slice(0, limit) } };
  } catch (err) {
    const base = direction === "gainers" ? 2 : -2;
    const movers = symbols.slice(0, limit).map((t) => {
      const changePercent = base + (Math.random() - 0.5) * 1.5;
      const price = 100 + Math.random() * 300;
      return {
        ticker: t,
        price: Number(price.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
      };
    });
    return {
      ok: false,
      error: (err as Error)?.message,
      data: { direction, movers },
    };
  }
}

export async function getNews(params: {
  ticker?: string;
  limit?: number;
}): Promise<ToolResponse<{ ticker: string; headlines: Headline[] }>> {
  const ticker = params.ticker;
  const limit = Math.min(Math.max(Number(params.limit ?? 3), 1), 10);
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const news = ticker
      ? await finnhubFetch<any[]>("/company-news", {
          symbol: ticker,
          from: formatDate(from),
          to: formatDate(now),
        })
      : await finnhubFetch<any[]>("/news", { category: "general" });

    const headlines = (news || [])
      .slice(0, limit)
      .map((n) => ({
        title: n.headline,
        url: n.url,
        time: n.datetime ? new Date(n.datetime * 1000).toISOString() : undefined,
      }));
    return { ok: true, data: { ticker: ticker ?? "MARKET", headlines } };
  } catch (err) {
    const headlines = Array.from({ length: limit }).map((_, i) => ({
      title: `Demo headline ${i + 1} for ${ticker ?? "MARKET"}`,
      url: "#",
      time: new Date(Date.now() - i * 60_000).toISOString(),
    }));
    return {
      ok: false,
      error: (err as Error)?.message,
      data: { ticker: ticker ?? "MARKET", headlines },
    };
  }
}
