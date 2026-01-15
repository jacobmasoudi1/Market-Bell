import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";
import { extractToolCall, normalizeArgs } from "@/lib/vapi/parseToolCall";
import { extractUserToken, extractUserHint, resolveUserId } from "@/lib/vapi/resolveUser";
import { TOOL_ALIASES } from "@/lib/vapi/tools/registry";
import { ToolArgs, ToolName } from "@/lib/vapi/toolTypes";

const isDev = process.env.NODE_ENV !== "production";

export type VapiContext = {
  name?: string;
  resolvedName: string;
  args: ToolArgs;
  toolCallId: string;
  conversationId?: string;
  userId?: string;
  source?: string;
  fromBrowser: boolean;
  tokenSource?: string;
  userText: string;
  error?: string;
  userToken?: string;
  missingNameResponse?: NextResponse;
};

const parseArgs = (argValue: unknown): ToolArgs => {
  if (typeof argValue === "string") {
    try {
      return JSON.parse(argValue);
    } catch {
      return {};
    }
  }
  return (argValue as ToolArgs) ?? {};
};

export async function buildVapiContext(req: NextRequest, body: any): Promise<VapiContext> {
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
    if (
      args.limit !== undefined &&
      (args.direction === "up" || args.direction === "down" || args.direction === "gainers" || args.direction === "losers")
    ) {
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

  args = normalizeArgs(parseArgs(args), userText);

  if (!name || typeof name !== "string" || !name.trim()) {
    const missingNameResponse = NextResponse.json(
      {
        results: [
          {
            toolCallId,
            result:
              "Error: Missing tool name. Please verify the tool is configured with a valid name (e.g., get_movers or get_quote) and resend the request with the name field set.",
          },
        ],
      },
      { status: 400, headers: getCorsHeaders() }
    );

    return {
      name,
      resolvedName: "",
      args,
      toolCallId,
      conversationId,
      fromBrowser: req.headers.get("x-from-browser") === "1",
      tokenSource: undefined,
      userText,
      missingNameResponse,
    };
  }

  const { token: userToken, source: tokenSource } = extractUserToken(body, args, req);
  const userHint = isDev ? extractUserHint(body, args, req) : undefined;
  const fromBrowser = req.headers.get("x-from-browser") === "1";
  const allowDemo = isDev && req.headers.get("x-allow-demo") === "1";

  const normalizedName = name.toLowerCase().replace(/-/g, "_") as ToolName | string;
  const resolvedName = (TOOL_ALIASES[normalizedName as ToolName] ?? normalizedName) as string;

  const { userId, source, error, tokenSource: resolvedTokenSource } = await resolveUserId({
    userToken,
    userHint,
    fromBrowser,
    allowDemo,
  });

  return {
    name,
    resolvedName,
    args,
    toolCallId,
    conversationId,
    userId,
    source,
    fromBrowser,
    tokenSource: resolvedTokenSource ?? tokenSource,
    userText,
    error,
    userToken,
    missingNameResponse: undefined,
  };
}
