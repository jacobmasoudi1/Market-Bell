"use client";

import { useEffect, useState } from "react";
import { Role } from "@prisma/client";
import {
  useConversationDetail,
  useConversations,
  useCreateConversation,
  usePostMessage,
} from "@/lib/hooks";

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

  const {
    data: conversationsData,
    mutate: mutateHistory,
  } = useConversations({ revalidateOnFocus: false, revalidateIfStale: false });

  const {
    data: conversationData,
    mutate: mutateConversation,
  } = useConversationDetail(conversationId, { revalidateOnFocus: false });

  const { trigger: createConversation } = useCreateConversation();
  const { trigger: postMessage } = usePostMessage(conversationId);

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
    if (messages.length) {
      setTranscript(
        messages.map((m: any) => ({
          role: m.role,
          text: m.text,
          at: m.createdAt,
        })),
      );
    }
  }, [conversationData]);

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
        const result = await postMessage({
          role,
          text,
          toolName: extras?.toolName,
          toolCallId: extras?.toolCallId,
          toolArgsJson: extras?.toolArgsJson,
          toolResultJson: extras?.toolResultJson,
        });
        const persistedId = (result as any)?.conversationId;
        if (persistedId && persistedId !== targetConversationId) {
          setConversationId(persistedId);
          localStorage.setItem("conversationId", persistedId);
        }
        if (role === Role.assistant) {
          await mutateHistory();
        }
        await mutateConversation();
      } catch (err: unknown) {
        console.error("Failed to persist message", err);
      }
    }
  };

  const loadHistory = async () => {
    await mutateHistory();
  };

  const loadConversation = async (id: string) => {
    try {
      setConversationId(id);
      localStorage.setItem("conversationId", id);
      await mutateConversation();
      await mutateHistory();
    } catch (error: unknown) {
      console.error("Could not load conversation", error);
    }
  };

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const res = await createConversation();
    const id = (res as any)?.conversation?.id;
    if (id) {
      setConversationId(id);
      localStorage.setItem("conversationId", id);
      await mutateHistory();
      return id;
    }
    throw new Error("Unable to create conversation");
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
