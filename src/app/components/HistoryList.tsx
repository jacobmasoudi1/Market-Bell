"use client";

import { HistoryEntry } from "@/hooks/useVoiceSession";

type Props = {
  history: HistoryEntry[];
};

export function HistoryList({ history }: Props) {
  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Conversation History</h2>
          <p className="text-sm text-slate-500">Recent saved sessions</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {history.map((session) => (
          <div key={session.id} className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <strong>{session.title || "Saved conversation"}</strong>
              <span className="text-slate-500">{session.createdAt}</span>
            </div>
            <p className="text-sm text-slate-600">{session.summary}</p>
          </div>
        ))}
        {!history.length && (
          <div className="text-sm text-slate-500">No saved conversations yet.</div>
        )}
      </div>
    </section>
  );
}
