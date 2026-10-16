"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { EVENT_NODE } from "@/lib/relevance/chain";
import { byScore } from "@/lib/view-model";
import { useAppData } from "./app-data";
import { linkTypesOf, reachSummary } from "./event-row";
import { ImpactChain } from "./impact-chain";
import { BandMark, buttonClass, DemoTag, Empty, LinkTypeTag, PageHeader, Panel } from "./ui";

export function ImpactChains() {
  const { views } = useAppData();
  const ranked = views.filter((v) => v.links.length > 0).sort(byScore);
  const [selection, setSelection] = useState<{ eventId: string; nodeId: string } | null>(null);
  const view = ranked.find((v) => v.event.id === selection?.eventId) ?? ranked[0];

  return (
    <>
      <PageHeader eyebrow="Impact Chains" title="Trace an event to what you own.">
        Event → evidence or transmission channel → issuer or sector → your holdings and watchlist. Every step names its reason, mapping
        logic and source. A macro channel is a hypothesis, never a confirmed effect.
      </PageHeader>

      {!view ? (
        <Empty title="No chains to show">No event in the dataset has a curated link.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          {/* Below xl: a swipeable strip, so the chain itself is on the first screen. From xl: a sidebar list. */}
          <ul
            className="rise -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 xl:block xl:self-start xl:overflow-hidden xl:rounded-xl xl:bg-surface xl:p-0"
            aria-label="Events"
          >
            {ranked.map((v) => (
              <li key={v.event.id} className="w-64 shrink-0 snap-start overflow-hidden rounded-xl bg-surface xl:w-auto xl:rounded-none xl:border-b xl:border-rule xl:last:border-b-0">
                <button
                  type="button"
                  aria-current={v.event.id === view.event.id}
                  onClick={() => setSelection({ eventId: v.event.id, nodeId: EVENT_NODE })}
                  className={`block h-full w-full px-3.5 py-3 text-left transition-colors ${v.event.id === view.event.id ? "bg-brand/15" : "hover:bg-card"}`}
                >
                  <span className="block text-sm font-medium leading-snug">{v.event.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {linkTypesOf(v).map((t) => (
                      <LinkTypeTag key={t} type={t} />
                    ))}
                    <BandMark band={v.score.band} score={v.score.score} />
                  </span>
                  <span className="mt-1 block text-xs text-muted">{reachSummary(v)}</span>
                </button>
              </li>
            ))}
          </ul>

          <Panel
            title={view.event.title}
            aside={
              <span className="flex flex-wrap items-center gap-2">
                {view.event.isIllustrative && <DemoTag />}
                <span className="font-mono text-xs text-muted">{formatDateTime(view.event.startsAt)}</span>
              </span>
            }
            className="rise"
          >
            <div className="p-4">
              <ImpactChain
                key={view.event.id}
                view={view}
                selectedId={selection?.eventId === view.event.id ? selection.nodeId : EVENT_NODE}
                onSelect={(nodeId) => setSelection({ eventId: view.event.id, nodeId })}
              />
              <Link href={`/events/${view.event.id}`} className={`${buttonClass} mt-5`}>
                Open the brief and ledger entry
              </Link>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
