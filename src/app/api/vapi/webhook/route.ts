import { NextRequest, NextResponse } from "next/server";
import { getQuote, getMovers, getNews, isValidTicker } from "@/lib/finnhub";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/lib/watchlistStore";
import { getProfile, saveProfile } from "@/lib/profileStore";
import { ToolResponse, TodayBrief, WatchItem, Profile, Mover } from "@/lib/types";
import { getNews as getNewsHelper } from "@/lib/finnhub";

type ToolArgs = Record<string, any>;

function wrap<T>(resp: ToolResponse<T>) {
  return NextResponse.json(resp);
}

function getProfileData() {
  return getProfile().data as Profile;
}

function getWatchlistData() {
  return (getWatchlist().data?.items ?? []) as WatchItem[];
}

async function getTodayBrief(args: ToolArgs): Promise<ToolResponse<TodayBrief>> {
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
        profile: getProfileData(),
        watchlist: getWatchlistData(),
      },
    };
  }

  return {
    ok: true,
    data: {
      summary: "Brief: markets mixed; watching tech and rates; headlines below.",
      topGainers: gainers.data?.movers.slice(0, 5) ?? [],
      topLosers: losers.data?.movers.slice(0, 5) ?? [],
      headlines: news.data?.headlines ?? [],
      profile: getProfileData(),
      watchlist: getWatchlistData(),
    },
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = body?.name;
  const args: ToolArgs = body?.arguments ?? {};

  switch (name) {
    case "get_quote": {
      const ticker = String(args.ticker ?? "AAPL").toUpperCase();
      return wrap(await getQuote(ticker));
    }
    case "get_top_movers": {
      return wrap(
        await getMovers({
          direction: args.direction === "losers" ? "losers" : "gainers",
          limit: args.limit,
        }),
      );
    }
    case "add_to_watchlist": {
      return wrap(addToWatchlist(args.ticker, args.reason));
    }
    case "get_watchlist": {
      return wrap(getWatchlist());
    }
    case "remove_from_watchlist": {
      return wrap(removeFromWatchlist(args.ticker));
    }
    case "save_user_profile": {
      return wrap(
        saveProfile({
          riskTolerance: args.riskTolerance,
          horizon: args.horizon,
          sectors: args.sectors,
          constraints: args.constraints,
        }),
      );
    }
    case "get_user_profile": {
      return wrap(getProfile());
    }
    case "get_news": {
      return wrap(
        await getNews({
          ticker: isValidTicker(args.ticker) ? args.ticker : undefined,
          limit: args.limit,
        }),
      );
    }
    case "get_today_brief": {
      return wrap(await getTodayBrief(args));
    }
    default:
      return NextResponse.json(
        { error: `Unknown tool: ${name}` },
        { status: 400 },
      );
  }
}
