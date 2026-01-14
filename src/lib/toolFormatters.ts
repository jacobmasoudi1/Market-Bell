type QuotePayload = {
  ok?: boolean;
  data?: { ticker: string; price: number; change: number; changePercent: number; name?: string | null };
};

type NewsPayload = { ok?: boolean; data?: { headlines?: { title: string }[]; ticker?: string }; headlines?: { title: string }[]; ticker?: string };

type BriefPayload = { ok?: boolean; data?: { summary?: string }; summary?: string };

const parseJsonSafe = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const formatQuote = (res: unknown): string => {
  const quote = parseJsonSafe(res) as QuotePayload;
  if (quote?.ok && quote?.data) {
    const { ticker: t, price, change, changePercent, name } = quote.data;
    return `${name ? name + " " : ""}${t}: ${price} (${change}, ${changePercent}%)`;
  }
  return typeof res === "string" ? res : JSON.stringify(res);
};

export const formatNews = (res: unknown, ticker?: string): string => {
  const parsed = parseJsonSafe(res) as NewsPayload;
  const headlines = Array.isArray(parsed?.headlines)
    ? parsed.headlines
    : Array.isArray(parsed?.data?.headlines)
      ? parsed.data.headlines
      : [];
  if (headlines.length) {
    const top = headlines
      .slice(0, 3)
      .map((h: any) => h.title)
      .join(" | ");
    const tgt = parsed?.ticker || parsed?.data?.ticker || ticker;
    return `Headlines${tgt ? " for " + tgt : ""}: ${top}`;
  }
  return typeof parsed === "string" ? (parsed as string) : JSON.stringify(parsed);
};

export const formatTodayBrief = (res: unknown): string => {
  const parsed = parseJsonSafe(res) as BriefPayload;
  const summary = parsed?.summary ?? parsed?.data?.summary;
  if (summary) return summary;
  if ((parsed as any)?.ok && (parsed as any)?.data) {
    return ((parsed as any).data.summary as string) || "Brief ready";
  }
  return typeof parsed === "string" ? (parsed as string) : JSON.stringify(parsed);
};
