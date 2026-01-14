import { clearPendingConfirmation, getPendingConfirmation, isAffirmativeResponse } from "@/lib/pendingConfirmations";
import { TOOL_REGISTRY } from "@/lib/vapi/tools/registry";
import type { CanonicalToolName } from "@/lib/vapi/tools/registry";
import { ToolArgs } from "@/lib/vapi/toolTypes";
import { ToolResponse } from "@/lib/types";

type ConfirmationContext = {
  conversationId?: string;
  args: ToolArgs;
  userText: string;
  userId?: string;
  source?: string;
  toolCallId: string;
};

export async function maybeRunPendingConfirmation(ctx: ConfirmationContext): Promise<ToolResponse<any> | null> {
  if (!ctx.conversationId || !(ctx.args.confirm === true || isAffirmativeResponse(ctx.userText))) {
    return null;
  }

  const tickerTools: CanonicalToolName[] = ["get_quote", "get_news", "add_to_watchlist", "remove_from_watchlist"];
  for (const toolName of tickerTools) {
    const pending = getPendingConfirmation(ctx.conversationId, toolName);
    if (pending && pending.userId === ctx.userId) {
      clearPendingConfirmation(ctx.conversationId, toolName, pending.ticker);
      const handler = TOOL_REGISTRY[toolName];
      if (!handler) continue;

      try {
        const confirmedArgs = { ...pending.args, confirm: true, ticker: pending.ticker };
        const result = await handler(confirmedArgs, {
          userId: ctx.userId as string,
          source: ctx.source || "unknown",
          toolCallId: ctx.toolCallId,
          conversationId: ctx.conversationId,
        });
        return result;
      } catch (err: unknown) {
        console.error("[Webhook] pending confirmation execution error", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Tool error",
        };
      }
    }
  }

  return null;
}
