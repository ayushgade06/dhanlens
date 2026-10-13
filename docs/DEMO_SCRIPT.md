# Demo script (about 90 seconds)

Start with `npm run dev`, open http://localhost:3000, and use a laptop-width window. If you have used the
app before, run **Settings → Reset demo data** first.

| Time | Do | Say |
| --- | --- | --- |
| 0:00 | **Overview**. Point at the `DEMO DATA` strip and the headline. | "Everything here is an illustrative scenario. Out of the upcoming events, this many have a traceable link to this portfolio — the count is derived, not typed." |
| 0:12 | Point at **Look at this first**. | "It is ranked first because it is a direct issuer event for something held, soon — not because of any predicted move." |
| 0:20 | Click **Open the Impact Chain**. | "Event, evidence, issuer or sector, then my rows. Solid is a direct link, dashed is sector, dotted is a macro hypothesis." |
| 0:30 | Click the **TCS** row, then the **IT services peer read-across** box. | "For a holding I see measured exposure. For each link: the reason, the mapping rule, the source and how confident the *relationship* is." |
| 0:42 | Open **Impact Chains**, pick the **RBI** scenario. | "A macro event never points straight at a stock. It reaches a sector as a possible transmission channel, and the position value is labelled indirect." |
| 0:52 | Back on an upcoming event: **Save to Event Ledger**, type a note, tick a watch item. | "Before the event I record what I want to watch. No forecast." |
| 1:02 | Open **Event Ledger**; the HDFC Bank scenario is selected. | "Before: my note, locked at release. Observed: what was reported, with its source. After: return against the benchmark over a stated close-to-close window, in percent and percentage points." |
| 1:15 | Point at the highlighted line and the `SIMULATED` tag; click the CPI entry. | "It says observed movement, not causation. And where no result or price exists, it says data unavailable instead of inventing one." |
| 1:25 | **Settings**. | "Demo by default. A read-only DhanHQ adapter can load my own holdings server-side; events would come from a separate licensed source. Independent prototype — I'd like your feedback on whether this layer is useful." |

## Questions to expect

- **Is this live?** No. Demo fixtures. The Dhan adapter is unit-tested against mocked responses and has been run against one live account with no holdings; real holdings and last prices are unverified.
- **Where do events come from?** Fixtures behind an `EventProvider` interface. No feed is integrated; licensing is an open requirement.
- **Is the score a prediction?** No. Open "Why ranked here?" — it is a sum of five visible ranking inputs.
- **Does Dhan already do this?** Unknown. This is a hypothesis to test, not a claim about anyone's product.
- **Any trading?** None. No order endpoint is referenced in the code.
