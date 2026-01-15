import { NextRequest } from "next/server";
import { corsOptionsResponse } from "@/lib/cors";
import { withApi } from "@/lib/api/withApi";

type VapiCallResponse = {
  id: string;
  clientUrl: string;
};

export const POST = withApi(
  async (_req: NextRequest, _ctx, _context) => {
    const apiKey = process.env.VAPI_SECRET_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    if (!apiKey || !assistantId) {
      return { ok: false, error: "Missing VAPI_SECRET_KEY or NEXT_PUBLIC_VAPI_ASSISTANT_ID", status: 500 };
    }

    const requestBody = { assistantId };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Vapi call failed: ${errText || res.statusText}`, status: res.status };
    }

    const data = (await res.json()) as VapiCallResponse;
    if (!data.clientUrl) {
      return { ok: false, error: "Vapi response missing clientUrl", status: 500 };
    }

    return { clientUrl: data.clientUrl, callId: data.id };
  },
  { auth: true, rateLimit: { key: "vapi-call-token", limit: 30, windowMs: 60_000 } },
);

export async function OPTIONS() {
  return corsOptionsResponse();
}
