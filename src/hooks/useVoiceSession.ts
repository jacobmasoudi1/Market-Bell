"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { Role } from "@prisma/client";
import { nanoid } from "nanoid";

export type TranscriptEntry = { role: string; text: string; at: string };
export type HistoryEntry = {
  id: string;
  title?: string;
  createdAt?: string;
  summary?: string;
};

const formatErr = (e: any) => {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e?.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unexpected error";
  }
};

export function useVoiceSession() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const voiceClientRef = useRef<any>(null);

  useEffect(() => {
    const savedConversation = localStorage.getItem("conversationId");
    if (savedConversation) {
      setConversationId(savedConversation);
      loadConversation(savedConversation);
    } else {
      loadHistory();
    }
  }, []);

  const addMessage = async (
    role: Role,
    text?: string,
    extras?: {
      toolName?: string;
      toolArgsJson?: any;
      toolResultJson?: any;
      toolCallId?: string;
      ensureConversation?: boolean;
    },
  ) => {
    if (!text) return;
    const entry = { role, text, at: new Date().toISOString() };
    setTranscript((prev) => [...prev, entry]);
    let targetConversationId = conversationId;
    if (extras?.ensureConversation && !targetConversationId) {
      targetConversationId = await ensureConversation();
    }
    if (targetConversationId) {
      try {
        await fetchJson(`/api/conversations/${targetConversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            text,
            toolName: extras?.toolName,
            toolCallId: extras?.toolCallId,
            toolArgsJson: extras?.toolArgsJson,
            toolResultJson: extras?.toolResultJson,
          }),
        });
      } catch (err) {
        console.error("Failed to persist message", err);
      }
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchJson("/api/conversations");
      setHistory(data?.conversations || []);
    } catch (error: any) {
      setStatus(`Could not load history: ${error.message}`);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const data = await fetchJson(`/api/conversations/${id}`);
      const messages = data?.conversation?.messages || [];
      setTranscript(
        messages.map((m: any) => ({
          role: m.role,
          text: m.text,
          at: m.createdAt,
        })),
      );
      setConversationId(id);
      localStorage.setItem("conversationId", id);
      await loadHistory();
    } catch (error: any) {
      setStatus(`Could not load conversation: ${error.message}`);
    }
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const res = await fetchJson("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const id = res?.conversation?.id;
    if (id) {
      setConversationId(id);
      localStorage.setItem("conversationId", id);
      await loadHistory();
      return id;
    }
    throw new Error("Unable to create conversation");
  };

  const startVoiceSession = async () => {
    const publicKey =
      process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("Add NEXT_PUBLIC_VAPI_PUBLIC_KEY to your env before starting voice.");
      return;
    }

    setStatus("Connecting to voice agent…");
    try {
      const module = await import("@vapi-ai/web");
      const Vapi = (module as any)?.default || (module as any)?.Vapi || module;
      if (!Vapi) {
        throw new Error("Vapi SDK unavailable");
      }

      await ensureConversation();

      const client = new Vapi(publicKey);
      client.on?.("message", (payload: any = {}) => {
        const text = payload?.message || payload?.text || payload?.content;
        if (text) addMessage(Role.assistant, text);
      });
      client.on?.("call-end", () => {
        setIsSessionActive(false);
        setStatus("Session stopped.");
      });

      const assistantId =
        process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
        "16d8ea7a-bc10-40c4-bae1-9ac1a9567c74";

      if (client.start) {
        await client.start(assistantId);
      } else if (client.connect) {
        await client.connect({ assistantId });
      }

      voiceClientRef.current = client;
      setIsSessionActive(true);
      addMessage(Role.assistant, "Voice session live. Ask for a market brief anytime.");
      setStatus("Voice session active.");
    } catch (error: any) {
      setStatus(`Voice session error: ${formatErr(error)}`);
    }
  };

  const stopVoiceSession = async () => {
    try {
      const client = voiceClientRef.current;
      if (client?.stop) {
        await client.stop();
      } else if (client?.disconnect) {
        await client.disconnect();
      }
    } catch (error) {
      console.error(error);
    }
    setIsSessionActive(false);
    setStatus("Session stopped.");
  };

  const toggleVoice = () => {
    if (isSessionActive) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  };

  const callTool = async (name: string, args: any, formatResult?: (res: any) => string) => {
    const toolCallId = nanoid();
    try {
      const id = await ensureConversation();
      setStatus(`Calling ${name}...`);
      const res = await fetchJson("/api/vapi/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: args }),
      });
      const resultText =
        (formatResult && formatResult(res)) ||
        (typeof res === "string" ? res : JSON.stringify(res));
      await addMessage(Role.assistant, resultText, {
        toolName: name,
        toolResultJson: res,
        toolArgsJson: args,
        toolCallId,
        ensureConversation: true,
      });
      setStatus(`Got ${name} result`);
      await loadHistory();
      return res;
    } catch (error: any) {
      setStatus(`Tool error: ${formatErr(error)}`);
      await addMessage(Role.assistant, `Error: ${formatErr(error)}`, {
        toolName: name,
        toolResultJson: { error: formatErr(error) },
        toolArgsJson: args,
        toolCallId,
        ensureConversation: true,
      });
    }
  };

  const fetchQuote = async (ticker: string) => {
    if (!ticker) return;
    await callTool("get_quote", { ticker }, (res) => {
      if (res?.ok && res?.data) {
        const { ticker: t, price, change, changePercent, name } = res.data;
        return `${name ? name + " " : ""}${t}: ${price} (${change}, ${changePercent}%)`;
      }
      return typeof res === "string" ? res : JSON.stringify(res);
    });
  };

  const fetchNews = async (ticker?: string) => {
    await callTool("get_news", ticker ? { ticker } : {}, (res) => {
      if (res?.ok && res?.data?.headlines?.length) {
        const top = res.data.headlines
          .slice(0, 3)
          .map((h: any) => h.title)
          .join(" | ");
        return `Headlines${ticker ? " for " + ticker : ""}: ${top}`;
      }
      return typeof res === "string" ? res : JSON.stringify(res);
    });
  };

  const fetchTodayBrief = async () => {
    await callTool("get_today_brief", {}, (res) => {
      if (res?.ok && res?.data) {
        return res.data.summary || "Brief ready";
      }
      return typeof res === "string" ? res : JSON.stringify(res);
    });
  };

  const selectConversation = async (id: string) => {
    await loadConversation(id);
  };

  const startNewConversation = async () => {
    setTranscript([]);
    localStorage.removeItem("conversationId");
    setConversationId(null);
    await ensureConversation();
    await loadHistory();
  };

  return {
    isSessionActive,
    status,
    transcript,
    history,
    conversationId,
    toggleVoice,
    startVoiceSession,
    stopVoiceSession,
    selectConversation,
    startNewConversation,
    fetchQuote,
    fetchNews,
    fetchTodayBrief,
  };
}
