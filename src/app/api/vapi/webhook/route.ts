import { NextRequest, NextResponse } from "next/server";
import { buildBriefData, formatBrief } from "@/lib/brief";
import { getQuote, getMovers, getNews } from "@/lib/finnhub";
import { validateTickerForTool, mapCommonNameToTicker, normalizeTicker } from "@/lib/ticker";
import {
  storePendingConfirmation,
  getPendingConfirmation,
  clearPendingConfirmation,
  isAffirmativeResponse,
} from "@/lib/pendingConfirmations";
import { ToolResponse, TodayBrief, Profile } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { addWatchlistItem, listWatchlist, removeWatchlistItem, clearWatchlist } from "@/lib/watchlist";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";
import { ToolArgs, ToolName } from "@/lib/vapi/toolTypes";
import { extractToolCall, normalizeArgs } from "@/lib/vapi/parseToolCall";
import { extractUserToken, extractUserHint, resolveUserId } from "@/lib/vapi/resolveUser";
import { wrapVapiResponse } from "@/lib/vapi/respond";

type ToolContext = { userId: string; source: string; toolCallId: string; conversationId?: string };

export async function OPTIONS() {
  return corsOptionsResponse();
}

const isDev = process.env.NODE_ENV !== "production";
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

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

type ToolHandler = (args: ToolArgs, ctx: ToolContext) => Promise<ToolResponse<any>>;

const TOOL_REGISTRY: Record<ToolName, ToolHandler> = {
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
      console.error("[Webhook][add_to_watchlist] watchlist write failed", err);
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

    const removed = await removeWatchlistItem(ctx.userId, validation.ticker);
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
  const conversationId =
    (body as { metadata?: { conversationId?: string } })?.metadata?.conversationId ||
    (body as { call?: { metadata?: { conversationId?: string } } })?.call?.metadata?.conversationId ||
    (body as { conversationId?: string })?.conversationId ||
    undefined;

  const extracted = extractToolCall(body);
  let name = extracted.name;
  let args: ToolArgs = extracted.args ?? {};
  const toolCallId = extracted.toolCallId ?? "unknown";

  if (!name || typeof name !== "string" || !name.trim()) {
    if (args.limit !== undefined && (args.direction === "up" || args.direction === "down" || args.direction === "gainers" || args.direction === "losers")) {
      name = "get_movers";
    } else if (args.ticker && typeof args.ticker === "string") {
      if (args.reason !== undefined) {
        name = "add_to_watchlist";
      } else {
        name = "get_quote";
      }
    }
  }

  const userText =
    (typeof args.ticker === "string" ? args.ticker : "") ||
    (typeof (args as { message?: string }).message === "string" ? (args as { message: string }).message : "") ||
    (typeof (args as { text?: string }).text === "string" ? (args as { text: string }).text : "") ||
    (typeof body?.message === "string" ? body.message : "") ||
    (typeof body?.text === "string" ? body.text : "") ||
    (typeof body?.userMessage === "string" ? body.userMessage : "") ||
    "";

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

  args = normalizeArgs(parseArgs(args), userText);

  const { token: userToken, source: tokenSource } = extractUserToken(body, args, req);
  const userHint = isDev ? extractUserHint(body, args, req) : undefined;
  const fromBrowser = req.headers.get("x-from-browser") === "1";
  const allowDemo = isDev && req.headers.get("x-allow-demo") === "1";

  if (!name || typeof name !== "string" || !name.trim()) {
    const receivedKeys = Object.keys(body);
    console.error("=== WEBHOOK MISSING TOOL NAME ===");
    console.error("Received keys:", receivedKeys);
    console.error("Full received body:", JSON.stringify(body, null, 2));
    console.error("Extracted values:", { name, toolCallId, args });
    console.error("Args structure:", { argsKeys: Object.keys(args), args });
    console.error("=================================");
    return NextResponse.json(
      {
        results: [
          {
            toolCallId,
            result: `Error: Missing tool name. The tool name field is empty. Please check your VAPI assistant tool configuration:\n1. Ensure the tool function name is set correctly in VAPI dashboard\n2. Ensure the tool schema name matches your registry (e.g., "get_movers" or "get_top_movers")\n3. If testing manually, ensure the "name" field is not empty.\n\nReceived arguments: ${JSON.stringify(args)}`,
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
  if (conversationId && (args.confirm === true || isAffirmativeResponse(userText))) {
    const tickerTools: ToolName[] = ["get_quote", "get_news", "add_to_watchlist", "remove_from_watchlist"];
    for (const toolName of tickerTools) {
      const pending = getPendingConfirmation(conversationId, toolName);
      if (pending && pending.userId === userId) {
        clearPendingConfirmation(conversationId, toolName, pending.ticker);
        const handler = TOOL_REGISTRY[toolName];
        if (handler) {
          try {
            const confirmedArgs = { ...pending.args, confirm: true, ticker: pending.ticker };
            const result = await handler(confirmedArgs, {
              userId,
              source: source || "unknown",
              toolCallId,
              conversationId,
            });
            return wrapVapiResponse(toolCallId, result);
          } catch (err: unknown) {
            console.error("[Webhook] pending confirmation execution error", err);
            return wrapVapiResponse(toolCallId, {
              ok: false,
              error: err instanceof Error ? err.message : "Tool error",
            });
          }
        }
      }
    }
  }

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
    const result = await handler(args, {
      userId,
      source: source || "unknown",
      toolCallId,
      conversationId,
    });
    return wrapVapiResponse(toolCallId, result);
  } catch (err: unknown) {
    console.error("[Webhook] tool handler error", err);
    return wrapVapiResponse(toolCallId, {
      ok: false,
      error: err instanceof Error ? err.message : "Tool error",
    });
  }
}
