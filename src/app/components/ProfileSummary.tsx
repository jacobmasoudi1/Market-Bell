"use client";

type Props = {
  profile: {
    riskTolerance?: string;
    horizon?: string;
    briefStyle?: string;
    experience?: string;
  };
  onEdit: () => void;
};

export function ProfileSummary({ profile, onEdit }: Props) {
  const rows = [
    { label: "Risk tolerance", value: profile.riskTolerance || "—" },
    { label: "Horizon", value: profile.horizon || "—" },
    { label: "Brief style", value: profile.briefStyle || "—" },
    { label: "Experience", value: profile.experience || "—" },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h2 className="text-lg font-semibold">Your Preferences</h2>
          <p className="text-sm text-slate-300/80">Used to personalize briefs and watchlist ideas.</p>
        </div>
        <button
          onClick={onEdit}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:border-white/40 hover:bg-white/10"
        >
          Edit preferences
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 px-4 pb-5">
        {rows.map((r) => (
          <div key={r.label} className="rounded border border-white/10 bg-slate-900 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-300">{r.label}</div>
            <div className="text-sm text-white">{r.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
