"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

type Item = { id: string; ticker: string; reason?: string; createdAt?: string };

export function Watchlist() {
  const [items, setItems] = useState<Item[]>([]);
  const [ticker, setTicker] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await fetchJson("/api/watchlist");
      setItems(res?.items || []);
    } catch (err: any) {
      setStatus(err?.message || "Failed to load watchlist");
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      setStatus("Added");
    } catch (err: any) {
      setStatus(err?.message || "Add failed");
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
      setStatus(err?.message || "Remove failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Watchlist</h2>
          <p className="text-sm text-slate-500">Add tickers to personalize your brief.</p>
        </div>
        <div className="text-sm text-slate-600 min-w-[80px] text-right">{status}</div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          className="w-full sm:w-32 rounded border border-slate-200 px-3 py-2 text-sm"
          placeholder="Ticker"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
          placeholder="Why track it?"
        />
        <button
          onClick={add}
          disabled={loading || !ticker}
          className="rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add"}
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
          >
            <div>
              <div className="text-sm font-semibold">{item.ticker}</div>
              {item.reason && <div className="text-xs text-slate-600">{item.reason}</div>}
            </div>
            <button
              onClick={() => remove(item.ticker)}
              disabled={loading}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
        {!items.length && (
          <div className="text-sm text-slate-500">No tickers yet. Add one to get started.</div>
        )}
      </div>
    </section>
  );
}
