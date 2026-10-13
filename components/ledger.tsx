"use client";

import Link from "next/link";
import { useState } from "react";
import type { LifecycleStatus } from "@/lib/domain/types";
import { formatDateTime, formatRelativeDay } from "@/lib/format";
import { type EventView } from "@/lib/view-model";
import { useAppData } from "./app-data";
import { LedgerNotes, Reflection } from "./ledger-notes";
import { ObservationPanel } from "./observation";
import { buttonClass, DemoTag, Empty, LifecycleTag, lifecycleLabel, PageHeader, primaryButtonClass } from "./ui";

const STATES: LifecycleStatus[] = ["UPCOMING", "OBSERVED", "REVIEWED", "DATA_UNAVAILABLE"];

function Stage({ step, title, hint, children }: { step: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-6 gap-y-2 border-t border-rule py-5 first:border-t-0 md:grid-cols-[9rem_1fr]">
      <div>
        <p className="text-xl font-semibold leading-none text-muted">{step}</p>
        <h3 className="label mt-1.5">{title}</h3>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Entry({ view }: { view: EventView }) {
  const { snapshot, ledger } = useAppData();
  const { event, note, lifecycle } = view;
  const released = event.status === "RELEASED";
  const saveButton = (
    <button type="button" onClick={() => ledger.save(event.id, released ? [] : event.suggestedWatchItems)} className={primaryButtonClass}>
      Add to my ledger
    </button>
  );

  return (
    <article className="rise overflow-hidden rounded-xl bg-surface">
      <header className="border-b border-rule px-5 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <LifecycleTag status={lifecycle} />
          {event.isIllustrative && <DemoTag>Illustrative scenario</DemoTag>}
        </div>
        <h2 className="mt-2 text-xl font-semibold leading-tight">{event.title}</h2>
        <p className="mt-1 font-mono text-xs text-muted">
          {formatDateTime(event.startsAt)} · {formatRelativeDay(snapshot.generatedAt, event.startsAt)} ·{" "}
          <Link href={`/events/${event.id}`} className="text-info underline underline-offset-2">
            Impact Chain and brief
          </Link>
        </p>
      </header>
      <div className="px-5">
        <Stage step={1} title="Before" hint="Your note and what you chose to watch.">
          {note ? <LedgerNotes note={note} released={released} /> : <p className="text-sm text-muted">Nothing was saved before this event.</p>}
        </Stage>
        <Stage step={2} title="Observed" hint="What was actually reported, with its source.">
          {!released ? (
            <p className="text-sm text-muted">Not released yet. Nothing is recorded until a source reports it.</p>
          ) : event.actuals ? (
            <>
              <p className="text-sm font-medium">{event.actuals.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm marker:text-muted">
                {event.actuals.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <p className="mt-2 font-mono text-xs text-muted">
                {event.actuals.source.label} · {event.actuals.source.publisher} · published {formatDateTime(event.actuals.source.publishedAt)}
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-rule p-4 text-sm">
              <p className="font-medium">Result unavailable.</p>
              <p className="mt-1 text-muted">No result was ingested from a verified source, so none is shown. Record what you saw in your own note below.</p>
            </div>
          )}
        </Stage>
        <Stage step={3} title="After" hint="Price movement in a stated window, against a benchmark.">
          {released ? (
            <ObservationPanel event={event} outcome={snapshot.outcomes.find((o) => o.eventId === event.id)} />
          ) : (
            <p className="text-sm text-muted">Available after the first market close following the release.</p>
          )}
        </Stage>
        <Stage step={4} title="Learn" hint="What you want to remember.">
          {!released ? (
            <p className="text-sm text-muted">Write your reflection once the event has happened.</p>
          ) : note ? (
            <Reflection note={note} canReview={lifecycle === "OBSERVED" || lifecycle === "REVIEWED"} />
          ) : (
            saveButton
          )}
        </Stage>
      </div>
    </article>
  );
}

export function EventLedger() {
  const { views, snapshot } = useAppData();
  const [filter, setFilter] = useState<LifecycleStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The ledger holds everything the user saved, plus every past event (saved or not).
  const entries = views
    .filter((v) => v.note || v.event.status === "RELEASED")
    .sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt));
  const shown = entries.filter((v) => filter === "ALL" || v.lifecycle === filter);
  const selected = shown.find((v) => v.event.id === selectedId) ?? shown.find((v) => v.lifecycle === "OBSERVED") ?? shown[0];
  const count = (s: LifecycleStatus) => entries.filter((v) => v.lifecycle === s).length;

  return (
    <>
      <PageHeader eyebrow="Event Ledger" title="Before, observed, after — kept on one page.">
        Save an event before it happens, then come back to what was reported and how prices moved in a stated window. Notes stay in this
        browser only.
      </PageHeader>

      <div className="rise mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by lifecycle state">
        {(["ALL", ...STATES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className={`label rounded-lg px-2.5 py-1.5 ${filter === s ? "bg-brand/15 text-brand" : "bg-card text-muted hover:text-fg"}`}
          >
            {s === "ALL" ? `All · ${entries.length}` : `${lifecycleLabel(s)} · ${count(s)}`}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <Empty title="Your ledger is empty">
          <p>Open an event and choose “Save to Event Ledger” to start a before-and-after record.</p>
          <Link href="/radar" className={`${buttonClass} mt-4`}>
            Browse events
          </Link>
        </Empty>
      ) : shown.length === 0 || !selected ? (
        <Empty title="Nothing in this state">No ledger entries are currently {filter === "ALL" ? "available" : lifecycleLabel(filter as LifecycleStatus).toLowerCase()}.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <ul className="self-start overflow-hidden rounded-xl bg-surface">
            {shown.map((v) => (
              <li key={v.event.id} className="border-b border-rule last:border-b-0">
                <button
                  type="button"
                  aria-current={selected.event.id === v.event.id}
                  onClick={() => setSelectedId(v.event.id)}
                  className={`block w-full px-3.5 py-3 text-left transition-colors ${selected.event.id === v.event.id ? "bg-brand/15" : "hover:bg-card"}`}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <LifecycleTag status={v.lifecycle} />
                    {v.note ? <span className="label text-info">Saved</span> : <span className="label text-muted">Not saved</span>}
                  </span>
                  <span className="mt-1.5 block text-sm font-medium leading-snug">{v.event.title}</span>
                  <span className="mt-1 block font-mono text-xs text-muted">{formatRelativeDay(snapshot.generatedAt, v.event.startsAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <Entry key={selected.event.id} view={selected} />
        </div>
      )}
    </>
  );
}
