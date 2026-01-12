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
FINNHUB_API_KEY=...
```

Open http://localhost:3000 and start a voice session.

## Notes
- Vapi webhook: `/api/vapi/webhook` handles tool calls (quotes/news/movers/watchlist/profile/today_brief).
- Finnhub is used for quotes/news/movers with no-store fetch and validation; watchlist/profile are in-memory for demo only.
