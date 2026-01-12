import { NextResponse } from "next/server";

type VapiCallResponse = {
  id: string;
  clientUrl: string;
};

export async function POST() {
  const apiKey = process.env.VAPI_SECRET_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

  if (!apiKey || !assistantId) {
    return NextResponse.json(
      { error: "Missing VAPI_SECRET_KEY or NEXT_PUBLIC_VAPI_ASSISTANT_ID" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ assistantId }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Vapi call failed: ${errText || res.statusText}` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as VapiCallResponse;
    if (!data.clientUrl) {
      return NextResponse.json(
        { error: "Vapi response missing clientUrl" },
        { status: 500 },
      );
    }

    return NextResponse.json({ clientUrl: data.clientUrl, callId: data.id });
  } catch (err) {
    console.error("Vapi token error", err);
    return NextResponse.json(
      { error: "Unable to create Vapi call token" },
      { status: 500 },
    );
  }
}
