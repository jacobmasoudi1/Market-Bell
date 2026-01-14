import { NextRequest } from "next/server";
import { verifyUserToken } from "@/lib/userToken";
import { getOrCreateDefaultUser } from "@/lib/user";

const isDev = process.env.NODE_ENV !== "production";

export type TokenExtraction = { token?: string; source: "arguments" | "header" | "metadata" | "query" | "none" };

export function extractUserToken(body: any, args: any, req: NextRequest): TokenExtraction {
  const argToken = args?.userToken ?? args?.user_token ?? body?.userToken ?? body?.user_token;
  if (argToken) return { token: argToken.toString(), source: "arguments" };

  const headerToken = req.headers.get("x-mb-user-token") || undefined;
  if (headerToken) return { token: headerToken.toString(), source: "header" };

  const metadataSources = [
    body?.metadata,
    body?.meta,
    body?.toolCall?.metadata,
    body?.tool?.metadata,
    body?.payload?.metadata,
    body?.message?.metadata,
    args?.metadata,
  ].filter(Boolean);
  const metaToken = metadataSources
    .map((m: any) => m?.userToken ?? m?.user_token)
    .find((val) => typeof val === "string");
  if (metaToken) return { token: metaToken.toString(), source: "metadata" };

  const url = new URL(req.url);
  const queryToken = isDev ? url.searchParams.get("userToken") || url.searchParams.get("user_token") : undefined;
  if (queryToken) return { token: queryToken.toString(), source: "query" };

  return { token: undefined, source: "none" };
}

export function extractUserHint(body: any, args: any, req: NextRequest) {
  if (!isDev) return undefined;
  const url = new URL(req.url);
  const queryUser = url.searchParams.get("userId") || url.searchParams.get("user_id");
  const headerUser =
    req.headers.get("x-user-id") ||
    req.headers.get("x-userid") ||
    req.headers.get("x-user") ||
    undefined;
  const argUser = args?.userId ?? args?.user_id ?? body?.userId ?? body?.user_id;
  return (argUser || headerUser || queryUser)?.toString?.();
}

export async function resolveUserId({
  userToken,
  userHint,
  fromBrowser,
  allowDemo,
}: {
  userToken?: string;
  userHint?: string;
  fromBrowser: boolean;
  allowDemo: boolean;
}): Promise<{ userId?: string; source?: string; error?: string; tokenSource?: string }> {
  if (userToken) {
    const verified = verifyUserToken(userToken);
    if (!verified) {
      return { error: "Invalid user token", tokenSource: "token" };
    }
    return { userId: verified.userId, source: "token", tokenSource: "token" };
  }
  if (userHint && isDev) {
    return { userId: userHint, source: "hint", tokenSource: "hint" };
  }
  if (fromBrowser) {
    return { error: "Missing user token", tokenSource: "none" };
  }
  if (allowDemo) {
    const demoId = await getOrCreateDefaultUser();
    console.log("[Webhook] NO TOKEN -> demo-user", demoId);
    return { userId: demoId, source: "demo-fallback", tokenSource: "demo" };
  }
  return { error: "Missing user token", tokenSource: "none" };
}
