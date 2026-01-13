/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

type Status = "idle" | "connecting" | "live" | "ended" | "error";

export function VoiceButton() {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const publicKey =
      process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ||
      process.env.VAPI_PUBLIC_KEY ||
      "";

    if (!publicKey) {
      setError("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY");
      return;
    }

    vapiRef.current = new Vapi(publicKey);
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const startCall = async () => {
    setError(null);
    setStatus("connecting");
    try {
      const vapi = vapiRef.current;
      if (!vapi) throw new Error("Vapi not ready");

      const assistantId =
        process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
        "16d8ea7a-bc10-40c4-bae1-9ac1a9567c74";
      if (!assistantId) {
        throw new Error("Missing NEXT_PUBLIC_VAPI_ASSISTANT_ID");
      }

      vapi.removeAllListeners?.();

      vapi.on("call-start", () => setStatus("live"));
      vapi.on("call-end", () => setStatus("ended"));
      vapi.on("error", (e) => {
        console.error("Vapi error", e);
        setError(formatErr(e) || "Call error");
        setStatus("error");
      });

      await vapi.start(assistantId);
    } catch (e: any) {
      setStatus("error");
      setError(formatErr(e) || "Could not start call");
    }
  };

  const stopCall = () => {
    vapiRef.current?.stop();
    setStatus("ended");
  };

  const label =
    status === "live"
      ? "End Call"
      : status === "connecting"
        ? "Connecting..."
        : "Start Voice Call";

  return (
    <div className="space-y-2">
      <button
        onClick={status === "live" ? stopCall : startCall}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        disabled={status === "connecting"}
      >
        {label}
      </button>
      <div className="text-sm text-gray-700">Status: {status}</div>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
