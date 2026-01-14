import { Role } from "@prisma/client";

type LiveTranscriptProps = {
  text?: string;
  role?: Role;
  title?: string;
};

export function LiveTranscript({ text, role, title = "Streaming Transcript" }: LiveTranscriptProps) {
  const roleLabel = role === Role.user ? "You" : role === Role.assistant ? "Assistant" : undefined;
  const roleColor =
    role === Role.user
      ? "bg-emerald-500/15 text-emerald-200"
      : role === Role.assistant
        ? "bg-blue-500/15 text-blue-200"
        : "bg-white/10 text-slate-200";

  return (
    <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-lg border border-white/10">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-200 px-3 py-1 text-xs font-semibold">
              ● Live
            </span>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <p className="text-xs text-slate-300/80">Partial + final text as the call streams.</p>
        </div>
        <span className="text-xs text-slate-300/80">{text ? "Transcribing…" : "Waiting for audio…"}</span>
      </div>

      <div className="mt-4 min-h-[140px] rounded-2xl bg-white/5 border border-white/10 mx-5 mb-5 px-4 py-3 text-sm text-slate-100 whitespace-pre-wrap backdrop-blur space-y-2">
        {roleLabel && (
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${roleColor}`}>
            {roleLabel}
          </span>
        )}
        <div>{text || "No live transcript yet."}</div>
      </div>
    </section>
  );
}
