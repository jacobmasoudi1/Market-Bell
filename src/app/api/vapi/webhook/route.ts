import { NextRequest } from "next/server";
import { corsOptionsResponse } from "@/lib/cors";
import { maybeRunPendingConfirmation } from "@/lib/vapi/confirmations";
import { buildVapiContext } from "@/lib/vapi/context";
import { TOOL_REGISTRY } from "@/lib/vapi/tools/registry";
import { formatResult } from "@/lib/vapi/respond";
import { withApi } from "@/lib/api/withApi";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export const GET = withApi(async () => ({ message: "webhook alive" }));

export const POST = withApi(
  async (req: NextRequest, _ctx, context) => {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return {
        results: [
          {
            toolCallId: "unknown",
            result: "Invalid content-type. Expect application/json.",
          },
        ],
        status: 400,
      };
    }

    const body = await req.json().catch(() => ({}));
    const ctx = await buildVapiContext(req, body);

    if (ctx.missingNameResponse) {
      return {
        results: [
          {
            toolCallId: ctx.toolCallId,
            result:
              "Error: Missing tool name. Please verify the tool is configured with a valid name (e.g., get_movers or get_quote) and resend the request with the name field set.",
          },
        ],
        status: 400,
      };
    }

    if (!ctx.userId || ctx.error) {
      const errMsg = ctx.error || "Unauthorized";
      const status = errMsg === "Unauthorized" ? 401 : 400;
      return {
        results: [
          {
            toolCallId: ctx.toolCallId,
            result: errMsg,
          },
        ],
        status,
      };
    }

    const confirmationResult = await maybeRunPendingConfirmation({
      conversationId: ctx.conversationId,
      args: ctx.args,
      userText: ctx.userText,
      userId: ctx.userId,
      source: ctx.source,
      toolCallId: ctx.toolCallId,
    });
    if (confirmationResult) {
      return {
        results: [
          {
            toolCallId: ctx.toolCallId,
            result: formatResult(confirmationResult),
          },
        ],
      };
    }

    const handler = TOOL_REGISTRY[ctx.resolvedName as keyof typeof TOOL_REGISTRY];

    if (!handler) {
      return {
        results: [
          {
            toolCallId: ctx.toolCallId,
            result: `Unknown tool: ${ctx.resolvedName}`,
          },
        ],
        status: 400,
      };
    }

    const result = await handler(ctx.args, {
      userId: ctx.userId,
      source: ctx.source || "unknown",
      toolCallId: ctx.toolCallId,
      conversationId: ctx.conversationId,
    });
    return {
      results: [
        {
          toolCallId: ctx.toolCallId,
          result: formatResult(result),
        },
      ],
    };
  },
  { rateLimit: { key: "vapi-webhook", limit: 120, windowMs: 60_000 }, raw: true },
);
