# DhanLens — Product thesis

**Portfolio-aware market event intelligence.**
"See what matters to your portfolio — and what actually happened."

> Independent prototype for the DhanHQ ecosystem. Not affiliated with or endorsed by Dhan.

## Problem

A calendar says what is happening. A news feed says what was reported. A broker says what you own.
The investor still does the joining work by hand:

- Does this event relate to something I hold or track?
- Is the link direct, sector-level, or only a broad macro sensitivity?
- What evidence supports the link, and how much of my "exposure" is measured versus inferred?
- After the event: what was announced, and how did the instrument move against a benchmark?

## Target user

- **Primary:** an Indian retail investor or active trader with a small-to-medium portfolio and a watchlist,
  overloaded by events and news, who values explanation and evidence over more data.
- **Secondary (for this demo):** a Dhan engineer or PM judging correctness, API awareness and whether the
  idea could sit responsibly on top of DhanHQ.

## Two differentiators

### 1. The Impact Chain

`EVENT → EVIDENCE / TRANSMISSION CHANNEL → ISSUER OR SECTOR → YOUR HOLDINGS / WATCHLIST`

Every link is typed and inspectable, never flattened into one "impact score":

| Type | Meaning | Requires |
| --- | --- | --- |
| DIRECT | The event is about this issuer | A verified issuer/instrument mapping |
| SECTOR | The event maps to a sector containing your instrument | Explicit sector taxonomy in instrument metadata |
| MACRO | A *possible* transmission channel | A curated, labelled hypothesis — may only target a sector |
| WATCHLIST | The instrument is tracked, not owned | — (no monetary exposure shown) |

Monetary exposure is shown as *measured* only for direct links to held positions. Indirect links show the
position value labelled as indirect; watchlist rows show none.

### 2. The Event Ledger

`BEFORE → OBSERVED → AFTER → LEARN`

1. **Before** — save the event, write a pre-event note, pick what to watch. No price forecast.
2. **Observed** — the reported facts with source and timestamp, or "unavailable". Never fabricated.
3. **After** — instrument vs benchmark return over a stated close-to-close window, in % and percentage points.
4. **Learn** — a reflection note, so the event becomes an auditable personal reference.

Observed movement is always described as occurring *around* the event — not proof the event caused it.

## Product hypothesis

Users would benefit from a source-backed portfolio context layer that connects existing news and events to
their own holdings and carries each event into a measured review.

This is a hypothesis to test with Dhan's team. We do **not** claim Dhan or any competitor lacks this, nor that
it is on anyone's roadmap; public pages cannot establish that.

## Non-goals (V1)

- Order placement, modification or cancellation; autonomous trading.
- Buy/sell calls, price targets, directional forecasts, personalised advice.
- A generic chatbot over broker endpoints (Dhan ships an MCP server and agent skills).
- A news crawler, scraping, or an unlicensed event feed.
- Multi-user login on top of one developer's access token.
- ML impact prediction, backtesting, multi-broker support, native mobile.

## V1 boundaries

- Works fully with no credentials on clearly labelled illustrative fixtures.
- Events are fixtures behind an `EventProvider` interface; no real event feed is integrated.
- Optional read-only DhanHQ holdings/LTP for one developer's own account, server-side only.
- Relevance score is a transparent ranking heuristic — not a probability, not a prediction.
- No LLM. The "Lens Brief" is assembled from structured event fields.
