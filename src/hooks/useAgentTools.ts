"use client";

import { nanoid } from "nanoid";
import { fetchJson } from "@/lib/fetchJson";
import { Role } from "@prisma/client";

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
  const callTool = async (name: string, args: ToolArgs = {}, formatResult?: (res: unknown) => string) => {
    const toolCallId = nanoid();
    const token = deps.userToken;
    if (!token) {
      deps.setStatus("Sign in to use tools (missing token).");
      console.warn("[AgentTools] Missing user token; aborting tool call", {
        name,
        argsKeys: Object.keys(args || {}),
      });
      await deps.addMessage(Role.assistant, "I need you to sign in before running tools.");
      return;
    }
    const payloadArgs: ToolArgs & { userToken: string } = { ...args, userToken: token };
    try {
      await deps.ensureConversation();
      deps.setStatus(`Calling ${name}...`);
      const res = await fetchJson<unknown>("/api/vapi/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-from-browser": "1" },
        credentials: "include",
        body: JSON.stringify({ name, arguments: payloadArgs }),
      });
      const resultText =
        (formatResult && formatResult(res)) ||
        (typeof res === "string" ? res : JSON.stringify(res));
      await deps.addMessage(Role.assistant, resultText, {
        toolName: name,
        toolResultJson: res,
        toolArgsJson: args,
        toolCallId,
        ensureConversation: true,
      });
      deps.setStatus(`Got ${name} result`);
      await deps.loadHistory();
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
    await callTool(
      "get_quote",
      { ticker, confirm },
      (res) => {
        const quote = res as QuotePayload;
        if (quote?.ok && quote?.data) {
          const { ticker: t, price, change, changePercent, name } = quote.data;
          return `${name ? name + " " : ""}${t}: ${price} (${change}, ${changePercent}%)`;
        }
        return typeof res === "string" ? res : JSON.stringify(res);
      },
    );
  };

  const fetchNews = async (ticker?: string, confirm: boolean = true) => {
    const args = ticker ? { ticker, confirm } : {};
    await callTool("get_news", args, (res) => {
      const news = res as NewsPayload;
      if (news?.ok && news?.data?.headlines?.length) {
        const top = news.data.headlines
          .slice(0, 3)
          .map((h) => h.title)
          .join(" | ");
        return `Headlines${ticker ? " for " + ticker : ""}: ${top}`;
      }
      return typeof res === "string" ? res : JSON.stringify(res);
    });
  };

  const fetchTodayBrief = async () => {
    await callTool("get_today_brief", {}, (res) => {
      const brief = res as BriefPayload;
      if (brief?.ok && brief?.data) {
        return brief.data.summary || "Brief ready";
      }
      return typeof res === "string" ? res : JSON.stringify(res);
    });
  };

  return { callTool, fetchQuote, fetchNews, fetchTodayBrief };
}
