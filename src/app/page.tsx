"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { HistoryList } from "./components/HistoryList";
import { SessionHeader } from "./components/SessionHeader";
import { CallTranscript } from "./components/CallTranscript";
import { useAgentTools } from "@/hooks/useAgentTools";
import { useConversation } from "@/hooks/useConversation";
import { useVoiceClient } from "@/hooks/useVoiceClient";
import { ProfileForm, Profile } from "./components/ProfileForm";
import { ProfileSummary } from "./components/ProfileSummary";
import { fetchJson } from "@/lib/fetchJson";
import { Watchlist } from "./components/Watchlist";

export default function Home() {
  const {
    transcript,
    history,
    conversationId,
    addMessage,
    ensureConversation,
    loadHistory,
    selectConversation,
    startNewConversation,
  } = useConversation();

  const {
    isSessionActive,
    status,
    setStatus,
    userToken,
    toggleVoice,
    liveTranscript,
    liveTranscriptRole,
    lastCallDurationSec,
  } = useVoiceClient({
    addMessage,
    ensureConversation,
  });

  const { fetchQuote, fetchNews, fetchTodayBrief } = useAgentTools({
    userToken,
    setStatus,
    addMessage,
    ensureConversation,
    loadHistory,
  });

  const [quoteTicker, setQuoteTicker] = useState("AAPL");
  const [newsTicker, setNewsTicker] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authError, setAuthError] = useState(false);
  const { data: session, status: authStatus } = useSession();
  const signedIn = Boolean(session?.user?.id);
  const profileComplete = Boolean(profile?.riskTolerance && profile?.horizon);
  const hasAssistantReply = transcript.some((t) => t.role === "assistant");
  const shouldShowProfileForm = showProfileForm || !profileComplete;
  const currentConversation = conversationId
    ? history.find((h) => h.id === conversationId)
    : null;
  const transcriptTitle =
    currentConversation?.title ||
    (conversationId ? `Conversation ${conversationId.slice(0, 6)}` : "New conversation");

  useEffect(() => {
    const loadProfile = async () => {
      if (!signedIn) {
        setProfile(null);
        setShowProfileForm(false);
        setAuthError(false);
        return;
      }
      try {
        const res = await fetchJson("/api/profile");
        setProfile(res?.profile || null);
        if (!res?.profile?.riskTolerance || !res?.profile?.horizon) {
          setShowProfileForm(true);
        }
      } catch (err) {
        console.error("Profile load failed", err);
        if ((err as any)?.message?.includes("401") || (err as any)?.message?.includes("Unauthorized")) {
          setAuthError(true);
        }
        setShowProfileForm(true);
      }
    };
    loadProfile();
  }, [signedIn]);

  const handleProfileSaved = (p: Profile) => {
    setProfile(p);
    setShowProfileForm(false);
  };

  const handleToggleVoice = () => {
    setHistoryOpen(true);
    toggleVoice();
  };

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <SessionHeader isSessionActive={false} status="" onToggle={() => {}} />
          <div className="rounded-2xl bg-white/10 p-6 shadow-lg space-y-3">
            <h2 className="text-xl font-semibold">Sign in to continue</h2>
            <p className="text-sm text-slate-300">
              Sign in with Google to access your conversations, preferences, and watchlist.
            </p>
            <button
              onClick={() => signIn("google")}
              className="w-full rounded-lg bg-white text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-200 transition"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
        <SessionHeader isSessionActive={isSessionActive} status={status} onToggle={handleToggleVoice} />

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded bg-white/10 px-2 py-1">Conversation ID: {conversationId ?? "none"}</span>
          <span className="rounded bg-white/10 px-2 py-1">Auto-saved while you talk</span>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition"
          >
            {historyOpen ? "Hide history" : "Show history"}
          </button>
          <span className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <>
                <span className="text-slate-400">{session?.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition"
              >
                Sign in with Google
              </button>
            )}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr_320px] items-start">
          <aside
            className={`space-y-4 transition-all duration-300 ${
              historyOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <HistoryList history={history} onSelect={selectConversation} onNew={startNewConversation} />
          </aside>

          <div className="space-y-4">
            <CallTranscript
              transcript={transcript}
              liveText={liveTranscript}
              liveRole={liveTranscriptRole}
              title={transcriptTitle}
              lastDurationSec={lastCallDurationSec}
            />

            {profileComplete && !shouldShowProfileForm && hasAssistantReply && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
                Want more tailored answers?{" "}
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="font-semibold text-blue-700 underline underline-offset-2"
                >
                  Set your preferences.
                </button>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            {!signedIn || authStatus === "loading" ? (
              <div className="rounded-xl bg-white/10 p-5 shadow-sm text-sm text-slate-200">
                <div className="font-semibold mb-2">Sign in required</div>
                <p className="text-xs text-slate-300">
                  Sign in to save preferences, watchlist, and conversations.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => signIn("google")}
                    className="rounded bg-white text-slate-900 px-3 py-2 text-sm hover:bg-slate-200"
                  >
                    Sign in with Google
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!shouldShowProfileForm && profile && (
                  <ProfileSummary profile={profile} onEdit={() => setShowProfileForm(true)} />
                )}
                {shouldShowProfileForm && (
                  <ProfileForm initialProfile={profile} onSaved={handleProfileSaved} />
                )}

                <Watchlist />

                <details className="rounded-xl bg-white/10 p-5 shadow-sm space-y-3 text-white" open>
                  <summary className="text-sm font-semibold cursor-pointer">
                    Quick tools (optional)
                  </summary>
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
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
