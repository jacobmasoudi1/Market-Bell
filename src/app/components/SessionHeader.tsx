"use client";

type Props = {
  isSessionActive: boolean;
  status: string;
  onToggle: () => void;
};

export function SessionHeader({ isSessionActive, status, onToggle }: Props) {
  return (
    <header className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Market Briefing Assistant</h1>
        <p className="text-slate-600">
          Talk to a voice-first AI that summarizes market moves and remembers what you care about.
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <button
          className={`rounded-lg px-4 py-2 text-white shadow-sm transition ${
            isSessionActive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={onToggle}
        >
          {isSessionActive ? "Stop Voice Session" : "Start Voice Session"}
        </button>
        <span className="text-sm text-slate-600">{status || "Idle"}</span>
      </div>
    </header>
  );
}
