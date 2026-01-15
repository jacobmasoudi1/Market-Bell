import useSWR, { SWRConfiguration } from "swr";
import useSWRMutation from "swr/mutation";
import { fetchJson } from "@/lib/fetchJson";
import { Profile } from "@/lib/types";
import {
  ConversationDetail,
  ConversationSummary,
  Json,
  MutationArg,
  WatchlistItem,
} from "@/lib/types.hooks";

const jsonFetcher = (url: string) => fetchJson(url, { credentials: "include" });

// Profile
export function useUserProfile(config?: SWRConfiguration) {
  const swr = useSWR<{ profile?: Profile | null }>("/api/profile", jsonFetcher, config);
  return {
    profile: swr.data?.profile ?? null,
    ...swr,
  };
}

export function useUpdateProfile() {
  return useSWRMutation("/api/profile", (url, { arg }: MutationArg<Json>) =>
    fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(arg),
    }),
  );
}

// Watchlist
export function useWatchlist(config?: SWRConfiguration) {
  return useSWR<{ items?: WatchlistItem[] }>("/api/watchlist", jsonFetcher, config);
}

export function useAddWatchlistItem() {
  return useSWRMutation("/api/watchlist", (url, { arg }: MutationArg<{ ticker: string; reason?: string }>) =>
    fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(arg),
    }),
  );
}

export function useRemoveWatchlistItem() {
  return useSWRMutation("/api/watchlist", (url, { arg }: MutationArg<{ ticker: string }>) =>
    fetchJson(`${url}?ticker=${encodeURIComponent(arg.ticker)}`, {
      method: "DELETE",
      credentials: "include",
    }),
  );
}

// Conversations
export function useConversations(config?: SWRConfiguration) {
  return useSWR<{ conversations?: ConversationSummary[] }>("/api/conversations", jsonFetcher, config);
}

export function useConversationDetail(conversationId?: string | null, config?: SWRConfiguration) {
  const key = conversationId ? `/api/conversations/${conversationId}` : null;
  return useSWR<{ conversation?: ConversationDetail }>(key, jsonFetcher, config);
}

export function useCreateConversation() {
  return useSWRMutation("/api/conversations", (url) =>
    fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    }),
  );
}

export function usePostMessage(conversationId?: string | null) {
  const key = conversationId ? `/api/conversations/${conversationId}/messages` : null;
  return useSWRMutation(
    key,
    (
      url,
      {
        arg,
      }: MutationArg<{
        role: string;
        text: string;
        toolName?: string;
        toolCallId?: string;
        toolArgsJson?: unknown;
        toolResultJson?: unknown;
      }>,
    ) =>
      fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(arg),
      }),
  );
}

// Vapi
export function useUserToken(config?: SWRConfiguration) {
  return useSWR<{ userToken?: string }>("/api/vapi/user-token", jsonFetcher, config);
}

export function useVapiWebhook() {
  return useSWRMutation(
    "/api/vapi/webhook",
    (url, { arg }: MutationArg<Json>) =>
      fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-from-browser": "1" },
        credentials: "include",
        body: JSON.stringify(arg),
      }),
  );
}
