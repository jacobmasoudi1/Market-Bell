export type QuoteData = {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
};

export type Mover = { ticker: string; price: number; changePercent: number };

export type WatchItem = { ticker: string; reason?: string };

export type Profile = {
  riskTolerance: "low" | "medium" | "high";
  horizon: "day" | "swing" | "long";
  sectors?: string;
  constraints?: string;
  briefStyle?: "bullet" | "narrative" | "numbers_first";
  experience?: "beginner" | "intermediate" | "advanced";
};

export type Headline = {
  title: string;
  url: string;
  time?: string;
};

export type TodayBrief = {
  summary: string;
  topGainers: Mover[];
  topLosers: Mover[];
  headlines: Headline[];
  profile?: Profile;
  watchlist?: WatchItem[];
};

export type ToolResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  fallback?: any;
};
