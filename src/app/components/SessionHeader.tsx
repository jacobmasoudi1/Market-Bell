"use client";

type Props = {
  isSessionActive: boolean;
  status: string;
  onToggle: () => void;
};

export function SessionHeader({ isSessionActive, status, onToggle }: Props) {
  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_45%)]" />
      <div className="relative flex flex-col items-center gap-8 px-6 py-14 text-center sm:px-10">
        <div className="space-y-3 max-w-3xl">
          <p className="text-sm uppercase tracking-wide text-blue-100">Market Briefing Assistant</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Talk to a voice-first AI that understands your style.
          </h1>
          <p className="text-blue-100 text-lg">
            One tap to speak. The agent remembers your preferences and watchlist to tailor each brief.
          </p>
          <div className="mx-auto max-w-xl rounded-xl bg-white/10 px-5 py-4 text-sm text-blue-50 backdrop-blur">
            “Say: ‘Give me today’s market brief.’”
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-3">
          <span
            className={`absolute inset-0 m-auto h-44 w-44 rounded-full blur-2xl transition ${
              isSessionActive ? "bg-red-400/40" : "bg-blue-400/30"
            }`}
          />
          <button
            className={`relative z-10 flex h-44 w-44 items-center justify-center rounded-full text-2xl font-semibold shadow-[0_0_60px_rgba(0,0,0,0.25)] transition transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-8 focus:ring-white/40 ${
              isSessionActive
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-white text-slate-900 hover:bg-blue-50"
            }`}
            onClick={onToggle}
          >
            {isSessionActive ? "Stop" : "◉ Talk"}
          </button>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm text-blue-50">
            Status: {status || "Idle"}
          </span>
        </div>
      </div>
    </header>
  );
}
