# DhanHQ integration (optional, read-only)

DhanLens runs fully without credentials. This mode exists so a developer can view **their own** holdings
through the same Impact Chain logic.

> **Status: implemented, unit-tested against mocked HTTP responses, and run once (13 Oct 2026) against a
> live Dhan account that has no holdings.** That confirmed authentication and the empty-account path only.
> Mapping real holdings and reading last prices have not been exercised live. The fallback path
> (unreachable API → demo mode with a visible reason, no token in the page) was verified in a running
> production build.

## What it calls

| Purpose | Request | Docs |
| --- | --- | --- |
| Holdings | `GET {base}/holdings` | https://dhanhq.co/docs/v2/portfolio/ |
| Last traded price | `POST {base}/marketfeed/ltp` with `{ "NSE_EQ": [ids], "BSE_EQ": [ids] }` | https://dhanhq.co/docs/v2/market-quote/ |

Headers on both: `access-token`, `client-id`. Nothing else is called. There is no order, funds, trade or
position endpoint anywhere in the codebase, and a test asserts the adapter only requests these two paths.

## Setup

```bash
cp .env.example .env.local
```

```
DHAN_READ_ONLY_ENABLED=true
DHAN_CLIENT_ID=<your client id>
DHAN_ACCESS_TOKEN=<access token from web.dhan.co>
```

Restart the server and open **Settings**. The mode badge reads `DHAN READ-ONLY` only after a successful read.

## Security

- Credentials are read from server-side environment variables in `lib/providers/index.ts`, which imports
  `server-only`. They are never given a `NEXT_PUBLIC_` prefix, sent to the browser, written to storage, or logged.
- Error messages are fixed strings; nothing from the request or the raw response body is echoed.
- `DHAN_API_BASE_URL` must be `https`, because the token is sent to that host.
- `.env*` is git-ignored (except `.env.example`, which holds placeholders only).
- The last successful read is cached in server memory for 30 seconds and never persisted.

## Behaviour and limits

- **Token lifetime.** Individual access tokens are valid for 24 hours. An expired or rejected token shows
  `unauthenticated` and the app falls back to demo data, saying so.
- **Rate limits.** The quote API allows 1 request/second. Reads are cached for 30 seconds; 4xx and rate-limit
  responses are never retried; network errors and 5xx are retried once after a short delay; requests time out after 8 seconds.
- **Entitlement.** Last prices need a Data API subscription on your account. Without it the status is
  `partial` and positions are valued at average cost. Validate your own plan and pricing with Dhan.
- **Sectors.** Dhan holdings carry no sector. A holding links to sector/macro events only if its trading
  symbol is in the curated demo taxonomy (`data/demo-instruments.ts`); others show "Sector not mapped".
- **Events.** Dhan is not assumed to provide an event calendar. Events stay illustrative fixtures in every mode.
- **Watchlist.** Not read from Dhan; the demo watchlist remains, minus anything you hold.

## Not verified against a live account

- Which LTP segment to use when a holding reports `exchange: "ALL"` (the adapter uses `NSE_EQ` unless the
  holding is `BSE`). A miss degrades to cost basis rather than a wrong price.
- The holdings payload for an account that does hold something, and the whole last-price request.
- Error bodies beyond the one observed. An account with no holdings answers `HTTP 500` with
  `{ errorType, errorCode: "DH-1111", errorMessage }`; the adapter reads that as an empty portfolio.

## Individual vs partner authentication

A personal access token identifies one Dhan user: the developer running the server. It is **not** a login
for other people. Offering DhanLens to other users would require Dhan's partner authentication (a
consent-based flow with Dhan-issued partner credentials) and Dhan's approval. This prototype does not
implement or imitate that flow, and has no "Connect Dhan" button.

## Not implemented

- Positions (`GET /positions`), historical bars, WebSocket feeds — so post-event observations use simulated
  fixtures even in Dhan mode, and are labelled as such.
- Any real event provider. `EventProvider` in `lib/providers/contracts.ts` is the seam; a licensed source
  must be verified for API shape, terms, attribution and caching before it is wired in.
- The official `dhan-oss/dhanhq-skills` agent skill was not installed for this build; contracts were taken
  from the official documentation linked above.
