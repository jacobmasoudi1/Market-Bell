"use client";

import { useEffect, useState } from "react";
import { useUpdateProfile, useUserProfile } from "@/lib/hooks";

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
  const { profile: fetchedProfile, mutate: refreshProfile } = useUserProfile({ revalidateOnFocus: false });
  const { trigger: updateProfile } = useUpdateProfile();

  const loadProfile = async () => {
    try {
      const sourceProfile = initialProfile ?? fetchedProfile ?? (await refreshProfile())?.profile ?? {};
      setProfile({
        riskTolerance: sourceProfile.riskTolerance ?? "medium",
        horizon: sourceProfile.horizon ?? "long",
        sectors: sourceProfile.sectors ?? "",
        constraints: sourceProfile.constraints ?? "",
        briefStyle: sourceProfile.briefStyle ?? "bullet",
        experience: sourceProfile.experience ?? "intermediate",
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
      const res = await updateProfile(payload);
      const p = (res as any)?.profile || payload;
      setProfile({
        riskTolerance: p.riskTolerance ?? "medium",
        horizon: p.horizon ?? "long",
        sectors: p.sectors ?? "",
        constraints: p.constraints ?? "",
        briefStyle: p.briefStyle ?? "bullet",
        experience: p.experience ?? "intermediate",
      });
      await refreshProfile();
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
    <section className="rounded-2xl border border-white/10 bg-slate-950/70 text-white shadow-lg">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h2 className="text-lg font-semibold">Your Profile</h2>
          <p className="text-sm text-slate-300/80">Personalize briefs and tool answers</p>
        </div>
        <div className="text-sm text-slate-200 min-w-[80px] text-right">
          {status || (justSaved ? "Saved ✓" : "")}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 px-4 pb-5">
        <label className="text-sm text-slate-200">
          Risk tolerance
          <select
            value={profile.riskTolerance || ""}
            onChange={(e) => setProfile((p) => ({ ...p, riskTolerance: e.target.value }))}
            className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
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

        <label className="text-sm text-slate-200">
          Horizon
          <select
            value={profile.horizon || ""}
            onChange={(e) => setProfile((p) => ({ ...p, horizon: e.target.value }))}
            className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
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

        <label className="text-sm text-slate-200 sm:col-span-2">
          Sectors (comma-separated)
          <input
            value={profile.sectors || ""}
            onChange={(e) => setProfile((p) => ({ ...p, sectors: e.target.value }))}
            className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
            placeholder="tech, healthcare"
          />
        </label>

        <label className="text-sm text-slate-200 sm:col-span-2">
          Constraints
          <textarea
            value={profile.constraints || ""}
            onChange={(e) => setProfile((p) => ({ ...p, constraints: e.target.value }))}
            className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none"
            placeholder="e.g., ESG, no crypto, etc."
          />
        </label>

        <label className="text-sm text-slate-200">
          Brief style
          <select
            value={profile.briefStyle || "bullet"}
            onChange={(e) => setProfile((p) => ({ ...p, briefStyle: e.target.value }))}
            className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
          >
            {BRIEF.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-200">
          Experience level
          <select
            value={profile.experience || "intermediate"}
            onChange={(e) => setProfile((p) => ({ ...p, experience: e.target.value }))}
            className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
          >
            {EXPERIENCE.map((ex) => (
              <option key={ex.value} value={ex.value}>
                {ex.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={loadProfile}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white hover:border-white/40 hover:bg-white/10"
          >
            Refresh
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}
