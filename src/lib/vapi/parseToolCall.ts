export function extractToolCall(body: any): { name?: string; args?: any; toolCallId?: string } {
  if (!body || typeof body !== "object") return {};

  if (typeof body?.name === "string") {
    return { name: body.name, args: body.arguments ?? body.args, toolCallId: body.toolCallId ?? body.id };
  }

  const candidates = [
    body?.toolCall,
    body?.tool,
    body?.tool_call,
    body?.tool_calls?.[0],
    body?.toolCalls?.[0],
    body?.message?.toolCall,
    body?.message?.toolCalls?.[0],
    body?.message?.tool_call,
    body?.message?.tool_calls?.[0],
    body?.delta?.toolCall,
    body?.delta?.toolCalls?.[0],
    body?.delta?.tool_call,
    body?.delta?.tool_calls?.[0],
    body?.payload?.toolCall,
    body?.payload?.toolCalls?.[0],
    body?.response?.toolCall,
    body?.response?.toolCalls?.[0],
  ].filter(Boolean);

  const tc = candidates[0];
  if (tc) {
    const fn = tc.function ?? tc.func ?? tc;
    const name =
      fn?.name ??
      tc?.name ??
      body?.toolName ??
      body?.function?.name ??
      body?.function_call?.name;
    const args =
      fn?.arguments ??
      tc?.arguments ??
      body?.arguments ??
      body?.function?.arguments ??
      body?.function_call?.arguments;
    const toolCallId = tc?.id ?? tc?.toolCallId ?? body?.toolCallId ?? body?.id;
    return { name, args, toolCallId };
  }

  return {
    name: body?.toolName ?? body?.function?.name ?? body?.function_call?.name,
    args: body?.arguments ?? body?.function?.arguments ?? body?.function_call?.arguments,
    toolCallId: body?.toolCallId ?? body?.id,
  };
}

export function normalizeArgs(raw: any) {
  if (!raw || typeof raw !== "object") return {};
  const a: any = { ...raw };
  if (a.tickerr && !a.ticker) a.ticker = a.tickerr;
  if (Array.isArray(a.tickers) && a.tickers.length === 1 && !a.ticker) {
    a.ticker = a.tickers[0];
  }
  if (typeof a.ticker === "string") {
    a.ticker = a.ticker.trim();
    if (a.ticker === "") a.ticker = undefined;
  }
  return a;
}
