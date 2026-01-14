const TICKER_REGEX = /^[A-Z]{1,5}(?:\.[A-Z]{1,2})?$/;
const NAME_TICKER_MAP: Record<string, string> = {
  amazon: "AMZN",
  "amazon.com": "AMZN",
  apple: "AAPL",
  alphabet: "GOOGL",
  google: "GOOGL",
  microsoft: "MSFT",
  meta: "META",
  facebook: "META",
  tesla: "TSLA",
  nvidia: "NVDA",
  netflix: "NFLX",
  adobe: "ADBE",
  "advanced micro devices": "AMD",
  amd: "AMD",
  intel: "INTC",
};

export const mapCommonNameToTicker = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  return NAME_TICKER_MAP[key];
};

export type TickerValidationResult =
  | { status: "ok"; ticker: string }
  | { status: "needs_confirm"; error: string; ticker: string }
  | { status: "invalid"; error: string; ticker?: string };

export const normalizeTicker = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  return normalized || undefined;
};

export const isValidTicker = (value?: string | null): boolean => {
  const ticker = normalizeTicker(value);
  return !!ticker && TICKER_REGEX.test(ticker);
};

export const spellTicker = (ticker: string) => ticker.split("").join("-");

type ValidateOptions = {
  confirm?: boolean;
  allowEmpty?: boolean;
  action?: string;
  requireConfirm?: boolean;
};

export const validateTickerForTool = (
  rawTicker?: string | null,
  options: ValidateOptions = {},
): TickerValidationResult => {
  const { confirm = false, allowEmpty = false, action, requireConfirm = true } = options;

  if (!rawTicker || rawTicker.trim() === "") {
    if (allowEmpty) {
      return { status: "ok", ticker: "" };
    }
    return {
      status: "invalid",
      error: "Please provide a ticker (spell it out letter by letter).",
    };
  }

  const ticker = normalizeTicker(rawTicker);
  if (!ticker) {
    return {
      status: "invalid",
      error: "Please provide a ticker (spell it out letter by letter).",
    };
  }

  if (!isValidTicker(ticker)) {
    const spelled = spellTicker(ticker);
    return {
      status: "needs_confirm",
      error: `Did you mean ticker ${spelled}? To confirm, call this tool again with confirm: true. To cancel, call with confirm: false.`,
      ticker,
    };
  }

  if (requireConfirm && !confirm) {
    const spelled = spellTicker(ticker);
    const actionText = action ? `${action} ${ticker}` : `ticker ${ticker}`;
    return {
      status: "needs_confirm",
      error: `Confirm ${actionText}? To proceed with ${spelled}, call this tool again with confirm: true. To cancel, call with confirm: false.`,
      ticker,
    };
  }

  return { status: "ok", ticker };
};
