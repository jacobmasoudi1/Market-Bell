import crypto from "crypto";

const base64UrlEncode = (input: Buffer | string) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + pad, "base64").toString("utf8");
};

function getSecret() {
  const secret = process.env.VAPI_USER_TOKEN_SECRET;
  if (!secret) throw new Error("Missing VAPI_USER_TOKEN_SECRET");
  return secret;
}

export function signUserToken(userId: string, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { userId, exp: now + ttlSeconds, iat: now };
  const header = { alg: "HS256", typ: "JWT" };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac("sha256", getSecret()).update(data).digest("base64");
  const sigB64 = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sigB64}`;
}

export function verifyUserToken(token?: string): { userId: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sig] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64");
  const expectedSigB64 = expectedSig.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (sig !== expectedSigB64) return null;

  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload?.exp !== "number" || typeof payload?.userId !== "string") return null;
    if (payload.exp < now) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
