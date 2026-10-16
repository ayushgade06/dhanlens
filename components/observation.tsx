"use client";

import { useState } from "react";
import type { EventOutcomeData, MarketEvent, WindowKind } from "@/lib/domain/types";
import { formatDate, formatDateTime, formatINR, formatPercent, formatPoints } from "@/lib/format";
import { aggregate, AGGREGATION_METHOD, observeOutcome } from "@/lib/outcomes/returns";
import { DemoTag, Tag } from "./ui";

/** Green for a rise, red for a fall, in the terminal convention. Describes what happened; implies nothing about what will. */
const signText = (value: number) => (value > 0 ? "text-brand" : value < 0 ? "text-danger" : "");

export const CAUSATION_NOTE = "Observed movement around the event; not proof the event caused the move.";

const WINDOWS: Record<WindowKind, string> = {
  FIRST_CLOSE: "Prior close → first close after release",
  NEXT_CLOSE: "Prior close → following close",
};

function Bar({ value, scale, hollow }: { value: number; scale: number; hollow?: boolean }) {
  const width = `${(Math.abs(value) / scale) * 50}%`;
  return (
    <div className="relative h-3.5 rounded-sm bg-card">
      <div className="absolute inset-y-0 left-1/2 w-px bg-muted" />
      <div
        className={`absolute inset-y-0 ${value >= 0 ? "border-brand" : "border-danger"} ${hollow ? "border-2" : value >= 0 ? "bg-brand" : "bg-danger"}`}
        style={value >= 0 ? { left: "50%", width } : { right: "50%", width }}
      />
    </div>
  );
}

/** Instrument vs benchmark return over one stated close-to-close window. */
export function ObservationPanel({ event, outcome }: { event: MarketEvent; outcome: EventOutcomeData | undefined }) {
  const [window, setWindow] = useState<WindowKind>("FIRST_CLOSE");
  const observations = outcome ? observeOutcome(outcome, event.startsAt, window) : [];

  if (!outcome || outcome.series.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-rule p-4 text-sm">
        <p className="font-medium">No verified post-event price window available.</p>
        <p className="mt-1 text-muted">No price data was supplied for this event, so no return is shown.</p>
      </div>
    );

  const summary = aggregate(observations);
  const simulated = observations.some((o) => o.isSimulated);
  const scale = Math.max(0.5, ...observations.flatMap((o) => [Math.abs(o.absoluteReturn), Math.abs(o.benchmarkReturn ?? 0)]));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex flex-wrap gap-0.5 rounded-xl bg-card p-1">
          <legend className="sr-only">Return window</legend>
          {(Object.keys(WINDOWS) as WindowKind[]).map((w) => (
            <label key={w} className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs has-[:focus-visible]:outline-2 ${window === w ? "bg-brand/15 font-medium text-brand" : "text-muted hover:text-fg"}`}>
              <input type="radio" name="window" className="sr-only" checked={window === w} onChange={() => setWindow(w)} />
              {WINDOWS[w]}
            </label>
          ))}
        </fieldset>
        {simulated && <DemoTag>Simulated prices</DemoTag>}
      </div>

      {observations.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-rule p-4 text-sm">
          No verified post-event price window available for this selection — a closing price is missing on one side of the release.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm sm:min-w-[34rem]">
              <caption className="sr-only">
                Close-to-close price returns around the event. {CAUSATION_NOTE}
              </caption>
              <thead>
                <tr className="label border-b border-rule text-left text-muted">
                  <th scope="col" className="py-2 pr-3 font-normal">Instrument</th>
                  <th scope="col" className="hidden px-3 py-2 font-normal sm:table-cell">Start close</th>
                  <th scope="col" className="hidden px-3 py-2 font-normal sm:table-cell">End close</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Return (%)</th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-normal sm:table-cell">Benchmark (%)</th>
                  <th scope="col" className="py-2 pl-3 text-right font-normal">
                    <abbr title="Instrument return minus benchmark return, in percentage points">Relative (pp)</abbr>
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {observations.map((o) => (
                  <tr key={o.instrumentId} className="border-b border-rule align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">
                      {o.label}
                      {o.limitation && <span className="block max-w-56 font-sans text-xs font-normal text-warn">{o.limitation}</span>}
                    </th>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      {formatINR(o.startPrice)}
                      <span className="block text-xs text-muted">{formatDate(o.startDate)}</span>
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      {formatINR(o.endPrice)}
                      <span className="block text-xs text-muted">{formatDate(o.endDate)}</span>
                    </td>
                    <td className={`px-3 py-2 text-right ${signText(o.absoluteReturn)}`}>{formatPercent(o.absoluteReturn)}</td>
                    <td className={`hidden px-3 py-2 text-right sm:table-cell ${signText(o.benchmarkReturn ?? 0)}`}>{o.benchmarkReturn === null ? "—" : formatPercent(o.benchmarkReturn)}</td>
                    <td className={`whitespace-nowrap py-2 pl-3 text-right font-medium ${signText(o.relativeReturn ?? 0)}`}>{o.relativeReturn === null ? "Not computed" : formatPoints(o.relativeReturn)}</td>
                  </tr>
                ))}
              </tbody>
              {summary && observations.length > 1 && (
                <tfoot className="font-mono text-sm">
                  <tr>
                    <th scope="row" className="py-2 pr-3 text-left font-sans text-xs font-normal text-muted">
                      {AGGREGATION_METHOD}
                    </th>
                    <td colSpan={2} className="hidden sm:table-cell" />
                    <td className={`px-3 py-2 text-right ${signText(summary.absolute)}`}>{formatPercent(summary.absolute)}</td>
                    <td className="hidden sm:table-cell" />
                    <td className={`whitespace-nowrap py-2 pl-3 text-right font-medium ${signText(summary.relative ?? 0)}`}>{summary.relative === null ? "Not computed" : formatPoints(summary.relative)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <figure className="mt-5">
            <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="label">Return over the window, % {simulated && "· simulated"}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-muted" aria-hidden="true" /> Instrument (filled)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="inline-block h-2.5 w-4 rounded-sm border-2 border-muted" aria-hidden="true" /> {outcome.benchmark.label} (outline)
              </span>
            </figcaption>
            <div className="mt-2 space-y-2.5" role="img" aria-label={observations.map((o) => `${o.label} ${formatPercent(o.absoluteReturn)}${o.benchmarkReturn === null ? "" : `, benchmark ${formatPercent(o.benchmarkReturn)}`}`).join("; ")}>
              {observations.map((o) => (
                <div key={o.instrumentId} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-x-3 gap-y-1 font-mono text-xs">
                  <span>{o.label}</span>
                  <Bar value={o.absoluteReturn} scale={scale} />
                  <span className={`text-right ${signText(o.absoluteReturn)}`}>{formatPercent(o.absoluteReturn)}</span>
                  {o.benchmarkReturn !== null && (
                    <>
                      <span className="text-muted">benchmark</span>
                      <Bar value={o.benchmarkReturn} scale={scale} hollow />
                      <span className={`text-right ${signText(o.benchmarkReturn)}`}>{formatPercent(o.benchmarkReturn)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1 text-center font-mono text-xs text-muted">← negative · 0 · positive →</p>
          </figure>
        </>
      )}

      <p className="mt-4 rounded-lg bg-warn/15 px-3 py-2 text-sm font-medium text-warn">{CAUSATION_NOTE}</p>
      <p className="mt-2 font-mono text-xs leading-relaxed text-muted">
        Simple close-to-close price return (dividends excluded); relative return is computed before rounding. Release time {formatDateTime(event.startsAt)}; daily closes at 15:30 IST.
        Benchmark: {outcome.benchmark.label}. Source: {outcome.benchmark.source} · as of {formatDateTime(outcome.benchmark.asOf)}.
      </p>
      {!simulated && <Tag tone="info">Market data</Tag>}
    </div>
  );
}
