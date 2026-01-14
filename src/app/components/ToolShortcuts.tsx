type Props = {
  quoteTicker: string;
  setQuoteTicker: (v: string) => void;
  newsTicker: string;
  setNewsTicker: (v: string) => void;
  fetchQuote: (ticker: string) => Promise<void>;
  fetchNews: (ticker?: string) => Promise<void>;
  fetchTodayBrief: () => Promise<void>;
};

export function ToolShortcuts({
  quoteTicker,
  setQuoteTicker,
  newsTicker,
  setNewsTicker,
  fetchQuote,
  fetchNews,
  fetchTodayBrief,
}: Props) {
  return (
    <details className="rounded-xl bg-white/10 p-5 shadow-sm space-y-3 text-white" open>
      <summary className="text-sm font-semibold cursor-pointer">Quick tools (optional)</summary>
      <p className="text-xs text-slate-300">Use when you can’t speak.</p>
      <div className="flex items-center gap-2">
        <input
          value={quoteTicker}
          onChange={(e) => setQuoteTicker(e.target.value.toUpperCase())}
          className="w-24 rounded border border-white/20 bg-white/5 px-3 py-2 text-sm"
          placeholder="Ticker"
        />
        <button
          onClick={() => fetchQuote(quoteTicker)}
          className="rounded-lg bg-white text-slate-900 px-3 py-2 text-sm hover:bg-slate-200"
        >
          Quote
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newsTicker}
          onChange={(e) => setNewsTicker(e.target.value.toUpperCase())}
          className="w-24 rounded border border-white/20 bg-white/5 px-3 py-2 text-sm"
          placeholder="Ticker"
        />
        <button
          onClick={() => fetchNews(newsTicker || undefined)}
          className="rounded-lg bg-white text-slate-900 px-3 py-2 text-sm hover:bg-slate-200"
        >
          News
        </button>
      </div>
      <div>
        <button
          onClick={fetchTodayBrief}
          className="w-full rounded-lg bg-blue-500 px-3 py-2 text-white text-sm hover:bg-blue-600"
        >
          Today&apos;s Brief
        </button>
      </div>
    </details>
  );
}
