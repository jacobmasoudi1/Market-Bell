const TICKER_REGEX = /^[A-Z]{1,5}(?:\.[A-Z]{1,2})?$/;

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
};

export const validateTickerForTool = (
  rawTicker?: string | null,
  options: ValidateOptions = {},
): TickerValidationResult => {
  const { confirm = false, allowEmpty = false, action } = options;

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

  if (!confirm) {
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
