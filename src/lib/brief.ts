import { getMovers, getNews as getNewsHelper } from "@/lib/finnhub";
import { prisma } from "@/lib/prisma";
import { listWatchlist } from "@/lib/watchlist";
import { Mover, Profile, WatchItem, Headline } from "@/lib/types";

const DEFAULT_PROFILE: Profile = {
  riskTolerance: "medium",
  horizon: "long",
  briefStyle: "bullet",
  experience: "intermediate",
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export type BriefData = {
  profile: Profile;
  topGainers: Mover[];
  topLosers: Mover[];
  headlines: Headline[];
  watchlist: (WatchItem & { reason?: string | null })[];
  errors: string[];
};

type MoversCacheEntry = {
  data: Mover[];
  expiresAt: number;
};

type NewsCacheEntry = {
  data: Headline[];
  expiresAt: number;
};

const moversCache = new Map<string, MoversCacheEntry>();
const newsCache = new Map<string, NewsCacheEntry>();
const CACHE_TTL_MS = 45 * 1000;

async function loadProfile(userId: string): Promise<Profile> {
  const dbProfile = await prisma.userProfile.findUnique({ where: { userId } });
  return {
    riskTolerance: dbProfile?.riskTolerance ?? DEFAULT_PROFILE.riskTolerance,
    horizon: dbProfile?.horizon ?? DEFAULT_PROFILE.horizon,
    briefStyle: (dbProfile?.briefStyle as Profile["briefStyle"]) ?? DEFAULT_PROFILE.briefStyle,
    experience: (dbProfile?.experience as Profile["experience"]) ?? DEFAULT_PROFILE.experience,
    sectors: dbProfile?.sectors ?? undefined,
    constraints: dbProfile?.constraints ?? undefined,
  };
}

async function getCachedMovers(direction: "gainers" | "losers", limit: number): Promise<Mover[]> {
  const cacheKey = `${direction}:${limit}`;
  const cached = moversCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const resp = await getMovers({ direction, limit });
    const movers = resp.ok ? resp.data?.movers ?? [] : [];

    if (resp.ok && movers.length > 0) {
      moversCache.set(cacheKey, {
        data: movers,
        expiresAt: now + CACHE_TTL_MS,
      });
      return movers;
    }
  } catch (err) {
    console.error("[Brief] movers fetch error", err);
  }

  return [];
}

async function getCachedNews(limit: number): Promise<Headline[]> {
  const cacheKey = `general:${limit}`;
  const cached = newsCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const resp = await getNewsHelper({ limit });
    const headlines = resp.ok ? resp.data?.headlines ?? [] : [];

    if (resp.ok && headlines.length > 0) {
      newsCache.set(cacheKey, {
        data: headlines,
        expiresAt: now + CACHE_TTL_MS,
      });
      return headlines;
    }
  } catch (err) {
    console.error("[Brief] news fetch error", err);
  }

  return [];
}

export async function buildBriefData(
  userId: string,
  options: { newsLimit?: number; moversLimit?: number } = {},
): Promise<BriefData> {
  const newsLimit = clamp(Number(options.newsLimit ?? 3), 1, 10);
  const moversLimit = clamp(Number(options.moversLimit ?? 5), 1, 10);

  const errors: string[] = [];

  const [profile, watchlist, topGainers, topLosers, headlines] = await Promise.all([
    loadProfile(userId),
    listWatchlist(userId),
    getCachedMovers("gainers", moversLimit),
    getCachedMovers("losers", moversLimit),
    getCachedNews(newsLimit),
  ]);

  const formattedWatchlist = watchlist.map((w) => ({
    ...w,
    reason: w.reason ?? undefined,
  }));

  return { profile, topGainers, topLosers, headlines, watchlist: formattedWatchlist, errors };
}

export function formatBrief(
  profile: Profile,
  data: Pick<BriefData, "topGainers" | "topLosers" | "headlines">,
) {
  const experience = (profile.experience as string) ?? "intermediate";
  const briefStyle = (profile.briefStyle as string) ?? "bullet";

  const explain = experience === "beginner";
  const concise = experience === "advanced";

  const gainText = data.topGainers.slice(0, 3).map((g) => `${g.ticker} ${g.changePercent.toFixed(2)}%`);
  const loseText = data.topLosers.slice(0, 3).map((l) => `${l.ticker} ${l.changePercent.toFixed(2)}%`);
  const newsText = data.headlines.slice(0, 2).map((h) => h.title);

  const helper = (arr: string[], label: string) =>
    arr.length ? `${label}: ${arr.join(", ")}` : `${label}: none`;

  if (briefStyle === "numbers_first") {
    const parts = [
      helper(gainText, "Top gainers"),
      helper(loseText, "Top losers"),
      newsText.length ? `News: ${newsText.join(" | ")}` : "News: none",
    ];
    if (explain) parts.push("Note: % change vs prior close; headlines are recent market items.");
    return parts.join("; ");
  }

  if (briefStyle === "narrative") {
    const lines = [];
    if (gainText.length || loseText.length) {
      lines.push(
        `Markets mixed: gainers (${gainText.join(", ") || "none"}), losers (${loseText.join(", ") || "none"}).`,
      );
    }
    if (newsText.length) lines.push(`Headlines: ${newsText.join(" | ")}`);
    if (explain) lines.push("Note: % change is vs prior close; headlines summarize recent moves.");
    if (concise) return lines.join(" ");
    return lines.join(" ");
  }

  const bullets = [
    helper(gainText, "Top gainers"),
    helper(loseText, "Top losers"),
    newsText.length ? `News: ${newsText.join(" | ")}` : "News: none",
  ];
  if (explain) bullets.push("Note: % change is vs prior close; headlines summarize recent moves.");
  return bullets.join(" • ");
}
