# Market-Bell

Voice-first market assistant with Vapi + Finnhub integration. Built on Next.js App Router and Tailwind. Uses Prisma + Postgres (Neon or local) for user, profile, conversations, and watchlist.

## Quickstart

```bash
npm install
npm run dev
```

Env (`.env` or `.env.local`):
```
FINNHUB_API_KEY=...
OPENAI_API_KEY=...
DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>

# Auth (NextAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...            # strong random
NEXTAUTH_URL=http://localhost:3000

# Vapi
VAPI_SECRET_KEY=...
NEXT_PUBLIC_VAPI_ASSISTANT_ID=...
VAPI_PUBLIC_KEY=...
NEXT_PUBLIC_VAPI_PUBLIC_KEY=...
VAPI_USER_TOKEN_SECRET=...      # 32+ chars, JWT signing for user tokens

# Optional: Fallback providers (JSON arrays)
# NEXT_PUBLIC_VAPI_TRANSCRIBER_FALLBACK='[{"provider":"assembly-ai","speechModel":"universal-streaming-multilingual","language":"en"}]'
# NEXT_PUBLIC_VAPI_VOICE_FALLBACK='[{"provider":"cartesia","voiceId":"your-voice-id"}]'
```

Open http://localhost:3000 and start a voice session.

## Notes
- Vapi webhook: `/api/vapi/webhook` handles tool calls (quotes/news/movers/watchlist/profile/today_brief).
- Finnhub powers quotes/news/movers. Provide `FINNHUB_API_KEY`.
- Prisma + Postgres for users, profiles, conversations, watchlist. Make sure `DATABASE_URL` points to your Neon/local DB and migrations are applied.

## Database
- Engine: Postgres (works with Neon or local Postgres).
- URL: set `DATABASE_URL=postgresql://<user>:<pass>@<host>:<port>/<db>`.
- Apply schema: from `web/` run `npx prisma migrate dev` (local) or `npx prisma db push` if you only want to sync schema.
- Inspect data: `npx prisma studio`.
- If using Neon for shared dev data, keep `DATABASE_URL` pointing to the Neon instance; for local isolation, point to your local Postgres.
- Watchlist/Profile/Conversation data persist in the DB; auth uses NextAuth (add a Prisma adapter if you want user records created automatically).

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
