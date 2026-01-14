const TICKER_REGEX = /^[A-Z]{1,5}(?:\.[A-Z]{1,2})?$/;

export type TickerValidationResult =
  | { ok: true; ticker?: string }
  | { ok: false; error: string; needsConfirm?: boolean; ticker?: string };

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
    if (allowEmpty) return { ok: true, ticker: undefined };
    return { ok: false, error: "Please provide a ticker (spell it out letter by letter)." };
  }

  const ticker = normalizeTicker(rawTicker);
  if (!ticker) {
    return { ok: false, error: "Please provide a ticker (spell it out letter by letter)." };
  }

  if (!isValidTicker(ticker)) {
    const spelled = spellTicker(ticker);
    return { ok: false, error: `Did you mean ticker ${spelled}? say yes or no.`, needsConfirm: true, ticker };
  }

  if (!confirm) {
    const spelled = spellTicker(ticker);
    const actionText = action ? `${action} ${ticker}` : `ticker ${ticker}`;
    return {
      ok: false,
      error: `Confirm ${actionText}? Say yes to proceed with ${spelled} or no to cancel.`,
      needsConfirm: true,
      ticker,
    };
  }

  return { ok: true, ticker };
};
