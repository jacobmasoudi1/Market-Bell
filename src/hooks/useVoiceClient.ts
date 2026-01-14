"use client";

import { useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { Role } from "@prisma/client";
import { VoiceClientDeps, VapiClient } from "@/types/voiceClient";

const toSafeString = (val: unknown): string | null => (typeof val === "string" ? val : null);

export function useVoiceClient(deps: VoiceClientDeps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState("");
  const [userToken, setUserToken] = useState<string | null>(null);
  const voiceClientRef = useRef<VapiClient | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [liveTranscriptRole, setLiveTranscriptRole] = useState<Role | undefined>(undefined);
  const callStartMs = useRef<number | null>(null);
  const [lastCallDurationSec, setLastCallDurationSec] = useState<number | null>(null);
  const lastCommittedRef = useRef<string>("");

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
      let userProfile: any = null;
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

      try {
        const profileResp = await fetchJson<{ profile?: any }>("/api/profile", { credentials: "include" });
        userProfile = profileResp?.profile ?? null;
      } catch {
        userProfile = null;
      }

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
        const messagePayload = payload as {
          message?: unknown;
          text?: unknown;
          content?: unknown;
          transcript?: unknown;
          output?: unknown;
          role?: string;
          type?: string;
        };
        const text =
          toSafeString(messagePayload?.transcript) ||
          toSafeString(messagePayload?.output) ||
          toSafeString(messagePayload?.message) ||
          toSafeString(messagePayload?.text) ||
          toSafeString(messagePayload?.content);
        const role =
          messagePayload?.role === "user" || messagePayload?.type === "voice-input"
            ? Role.user
            : Role.assistant;
        const transcriptType = (messagePayload as { transcriptType?: string })?.transcriptType;
        const isFinal = transcriptType === "final" || transcriptType === "final_transcript";
        if (text) {
          setLiveTranscript(text);
          setLiveTranscriptRole(role);
          if (isFinal) {
            const normalized = text.trim();
            if (normalized && normalized !== lastCommittedRef.current.trim()) {
              deps.addMessage(role, normalized);
              lastCommittedRef.current = normalized;
            }
            setStatus("Listening...");
            setLiveTranscript("");
          } else {
            setStatus("Transcribing...");
          }
        }
      });
      client.on?.("call-start", () => {
        callStartMs.current = Date.now();
        setLastCallDurationSec(null);
        setStatus("Call started - speak now");
      });
      const handleTranscript = (payload: unknown, source: string) => {
        const t = payload as { transcript?: unknown; transcriptType?: string; role?: string; text?: unknown };
        const textVal = toSafeString(t?.transcript) || toSafeString(t?.text);
        if (textVal) {
          setLiveTranscript(textVal);
          if (t?.role === "user") setLiveTranscriptRole(Role.user);
          else if (t?.role === "assistant") setLiveTranscriptRole(Role.assistant);
          if (t.transcriptType === "final") {
            setStatus("Listening...");
          } else {
            setStatus("Transcribing...");
          }
        }
      };
      client.on?.("transcript", (p) => handleTranscript(p, "transcript"));
      client.on?.("transcript.partial", (p) => handleTranscript(p, "transcript.partial"));
      client.on?.("transcript.final", (p) => handleTranscript(p, "transcript.final"));
      client.on?.("call-end", () => {
        setIsSessionActive(false);
        setStatus("Session stopped.");
        if (callStartMs.current) {
          const secs = Math.max(0, Math.round((Date.now() - callStartMs.current) / 1000));
          setLastCallDurationSec(secs);
        }
        callStartMs.current = null;
      });
      client.on?.("error", (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(message ? `Voice session error: ${message}` : "Voice session error. Tap to retry.");
      });

      const assistantId =
        process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
        "16d8ea7a-bc10-40c4-bae1-9ac1a9567c74";

      const variableValues: Record<string, any> = {
        userToken: token ?? "",
        riskTolerance: userProfile?.riskTolerance ?? "",
        horizon: userProfile?.horizon ?? "",
        briefStyle: userProfile?.briefStyle ?? "",
        experience: userProfile?.experience ?? "",
        sectors: userProfile?.sectors ?? "",
        constraints: userProfile?.constraints ?? "",
      };

      const assistantOverrides = { variableValues };

      if (client.start) {
        if (assistantOverrides) {
          await client.start(assistantId, assistantOverrides);
        } else {
          await client.start(assistantId);
        }
      } else if (client.connect) {
        if (assistantOverrides) {
          await client.connect(assistantId, assistantOverrides);
        } else {
          await client.connect(assistantId);
        }
      }

      voiceClientRef.current = client;
      setIsSessionActive(true);
      deps.addMessage(Role.assistant, "Voice session live. Ask for a market brief anytime.");
      setStatus("Voice session active.");
    } catch (error: unknown) {
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
    liveTranscript,
    liveTranscriptRole,
    lastCallDurationSec,
  };
}
