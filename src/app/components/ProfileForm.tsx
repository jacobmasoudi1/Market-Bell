"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

export type Profile = {
  riskTolerance?: string;
  horizon?: string;
  sectors?: string | null;
  constraints?: string | null;
  briefStyle?: string;
  experience?: string;
};

const RISK = ["low", "medium", "high"];
const HORIZON = ["day", "swing", "long"];
const BRIEF = [
  { value: "bullet", label: "Bullets" },
  { value: "narrative", label: "Narrative" },
  { value: "numbers_first", label: "Numbers-first" },
];
const EXPERIENCE = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

type Props = {
  initialProfile?: Profile | null;
  onSaved?: (p: Profile) => void;
};

export function ProfileForm({ initialProfile, onSaved }: Props) {
  const [profile, setProfile] = useState<Profile>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const loadProfile = async () => {
    try {
      const res = initialProfile ? { profile: initialProfile } : await fetchJson("/api/profile");
      const p = res?.profile || {};
      setProfile({
        riskTolerance: p.riskTolerance ?? "medium",
        horizon: p.horizon ?? "long",
        sectors: p.sectors ?? "",
        constraints: p.constraints ?? "",
        briefStyle: p.briefStyle ?? "bullet",
        experience: p.experience ?? "intermediate",
      });
    } catch (err: any) {
      console.error("Profile load failed", err);
      setStatus("Couldn't load preferences. Try refresh.");
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const payload = {
        riskTolerance: profile.riskTolerance || "medium",
        horizon: profile.horizon || "long",
        sectors: profile.sectors?.trim() || null,
        constraints: profile.constraints?.trim() || null,
        briefStyle: profile.briefStyle || "bullet",
        experience: profile.experience || "intermediate",
      };
      const res = await fetchJson("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const p = res?.profile || payload;
      setProfile({
        riskTolerance: p.riskTolerance ?? "medium",
        horizon: p.horizon ?? "long",
        sectors: p.sectors ?? "",
        constraints: p.constraints ?? "",
        briefStyle: p.briefStyle ?? "bullet",
        experience: p.experience ?? "intermediate",
      });
      setStatus("Saved");
      setJustSaved(true);
      onSaved?.(p);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (err: any) {
      console.error("Profile save failed", err);
      setStatus("Save failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Profile</h2>
          <p className="text-sm text-slate-500">
            Used to personalize your brief and ticker suggestions
          </p>
        </div>
        <div className="text-sm text-slate-600 min-w-[80px] text-right">
          {status || (justSaved ? "Saved ✓" : "")}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Risk tolerance
          <select
            value={profile.riskTolerance || ""}
            onChange={(e) => setProfile((p) => ({ ...p, riskTolerance: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            required
          >
            {!profile.riskTolerance && (
              <option value="" disabled>
                Select
              </option>
            )}
            {RISK.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Horizon
          <select
            value={profile.horizon || ""}
            onChange={(e) => setProfile((p) => ({ ...p, horizon: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            required
          >
            {!profile.horizon && (
              <option value="" disabled>
                Select
              </option>
            )}
            {HORIZON.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Sectors (comma-separated)
          <input
            value={profile.sectors || ""}
            onChange={(e) => setProfile((p) => ({ ...p, sectors: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="tech, healthcare"
          />
        </label>

        <label className="text-sm text-slate-700 sm:col-span-2">
          Constraints
          <textarea
            value={profile.constraints || ""}
            onChange={(e) => setProfile((p) => ({ ...p, constraints: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="e.g., ESG, no crypto, etc."
          />
        </label>

        <label className="text-sm text-slate-700">
          Brief style
          <select
            value={profile.briefStyle || "bullet"}
            onChange={(e) => setProfile((p) => ({ ...p, briefStyle: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          >
            {BRIEF.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Experience level
          <select
            value={profile.experience || "intermediate"}
            onChange={(e) => setProfile((p) => ({ ...p, experience: e.target.value }))}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          >
            {EXPERIENCE.map((ex) => (
              <option key={ex.value} value={ex.value}>
                {ex.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={loadProfile}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300"
          >
            Refresh
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}
