export const isNoiseText = (t: string) => {
  const s = (t || "").trim().toLowerCase();
  if (!s) return true;
  if (s.startsWith("voice session")) return true;
  if (s.startsWith("tap to load")) return true;
  if (s.startsWith("conversation ")) return true;
  if (s.length < 4) return true;
  if (["hi", "hey", "hello", "yo", "test"].includes(s)) return true;
  return false;
};

export const buildTitle = (text: string) => {
  if (isNoiseText(text)) return null;
  const sanitized = text.replace(/\s+/g, " ").trim();
  if (!sanitized) return null;
  const max = 80;
  return sanitized.length > max ? sanitized.slice(0, max - 1) + "…" : sanitized;
};
