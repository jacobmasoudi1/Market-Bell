import { buildBriefData, formatBrief } from "@/lib/brief";
import { getQuote, getMovers, getNews } from "@/lib/finnhub";
import { prisma } from "@/lib/prisma";
import { storePendingConfirmation } from "@/lib/pendingConfirmations";
import { validateTickerForTool, mapCommonNameToTicker, normalizeTicker } from "@/lib/ticker";
import { ToolArgs, ToolName } from "@/lib/vapi/toolTypes";
import { ToolResponse, TodayBrief, Profile } from "@/lib/types";
import { addWatchlistItem, listWatchlist, removeWatchlistItem, clearWatchlist } from "@/lib/watchlist";

type ToolContext = { userId: string; source: string; toolCallId: string; conversationId?: string };
type ToolHandler = (args: ToolArgs, ctx: ToolContext) => Promise<ToolResponse<any>>;
type CanonicalToolName = Exclude<ToolName, "get_top_movers">;

const coerceTicker = (raw?: string | null) => {
  const mapped = mapCommonNameToTicker(raw);
  if (mapped) return mapped;
  return normalizeTicker(raw) || raw;
};

async function getTodayBrief(args: ToolArgs, userId: string): Promise<ToolResponse<TodayBrief>> {
  const limit = Math.min(Math.max(Number(args.limit ?? 3), 1), 10);
  const briefData = await buildBriefData(userId, { newsLimit: limit, moversLimit: 5 });

  const summary = formatBrief(briefData.profile, {
    topGainers: briefData.topGainers,
    topLosers: briefData.topLosers,
    headlines: briefData.headlines,
  });

  const ok = briefData.errors.length === 0;

  return {
    ok,
    error: ok ? undefined : "Unable to build brief from live data",
    data: {
      summary,
      topGainers: briefData.topGainers.slice(0, 5),
      topLosers: briefData.topLosers.slice(0, 5),
      headlines: briefData.headlines,
      profile: briefData.profile,
      watchlist: briefData.watchlist,
    },
  };
}

const moversHandler: ToolHandler = async (args) => {
  if (args.limit && typeof args.limit !== "number") {
    return { ok: false, error: "Limit must be a number." };
  }
  return getMovers({
    direction: args.direction === "losers" ? "losers" : "gainers",
    limit: args.limit,
  });
};

const TOOL_REGISTRY: Record<CanonicalToolName, ToolHandler> = {
  get_quote: async (args, ctx) => {
    const ticker = coerceTicker(args.ticker);
    const validation = validateTickerForTool(ticker, {
      confirm: args.confirm === true,
      requireConfirm: false,
      action: "get a quote for",
    });
    if (validation.status === "invalid") {
      return { ok: false, error: validation.error };
    }
    if (validation.status === "needs_confirm") {
      if (ctx.conversationId) {
        storePendingConfirmation(ctx.conversationId, "get_quote", validation.ticker, args, ctx.userId);
      }
      return { ok: false, error: validation.error };
    }
    return getQuote(validation.ticker);
  },
  get_movers: moversHandler,
  get_news: async (args, ctx) => {
    const ticker = coerceTicker(args.ticker);
    const validation = validateTickerForTool(ticker, {
      allowEmpty: true,
      confirm: args.confirm === true,
      requireConfirm: false,
      action: "get news for",
    });
    if (validation.status === "invalid") {
      return { ok: false, error: validation.error };
    }
    if (validation.status === "needs_confirm") {
      if (ctx.conversationId && validation.ticker) {
        storePendingConfirmation(ctx.conversationId, "get_news", validation.ticker, args, ctx.userId);
      }
      return { ok: false, error: validation.error };
    }
    if (args.limit && typeof args.limit !== "number") {
      return { ok: false, error: "Limit must be a number." };
    }
    return getNews({
      ticker: validation.ticker || undefined,
      limit: args.limit,
    });
  },
  get_watchlist: async (_args, ctx) => {
    const items = await listWatchlist(ctx.userId);
    return { ok: true, data: { items } };
  },
  add_to_watchlist: async (args, ctx) => {
    const rawTicker = coerceTicker(args.ticker);

    if (!ctx.userId) {
      return { ok: false, error: "I couldn't verify your session. Please sign in and try again." };
    }

    const validation = validateTickerForTool(rawTicker, {
      confirm: true,
      requireConfirm: false,
      action: "add",
    });
    if (validation.status === "invalid") {
      return { ok: false, error: validation.error };
    }
    if (validation.status === "needs_confirm") {
      if (ctx.conversationId) {
        storePendingConfirmation(ctx.conversationId, "add_to_watchlist", validation.ticker, args, ctx.userId);
      }
      return { ok: false, error: validation.error };
    }

    try {
      const item = await addWatchlistItem(ctx.userId, validation.ticker, args.reason);
      const ok = Boolean(item?.ticker);
      if (!ok) {
        return { ok: false, error: "Unable to add to watchlist right now." };
      }
      return { ok: true, data: { added: validation.ticker, speech: `Added ${validation.ticker} to your watchlist.` } };
    } catch (err: any) {
      console.error("Watchlist add failed", {
        userId: ctx.userId,
        ticker: validation.ticker,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: "Unable to add to watchlist right now." };
    }
  },
  remove_from_watchlist: async (args, ctx) => {
    const rawTicker = coerceTicker(args.ticker);
    const wantsAll =
      args?.all === true ||
      args?.clear === true ||
      (typeof rawTicker === "string" &&
        ["all", "clear all", "clear", "*", "everything", "remove all"].includes(rawTicker.toLowerCase()));

    if (wantsAll || !rawTicker) {
      const count = await clearWatchlist(ctx.userId);
      return { ok: true, data: { removed: count ? "all" : "none" } };
    }

    const validation = validateTickerForTool(rawTicker, {
      confirm: args.confirm === true,
      requireConfirm: true,
      action: "remove",
    });
    if (validation.status === "invalid") {
      return { ok: false, error: validation.error };
    }
    if (validation.status === "needs_confirm") {
      if (ctx.conversationId) {
        storePendingConfirmation(ctx.conversationId, "remove_from_watchlist", validation.ticker, args, ctx.userId);
      }
      return { ok: false, error: validation.error };
    }

    try {
      const removed = await removeWatchlistItem(ctx.userId, validation.ticker);
      return { ok: true, data: { removed } };
    } catch (err: any) {
      console.error("Watchlist remove failed", {
        userId: ctx.userId,
        ticker: validation.ticker,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: "Unable to remove from watchlist right now." };
    }
  },
  get_today_brief: async (args, ctx) => {
    return getTodayBrief(args, ctx.userId);
  },
  get_user_profile: async (_args, ctx) => {
    const dbProfile: any = await prisma.userProfile.findFirst({
      where: { userId: ctx.userId },
    });
    if (!dbProfile) {
      return {
        ok: true,
        data: {
          riskTolerance: "medium",
          horizon: "long",
          briefStyle: "bullet",
          experience: "intermediate",
        },
      };
    }
    return {
      ok: true,
      data: {
        riskTolerance: dbProfile.riskTolerance,
        horizon: dbProfile.horizon,
        briefStyle: dbProfile.briefStyle as Profile["briefStyle"],
        experience: dbProfile.experience as Profile["experience"],
        sectors: dbProfile.sectors ?? undefined,
        constraints: dbProfile.constraints ?? undefined,
      },
    };
  },
};

const TOOL_ALIASES: Partial<Record<ToolName, ToolName>> = {
  get_top_movers: "get_movers",
};

export type { ToolContext, ToolHandler, CanonicalToolName };
export { coerceTicker, TOOL_REGISTRY, TOOL_ALIASES };
