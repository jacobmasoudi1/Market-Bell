import { NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";
import { ToolResponse } from "@/lib/types";

export function formatResult<T>(resp: ToolResponse<T>): string {
  if (!resp.ok) {
    return resp.error || "An error occurred";
  }
  if (!resp.data) {
    return "No data available";
  }

  const data = resp.data as any;

  if (data.ticker && typeof data.price === "number") {
    const change = data.change >= 0 ? `+${data.change}` : `${data.change}`;
    const changePercent =
      data.changePercent >= 0 ? `+${data.changePercent.toFixed(2)}%` : `${data.changePercent.toFixed(2)}%`;
    return `${data.ticker} is trading at $${data.price.toFixed(2)}, ${change} (${changePercent})`;
  }

  if (data.items && Array.isArray(data.items)) {
    if (data.items.length === 0) return "Watchlist is empty";
    return `Watchlist: ${data.items.map((item: any) => item.ticker).join(", ")}`;
  }

  if (data.added) return `Added ${data.added} to watchlist`;
  if (data.removed) return `Removed ${data.removed} from watchlist`;

  if (data.summary) return data.summary;

  return JSON.stringify(data).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

export function wrapVapiResponse<T>(toolCallId: string, resp: ToolResponse<T>) {
  const result = formatResult(resp);
  return NextResponse.json(
    {
      results: [
        {
          toolCallId,
          result,
        },
      ],
    },
    { status: 200, headers: getCorsHeaders() }
  );
}
