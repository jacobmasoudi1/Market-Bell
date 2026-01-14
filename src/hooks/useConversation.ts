"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { Role } from "@prisma/client";

export type TranscriptEntry = { role: string; text: string; at: string };
export type HistoryEntry = {
  id: string;
  title?: string;
  createdAt?: string;
  summary?: string;
  lastMessageAt?: string;
};

type AddMessageExtras = {
  toolName?: string;
  toolArgsJson?: unknown;
  toolResultJson?: unknown;
  toolCallId?: string;
  ensureConversation?: boolean;
};

type ConversationMessage = { role: string; text: string; createdAt: string };
type HistoryResponse = { conversations?: HistoryEntry[] };
type ConversationResponse = {
  conversation?: {
    messages?: ConversationMessage[];
    id?: string;
  };
  conversationId?: string;
};

export function useConversation() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const savedConversation = localStorage.getItem("conversationId");
    if (savedConversation) {
      setConversationId(savedConversation);
      loadConversation(savedConversation);
    } else {
      loadHistory();
    }
  }, []);

  const addMessage = async (role: Role, text?: string, extras?: AddMessageExtras) => {
    if (!text) return;
    const entry = { role, text, at: new Date().toISOString() };
    setTranscript((prev) => [...prev, entry]);
    let targetConversationId = conversationId;
    if (extras?.ensureConversation && !targetConversationId) {
      targetConversationId = await ensureConversation();
    }
    if (targetConversationId) {
      try {
        const result = await fetchJson<ConversationResponse>(`/api/conversations/${targetConversationId}/messages`, {
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
        const persistedId = result?.conversationId;
        if (persistedId && persistedId !== targetConversationId) {
          setConversationId(persistedId);
          localStorage.setItem("conversationId", persistedId);
        }
      } catch (err: unknown) {
        console.error("Failed to persist message", err);
      }
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchJson<HistoryResponse>("/api/conversations");
      setHistory(data?.conversations || []);
    } catch (error: unknown) {
      console.error("Could not load history", error);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const data = await fetchJson<ConversationResponse>(`/api/conversations/${id}`);
      const messages = data?.conversation?.messages || [];
      setTranscript(
        messages.map((m) => ({
          role: m.role,
          text: m.text,
          at: m.createdAt,
        })),
      );
      setConversationId(id);
      localStorage.setItem("conversationId", id);
      await loadHistory();
    } catch (error: unknown) {
      console.error("Could not load conversation", error);
    }
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const res = await fetchJson<ConversationResponse>("/api/conversations", {
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

  const startNewConversation = async () => {
    setTranscript([]);
    localStorage.removeItem("conversationId");
    setConversationId(null);
    await ensureConversation();
    await loadHistory();
  };

  const selectConversation = async (id: string) => loadConversation(id);

  return {
    transcript,
    history,
    conversationId,
    addMessage,
    ensureConversation,
    loadHistory,
    loadConversation,
    startNewConversation,
    selectConversation,
    setConversationId,
  };
}
