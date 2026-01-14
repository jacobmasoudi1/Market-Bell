import { NextRequest, NextResponse } from "next/server";
import { getQuote, getMovers, getNews, isValidTicker } from "@/lib/finnhub";
import { ToolResponse, TodayBrief, WatchItem, Profile, Mover } from "@/lib/types";
import { getNews as getNewsHelper } from "@/lib/finnhub";
import { prisma } from "@/lib/prisma";
import { addWatchlistItem, listWatchlist, removeWatchlistItem, clearWatchlist } from "@/lib/watchlist";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";
import { ToolArgs, ToolName } from "@/lib/vapi/toolTypes";
import { extractToolCall, normalizeArgs } from "@/lib/vapi/parseToolCall";
import { extractUserToken, extractUserHint, resolveUserId } from "@/lib/vapi/resolveUser";
import { wrapVapiResponse } from "@/lib/vapi/respond";

type ToolContext = { userId: string; source: string; toolCallId: string };

export async function OPTIONS() {
  return corsOptionsResponse();
}

const isDev = process.env.NODE_ENV !== "production";
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

async function getTodayBrief(args: ToolArgs, userId: string): Promise<ToolResponse<TodayBrief>> {
  const dbProfile: any = await prisma.userProfile.findUnique({ where: { userId } });
  const defaultProfile: Profile = {
    riskTolerance: "medium",
    horizon: "long",
    briefStyle: "bullet",
    experience: "intermediate",
  };
  const profile: Profile = {
    riskTolerance: dbProfile?.riskTolerance ?? defaultProfile.riskTolerance,
    horizon: dbProfile?.horizon ?? defaultProfile.horizon,
    briefStyle: (dbProfile?.briefStyle as Profile["briefStyle"]) ?? defaultProfile.briefStyle,
    experience: (dbProfile?.experience as Profile["experience"]) ?? defaultProfile.experience,
    sectors: dbProfile?.sectors ?? undefined,
    constraints: dbProfile?.constraints ?? undefined,
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
        watchlist: [],
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
      watchlist: (await listWatchlist(userId)).map((w) => ({
        ...w,
        reason: w.reason ?? undefined,
      })),
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

  const bullets = [
    helper(gainText, "Top gainers"),
    helper(loseText, "Top losers"),
    newsText.length ? `News: ${newsText.join(" | ")}` : "News: none",
  ];
  if (explain) bullets.push("Note: % change is vs prior close; headlines summarize recent moves.");
  return bullets.join(" • ");
}

type ToolHandler = (args: ToolArgs, ctx: ToolContext) => Promise<ToolResponse<any>>;

const TOOL_REGISTRY: Record<ToolName, ToolHandler> = {
  get_quote: async (args) => {
    if (!args.ticker || typeof args.ticker !== "string") {
      return { ok: false, error: "Please provide a ticker (spell it out letter by letter)." };
    }
    const ticker = args.ticker.toUpperCase();
    if (!isValidTicker(ticker)) {
      const spelled = ticker.split("").join("-");
      return { ok: false, error: `Did you mean ticker ${spelled}? say yes or no.` };
    }
    return getQuote(ticker);
  },
  get_top_movers: async (args) => {
    if (args.limit && typeof args.limit !== "number") {
      return { ok: false, error: "Limit must be a number." };
    }
    return getMovers({
      direction: args.direction === "losers" ? "losers" : "gainers",
      limit: args.limit,
    });
  },
  get_movers: async (args) => {
    if (args.limit && typeof args.limit !== "number") {
      return { ok: false, error: "Limit must be a number." };
    }
    return getMovers({
      direction: args.direction === "losers" ? "losers" : "gainers",
      limit: args.limit,
    });
  },
  get_news: async (args) => {
    if (args.ticker && typeof args.ticker !== "string") {
      return { ok: false, error: "Please provide a ticker (spell it out letter by letter)." };
    }
    if (args.ticker && !isValidTicker(args.ticker)) {
      const spelled = String(args.ticker).toUpperCase().split("").join("-");
      return { ok: false, error: `Did you mean ticker ${spelled}? say yes or no.` };
    }
    if (args.limit && typeof args.limit !== "number") {
      return { ok: false, error: "Limit must be a number." };
    }
    return getNews({
      ticker: args.ticker,
      limit: args.limit,
    });
  },
  get_watchlist: async (_args, ctx) => {
    const items = await listWatchlist(ctx.userId);
    return { ok: true, data: { items } };
  },
  add_to_watchlist: async (args, ctx) => {
    if (!args.ticker || typeof args.ticker !== "string") {
      return { ok: false, error: "Please provide a ticker (spell it out letter by letter)." };
    }
    const ticker = args.ticker.toUpperCase();
    if (!isValidTicker(ticker)) {
      const spelled = ticker.split("").join("-");
      return { ok: false, error: `Did you mean ticker ${spelled}? say yes or no.` };
    }
    if (args.confirm !== true) {
      const spelled = ticker.split("").join("-");
      return { ok: false, error: `Confirm add ${ticker}? Say yes to add ${spelled} or no to cancel.` };
    }
    const item = await addWatchlistItem(ctx.userId, ticker, args.reason);
    return { ok: true, data: { added: item.ticker } };
  },
  remove_from_watchlist: async (args, ctx) => {
    const rawTicker = args.ticker;
    const wantsAll =
      args?.all === true ||
      args?.clear === true ||
      (typeof rawTicker === "string" && ["all", "clear all", "*"].includes(rawTicker.toLowerCase()));

    if (wantsAll || !rawTicker) {
      const count = await clearWatchlist(ctx.userId);
      return { ok: true, data: { removed: count ? "all" : "none" } };
    }

    if (!isValidTicker(rawTicker)) {
      return { ok: false, error: "Please provide a valid ticker to remove." };
    }

    const removed = await removeWatchlistItem(ctx.userId, rawTicker);
    return { ok: true, data: { removed } };
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

// Allow simple GET to avoid 405 noise / health checks
export async function GET() {
  return NextResponse.json({ ok: true, message: "webhook alive" }, { status: 200, headers: getCorsHeaders() });
}

export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const secretHeader = req.headers.get("x-webhook-secret");
    if (!secretHeader || secretHeader !== WEBHOOK_SECRET) {
      return NextResponse.json(
        {
          results: [
            { toolCallId: "unknown", result: "Invalid webhook secret" },
          ],
        },
        { status: 401, headers: getCorsHeaders() }
      );
    }
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      {
        results: [
          {
            toolCallId: "unknown",
            result: "Invalid content-type. Expect application/json.",
          },
        ],
      },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  const body = await req.json().catch(() => ({}));
  console.log("[Webhook] received keys", Object.keys(body));

  const extracted = extractToolCall(body);
  let name = extracted.name;
  let args: ToolArgs = extracted.args ?? {};
  let toolCallId = extracted.toolCallId ?? "unknown";

  const parseArgs = (argValue: any): ToolArgs => {
    if (typeof argValue === "string") {
      try {
        return JSON.parse(argValue);
      } catch {
        return {};
      }
    }
    return argValue ?? {};
  };

  args = normalizeArgs(parseArgs(args));

  const { token: userToken, source: tokenSource } = extractUserToken(body, args, req);
  const userHint = isDev ? extractUserHint(body, args, req) : undefined;
  const fromBrowser = req.headers.get("x-from-browser") === "1";
  const allowDemo = isDev && req.headers.get("x-allow-demo") === "1";

  console.log("[Webhook] extracted tool call", {
    name,
    toolCallId,
    argsKeys: Object.keys(args),
    userHint,
    hasUserToken: Boolean(userToken),
    tokenSource,
  });

  if (!name || typeof name !== "string" || !name.trim()) {
    const receivedKeys = Object.keys(body);
    console.error("=== WEBHOOK MISSING TOOL NAME ===");
    console.error("Received keys:", receivedKeys);
    console.error("Full received body:", JSON.stringify(body, null, 2));
    console.error("Extracted values:", { name, toolCallId, args });
    console.error("=================================");
    return NextResponse.json(
      {
        results: [
          {
            toolCallId,
            result: `Error: Missing tool name. Received keys: ${receivedKeys.join(", ")}. Full body logged to server.`,
          },
        ],
      },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  const normalizedName = name.toLowerCase().replace(/-/g, "_") as ToolName | string;
  const resolvedName = (TOOL_ALIASES[normalizedName as ToolName] ?? normalizedName) as string;

  const { userId, source, error, tokenSource: resolvedTokenSource } = await resolveUserId({
    userToken,
    userHint,
    fromBrowser,
    allowDemo,
  });
  if (!userId || error) {
    const errMsg = error || "Unauthorized";
    console.error("[Webhook] user resolution failed", {
      error: errMsg,
      fromBrowser,
      hasToken: Boolean(userToken),
      tokenSource,
    });
    return wrapVapiResponse(toolCallId, { ok: false, error: errMsg });
  }
  console.log("[Webhook] resolved user", { userId, source, tokenSource: resolvedTokenSource ?? tokenSource });

  const handler = TOOL_REGISTRY[resolvedName as ToolName];

  if (!handler) {
    console.error("Webhook unknown tool", resolvedName, body);
    return NextResponse.json(
      {
        results: [
          {
            toolCallId,
            result: `Unknown tool: ${resolvedName}`,
          },
        ],
      },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  try {
    const result = await handler(args, { userId, source: source || "unknown", toolCallId });
    return wrapVapiResponse(toolCallId, result);
  } catch (err: any) {
    console.error("[Webhook] tool handler error", err);
    return wrapVapiResponse(toolCallId, { ok: false, error: err?.message || "Tool error" });
  }
}
