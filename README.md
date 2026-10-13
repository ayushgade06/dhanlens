# DhanLens

**Portfolio-aware market event intelligence.** See what matters to your portfolio — and what actually happened.

> Independent prototype for the DhanHQ ecosystem; not affiliated with or endorsed by Dhan.
> It runs on illustrative demo data by default. It places no orders, makes no forecasts and gives no advice.

A calendar tells you what is happening, a news feed what was reported, a broker what you own. DhanLens
connects them, in two ways:

1. **Impact Chain** — for each event, a visible, inspectable path:
   `event → evidence / transmission channel → issuer or sector → your holdings and watchlist`.
   Links are typed as *direct*, *sector* or *macro (hypothesis)* and never merged into one score. Each step
   shows its reason, mapping rule, source and relationship confidence.
2. **Event Ledger** — each event carried through `before → observed → after → learn`: your pre-event note,
   what was reported, the instrument's return against a benchmark over a stated window, and your reflection.
   Observed movement is never presented as proof of cause.

## What is in V1

| Screen | What it does |
| --- | --- |
| Overview | Data-derived headline, the one event to look at first and why, upcoming timeline, portfolio table |
| Event Radar | Search, filter (date window, type, link, holdings/watchlist, priority band), sort, and "Why ranked here?" |
| Event detail | Lens Brief (known / why it connects / what to watch / uncertain), interactive Impact Chain, ledger entry |
| Impact Chains | Browse the chain for every linked event |
| Event Ledger | Lifecycle states, editable pre-event note with history, watch items, reported facts, return observation |
| Settings | Current data mode and status, data categories, developer setup, reset demo data |

All of it works in **demo mode** with no keys. An optional read-only DhanHQ adapter can load your own
holdings; see [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. A 90-second walkthrough is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |

## Demo data

The demo dataset lives in typed files under `data/`: ten instruments across seven sectors, six holdings,
four watchlist entries, nine events and fourteen curated links.

- Every event is titled "Illustrative scenario", carries no source URL, and is dated relative to today so
  the demo always has upcoming and past events. **None is a real schedule.**
- Tickers are familiar NSE symbols so the same sector taxonomy can map a real portfolio. Quantities, prices,
  weights and results are invented round numbers, not market data.
- The completed scenario uses simulated closing prices; every return panel built from them is tagged `SIMULATED`.
- One past scenario deliberately has no result and no prices, to show the "data unavailable" state.
- One seeded ledger note makes the before → after loop visible on first load. It is tagged as seeded.

Your own notes are stored in your browser's localStorage only. **Settings → Reset demo data** clears them.

## Optional: read-only DhanHQ

```bash
cp .env.example .env.local   # then set DHAN_READ_ONLY_ENABLED=true, DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN
```

The token is used only on the server, for `GET /holdings` and `POST /marketfeed/ltp`. Never commit it and
never give it a `NEXT_PUBLIC_` prefix. A personal access token (valid 24 hours) is for your own account
only; a multi-user product needs Dhan's partner authentication. This adapter is unit-tested with mocked
responses and has been run against one live account **that has no holdings**; mapping real holdings and
last prices is still unverified. Details, limits and official links:
[docs/INTEGRATION.md](docs/INTEGRATION.md).

## Architecture at a glance

```
app/            routes; the layout loads one validated Snapshot per request
components/     one file per screen, plus ui.tsx (primitives, link-type visual language)
lib/domain      type contracts
lib/relevance   links.ts (resolution rules) · score.ts (ranking heuristic) · chain.ts (graph data)
lib/outcomes    returns.ts (close-to-close return math)
lib/ledger      lifecycle.ts · store.ts (notes in localStorage)
lib/providers   contracts.ts · demo.ts · dhan.ts (optional, read-only)
data/           typed illustrative fixtures
```

Linking, scoring and return math are pure functions with unit tests; components never recompute them.
More in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Limitations

- **No real event feed.** Events are fixtures behind an `EventProvider` interface. A real source needs a
  verified API and licence.
- **No order execution**, order CTA, or trading action of any kind.
- **No forecasts.** "Attention priority" is a transparent ranking heuristic, not a probability.
- **No causal attribution.** Returns are simple close-to-close price returns around an event. They exclude
  dividends and do not show that the event caused the move.
- **Sector taxonomy is a small curated list**, not a licensed classification.
- **Post-event prices are simulated** in every mode; historical bars are not read from DhanHQ.
- **No LLM.** The Lens Brief is assembled from structured event fields.
- Exchange holidays are not modelled in demo dates.

## Documents

- [Product thesis](docs/PRODUCT_THESIS.md)
- [Competitor research snapshot](docs/COMPETITOR_RESEARCH.md)
- [Architecture](docs/ARCHITECTURE.md)
- [DhanHQ integration](docs/INTEGRATION.md)
- [Demo script](docs/DEMO_SCRIPT.md)

## Next steps

1. Run the read-only adapter against a real account and confirm the unverified points in the integration notes.
2. Read historical daily bars from DhanHQ so post-event observations can use market data.
3. Integrate one licensed event source behind `EventProvider`, with attribution and caching per its terms.
