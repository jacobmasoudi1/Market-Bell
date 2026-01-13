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
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Preferences</h2>
          <p className="text-sm text-slate-500">Used to personalize briefs and watchlist ideas.</p>
        </div>
        <button
          onClick={onEdit}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300"
        >
          Edit preferences
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded border border-slate-100 px-3 py-2">
            <div className="text-xs uppercase text-slate-500">{r.label}</div>
            <div className="text-sm text-slate-800">{r.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
