"use client";

import { useState } from "react";
import { TranscriptEntry } from "@/hooks/useVoiceSession";

type Props = {
  transcript: TranscriptEntry[];
  title?: string;
};

export function TranscriptList({ transcript, title }: Props) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? transcript : transcript.slice(-12);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live Transcript</h2>
          {title && <p className="text-sm text-slate-500">{title}</p>}
        </div>
        <span className="text-sm text-slate-500">
          {transcript.length
            ? showAll
              ? `${transcript.length} messages`
              : `Showing latest ${displayed.length} of ${transcript.length}`
            : "Listening…"}
        </span>
      </div>
      <div className="mt-4 space-y-3 max-h-[460px] min-h-[260px] overflow-y-auto pr-2">
        {displayed.map((entry, idx) => (
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
          <div className="text-sm text-slate-500">No messages yet. Start talking to begin.</div>
        )}
      </div>
      {transcript.length > 12 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            {showAll ? "Show latest only" : "Show full transcript"}
          </button>
        </div>
      )}
    </section>
  );
}
