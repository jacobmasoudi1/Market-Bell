"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

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
  const voiceClientRef = useRef<any>(null);

  useEffect(() => {
    refreshProfile();
  }, []);

  const addMessage = (role: string, text?: string) => {
    if (!text) return;
    setTranscript((prev) => [
      ...prev,
      { role, text, at: new Date().toISOString() },
    ]);
  };

  const refreshProfile = async () => {
    try {
      const data = await fetchJson("/api/getUserProfile");
      setHistory(data?.conversationHistory || []);
    } catch (error: any) {
      setStatus(`Could not load profile: ${error.message}`);
    }
  };

  const persistConversation = async () => {
    if (!transcript.length) return;
    try {
      await fetchJson("/api/saveConversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          stoppedAt: new Date().toISOString(),
        }),
      });
      await refreshProfile();
    } catch (error: any) {
      setStatus(`Saved locally, backend save failed: ${error.message}`);
    }
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

      const client = new Vapi(publicKey);
      client.on?.("message", (payload: any = {}) => {
        const text = payload?.message || payload?.text || payload?.content;
        if (text) addMessage("agent", text);
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
      addMessage("agent", "Voice session live. Ask for a market brief anytime.");
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
    await persistConversation();
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
    transcript,
    history,
    toggleVoice,
    startVoiceSession,
    stopVoiceSession,
  };
}
