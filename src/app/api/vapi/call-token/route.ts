import { NextResponse } from "next/server";
import { corsResponse, corsOptionsResponse } from "@/lib/cors";
import { requireUserId } from "@/lib/auth-session";

type VapiCallResponse = {
  id: string;
  clientUrl: string;
};

export async function POST() {
  try {
    await requireUserId();

    const apiKey = process.env.VAPI_SECRET_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

    if (!apiKey || !assistantId) {
      return corsResponse(
        { error: "Missing VAPI_SECRET_KEY or NEXT_PUBLIC_VAPI_ASSISTANT_ID" },
        500
      );
    }

    const requestBody = { assistantId };

    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[CallToken] VAPI API error", { status: res.status, statusText: res.statusText, error: errText });
      return corsResponse(
        { error: `Vapi call failed: ${errText || res.statusText}` },
        res.status
      );
    }

    const data = (await res.json()) as VapiCallResponse;
    if (!data.clientUrl) {
      return corsResponse(
        { error: "Vapi response missing clientUrl" },
        500
      );
    }

    return corsResponse({ clientUrl: data.clientUrl, callId: data.id });
  } catch (err: any) {
    if (err?.message === "Unauthorized") {
      return corsResponse({ error: "Unauthorized" }, 401);
    }
    console.error("Vapi token error", err);
    return corsResponse(
      { error: "Unable to create Vapi call token" },
      500
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
