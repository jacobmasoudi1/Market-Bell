"use client";

import { HistoryList } from "./components/HistoryList";
import { SessionHeader } from "./components/SessionHeader";
import { TranscriptList } from "./components/TranscriptList";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useEffect, useState } from "react";
import { ProfileForm, Profile } from "./components/ProfileForm";
import { ProfileSummary } from "./components/ProfileSummary";
import { fetchJson } from "@/lib/fetchJson";

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
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <SessionHeader
          isSessionActive={isSessionActive}
          status={status}
          onToggle={toggleVoice}
        />

        {showProfileForm || !profile?.riskTolerance || !profile?.horizon ? (
          <ProfileForm initialProfile={profile} onSaved={handleProfileSaved} />
        ) : (
          <ProfileSummary profile={profile} onEdit={() => setShowProfileForm(true)} />
        )}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <input
                  value={quoteTicker}
                  onChange={(e) => setQuoteTicker(e.target.value.toUpperCase())}
                  className="w-32 rounded border border-slate-200 px-3 py-2 text-sm"
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
                  className="w-32 rounded border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ticker (opt)"
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
                  className="rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
                >
                  Today&apos;s Brief
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Conversation ID: {conversationId ?? "none"}
            </div>
          </div>
        </section>

        <TranscriptList transcript={transcript} />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
