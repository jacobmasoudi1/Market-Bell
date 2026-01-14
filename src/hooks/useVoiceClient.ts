"use client";

import { useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { Role } from "@prisma/client";

type VoiceClientDeps = {
  addMessage: (role: Role, text?: string) => Promise<void>;
  ensureConversation: () => Promise<string>;
};

type VapiClient = {
  start?: (payload: unknown) => Promise<unknown> | void;
  connect?: (payload: unknown) => Promise<unknown> | void;
  stop?: () => Promise<unknown> | void;
  disconnect?: () => Promise<unknown> | void;
  on?: (event: string, cb: (payload: unknown) => void) => void;
};

export function useVoiceClient(deps: VoiceClientDeps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState("");
  const [userToken, setUserToken] = useState<string | null>(null);
  const voiceClientRef = useRef<VapiClient | null>(null);

  const startVoiceSession = async () => {
    const publicKey =
      process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("Add NEXT_PUBLIC_VAPI_PUBLIC_KEY to your env before starting voice.");
      return;
    }

    setStatus("Connecting to voice agent…");
    try {
      let token: string | undefined;
      try {
        const tokenResp = await fetchJson<{ userToken?: string; ok?: boolean; error?: string }>(
          "/api/vapi/user-token",
          { credentials: "include" },
        );
        token = tokenResp?.userToken;
        if (!token) {
          console.warn("[VoiceClient] user token missing from /api/vapi/user-token response", tokenResp);
          setStatus("Signed-in context unavailable; using demo user.");
        }
      } catch (err) {
        console.warn("[VoiceClient] user token fetch failed; continuing in demo mode", err);
        setStatus("Signed-in context unavailable; using demo user.");
      }
      if (token) setUserToken(token);

      const vapiModule = (await import("@vapi-ai/web")) as {
        default?: new (key: string) => VapiClient;
        Vapi?: new (key: string) => VapiClient;
      };
      const VapiCtor = vapiModule.default ?? vapiModule.Vapi;
      if (!VapiCtor) {
        throw new Error("Vapi SDK unavailable");
      }

      await deps.ensureConversation();

      const client = new VapiCtor(publicKey);
      client.on?.("message", (payload: unknown = {}) => {
        const messagePayload = payload as { message?: string; text?: string; content?: string };
        const text = messagePayload?.message || messagePayload?.text || messagePayload?.content;
        console.log("[Vapi] message", payload);
        if (text) deps.addMessage(Role.assistant, text);
      });
      client.on?.("call-end", (info: unknown) => {
        console.log("[Vapi] call-end", info);
        setIsSessionActive(false);
        setStatus("Session stopped.");
      });
      client.on?.("error", (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Vapi] error", err);
        setStatus(message ? `Voice session error: ${message}` : "Voice session error. Tap to retry.");
      });

      const assistantId =
        process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
        "16d8ea7a-bc10-40c4-bae1-9ac1a9567c74";

      if (client.start) {
        const startPayload: unknown = token ? { assistantId, metadata: { userToken: token } } : assistantId;
        await client.start(startPayload);
      } else if (client.connect) {
        const connectPayload: unknown = token ? { assistantId, metadata: { userToken: token } } : { assistantId };
        await client.connect(connectPayload);
      }

      voiceClientRef.current = client;
      setIsSessionActive(true);
      deps.addMessage(Role.assistant, "Voice session live. Ask for a market brief anytime.");
      setStatus("Voice session active.");
    } catch (error: unknown) {
      console.error("[Vapi] start/connect error", error);
      const message = error instanceof Error ? error.message : null;
      setStatus(message ? `Voice session error: ${message}` : "Voice session error");
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

  return {
    isSessionActive,
    status,
    setStatus,
    userToken,
    setUserToken,
    startVoiceSession,
    stopVoiceSession,
    toggleVoice,
  };
}
