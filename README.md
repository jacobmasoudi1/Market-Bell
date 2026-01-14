# Market-Bell

Voice-first market assistant with Vapi + Finnhub integration. Built on Next.js App Router, Tailwind, and mock in-memory profile/watchlist stores (swap to Prisma/DB later).

## Quickstart

```bash
npm install
npm run dev
```

Env (`.env` or `.env.local`):
```
VAPI_SECRET_KEY=...
NEXT_PUBLIC_VAPI_ASSISTANT_ID=...
VAPI_PUBLIC_KEY=...
NEXT_PUBLIC_VAPI_PUBLIC_KEY=...
VAPI_USER_TOKEN_SECRET=...  # Random secure string (32+ chars) for JWT signing
FINNHUB_API_KEY=...

# Optional: Fallback providers (JSON arrays)
# NEXT_PUBLIC_VAPI_TRANSCRIBER_FALLBACK='[{"provider":"assembly-ai","speechModel":"universal-streaming-multilingual","language":"en"}]'
# NEXT_PUBLIC_VAPI_VOICE_FALLBACK='[{"provider":"cartesia","voiceId":"your-voice-id"}]'
```

Open http://localhost:3000 and start a voice session.

## Notes
- Vapi webhook: `/api/vapi/webhook` handles tool calls (quotes/news/movers/watchlist/profile/today_brief).
- Finnhub is used for quotes/news/movers with no-store fetch and validation; watchlist/profile are in-memory for demo only.

## VAPI Assistant Configuration

**Critical:** Update your VAPI assistant's system prompt to ensure every tool call includes the userToken:

```
IMPORTANT: When calling any tool, you MUST include userToken in the arguments. 
Every tool call must have this format:
{
  "userToken": "{{userToken}}",
  ...other arguments
}

Example tool call:
{
  "name": "get_quote",
  "arguments": {
    "userToken": "{{userToken}}",
    "ticker": "AAPL"
  }
}
```

**How it works:**
1. The code passes `userToken` via `assistantOverrides.variableValues.userToken` when starting the call
2. The assistant must include `"userToken": "{{userToken}}"` in every tool call's arguments
3. The webhook extracts `userToken` from `arguments.userToken` to authenticate the user

Without this, tool calls will fail with "Missing user token" errors.
