"use client";

import { HistoryEntry } from "@/hooks/useConversation";

type Props = {
  history: HistoryEntry[];
  activeId?: string | null;
  liveText?: string;
  isLive?: boolean;
  lastDurationSec?: number | null;
  onSelect?: (id: string) => void;
  onNew?: () => void;
};

export function HistoryList({ history, activeId, liveText, isLive, lastDurationSec, onSelect, onNew }: Props) {
  const toStringSafe = (val: unknown) => (typeof val === "string" ? val : "");

  const safeHistory = history
    .filter((h) => typeof h?.id === "string")
    .map((h) => ({
      id: h.id,
      title: toStringSafe(h.title),
      summary: toStringSafe(h.summary),
      createdAt: toStringSafe(h.createdAt),
      lastMessageAt: toStringSafe(h.lastMessageAt),
    }));

  const formatLabel = (session: HistoryEntry) => {
    const rawTitle = toStringSafe(session.title).trim();
    const lowerTitle = rawTitle.toLowerCase();
    const isPlaceholder =
      !rawTitle ||
      lowerTitle.startsWith("voice session") ||
      lowerTitle.startsWith("conversation ") ||
      lowerTitle.startsWith("tap to load");
    if (!isPlaceholder && rawTitle) return rawTitle;
    const summary = toStringSafe(session.summary).trim();
    if (summary) return summary.slice(0, 80);
    return `Conversation ${session.id.slice(0, 6)}`;
  };

  return (
    <section className="rounded-2xl bg-slate-900/70 border border-white/10 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h2 className="text-base font-semibold">Conversations</h2>
          <p className="text-xs text-slate-300/80">History + live status</p>
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition"
          >
            New chat
          </button>
        )}
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                isLive ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-slate-300"
              }`}
            >
              ● {isLive ? "Live" : "Idle"}
            </span>
            {lastDurationSec ? <span className="text-slate-300/80">Last: {lastDurationSec}s</span> : null}
          </div>
          <span className="text-[11px] text-slate-300/80 line-clamp-1">{liveText || "Ready"}</span>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2 max-h-[520px] overflow-y-auto">
        {safeHistory.slice(0, 12).map((session) => {
          const active = activeId && session.id === activeId;
          return (
            <button
              key={session.id}
              onClick={() => onSelect?.(session.id)}
              className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition ${
                active
                  ? "border-emerald-400/60 bg-emerald-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold line-clamp-1">{formatLabel(session)}</span>
                <span className="text-[11px] text-slate-400">{toStringSafe(session.createdAt)?.slice(0, 10)}</span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">
                <span className="font-semibold text-slate-200">Summary: </span>
                {toStringSafe(session.summary) || "Tap to load this conversation."}
              </p>
            </button>
          );
        })}
        {!history.length && (
          <div className="text-xs text-slate-400 px-1 pb-3">No saved conversations yet.</div>
        )}
      </div>
    </section>
  );
}
