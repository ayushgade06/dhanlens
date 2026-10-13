# Architecture

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Zod · Vitest. No database, no auth,
no chart or graph library, no LLM.

## Data flow

```
server                                         browser
──────                                         ───────
lib/providers/index.ts  getSnapshot()          components/app-data.tsx  AppDataProvider
  ├─ demo.ts   events, links, outcomes,          ├─ lib/ledger/store.ts   notes (localStorage, Zod-parsed)
  │            taxonomy, demo portfolio          └─ lib/view-model.ts     buildEventViews()
  └─ dhan.ts   optional live holdings + LTP            ├─ relevance/links.ts   resolveEvent()
       → one validated, serialisable Snapshot ──►      ├─ relevance/score.ts   scoreEvent()
                                                       └─ ledger/lifecycle.ts  lifecycleOf()
```

`app/layout.tsx` loads one `Snapshot` per request inside a `Suspense` boundary and hands it to a client
provider. Every screen reads the same resolved, scored `EventView[]` from `useAppData()`, so no screen
re-implements linking, scoring or return math.

## Modules

| Path | Responsibility |
| --- | --- |
| `lib/domain/types.ts` | Domain contracts: events, links, positions, observations, notes, provider state |
| `lib/relevance/links.ts` | Pure link resolution: curated links → the user's holdings/watchlist, with rule checks and de-duplication |
| `lib/relevance/score.ts` | Pure attention-priority heuristic with inspectable factors |
| `lib/relevance/chain.ts` | Pure graph data (nodes/edges/path highlighting) for the Impact Chain |
| `lib/outcomes/returns.ts` | Pure close-to-close return math and window selection |
| `lib/ledger/lifecycle.ts` | Lifecycle state from evidence (`UPCOMING / OBSERVED / REVIEWED / DATA_UNAVAILABLE`) |
| `lib/ledger/store.ts` | Browser persistence for notes only |
| `lib/providers/contracts.ts` | `PortfolioProvider`, `EventProvider`, `MarketDataProvider`, `InstrumentMetadataProvider` |
| `lib/providers/demo.ts` | Default implementation of all four, from `data/demo-*.ts` |
| `lib/providers/dhan.ts` | Optional read-only DhanHQ `PortfolioProvider` logic, fallback and env parsing |
| `components/*` | One file per screen or shared piece; `ui.tsx` holds primitives and the link-type visual language |

## Rules encoded in code (and tested)

**Linking** (`links.ts`)
- `DIRECT` must target an instrument that exists in instrument metadata; otherwise the link is rejected and shown as not applied.
- `SECTOR` and `MACRO` must target a sector. A macro link aimed at a single instrument is rejected.
- Sector membership comes only from `Instrument.sector`.
- An instrument reached by several links keeps the strongest (`DIRECT > SECTOR > MACRO`); the others are kept as "also via".
- Exposure is `MEASURED` only for a direct link to a held position, `INDIRECT` for sector/macro links, and absent for watchlist rows.

**Attention priority** (`score.ts`) — a ranking heuristic, max 100, never a probability:

| Input | Points |
| --- | --- |
| Strongest link: direct / sector / macro | 40 / 22 / 12 |
| Reaches a holding / watchlist only | 25 / 10 |
| Within 2 / 7 / 30 days (upcoming only) | 15 / 10 / 5 |
| Source-stated importance: high / medium / low | 12 / 6 / 2 |
| Saved to the Event Ledger | 8 |

Bands: High ≥ 70, Medium ≥ 45, Low > 0, otherwise Not linked. Relationship confidence
(verified / curated / hypothesis) is shown per link and is never mixed into the score.

**Returns** (`returns.ts`)
- Simple return `(end − start) / start × 100`, in percent. Relative return is `instrument − benchmark`, in percentage points.
- Window: start = last daily close strictly before the release time; end = first close at/after it
  (or the following close). A 16:30 IST release therefore starts from that day's close.
- The benchmark must have the same start and end dates, or relative return is not computed.
- Invalid prices return `null`. Unadjusted series carry a limitation note. These are price returns, not total returns.
- Multi-instrument summary: equal-weighted arithmetic mean, labelled as such.

## Status model

`PortfolioState.mode` says what the positions *are* (`demo` | `dhan`); `status` says how the read went:
`demo`, `live`, `partial` (holdings without prices), `stale` (last good read after a failure),
`unauthenticated`, `unavailable`. A failed live read with no earlier success switches the visible mode to
demo and shows the reason — demo values are never shown under a live badge.

## Time

Timestamps are ISO-8601 with offsets. Display is `Asia/Kolkata`; each event keeps its source timezone.
Demo fixtures are dated in weekday offsets from "today" (`data/demo-clock.ts`) so the scenario always has
upcoming and past events; exchange holidays are not modelled.

## Design system

Warm paper canvas, navy ink, one lime highlighter for attention/selection, teal for verified/sector, amber
for illustrative/simulated/hypothesis. Link types differ by line pattern (solid / dashed / dotted) as well as
colour; watchlist rows are dashed outlines. Instrument Serif (display), Hanken Grotesk (text), IBM Plex Mono
(data). Motion is limited to a load-in rise and path highlighting, and is disabled under
`prefers-reduced-motion`.

## Deliberate simplifications

- No API routes: server components call the provider directly. Add routes when a second client needs the data.
- No global state library: one context plus `useSyncExternalStore` over localStorage.
- Charts and the graph are plain HTML/SVG; no charting dependency.
- Radar filters are local state, not URL parameters.
- Positions (intraday/F&O) and historical bars from DhanHQ are not read; see `INTEGRATION.md`.
