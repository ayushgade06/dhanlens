"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { formatDateTime, formatRelativeDay } from "@/lib/format";
import { channelNodeId, EVENT_NODE, rowNodeId } from "@/lib/relevance/chain";
import { useAppData } from "./app-data";
import { EVENT_TYPE_LABEL, WhyRanked } from "./event-row";
import { ImpactChain } from "./impact-chain";
import { LedgerNotes } from "./ledger-notes";
import { ObservationPanel } from "./observation";
import { BandMark, buttonClass, DemoTag, Empty, LifecycleTag, LinkTypeTag, Panel, primaryButtonClass, RelationTag, Tag } from "./ui";

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-rule px-4 py-3.5 last:border-b-0">
      <h3 className="label mb-2 text-muted">{title}</h3>
      {children}
    </div>
  );
}

const bullets = (items: string[]) => (
  <ul className="list-disc space-y-1 pl-4 text-sm marker:text-muted">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export function EventDetail({ id }: { id: string }) {
  const { views, snapshot, instruments, ledger } = useAppData();
  const [selectedId, setSelectedId] = useState(EVENT_NODE);
  const view = views.find((v) => v.event.id === id);

  if (!view)
    return (
      <Empty title="Event not found">
        <p>This event is not in the current dataset.</p>
        <Link href="/radar" className={`${buttonClass} mt-4`}>
          Back to Event Radar
        </Link>
      </Empty>
    );

  const { event, note } = view;
  const released = event.status === "RELEASED";
  const select = (nodeId: string) => {
    setSelectedId(nodeId);
    document.getElementById("impact-chain")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <>
      <header className="rise mb-7">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag>{EVENT_TYPE_LABEL[event.type]}</Tag>
          <Tag>Status: {event.status.toLowerCase()}</Tag>
          <LifecycleTag status={view.lifecycle} />
          {event.isIllustrative && <DemoTag>Illustrative scenario — not a real schedule</DemoTag>}
        </div>
        <h1 className="mt-3 max-w-4xl text-[28px] font-bold leading-tight">{event.title}</h1>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <dl className="grid gap-x-8 gap-y-1 font-mono text-xs sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-muted">When</dt>
              <dd>
                {formatDateTime(event.startsAt)} ({formatRelativeDay(snapshot.generatedAt, event.startsAt)})
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">Source</dt>
              <dd>
                {event.sourceUrl ? (
                  <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-info underline">
                    {event.publisher}
                  </a>
                ) : (
                  `${event.publisher} (no document link)`
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">Source timezone</dt>
              <dd>{event.timezone}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">Last updated</dt>
              <dd>{formatDateTime(event.updatedAt)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <BandMark band={view.score.band} score={view.score.score} />
            {note ? (
              <>
                <span className="label inline-flex items-center gap-1.5 text-info">
                  <BookmarkCheck size={14} aria-hidden="true" /> In your Event Ledger
                </span>
                <button type="button" onClick={() => ledger.remove(event.id)} className={buttonClass}>
                  Remove
                </button>
              </>
            ) : (
              <button type="button" onClick={() => ledger.save(event.id, released ? [] : event.suggestedWatchItems)} className={primaryButtonClass}>
                <BookmarkPlus size={15} aria-hidden="true" /> Save to Event Ledger
              </button>
            )}
          </div>
        </div>
        <div className="mt-3">
          <WhyRanked score={view.score} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <Panel title="Lens Brief" aside={<span className="label text-muted">Assembled from event fields · no AI model</span>} className="rise self-start">
          <BriefSection title="What is known">{bullets(event.known)}</BriefSection>
          <BriefSection title="Why it connects to your portfolio">
            {view.portfolioLinks.length === 0 ? (
              <p className="text-sm text-muted">No traceable link to your holdings or watchlist.</p>
            ) : (
              <ul className="space-y-2">
                {view.portfolioLinks.map((pl) => {
                  const link = view.links.find((l) => l.id === pl.linkId);
                  return (
                    <li key={pl.instrumentId} className="text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" onClick={() => select(rowNodeId(pl.instrumentId))} className="font-mono font-medium underline underline-offset-2">
                          {instruments.get(pl.instrumentId)?.symbol ?? pl.instrumentId}
                        </button>
                        <RelationTag relation={pl.relation} />
                        <LinkTypeTag type={pl.linkType} />
                      </div>
                      {link && (
                        <button type="button" onClick={() => select(channelNodeId(link.id))} className="mt-0.5 text-left text-muted hover:text-fg hover:underline">
                          {link.rationale}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </BriefSection>
          <BriefSection title="What to watch">
            {bullets(event.suggestedWatchItems)}
            <p className="mt-2 text-xs text-muted">Neutral observations, not trade advice. Save the event to make this list your own.</p>
          </BriefSection>
          <BriefSection title="What remains uncertain">{bullets(event.uncertain)}</BriefSection>
          {released && (
            <BriefSection title="What was reported">
              {event.actuals ? (
                <>
                  {bullets(event.actuals.facts)}
                  <p className="mt-2 font-mono text-xs text-muted">
                    {event.actuals.source.label} · {event.actuals.source.publisher} · {formatDateTime(event.actuals.source.publishedAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">No result has been ingested from a verified source.</p>
              )}
            </BriefSection>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Impact Chain"
            aside={<span className="label text-muted">Select any box to inspect that step</span>}
            className="rise"
          >
            <div id="impact-chain" className="scroll-mt-4 p-4">
              <ImpactChain view={view} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </Panel>

          <Panel
            title="Your Event Ledger entry"
            aside={
              <Link href="/ledger" className="label underline-offset-4 hover:underline">
                Open the ledger →
              </Link>
            }
          >
            <div className="p-4">
              {note ? (
                <LedgerNotes note={note} released={released} />
              ) : (
                <p className="text-sm text-muted">
                  {released
                    ? "This event was not saved before it happened, so there is no pre-event note. Save it to add a reflection in the ledger."
                    : "Save this event to write a pre-event note and keep a list of what you want to watch."}
                </p>
              )}
            </div>
          </Panel>

          {released && (
            <Panel title="Observed after the event">
              <div className="p-4">
                <ObservationPanel event={event} outcome={snapshot.outcomes.find((o) => o.eventId === event.id)} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
