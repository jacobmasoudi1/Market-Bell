"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { useWatchlistSync } from "@/hooks/useWatchlistSync";

type Item = { id: string; ticker: string; reason?: string; createdAt?: string };

export function Watchlist() {
  const [items, setItems] = useState<Item[]>([]);
  const [ticker, setTicker] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const { subscribe } = useWatchlistSync();

  const load = async () => {
    try {
      const res = await fetchJson("/api/watchlist");
      setItems(res?.items || []);
    } catch (err: any) {
      console.error("Watchlist load failed", err);
      setStatus("Couldn't load watchlist. Try again.");
    }
  };

  useEffect(() => {
    load();
    const unsub = subscribe(load);
    return () => {
      unsub && unsub();
    };
  }, [subscribe]);

  const add = async () => {
    if (!ticker) return;
    setLoading(true);
    setStatus("");
    try {
      await fetchJson("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, reason }),
      });
      setTicker("");
      setReason("");
      await load();
      setStatus("Added to watchlist");
    } catch (err: any) {
      console.error("Watchlist add failed", err);
      setStatus("Add failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (t: string) => {
    setLoading(true);
    setStatus("");
    try {
      await fetchJson(`/api/watchlist?ticker=${encodeURIComponent(t)}`, {
        method: "DELETE",
      });
      await load();
      setStatus("Removed");
    } catch (err: any) {
      console.error("Watchlist remove failed", err);
      setStatus("Remove failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h2 className="text-base font-semibold">Watchlist</h2>
          <p className="text-xs text-slate-300/80">Managed by voice or tools.</p>
        </div>
        <div className="text-xs text-slate-200 min-w-[120px] text-right">{status}</div>
      </div>
      <div className="mt-3 flex flex-col gap-2 px-4 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full sm:w-32 rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
            placeholder="Ticker"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
            placeholder="Optional note"
          />
          <button
            onClick={add}
            disabled={loading || !ticker}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Add"}
          </button>
        </div>

        <div className="grid gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded border border-white/10 bg-slate-900 px-3 py-2"
            >
              <div>
                <div className="text-sm font-semibold text-white">{item.ticker}</div>
                {item.reason && <div className="text-xs text-slate-300">{item.reason}</div>}
              </div>
              <button
                onClick={() => remove(item.ticker)}
                disabled={loading}
                className="text-xs text-red-300 hover:text-red-200 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ))}
          {!items.length && (
            <div className="text-xs text-slate-400">No tickers yet. Add one to get started.</div>
          )}
        </div>
      </div>
    </section>
  );
}
