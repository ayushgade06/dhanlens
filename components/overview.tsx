"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDateTime, formatINRWhole, formatRelativeDay, formatWeight } from "@/lib/format";
import { portfolioValue, positionValue } from "@/lib/relevance/links";
import { byScore, byTime, isUpcoming, targetLabel } from "@/lib/view-model";
import { useAppData } from "./app-data";
import { EventRow } from "./event-row";
import { BandMark, DemoTag, Empty, LINK_META, LinkTypeTag, PageHeader, Panel, primaryButtonClass, RelationTag, Tag } from "./ui";

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl bg-surface px-4 py-3.5 transition-colors hover:bg-card">
      <p className="text-[28px] font-bold leading-none">{value}</p>
      <p className="label mt-1.5 text-muted group-hover:text-fg">{label}</p>
    </Link>
  );
}

export function Overview() {
  const { snapshot, views, instruments } = useAppData();
  const now = snapshot.generatedAt;
  const demo = snapshot.portfolio.mode === "demo";

  const upcoming = views.filter(isUpcoming).sort(byTime);
  const linked = upcoming.filter((v) => v.portfolioLinks.length > 0);
  const direct = linked.filter((v) => v.hasDirect);
  const toHoldings = linked.filter((v) => v.heldCount > 0);
  const toReview = views.filter((v) => v.lifecycle === "OBSERVED");
  const top = [...linked].sort(byScore)[0];

  const total = portfolioValue(snapshot.positions);
  const upcomingByInstrument = (id: string) => linked.filter((v) => v.portfolioLinks.some((l) => l.instrumentId === id)).length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={
          linked.length > 0 ? (
            <>
              <span className="mark">{linked.length}</span> upcoming {linked.length === 1 ? "event connects" : "events connect"} to your
              portfolio.
            </>
          ) : (
            "No upcoming events connect to your portfolio."
          )
        }
      >
        See what matters to your portfolio — and what actually happened. {direct.length} name an issuer you hold or watch;{" "}
        {linked.length - direct.length} reach you only through a sector or a possible macro channel.
      </PageHeader>

      <div className="rise mb-6 grid grid-cols-3 gap-3" style={{ "--i": 1 } as React.CSSProperties}>
        <Stat value={toHoldings.length} label="Upcoming, linked to holdings" href="/radar" />
        <Stat value={direct.length} label="Direct issuer events" href="/radar" />
        <Stat value={toReview.length} label="Observed, to review" href="/ledger" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-6">
          {top ? (
            <Panel
              title="Look at this first"
              aside={<BandMark band={top.score.band} score={top.score.score} />}
              className="rise"
            >
              <div className="p-4">
                <p className="font-mono text-xs text-muted">
                  {formatDateTime(top.event.startsAt)} · {formatRelativeDay(now, top.event.startsAt)}
                </p>
                <h3 className="mt-1.5 text-xl font-semibold leading-tight">{top.event.title}</h3>
                {top.event.isIllustrative && (
                  <div className="mt-2">
                    <DemoTag>Illustrative scenario</DemoTag>
                  </div>
                )}
                <p className="label mt-5 text-muted">Why it matters to you</p>
                <ul className="mt-2 divide-y divide-rule border-y border-rule">
                  {top.portfolioLinks.map((pl) => {
                    const link = top.links.find((l) => l.id === pl.linkId);
                    const instrument = instruments.get(pl.instrumentId);
                    return (
                      <li key={pl.instrumentId} className="py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-sm font-medium">{instrument?.symbol ?? pl.instrumentId}</span>
                          <RelationTag relation={pl.relation} />
                          <LinkTypeTag type={pl.linkType} long />
                          {pl.exposure?.kind === "MEASURED" && (
                            <span className="font-mono text-xs">
                              {formatINRWhole(pl.exposure.value)} · {formatWeight(pl.exposure.weight)} of portfolio
                            </span>
                          )}
                        </div>
                        {link && (
                          <p className="mt-1 text-sm text-muted">
                            {link.rationale} <span className="text-fg">({targetLabel(link, instruments)})</span>
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  Ranked first because of how closely it is tied to your instruments — not because of any expected price move.
                </p>
                <Link href={`/events/${top.event.id}`} className={`${primaryButtonClass} mt-4`}>
                  Open the Impact Chain <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </Panel>
          ) : (
            <Empty title="Nothing needs attention">No upcoming event has a traceable link to your holdings or watchlist.</Empty>
          )}

          <Panel
            title="Your portfolio"
            aside={demo ? <DemoTag>Illustrative holdings</DemoTag> : <Tag tone="info">Dhan read-only</Tag>}
          >
            {snapshot.positions.length === 0 ? (
              <p className="p-4 text-sm text-muted">No holdings were returned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="label border-b border-rule text-left text-muted">
                      <th scope="col" className="px-3 py-2 sm:px-4 font-normal">Instrument</th>
                      <th scope="col" className="px-1.5 py-2 sm:px-2 text-right font-normal">Value (₹)</th>
                      <th scope="col" className="px-1.5 py-2 sm:px-2 text-right font-normal">Weight</th>
                      <th scope="col" className="px-3 py-2 sm:px-4 text-right font-normal">
                        <span className="sm:hidden">Events</span>
                        <span className="hidden sm:inline">Upcoming events</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.positions.map((p) => {
                      const { value, basis } = positionValue(p);
                      const instrument = instruments.get(p.instrumentId);
                      return (
                        <tr key={p.instrumentId} className="border-b border-rule last:border-b-0">
                          <td className="px-3 py-2 sm:px-4">
                            <span className="block font-semibold">{p.symbol}</span>
                            <span className="block text-xs text-muted">{instrument?.sector ?? "Sector not mapped"}</span>
                          </td>
                          <td className="px-1.5 py-2 sm:px-2 text-right font-mono" title={basis === "COST" ? "Valued at average cost; no last price available" : "Quantity × last price"}>
                            {formatINRWhole(value)}
                            {basis === "COST" && <span className="text-muted"> *</span>}
                          </td>
                          <td className="px-1.5 py-2 sm:px-2 text-right font-mono">{formatWeight(total > 0 ? value / total : 0)}</td>
                          <td className="px-3 py-2 sm:px-4 text-right font-mono">{upcomingByInstrument(p.instrumentId)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="border-t border-rule px-4 py-2 text-xs text-muted">
              {snapshot.watchlist.length} watchlist instruments tracked without monetary exposure.
              {snapshot.positions.some((p) => p.lastPrice === undefined) && " * Valued at average cost (no last price)."}
            </p>
          </Panel>
        </div>

        <Panel
          title="Upcoming events"
          aside={
            <Link href="/radar" className="label underline-offset-4 hover:underline">
              Filter in Event Radar →
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <div className="p-4">
              <Empty title="No upcoming events">The event source returned nothing scheduled.</Empty>
            </div>
          ) : (
            upcoming.map((v, i) => <EventRow key={v.event.id} view={v} now={now} index={i + 2} />)
          )}
          <p className="px-4 py-2 text-xs text-muted">
            {LINK_META.DIRECT.label}, {LINK_META.SECTOR.label.toLowerCase()} and {LINK_META.MACRO.label.toLowerCase()} links are different
            kinds of evidence and are never merged into one score.
          </p>
        </Panel>
      </div>
    </>
  );
}
