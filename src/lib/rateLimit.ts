type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

function keyFor(req: Request | { headers: Headers }, bucket: string) {
  const hdrs = "headers" in req ? req.headers : new Headers();
  const forwarded = hdrs.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || hdrs.get("x-real-ip") || "unknown";
  return `${bucket}:${ip}`;
}

export function rateLimitRequest(
  req: Request | { headers: Headers },
  bucket: string,
  limit = DEFAULT_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const key = keyFor(req, bucket);
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) {
    return false;
  }
  existing.count += 1;
  buckets.set(key, existing);
  return true;
}

export function rateLimitHeaders(req: Request | { headers: Headers }, bucket: string, limit = DEFAULT_LIMIT) {
  const key = keyFor(req, bucket);
  const entry = buckets.get(key);
  const remaining = entry ? Math.max(0, limit - entry.count) : limit - 1;
  const reset = entry ? Math.max(0, entry.resetAt - Date.now()) : DEFAULT_WINDOW_MS;
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };
}
