import { getMovers, getNews as getNewsHelper } from "@/lib/finnhub";
import { prisma } from "@/lib/prisma";
import { listWatchlist } from "@/lib/watchlist";
import { Mover, Profile, WatchItem } from "@/lib/types";

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
  headlines: { title: string }[];
  watchlist: (WatchItem & { reason?: string | null })[];
  errors: string[];
};

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

export async function buildBriefData(
  userId: string,
  options: { newsLimit?: number; moversLimit?: number } = {},
): Promise<BriefData> {
  const profile = await loadProfile(userId);
  const newsLimit = clamp(Number(options.newsLimit ?? 3), 1, 10);
  const moversLimit = clamp(Number(options.moversLimit ?? 5), 1, 10);

  const errors: string[] = [];

  const [gainersResp, losersResp, newsResp] = await Promise.all([
    getMovers({ direction: "gainers", limit: moversLimit }),
    getMovers({ direction: "losers", limit: moversLimit }),
    getNewsHelper({ limit: newsLimit }),
  ]);

  const topGainers = gainersResp.ok ? gainersResp.data?.movers ?? [] : [];
  const topLosers = losersResp.ok ? losersResp.data?.movers ?? [] : [];
  const headlines = newsResp.ok ? newsResp.data?.headlines ?? [] : [];

  if (!gainersResp.ok) errors.push("gainers");
  if (!losersResp.ok) errors.push("losers");
  if (!newsResp.ok) errors.push("news");

  const watchlist = (await listWatchlist(userId)).map((w) => ({
    ...w,
    reason: w.reason ?? undefined,
  }));

  return { profile, topGainers, topLosers, headlines, watchlist, errors };
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
