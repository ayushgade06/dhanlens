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
          <ul className="rise self-start overflow-hidden rounded-xl bg-surface" aria-label="Events">
            {ranked.map((v) => (
              <li key={v.event.id} className="border-b border-rule last:border-b-0">
                <button
                  type="button"
                  aria-current={v.event.id === view.event.id}
                  onClick={() => setSelection({ eventId: v.event.id, nodeId: EVENT_NODE })}
                  className={`block w-full px-3.5 py-3 text-left transition-colors ${v.event.id === view.event.id ? "bg-brand/15" : "hover:bg-card"}`}
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
