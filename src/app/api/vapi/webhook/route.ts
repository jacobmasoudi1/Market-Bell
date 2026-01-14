import { NextRequest, NextResponse } from "next/server";
import { buildBriefData, formatBrief } from "@/lib/brief";
import { getQuote, getMovers, getNews } from "@/lib/finnhub";
import { validateTickerForTool } from "@/lib/ticker";
import { ToolResponse, TodayBrief, Profile } from "@/lib/types";
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

type ToolHandler = (args: ToolArgs, ctx: ToolContext) => Promise<ToolResponse<any>>;

const TOOL_REGISTRY: Record<ToolName, ToolHandler> = {
  get_quote: async (args) => {
    const validation = validateTickerForTool(args.ticker, {
      confirm: args.confirm === true,
      action: "get a quote for",
    });
    if (!validation.ok) return { ok: false, error: validation.error };
    return getQuote(validation.ticker!);
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
    const validation = validateTickerForTool(args.ticker, {
      allowEmpty: true,
      confirm: args.confirm === true,
      action: "get news for",
    });
    if (!validation.ok) return { ok: false, error: validation.error };
    if (args.limit && typeof args.limit !== "number") {
      return { ok: false, error: "Limit must be a number." };
    }
    return getNews({
      ticker: validation.ticker,
      limit: args.limit,
    });
  },
  get_watchlist: async (_args, ctx) => {
    const items = await listWatchlist(ctx.userId);
    return { ok: true, data: { items } };
  },
  add_to_watchlist: async (args, ctx) => {
    const validation = validateTickerForTool(args.ticker, {
      confirm: args.confirm === true,
      action: "add",
    });
    if (!validation.ok) return { ok: false, error: validation.error };

    const item = await addWatchlistItem(ctx.userId, validation.ticker!, args.reason);
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

    const validation = validateTickerForTool(rawTicker, {
      confirm: args.confirm === true,
      action: "remove",
    });
    if (!validation.ok) return { ok: false, error: validation.error };

    const removed = await removeWatchlistItem(ctx.userId, validation.ticker!);
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
  const name = extracted.name;
  let args: ToolArgs = extracted.args ?? {};
  const toolCallId = extracted.toolCallId ?? "unknown";

  const parseArgs = (argValue: unknown): ToolArgs => {
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
