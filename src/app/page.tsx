"use client";

import { HistoryList } from "./components/HistoryList";
import { SessionHeader } from "./components/SessionHeader";
import { TranscriptList } from "./components/TranscriptList";
import { useVoiceSession } from "@/hooks/useVoiceSession";

export default function Home() {
  const {
    isSessionActive,
    status,
    transcript,
    history,
    toggleVoice,
  } = useVoiceSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <SessionHeader
          isSessionActive={isSessionActive}
          status={status}
          onToggle={toggleVoice}
        />
        <TranscriptList transcript={transcript} />
        <HistoryList history={history} />
      </div>
    </div>
  );
}
