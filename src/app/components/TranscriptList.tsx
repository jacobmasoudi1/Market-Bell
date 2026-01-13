"use client";

import { TranscriptEntry } from "@/hooks/useVoiceSession";

type Props = {
  transcript: TranscriptEntry[];
};

export function TranscriptList({ transcript }: Props) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversation Transcript</h2>
        <span className="text-sm text-slate-500">
          {transcript.length ? `${transcript.length} messages` : "Live"}
        </span>
      </div>
      <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-2">
        {transcript.map((entry, idx) => (
          <div key={idx} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <span
              className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                entry.role === "assistant"
                  ? "bg-blue-100 text-blue-700"
                  : entry.role === "tool"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-200 text-slate-700"
              }`}
            >
              {entry.role}
            </span>
            <div className="text-sm text-slate-800">{entry.text}</div>
          </div>
        ))}
        {!transcript.length && (
          <div className="text-sm text-slate-500">No messages yet. Start a session to begin.</div>
        )}
      </div>
    </section>
  );
}
