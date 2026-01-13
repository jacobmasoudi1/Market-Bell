"use client";

import { HistoryList } from "./components/HistoryList";
import { SessionHeader } from "./components/SessionHeader";
import { TranscriptList } from "./components/TranscriptList";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useEffect, useState } from "react";
import { ProfileForm, Profile } from "./components/ProfileForm";
import { ProfileSummary } from "./components/ProfileSummary";
import { fetchJson } from "@/lib/fetchJson";
import { Watchlist } from "./components/Watchlist";

export default function Home() {
  const {
    isSessionActive,
    status,
    transcript,
    history,
    conversationId,
    toggleVoice,
    selectConversation,
    fetchQuote,
    fetchNews,
    fetchTodayBrief,
  } = useVoiceSession();

  const [quoteTicker, setQuoteTicker] = useState("AAPL");
  const [newsTicker, setNewsTicker] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchJson("/api/profile");
        setProfile(res?.profile || null);
        if (!res?.profile?.riskTolerance || !res?.profile?.horizon) {
          setShowProfileForm(true);
        }
      } catch {
        setShowProfileForm(true);
      }
    };
    loadProfile();
  }, []);

  const handleProfileSaved = (p: Profile) => {
    setProfile(p);
    setShowProfileForm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <SessionHeader
              isSessionActive={isSessionActive}
              status={status}
              onToggle={toggleVoice}
            />
            <p className="mt-2 text-sm text-slate-600">Your conversation is saved automatically.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-1">
                Conversation ID: {conversationId ?? "none"}
              </span>
            </div>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-slate-800">Quick tools (non-voice)</div>
            <div className="flex items-center gap-2">
              <input
                value={quoteTicker}
                onChange={(e) => setQuoteTicker(e.target.value.toUpperCase())}
                className="w-24 rounded border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ticker"
              />
              <button
                onClick={() => fetchQuote(quoteTicker)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-white text-sm hover:bg-slate-900"
              >
                Quote
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newsTicker}
                onChange={(e) => setNewsTicker(e.target.value.toUpperCase())}
                className="w-24 rounded border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ticker"
              />
              <button
                onClick={() => fetchNews(newsTicker || undefined)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-white text-sm hover:bg-slate-900"
              >
                News
              </button>
            </div>
            <div>
              <button
                onClick={fetchTodayBrief}
                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
              >
                Today&apos;s Brief
              </button>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {showProfileForm || !profile?.riskTolerance || !profile?.horizon ? (
              <ProfileForm initialProfile={profile} onSaved={handleProfileSaved} />
            ) : (
              <ProfileSummary profile={profile} onEdit={() => setShowProfileForm(true)} />
            )}
          </div>
          <Watchlist />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <TranscriptList transcript={transcript} />
          <div className="space-y-4 lg:col-span-1">
            <HistoryList history={history} />
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-600">
                Tap a conversation to load:
                <div className="mt-2 flex flex-wrap gap-2">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => selectConversation(h.id)}
                      className="rounded border border-slate-200 px-3 py-1 text-sm hover:border-slate-400"
                    >
                      {h.title || h.id.slice(0, 6)} ({h.createdAt?.slice(0, 10)})
                    </button>
                  ))}
                  {!history.length && (
                    <div className="text-xs text-slate-500">No conversations yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
