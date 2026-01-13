"use client";

import { HistoryEntry } from "@/hooks/useVoiceSession";

type Props = {
  history: HistoryEntry[];
  onSelect?: (id: string) => void;
  onNew?: () => void;
};

export function HistoryList({ history, onSelect, onNew }: Props) {
  const formatLabel = (session: HistoryEntry) => {
    if (session.title && session.title.trim()) return session.title;
    if (session.summary && session.summary.trim()) return session.summary.slice(0, 80);
    return `Conversation ${session.id.slice(0, 6)}`;
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Recent conversations</h2>
          <p className="text-xs text-slate-500">Tap to load</p>
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="rounded bg-slate-100 px-3 py-1 text-xs text-slate-800 hover:bg-slate-200"
          >
            New
          </button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {history.slice(0, 6).map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect?.(session.id)}
            className="w-full text-left rounded border border-slate-100 px-3 py-2 text-sm hover:border-slate-200 hover:bg-slate-50 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold line-clamp-1">{formatLabel(session)}</span>
              <span className="text-xs text-slate-500">{session.createdAt?.slice(0, 10)}</span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">
              {session.summary || "Tap to load this conversation."}
            </p>
          </button>
        ))}
        {!history.length && <div className="text-xs text-slate-500">No saved conversations yet.</div>}
      </div>
    </section>
  );
}
