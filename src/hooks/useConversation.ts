"use client";

import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { useConversationDetail, useConversations, useCreateConversation } from "@/lib/hooks";
import { fetchJson } from "@/lib/fetchJson";
import { useRef } from "react";
import toast from "react-hot-toast";
import { placeholderTitle } from "@/lib/conversationUtils";

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

export function useConversation() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const creatingConversationRef = useRef<Promise<string | null> | null>(null);

  const {
    data: conversationsData,
    mutate: mutateHistory,
  } = useConversations({ revalidateOnFocus: false, revalidateIfStale: false });

  const {
    data: conversationData,
    mutate: mutateConversation,
  } = useConversationDetail(conversationId, { revalidateOnFocus: false });

  const { trigger: createConversation } = useCreateConversation();

  const normalizeHistoryEntry = (entry: any): HistoryEntry => ({
    id: typeof entry?.id === "string" ? entry.id : String(entry?.id ?? ""),
    title: typeof entry?.title === "string" ? entry.title : undefined,
    summary: typeof entry?.summary === "string" ? entry.summary : undefined,
    createdAt: typeof entry?.createdAt === "string" ? entry.createdAt : undefined,
    lastMessageAt: typeof entry?.lastMessageAt === "string" ? entry.lastMessageAt : undefined,
  });

  useEffect(() => {
    const savedConversation = localStorage.getItem("conversationId");
    if (savedConversation) {
      setConversationId(savedConversation);
    }
  }, []);

  useEffect(() => {
    const messages = conversationData?.conversation?.messages || [];
    setTranscript(
      messages.map((m: any) => ({
        role: m.role,
        text: m.text,
        at: m.createdAt,
      })),
    );
  }, [conversationData]);

  const persistMessage = async (
    targetConversationId: string,
    payload: {
      role: string;
      text: string;
      toolName?: string;
      toolCallId?: string;
      toolArgsJson?: unknown;
      toolResultJson?: unknown;
    },
  ) =>
    fetchJson(`/api/conversations/${targetConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

  const addMessage = async (role: Role, text?: string, extras?: AddMessageExtras) => {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;
    // Mirror server-side 4000 char cap to avoid truncation mismatch.
    const limitedText = trimmed.slice(0, 4000);
    const entry = { role, text: limitedText, at: new Date().toISOString() };
    setTranscript((prev) => [...prev, entry]);
    let targetConversationId = conversationId;
    // Always make sure we have a conversation before persisting so history/titles get saved.
    if (!targetConversationId || extras?.ensureConversation) {
      targetConversationId = await ensureConversation();
    }
    if (targetConversationId) {
      try {
        const result = await persistMessage(targetConversationId, {
          role,
          text: limitedText,
          toolName: extras?.toolName,
          toolCallId: extras?.toolCallId,
          toolArgsJson: extras?.toolArgsJson,
          toolResultJson: extras?.toolResultJson,
        });
        const persistedId = (result as any)?.conversationId ?? targetConversationId;
        if (persistedId && persistedId !== targetConversationId) {
          setConversationId(persistedId);
          localStorage.setItem("conversationId", persistedId);
        }
        // Refresh both history (titles/ordering) and the open conversation.
        await mutateConversation();
        await mutateHistory();
        toast.success("Message sent.");
      } catch (err: unknown) {
        console.error("Failed to persist message", err);
        // Roll back optimistic add so UI matches persisted state.
        setTranscript((prev) => prev.filter((m) => m !== entry));
        const status = (err as any)?.status;
        const message =
          status === 401
            ? "Please sign in to send messages."
            : status === 404
              ? "Conversation not found. Start a new chat."
              : "Unable to send message. Please retry.";
        toast.error(message);
      }
    }
  };

  const loadHistory = async () => {
    await mutateHistory();
  };

  const loadConversation = async (id: string) => {
    try {
      // clear transcript immediately to avoid showing previous convo while loading
      setTranscript([]);
      setConversationId(id);
      localStorage.setItem("conversationId", id);
      const data = await mutateConversation(
        async () => fetchJson<{ conversation?: any }>(`/api/conversations/${id}`, { credentials: "include" }),
        { revalidate: false, populateCache: true },
      );
      const messages = Array.isArray(data?.conversation?.messages) ? data.conversation.messages : [];
      setTranscript(
        messages.map((m: any) => ({
          role: m.role,
          text: m.text,
          at: m.createdAt,
        })),
      );
      await mutateHistory();
      // Ensure UI has a usable title if server hasn't set one yet.
      const current = conversationsData?.conversations?.find((c) => c.id === id);
      if (!current?.title) {
        const nextHistory = (conversationsData?.conversations || []).map((c) =>
          c.id === id ? { ...c, title: placeholderTitle(id) } : c,
        );
        // optimistic history update for title placeholder
        (mutateHistory as any)( { conversations: nextHistory }, { revalidate: false, populateCache: true });
      }
    } catch (error: unknown) {
      console.error("Could not load conversation", error);
    }
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    if (creatingConversationRef.current) {
      const existing = await creatingConversationRef.current;
      if (existing) return existing;
    }
    const creation = (async () => {
      const res = await createConversation();
      const id = (res as any)?.conversation?.id ?? null;
      if (id) {
        setConversationId(id);
        localStorage.setItem("conversationId", id);
        await mutateHistory();
        return id;
      }
      return null;
    })();
    creatingConversationRef.current = creation;
    try {
      const id = await creation;
      if (id) return id;
      throw new Error("Unable to create conversation");
    } finally {
      creatingConversationRef.current = null;
    }
  };

  const startNewConversation = async () => {
    setTranscript([]);
    localStorage.removeItem("conversationId");
    setConversationId(null);
    await ensureConversation();
    await mutateHistory();
  };

  const selectConversation = async (id: string) => loadConversation(id);

  return {
    transcript,
    history: (conversationsData?.conversations || []).map(normalizeHistoryEntry),
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
