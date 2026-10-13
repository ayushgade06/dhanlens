# Competitor research snapshot

**Snapshot date:** 13 October 2026. Product surfaces change quickly — re-check the sources before relying on
any line here.

**Provenance.** The Dhan, Zerodha and Groww feature facts below come from the project brief's research
snapshot of the linked public pages. During the build, only the DhanHQ developer documentation
(authentication, portfolio, market quote) and the `dhan-oss/dhanhq-skills` README were re-read directly.
Nothing here says anything about any company's private roadmap.

## Reported public features

### Dhan

| Feature | Date reported | Overlap with DhanLens |
| --- | --- | --- |
| Real-time news on ScanX (stocks, markets, earnings, corporate actions, deals, IPO) | 30 Jun 2026 | News/event *supply*. DhanLens does not build a feed. |
| Journal by Dhan (portfolio, trades, financial reporting) | 18 Jun 2026 | Trade journal. The Event Ledger's entity is the *event*, not the trade. |
| Trade Plan (risk/reward plan before a trade) | 19 May 2026 | Pre-trade planning. DhanLens has no trade actions. |
| Technical alerts, corporate-action tracking, Smart Portfolio Insights, external MF tracking | various | Portfolio insight; possible overlap with event-to-holding linking is **unknown**. |
| DhanHQ: REST, market-data WebSockets, portfolio/order APIs, MCP server, agent skill pack | current | Makes a "chat to the trading API" wrapper a weak idea. |

### Zerodha

| Feature | Date reported | Overlap |
| --- | --- | --- |
| Economic calendar with event alerts (data: IndiaDataHub) | 5 Aug 2026 | A generic calendar is not a differentiator. |
| Portfolio-concentration Nudge | 17 Jul 2026 | Generic portfolio warning. |
| Nudge v2 ("coming soon": hard limits, configurability) | 23 Sep 2026 | Same. |

### Groww

| Feature | Overlap |
| --- | --- |
| Portfolio / trade P&L reporting, post-trade analysis with period views and charge breakdowns | Post-trade journal. The Event Ledger must not be "another journal". |

## Implication for DhanLens

Do not rebuild a calendar, a news reader, a journal or a trade planner. Sit above them:
*why does this event matter to my holdings, what evidence links them, and what actually happened afterward?*

## Verified during the build (DhanHQ docs, read 13 Oct 2026)

- `GET /v2/holdings` returns `exchange, tradingSymbol, securityId, isin, totalQty, dpQty, t1Qty, availableQty,
  collateralQty, avgCostPrice`. **No last price and no sector.**
- `POST /v2/marketfeed/ltp` takes `{ "<SEGMENT>": [securityId, …] }`, headers `access-token` + `client-id`,
  up to 1000 instruments, 1 request/second.
- `GET /v2/profile` validates a token (`tokenValidity`, `dataPlan`, `dataValidity`).
- Individual access tokens are valid for 24 hours. Partner authentication is a separate consent-based flow.
- Static IP whitelisting applies to order placement APIs, not data retrieval.
- Official skill pack: `npx skills add dhan-oss/dhanhq-skills --skill dhanhq`.

## Unknowns and assumptions

- Whether Dhan (or anyone) already links events to a user's holdings internally — **unknown**.
- Whether DhanHQ exposes an economic calendar or earnings schedule — **not assumed**; events stay behind a
  separate provider.
- Data API entitlement and pricing per account — the user must validate their own plan.
- Licensing terms for any real event feed — a real requirement, not solved here.

## Sources

- Dhan feature updates: https://dhan.co/blog/feature-updates/
- Dhan investing features: https://dhan.co/investing-features/
- Dhan ScanX real-time news: https://dhan.co/blog/feature-updates/introducing-news-on-scanx/
- Dhan Trade Plan: https://dhan.co/blog/feature-updates/minimize-losses-manage-risk-rewards-with-trade-plan/
- DhanHQ developer docs: https://docs.dhanhq.co/
- DhanHQ authentication: https://dhanhq.co/docs/v2/authentication/
- DhanHQ portfolio: https://dhanhq.co/docs/v2/portfolio/
- DhanHQ market quote: https://dhanhq.co/docs/v2/market-quote/
- DhanHQ live market feed: https://dhanhq.co/docs/v2/live-market-feed/
- DhanHQ option chain: https://dhanhq.co/docs/v2/option-chain/
- DhanHQ agent skills: https://github.com/dhan-oss/dhanhq-skills
- Zerodha Kite features: https://zerodha.com/products/kite/
- Zerodha Z-Connect updates: https://zerodha.com/z-connect/updates
- Groww post-trade analysis: https://groww.in/blog/post-trade-analysis-on-groww
- Anthropic frontend-design skill: https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design
