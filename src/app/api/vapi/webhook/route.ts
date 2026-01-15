import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors";
import { maybeRunPendingConfirmation } from "@/lib/vapi/confirmations";
import { buildVapiContext } from "@/lib/vapi/context";
import { ToolName } from "@/lib/vapi/toolTypes";
import { TOOL_REGISTRY } from "@/lib/vapi/tools/registry";
import { wrapVapiResponse } from "@/lib/vapi/respond";

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

export async function OPTIONS() {
  return corsOptionsResponse();
}

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
  const ctx = await buildVapiContext(req, body);

  if (ctx.missingNameResponse) {
    return ctx.missingNameResponse;
  }

  if (!ctx.userId || ctx.error) {
    const errMsg = ctx.error || "Unauthorized";
    return wrapVapiResponse(ctx.toolCallId, { ok: false, error: errMsg });
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
    return wrapVapiResponse(ctx.toolCallId, confirmationResult);
  }

  const handler = TOOL_REGISTRY[ctx.resolvedName as keyof typeof TOOL_REGISTRY];

  if (!handler) {
    return NextResponse.json(
      {
        results: [
          {
            toolCallId: ctx.toolCallId,
            result: `Unknown tool: ${ctx.resolvedName}`,
          },
        ],
      },
      { status: 200, headers: getCorsHeaders() }
    );
  }

  try {
    const result = await handler(ctx.args, {
      userId: ctx.userId,
      source: ctx.source || "unknown",
      toolCallId: ctx.toolCallId,
      conversationId: ctx.conversationId,
    });
    return wrapVapiResponse(ctx.toolCallId, result);
  } catch (err: unknown) {
    return wrapVapiResponse(ctx.toolCallId, {
      ok: false,
      error: err instanceof Error ? err.message : "Tool error",
    });
  }
}
