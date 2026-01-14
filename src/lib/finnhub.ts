import { isValidTicker } from "@/lib/ticker";
import { Headline, Mover, QuoteData, ToolResponse } from "@/lib/types";

export { isValidTicker } from "@/lib/ticker";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const DEFAULT_UNIVERSE = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA", "GOOGL", "AVGO"];

const invalidTickerError =
  "Ticker not recognized. Please spell it letter-by-letter (e.g., A-P-L).";

async function finnhubFetch<T>(path: string, params: Record<string, any>): Promise<T> {
  const token = process.env.FINNHUB_API_KEY?.trim();
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

type ProfileCacheEntry = { name?: string; logo?: string; expiresAt: number };
const profileCache = new Map<string, ProfileCacheEntry>();
const PROFILE_TTL_MS = 5 * 60 * 1000;

async function getProfile(symbol: string): Promise<{ name?: string; logo?: string }> {
  const ticker = symbol.toUpperCase();
  const cached = profileCache.get(ticker);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { name: cached.name, logo: cached.logo };
  }
  try {
    const data = await finnhubFetch<{ name?: string; logo?: string }>("/stock/profile2", { symbol: ticker });
    profileCache.set(ticker, {
      name: data?.name,
      logo: data?.logo,
      expiresAt: now + PROFILE_TTL_MS,
    });
    return { name: data?.name, logo: data?.logo };
  } catch {
    return {};
  }
}

export async function getQuote(symbol: string): Promise<ToolResponse<QuoteData & { name?: string; logo?: string }>> {
  const ticker = symbol.toUpperCase();
  if (!isValidTicker(ticker)) {
    return { ok: false, error: invalidTickerError };
  }
  try {
    const profile = await getProfile(ticker);
    const data = await finnhubFetch<{ c: number; d: number; dp: number }>("/quote", { symbol: ticker });
    if (!data || data.c <= 0) {
      return { ok: false, error: "Quote not found" };
    }
    return {
      ok: true,
      data: {
        ticker,
        name: profile.name,
        logo: profile.logo,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error)?.message || "Quote fetch failed",
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
          const hasDp = Number.isFinite(q.dp);
          const hasClose = q.c > 0 && q.pc > 0;
          const changePercent = hasDp
            ? q.dp
            : hasClose
              ? ((q.c - q.pc) / q.pc) * 100
              : NaN;
          if (!Number.isFinite(changePercent)) return null;
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
    return {
      ok: false,
      error: (err as Error)?.message,
      data: { direction, movers: [] },
    };
  }
}

export async function getNews(params: {
  ticker?: string;
  limit?: number;
}): Promise<ToolResponse<{ ticker: string; headlines: Headline[] }>> {
  const tickerRaw = params.ticker;
  const ticker = tickerRaw ? tickerRaw.toUpperCase() : undefined;
  const limit = Math.min(Math.max(Number(params.limit ?? 3), 1), 10);
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const allowTicker = !ticker || isValidTicker(ticker);

  try {
    if (tickerRaw && !allowTicker) {
      return { ok: false, error: invalidTickerError, data: { ticker: tickerRaw, headlines: [] } };
    }

    const news = allowTicker && ticker
      ? await finnhubFetch<any[]>("/company-news", {
          symbol: ticker,
          from: formatDate(from),
          to: formatDate(now),
        })
      : await finnhubFetch<any[]>("/news", { category: "general" });

    const headlines = (news || [])
      .slice(0, limit)
      .map((n) => {
        const url = safeUrl(n.url);
        return {
          title: n.headline,
          url: url ?? "",
          time: n.datetime ? new Date(n.datetime * 1000).toISOString() : undefined,
        };
      });
    return { ok: true, data: { ticker: ticker ?? "MARKET", headlines } };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error)?.message,
      data: { ticker: ticker ?? "MARKET", headlines: [] },
    };
  }
}

function safeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
