"use client";

import { nanoid } from "nanoid";
import { formatQuote, formatNews, formatTodayBrief } from "@/lib/toolFormatters";
import { Role } from "@prisma/client";
import { useUserToken, useVapiWebhook } from "@/lib/hooks";

type AddMessage = (
  role: Role,
  text?: string,
  extras?: {
    toolName?: string;
    toolArgsJson?: unknown;
    toolResultJson?: unknown;
    toolCallId?: string;
    ensureConversation?: boolean;
  },
) => Promise<void>;

type AgentToolDeps = {
  userToken: string | null;
  setStatus: (text: string) => void;
  addMessage: AddMessage;
  ensureConversation: () => Promise<string>;
  loadHistory: () => Promise<void>;
  refreshWatchlist?: () => Promise<void> | void;
};

type ToolArgs = Record<string, unknown>;
type QuotePayload = {
  ok?: boolean;
  data?: { ticker: string; price: number; change: number; changePercent: number; name?: string | null };
};
type NewsPayload = { ok?: boolean; data?: { headlines?: { title: string }[] } };
type BriefPayload = { ok?: boolean; data?: { summary?: string } };

const formatErr = (e: unknown) => {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unexpected error";
  }
};

export function useAgentTools(deps: AgentToolDeps) {
  const { data: tokenData, mutate: refreshUserToken } = useUserToken({ revalidateOnFocus: false });
  const { trigger: callWebhook } = useVapiWebhook();

  const callTool = async (name: string, args: ToolArgs = {}, formatResult?: (res: unknown) => string) => {
    const toolCallId = nanoid();
    let token = deps.userToken ?? tokenData?.userToken ?? null;
    if (!token) {
      try {
        const tokenResp = await refreshUserToken();
        token = tokenResp?.userToken || null;
      } catch {
        token = null;
      }
      if (!token) {
        deps.setStatus("Sign in to use tools (missing token).");
        console.warn("[AgentTools] Missing user token; aborting tool call", {
          name,
          argsKeys: Object.keys(args || {}),
        });
        await deps.addMessage(Role.assistant, "I need you to sign in before running tools.");
        return;
      }
    }
    const payloadArgs: ToolArgs & { userToken: string } = { ...args, userToken: token };
    try {
      await deps.ensureConversation();
      deps.setStatus(`Calling ${name}...`);
      const res = await callWebhook({ name, arguments: payloadArgs });
      const unwrapped = Array.isArray((res as any)?.results)
        ? (res as any)?.results?.[0]?.result ?? res
        : res;
      const formatted = formatResult ? formatResult(unwrapped) : null;
      const resultText =
        (formatted && formatted) || (typeof unwrapped === "string" ? unwrapped : JSON.stringify(unwrapped));
      await deps.addMessage(Role.assistant, resultText, {
        toolName: name,
        toolResultJson: res,
        toolArgsJson: args,
        toolCallId,
        ensureConversation: true,
      });
      deps.setStatus(`Got ${name} result`);
      await deps.loadHistory();

      const isWatchlistTool = ["get_watchlist", "add_to_watchlist", "remove_from_watchlist"].includes(name);
      if (isWatchlistTool) {
        await deps.refreshWatchlist?.();
      }

      return res;
    } catch (error: unknown) {
      deps.setStatus(`Tool error: ${formatErr(error)}`);
      await deps.addMessage(Role.assistant, `Error: ${formatErr(error)}`, {
        toolName: name,
        toolResultJson: { error: formatErr(error) },
        toolArgsJson: args,
        toolCallId,
        ensureConversation: true,
      });
    }
  };

  const fetchQuote = async (ticker: string, confirm: boolean = true) => {
    if (!ticker) return;
    await callTool("get_quote", { ticker, confirm }, formatQuote);
  };

  const fetchNews = async (ticker?: string, confirm: boolean = true) => {
    const args = ticker ? { ticker, confirm } : {};
    await callTool("get_news", args, (res) => formatNews(res, ticker));
  };

  const fetchTodayBrief = async () => {
    await callTool("get_today_brief", {}, formatTodayBrief);
  };

  return { callTool, fetchQuote, fetchNews, fetchTodayBrief };
}
