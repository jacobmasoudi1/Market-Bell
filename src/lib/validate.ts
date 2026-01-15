export function safeJson<T = Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object") {
    return value as T;
  }
  return {} as T;
}

export function requireString(input: unknown, label: string, { maxLength = 4000, allowEmpty = false } = {}) {
  if (typeof input !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = input.trim();
  if (!allowEmpty && trimmed.length === 0) {
    throw new Error(`${label} is required`);
  }
  return trimmed.slice(0, maxLength);
}

export function optionalString(input: unknown, { maxLength = 4000 } = {}) {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}
