type PendingConfirmation = {
  toolName: string;
  ticker: string;
  args: Record<string, unknown>;
  userId: string;
  expiresAt: number;
};

const pendingConfirmations = new Map<string, PendingConfirmation>();
const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

export function storePendingConfirmation(
  conversationId: string,
  toolName: string,
  ticker: string,
  args: Record<string, unknown>,
  userId: string,
): void {
  const key = `${conversationId}:${toolName}:${ticker}`;
  pendingConfirmations.set(key, {
    toolName,
    ticker,
    args,
    userId,
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
  });
}

export function getPendingConfirmation(
  conversationId: string,
  toolName: string,
  ticker?: string,
): PendingConfirmation | null {
  if (ticker) {
    const key = `${conversationId}:${toolName}:${ticker}`;
    const pending = pendingConfirmations.get(key);
    if (pending && pending.expiresAt > Date.now()) {
      return pending;
    }
    pendingConfirmations.delete(key);
    return null;
  }

  const prefix = `${conversationId}:${toolName}:`;
  for (const [key, pending] of pendingConfirmations.entries()) {
    if (key.startsWith(prefix) && pending.expiresAt > Date.now()) {
      return pending;
    }
    if (pending.expiresAt <= Date.now()) {
      pendingConfirmations.delete(key);
    }
  }
  return null;
}

export function clearPendingConfirmation(conversationId: string, toolName: string, ticker: string): void {
  const key = `${conversationId}:${toolName}:${ticker}`;
  pendingConfirmations.delete(key);
}

export function isAffirmativeResponse(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return ["yes", "y", "yeah", "yep", "sure", "ok", "okay", "confirm", "correct", "right"].includes(normalized);
}
