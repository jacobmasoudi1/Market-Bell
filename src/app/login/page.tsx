"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SessionHeader } from "../components/SessionHeader";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="rounded-2xl bg-white/10 px-6 py-5 shadow-lg text-center text-sm text-slate-200">
          Loading…
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="rounded-2xl bg-white/10 px-6 py-5 shadow-lg text-center text-sm text-slate-200">
          Redirecting…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <SessionHeader isSessionActive={false} status="Sign in required" onToggle={() => {}} />
        <div className="rounded-2xl bg-white/10 p-8 shadow-lg space-y-4">
          <h2 className="text-2xl font-semibold">Welcome to Market Bell</h2>
          <p className="text-sm text-slate-300">
            Sign in with Google to access your voice assistant, conversations, preferences, and watchlist.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded-lg bg-white text-slate-900 px-6 py-3 text-base font-semibold hover:bg-slate-200 transition shadow-lg"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
