import { Profile } from "@/lib/types";

export type WatchlistItem = { id: string; ticker: string; reason?: string | null; createdAt?: string };

export type ConversationSummary = {
  id: string;
  title?: string | null;
  summary?: string | null;
  createdAt?: string;
  lastMessageAt?: string;
};

export type ConversationMessage = {
  role: string;
  text: string;
  createdAt: string;
  toolName?: string | null;
  toolCallId?: string | null;
  toolArgsJson?: unknown;
  toolResultJson?: unknown;
};

export type ConversationDetail = {
  id: string;
  messages: ConversationMessage[];
};

export type MutationArg<T> = { arg: T };
export type Json = Record<string, unknown>;
