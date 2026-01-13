import { NextRequest, NextResponse } from "next/server";
import { getQuote, getMovers, getNews, isValidTicker } from "@/lib/finnhub";
import { ToolResponse, TodayBrief, WatchItem, Profile, Mover } from "@/lib/types";
import { getNews as getNewsHelper } from "@/lib/finnhub";
import { prisma } from "@/lib/prisma";
import {
  addWatchlistItem,
  listWatchlist,
  removeWatchlistItem,
} from "@/lib/watchlist";
import { getOrCreateDefaultUser } from "@/lib/user";
import { getOrCreateProfile } from "@/lib/profile";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";

type ToolArgs = Record<string, any>;

// Convert response data to a single-line string for Vapi
function formatResult<T>(resp: ToolResponse<T>): string {
  if (!resp.ok) {
    return resp.error || "An error occurred";
  }
  if (!resp.data) {
    return "No data available";
  }

  const data = resp.data as any;

  // Format quote data naturally
  if (data.ticker && typeof data.price === "number") {
    const change = data.change >= 0 ? `+${data.change}` : `${data.change}`;
    const changePercent = data.changePercent >= 0 ? `+${data.changePercent.toFixed(2)}%` : `${data.changePercent.toFixed(2)}%`;
    return `${data.ticker} is trading at $${data.price.toFixed(2)}, ${change} (${changePercent})`;
  }

  // Format watchlist items
  if (data.items && Array.isArray(data.items)) {
    if (data.items.length === 0) return "Watchlist is empty";
    return `Watchlist: ${data.items.map((item: any) => item.ticker).join(", ")}`;
  }

  // Format added/removed ticker
  if (data.added) return `Added ${data.added} to watchlist`;
  if (data.removed) return `Removed ${data.removed} from watchlist`;

  // Format today's brief summary
  if (data.summary) return data.summary;

  // For other data, convert to JSON string (single-line)
  return JSON.stringify(data).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// Wrap response in Vapi's expected format
function wrapVapiResponse<T>(toolCallId: string, resp: ToolResponse<T>) {
  const result = formatResult(resp);
  // Always return 200 status - Vapi ignores other status codes
  return NextResponse.json(
    {
      results: [
        {
          toolCallId,
          result,
        },
      ],
    },
    { status: 200, headers: getCorsHeaders() }
  );
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return corsOptionsResponse();
}

function getWatchlistData() {
  return [] as WatchItem[];
}

async function getTodayBrief(args: ToolArgs): Promise<ToolResponse<TodayBrief>> {
  const userId = await getOrCreateDefaultUser();
  const dbProfile: any = await getOrCreateProfile(userId);
  const defaultProfile: Profile = {
    riskTolerance: "medium",
    horizon: "long",
    briefStyle: "bullet",
    experience: "intermediate",
  };
  const profile: Profile = {
    riskTolerance: dbProfile?.riskTolerance ?? "medium",
    horizon: dbProfile?.horizon ?? "long",
    briefStyle: (dbProfile?.briefStyle as Profile["briefStyle"]) ?? "bullet",
    experience: (dbProfile?.experience as Profile["experience"]) ?? "intermediate",
  };

  const limit = Math.min(Math.max(Number(args.limit ?? 3), 1), 10);
  const gainers = await getMovers({ direction: "gainers", limit: 5 });
  const losers = await getMovers({ direction: "losers", limit: 5 });
  const news = await getNewsHelper({ limit });

  if (!gainers.ok || !losers.ok || !news.ok) {
    return {
      ok: false,
      error: "Unable to build brief from live data",
      data: {
        summary: "",
        topGainers: gainers.data?.movers ?? [],
        topLosers: losers.data?.movers ?? [],
        headlines: news.data?.headlines ?? [],
        profile: profile ?? defaultProfile,
        watchlist: getWatchlistData(),
      },
    };
  }

  const summary = formatBrief(profile, gainers.data?.movers ?? [], losers.data?.movers ?? [], news.data?.headlines ?? []);

  return {
    ok: true,
    data: {
      summary,
      topGainers: gainers.data?.movers.slice(0, 5) ?? [],
      topLosers: losers.data?.movers.slice(0, 5) ?? [],
      headlines: news.data?.headlines ?? [],
      profile,
      watchlist: getWatchlistData(),
    },
  };
}

function formatBrief(profile: Profile, gainers: Mover[], losers: Mover[], headlines: { title: string }[]) {
  const experience = (profile.experience as string) ?? "intermediate";
  const briefStyle = (profile.briefStyle as string) ?? "bullet";

  const explain = experience === "beginner";
  const concise = experience === "advanced";

  const gainText = gainers.slice(0, 3).map((g) => `${g.ticker} ${g.changePercent.toFixed(2)}%`);
  const loseText = losers.slice(0, 3).map((l) => `${l.ticker} ${l.changePercent.toFixed(2)}%`);
  const newsText = headlines.slice(0, 2).map((h) => h.title);

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

  // default bullet
  const bullets = [
    helper(gainText, "Top gainers"),
    helper(loseText, "Top losers"),
    newsText.length ? `News: ${newsText.join(" | ")}` : "News: none",
  ];
  if (explain) bullets.push("Note: % change is vs prior close; headlines summarize recent moves.");
  return bullets.join(" • ");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.log("Webhook received body:", body);

  const name = body?.name || body?.tool;
  const args: ToolArgs = body?.arguments ?? body?.args ?? {};
  const toolCallId = body?.toolCallId || body?.id || "unknown";

  if (!name) {
    console.error("Webhook missing tool name", body);
    // Vapi requires 200 status even for errors
    return NextResponse.json(
      {
        results: [
          {
            toolCallId,
            result: "Error: Missing tool name",
          },
        ],
      },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  switch (name) {
    case "get_quote": {
      const ticker = String(args.ticker ?? "AAPL").toUpperCase();
      return wrapVapiResponse(toolCallId, await getQuote(ticker));
    }
    case "get_top_movers": {
      return wrapVapiResponse(
        toolCallId,
        await getMovers({
          direction: args.direction === "losers" ? "losers" : "gainers",
          limit: args.limit,
        }),
      );
    }
    case "add_to_watchlist": {
      try {
        const userId = await getOrCreateDefaultUser();
        if (!isValidTicker(args.ticker)) {
          return wrapVapiResponse(toolCallId, {
            ok: false,
            error: "Ticker not recognized. Please spell it letter-by-letter.",
          });
        }
        const item = await addWatchlistItem(userId, args.ticker, args.reason);
        return wrapVapiResponse(toolCallId, { ok: true, data: { added: item.ticker } });
      } catch (err: any) {
        return wrapVapiResponse(toolCallId, { ok: false, error: err.message });
      }
    }
    case "get_watchlist": {
      try {
        const userId = await getOrCreateDefaultUser();
        const items = await listWatchlist(userId);
        return wrapVapiResponse(toolCallId, { ok: true, data: { items } });
      } catch (err: any) {
        return wrapVapiResponse(toolCallId, { ok: false, error: err.message });
      }
    }
    case "remove_from_watchlist": {
      try {
        const userId = await getOrCreateDefaultUser();
        const removed = await removeWatchlistItem(userId, args.ticker);
        return wrapVapiResponse(toolCallId, { ok: true, data: { removed } });
      } catch (err: any) {
        return wrapVapiResponse(toolCallId, { ok: false, error: err.message });
      }
    }
    case "save_user_profile": {
      return wrapVapiResponse(toolCallId, { ok: false, error: "Not implemented in webhook" });
    }
    case "get_user_profile": {
      const userId = "demo-user";
      const dbProfile: any = await prisma.userProfile.findFirst({
        where: { userId },
      });
      if (!dbProfile) {
        return wrapVapiResponse(toolCallId, {
          ok: true,
          data: {
            riskTolerance: "medium",
            horizon: "long",
            briefStyle: "bullet",
            experience: "intermediate",
          },
        });
      }
      return wrapVapiResponse(toolCallId, {
        ok: true,
        data: {
          riskTolerance: dbProfile.riskTolerance,
          horizon: dbProfile.horizon,
          briefStyle: dbProfile.briefStyle as Profile["briefStyle"],
          experience: dbProfile.experience as Profile["experience"],
          sectors: dbProfile.sectors ?? undefined,
          constraints: dbProfile.constraints ?? undefined,
        },
      });
    }
    case "get_news": {
      return wrapVapiResponse(
        toolCallId,
        await getNews({
          ticker: isValidTicker(args.ticker) ? args.ticker : undefined,
          limit: args.limit,
        }),
      );
    }
    case "get_today_brief": {
      return wrapVapiResponse(toolCallId, await getTodayBrief(args));
    }
    default:
      console.error("Webhook unknown tool", name, body);
      return NextResponse.json(
        {
          results: [
            {
              toolCallId,
              result: `Unknown tool: ${name}`,
            },
          ],
        },
        { status: 200, headers: getCorsHeaders() }
      );
  }
}
