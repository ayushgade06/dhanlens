"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { EventType } from "@/lib/domain/types";
import type { Band } from "@/lib/relevance/score";
import { daysBetween } from "@/lib/time";
import { byScore, byTime, type EventView } from "@/lib/view-model";
import { useAppData } from "./app-data";
import { EVENT_TYPE_LABEL, EventRow, WhyRanked } from "./event-row";
import { buttonClass, Empty, fieldClass, PageHeader, Panel } from "./ui";

const IMPORTANCE = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const DEFAULTS = {
  query: "",
  window: "upcoming",
  type: "any",
  link: "any",
  relation: "any",
  band: "any",
  sort: "relevance",
};
type Filters = typeof DEFAULTS;

const WINDOWS: Record<string, { label: string; test: (days: number) => boolean }> = {
  "7d": { label: "Next 7 days", test: (d) => d >= 0 && d <= 7 },
  "30d": { label: "Next 30 days", test: (d) => d >= 0 && d <= 30 },
  upcoming: { label: "All upcoming", test: (d) => d >= 0 },
  past: { label: "Past", test: (d) => d < 0 },
  all: { label: "All dates", test: () => true },
};

const SORTS: Record<string, { label: string; compare: (a: EventView, b: EventView) => number }> = {
  relevance: { label: "Attention priority", compare: byScore },
  time: { label: "Event time", compare: byTime },
  importance: {
    label: "Source importance",
    compare: (a, b) => IMPORTANCE[b.event.importance] - IMPORTANCE[a.event.importance] || byTime(a, b),
  },
};

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [value: string, label: string][];
}) {
  return (
    <label className="block">
      <span className="label text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} mt-1`}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EventRadar() {
  const { snapshot, views, instruments } = useAppData();
  const [f, setF] = useState<Filters>(DEFAULTS);
  const set = (key: keyof Filters) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const now = snapshot.generatedAt;
  const q = f.query.trim().toLowerCase();

  const results = views
    .filter((v) => WINDOWS[f.window].test(daysBetween(now, v.event.startsAt)))
    .filter((v) => f.type === "any" || v.event.type === f.type)
    .filter((v) =>
      f.link === "any"
        ? true
        : f.link === "none"
          ? v.portfolioLinks.length === 0
          : v.portfolioLinks.some((l) => l.linkType === f.link),
    )
    .filter((v) => f.relation === "any" || v.portfolioLinks.some((l) => l.relation === f.relation))
    .filter((v) => f.band === "any" || v.score.band === (f.band as Band))
    .filter((v) => {
      if (!q) return true;
      const issuers = v.portfolioLinks.flatMap((l) => {
        const i = instruments.get(l.instrumentId);
        return i ? [i.symbol, i.displayName, i.sector] : [l.instrumentId];
      });
      const targets = v.links.map((l) => (l.target.kind === "sector" ? l.target.sector : l.target.instrumentId));
      return [v.event.title, v.event.description, ...issuers, ...targets].some((s) => s.toLowerCase().includes(q));
    })
    .sort(SORTS[f.sort].compare);

  return (
    <>
      <PageHeader eyebrow="Event Radar" title="Every event, ranked by its tie to you.">
        Attention priority is a transparent ranking heuristic built from the link type, whether you hold the instrument, how soon the
        event is, and the source&rsquo;s stated importance. It is not a probability and says nothing about price direction.
      </PageHeader>

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="rise mb-5 grid grid-cols-2 gap-3 rounded-xl bg-surface p-4 lg:grid-cols-4"
      >
        <label className="col-span-2 block">
          <span className="label text-muted">Search events and issuers</span>
          <span className="relative mt-1 block">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={f.query}
              onChange={(e) => set("query")(e.target.value)}
              placeholder="e.g. TCS, banks, policy"
              className={`${fieldClass} pl-9`}
            />
          </span>
        </label>
        <Select label="Date window" value={f.window} onChange={set("window")} options={Object.entries(WINDOWS).map(([k, w]) => [k, w.label])} />
        <Select label="Sort by" value={f.sort} onChange={set("sort")} options={Object.entries(SORTS).map(([k, s]) => [k, s.label])} />
        <Select
          label="Event type"
          value={f.type}
          onChange={set("type")}
          options={[["any", "Any type"], ...(Object.entries(EVENT_TYPE_LABEL) as [EventType, string][])]}
        />
        <Select
          label="Link to you"
          value={f.link}
          onChange={set("link")}
          options={[
            ["any", "Any link"],
            ["DIRECT", "Direct issuer"],
            ["SECTOR", "Sector"],
            ["MACRO", "Macro (hypothesis)"],
            ["none", "Not linked"],
          ]}
        />
        <Select
          label="Reaches"
          value={f.relation}
          onChange={set("relation")}
          options={[
            ["any", "Holdings or watchlist"],
            ["HELD", "Holdings"],
            ["WATCHLIST", "Watchlist"],
          ]}
        />
        <Select
          label="Attention priority"
          value={f.band}
          onChange={set("band")}
          options={[
            ["any", "Any band"],
            ["HIGH", "High"],
            ["MEDIUM", "Medium"],
            ["LOW", "Low"],
            ["NOT_LINKED", "Not linked"],
          ]}
        />
      </form>

      <Panel
        title={
          <span aria-live="polite">
            {results.length} of {views.length} events
          </span>
        }
        aside={<span className="label text-muted">Sorted by {SORTS[f.sort].label.toLowerCase()}</span>}
      >
        {results.length === 0 ? (
          <div className="p-4">
            <Empty title="No events match these filters">
              <p>Try a wider date window or a different link type.</p>
              <button type="button" onClick={() => setF(DEFAULTS)} className={`${buttonClass} mt-4`}>
                Clear filters
              </button>
            </Empty>
          </div>
        ) : (
          results.map((v, i) => (
            <div key={v.event.id}>
              <EventRow view={v} now={now} index={i} />
              <div className="border-b border-rule bg-canvas/60 px-4 py-2 empty:hidden">
                <WhyRanked score={v.score} />
              </div>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}
