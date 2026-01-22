"use client";

import { TranscriptEntry } from "@/hooks/useConversation";
import { Role } from "@prisma/client";

type Props = {
  transcript: TranscriptEntry[];
  liveText?: string;
  liveRole?: Role;
  title?: string;
  maxMessages?: number;
  lastDurationSec?: number | null;
};

export function CallTranscript({
  transcript,
  liveText,
  liveRole,
  title = "Call Transcript",
  // Show full history by default; set maxMessages to limit if desired.
  maxMessages = 200,
  lastDurationSec,
}: Props) {
  const cap = typeof maxMessages === "number" ? maxMessages : 200;
  const history = typeof cap === "number" ? transcript.slice(-cap) : transcript;
  const items = liveText
    ? [...history, { role: liveRole ?? Role.assistant, text: liveText }]
    : history;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur shadow-lg">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-300/80">Streaming + past turns</p>
        </div>
        {liveText ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-200 px-3 py-1 text-xs font-semibold">
            ● Live
          </span>
        ) : (
          <span className="text-xs text-slate-300/80">
            {lastDurationSec ? `Last call: ${lastDurationSec}s` : "Idle"}
          </span>
        )}
      </header>

      <div className="max-h-[520px] overflow-y-auto space-y-3 px-4 py-4">
        {items.length === 0 && (
          <div className="text-sm text-slate-400">No transcript yet. Start talking to begin.</div>
        )}
        {items.map((entry, idx) => {
          const isUser = entry.role === "user";
          const isAssistant = entry.role === "assistant";
          const align = isUser ? "items-end text-right" : "items-start text-left";
          const bubbleColor = isUser
            ? "bg-emerald-500/15 text-emerald-50"
            : "bg-slate-800 text-slate-50";
          const labelColor = isUser ? "text-emerald-200" : "text-blue-200";
          const labelText = isUser ? "User" : isAssistant ? "Assistant" : entry.role;
          const key =
            "at" in entry && entry.at
              ? `${entry.at}-${entry.role}-${entry.text.slice(0, 16)}`
              : `live-${idx}-${entry.role}-${entry.text.slice(0, 16)}`;

          return (
            <div key={key} className={`flex flex-col gap-1 ${align}`}>
              <span className={`text-xs font-semibold ${labelColor}`}>{labelText}</span>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${bubbleColor}`}>
                {entry.text}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
