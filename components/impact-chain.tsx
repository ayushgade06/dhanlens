"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, CornerUpLeft } from "lucide-react";
import type { EventLink } from "@/lib/domain/types";
import { formatDateTime, formatINR, formatINRWhole, formatWeight } from "@/lib/format";
import { buildChain, EVENT_NODE, isNodeActive, linksThrough, type Chain, type ChainNode } from "@/lib/relevance/chain";
import { isUpcoming, type EventView } from "@/lib/view-model";
import { useAppData } from "./app-data";
import { buttonClass, CONFIDENCE_LABEL, DemoTag, LINK_META, LINK_STROKE, LinkTypeTag, Panel, RelationTag, Tag } from "./ui";

const NODE_H = 76;
const GAP = 14;
const COL_W = 21; // percent
const COL_GAP = (100 - COL_W * 4) / 3;
const ROW_LIMIT = 4;
const COLUMNS = ["Event", "Evidence / channel", "Issuer or sector", "Your portfolio"];
const BORDER_STYLE = { DIRECT: "border-solid", SECTOR: "border-dashed", MACRO: "border-dotted" };

function NodeBody({ node, view }: { node: ChainNode; view: EventView }) {
  const { instruments } = useAppData();
  switch (node.kind) {
    case "event":
      return (
        <>
          <span className="label opacity-70">Event</span>
          <span className="line-clamp-2 text-sm font-medium leading-tight">{view.event.title.replace(/^Illustrative scenario: /, "")}</span>
        </>
      );
    case "channel":
      return (
        <>
          <span className="label" style={{ color: LINK_STROKE[node.link.linkType] }}>
            {LINK_META[node.link.linkType].label} · {node.link.linkType === "MACRO" ? "hypothesis" : "evidence"}
          </span>
          <span className="line-clamp-2 text-sm leading-tight">{node.link.channel}</span>
        </>
      );
    case "target":
      return (
        <>
          <span className="label text-muted">{node.isSector ? "Sector" : "Issuer"}</span>
          <span className="line-clamp-2 text-sm font-medium leading-tight">{node.label}</span>
        </>
      );
    case "row": {
      const pl = node.portfolioLink;
      return (
        <>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-medium">{instruments.get(pl.instrumentId)?.symbol ?? pl.instrumentId}</span>
            <span className="label text-muted">{pl.relation === "HELD" ? "Held" : "Watchlist"}</span>
          </span>
          <span className="font-mono text-xs text-muted">
            {pl.exposure
              ? `${formatINRWhole(pl.exposure.value)} · ${pl.exposure.kind === "MEASURED" ? "measured" : "indirect"}`
              : "No monetary exposure"}
          </span>
        </>
      );
    }
    case "none":
      return <span className="text-xs text-muted">Nothing you hold or watch in this sector</span>;
  }
}

function nodeClass(node: ChainNode, selected: boolean, active: boolean) {
  const base = "flex w-full flex-col justify-center gap-1 rounded-lg px-2.5 text-left transition-[opacity,background-color] duration-200";
  const tone =
    node.kind === "event"
      ? "bg-fg text-canvas"
      : node.kind === "channel"
        ? `border-2 bg-card ${BORDER_STYLE[node.link.linkType]}`
        : node.kind === "row" && node.portfolioLink.relation === "WATCHLIST"
          ? "border border-dashed border-muted bg-transparent"
          : node.kind === "none"
            ? "border border-dashed border-rule"
            : "bg-card";
  const state = selected ? "!border-brand !bg-brand !text-canvas [&_*]:!text-canvas" : active ? "" : "opacity-30";
  return `${base} ${tone} ${state}`;
}

interface ChainProps {
  view: EventView;
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Interactive relationship map. Wide screens get a four-column graph; narrow screens get stacked paths. */
export function ImpactChain({ view, selectedId, onSelect }: ChainProps) {
  const { instruments } = useAppData();
  const [expanded, setExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Edges are drawn in real pixels, so the graph's width has to be measured.
  const graphRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const full = useMemo(() => buildChain(view, instruments), [view, instruments]);

  const allRows = full.nodes.filter((n) => n.col === 3);
  const hiddenIds = new Set(expanded ? [] : allRows.slice(ROW_LIMIT).filter((n) => n.id !== selectedId).map((n) => n.id));
  const chain: Chain = {
    nodes: full.nodes.filter((n) => !hiddenIds.has(n.id)),
    edges: full.edges.filter((e) => !hiddenIds.has(e.to)),
  };

  const focusId = hoveredId ?? selectedId;
  const through = linksThrough(chain, focusId);
  const active = (n: ChainNode) => isNodeActive(n, focusId, through);
  const activeIds = new Set(chain.nodes.filter(active).map((n) => n.id));

  const columns = [0, 1, 2, 3].map((col) => chain.nodes.filter((n) => n.col === col));
  const height = Math.max(...columns.map((c) => c.length)) * (NODE_H + GAP) - GAP;
  const pos = new Map<string, { x: number; y: number }>();
  columns.forEach((nodes, col) => {
    const offset = (height - (nodes.length * (NODE_H + GAP) - GAP)) / 2;
    nodes.forEach((n, i) => pos.set(n.id, { x: col * (COL_W + COL_GAP), y: offset + i * (NODE_H + GAP) }));
  });

  const button = (node: ChainNode, style?: React.CSSProperties) =>
    node.kind === "none" ? (
      <div key={node.id} style={{ height: NODE_H, ...style }} className={nodeClass(node, false, activeIds.has(node.id))}>
        <NodeBody node={node} view={view} />
      </div>
    ) : (
      <button
        key={node.id}
        type="button"
        aria-pressed={selectedId === node.id}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId(null)}
        onFocus={() => setHoveredId(node.id)}
        onBlur={() => setHoveredId(null)}
        style={{ height: NODE_H, ...style }}
        className={nodeClass(node, selectedId === node.id, activeIds.has(node.id))}
      >
        <NodeBody node={node} view={view} />
      </button>
    );

  const nodeById = new Map(chain.nodes.map((n) => [n.id, n]));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="label text-muted">Link types</span>
        <LinkTypeTag type="DIRECT" long />
        <LinkTypeTag type="SECTOR" long />
        <LinkTypeTag type="MACRO" long />
        <Tag title="Tracked, not owned">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-muted" aria-hidden="true" /> Watchlist
        </Tag>
      </div>

      {/* Wide: graph */}
      <div className="hidden md:block" role="group" aria-label={`Impact chain for ${view.event.title}`}>
        <div className="mb-2 grid" style={{ gridTemplateColumns: `repeat(4, ${COL_W}%)`, columnGap: `${COL_GAP}%` }}>
          {COLUMNS.map((c) => (
            <span key={c} className="label text-muted">
              {c}
            </span>
          ))}
        </div>
        <div ref={graphRef} className="relative" style={{ height }}>
          <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
            {chain.edges.map((e) => {
              const a = pos.get(e.from);
              const b = pos.get(e.to);
              if (!a || !b) return null;
              const x1 = ((a.x + COL_W) / 100) * width;
              const x2 = (b.x / 100) * width;
              const y1 = a.y + NODE_H / 2;
              const y2 = b.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              const on = through.has(e.linkId) && activeIds.has(e.from) && activeIds.has(e.to);
              return (
                <path
                  key={e.id}
                  d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={LINK_STROKE[e.linkType]}
                  strokeWidth={on ? 2.25 : 1.25}
                  strokeDasharray={LINK_META[e.linkType].dash}
                  strokeLinecap="round"
                  opacity={on ? 1 : 0.18}
                  style={{ transition: "opacity 200ms" }}
                />
              );
            })}
          </svg>
          {chain.nodes.map((n) => {
            const p = pos.get(n.id)!;
            return button(n, { position: "absolute", left: `${p.x}%`, top: p.y, width: `${COL_W}%` });
          })}
        </div>
      </div>

      {/* Narrow: one vertical path per link */}
      <div className="space-y-5 md:hidden">
        {button(nodeById.get(EVENT_NODE)!)}
        {chain.nodes.flatMap((channel) => {
          if (channel.kind !== "channel") return [];
          const target = chain.nodes.find((n) => n.kind === "target" && n.linkIds.includes(channel.link.id));
          const ends = chain.nodes.filter((n) => n.col === 3 && n.linkIds.includes(channel.link.id));
          return (
            <div key={channel.id} className="space-y-1.5 border-l-2 pl-3" style={{ borderColor: LINK_STROKE[channel.link.linkType] }}>
              <p className="label text-muted">Path · {LINK_META[channel.link.linkType].long}</p>
              {button(channel)}
              <ArrowDown size={14} aria-hidden="true" className="mx-auto text-muted" />
              {target && button(target)}
              <ArrowDown size={14} aria-hidden="true" className="mx-auto text-muted" />
              <div className="space-y-1.5">{ends.map((n) => button(n))}</div>
            </div>
          );
        })}
      </div>

      {allRows.length > ROW_LIMIT && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className={`${buttonClass} mt-4`} aria-expanded={expanded}>
          {expanded ? `Show the ${ROW_LIMIT} most relevant` : `Show all ${allRows.length} linked instruments`}
        </button>
      )}

      <ChainInspector view={view} node={nodeById.get(selectedId) ?? nodeById.get(EVENT_NODE)!} onSelect={onSelect} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-rule py-2 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <dt className="label pt-0.5 text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function LinkFields({ link }: { link: EventLink }) {
  return (
    <>
      <Field label="Link type">
        <LinkTypeTag type={link.linkType} long />
        <p className="mt-1 text-muted">{LINK_META[link.linkType].help}</p>
      </Field>
      <Field label="Reason">{link.rationale}</Field>
      <Field label="Mapping logic">{link.rule}</Field>
      <Field label="Relationship confidence">
        {CONFIDENCE_LABEL[link.confidence]}
        <span className="text-muted"> — confidence in the link, not in any price outcome.</span>
      </Field>
      <Field label="Evidence">
        <ul className="space-y-1.5">
          {link.evidence.map((e) => (
            <li key={e.id}>
              {e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer" className="text-info underline underline-offset-2">
                  {e.label}
                </a>
              ) : (
                e.label
              )}
              <span className="block font-mono text-xs text-muted">
                {e.publisher} · {e.isPrimarySource ? "primary source" : "not a primary source"} · retrieved {formatDateTime(e.retrievedAt)}
                {!e.url && " · no document link"}
              </span>
            </li>
          ))}
          {link.evidence.length === 0 && <li className="text-warn">Source not verified.</li>}
        </ul>
      </Field>
    </>
  );
}

function ChainInspector({ view, node, onSelect }: { view: EventView; node: ChainNode; onSelect: (id: string) => void }) {
  const { views, instruments, snapshot } = useAppData();
  const back = node.kind !== "event" && (
    <button type="button" onClick={() => onSelect(EVENT_NODE)} className="label inline-flex items-center gap-1 hover:underline">
      <CornerUpLeft size={12} aria-hidden="true" /> Event context
    </button>
  );
  const linkById = new Map(view.links.map((l) => [l.id, l]));

  let title: string;
  let body: React.ReactNode;
  if (node.kind === "channel") {
    title = `Link · ${node.link.channel}`;
    body = <LinkFields link={node.link} />;
  } else if (node.kind === "target") {
    title = `${node.isSector ? "Sector" : "Issuer"} · ${node.label}`;
    const members = view.portfolioLinks.filter((pl) => node.linkIds.includes(pl.linkId) || pl.alsoViaLinkIds.some((id) => node.linkIds.includes(id)));
    body = (
      <>
        <Field label="Mapped by">
          {node.isSector
            ? "Sector taxonomy in instrument metadata. An instrument belongs here because its metadata says so."
            : "A verified issuer-to-instrument mapping by symbol."}
          <span className="block font-mono text-xs text-muted">{snapshot.instruments[0]?.metadataSource}</span>
        </Field>
        <Field label="In your portfolio">
          {members.length === 0
            ? "Nothing you hold or watch."
            : members.map((pl) => (
                <button key={pl.instrumentId} type="button" onClick={() => onSelect(`row:${pl.instrumentId}`)} className="mr-3 font-mono underline underline-offset-2">
                  {instruments.get(pl.instrumentId)?.symbol ?? pl.instrumentId}
                </button>
              ))}
        </Field>
        <Field label="Reached through">
          {node.linkIds.map((id) => linkById.get(id)).map((l) => l && (
            <button key={l.id} type="button" onClick={() => onSelect(`link:${l.id}`)} className="mr-3 underline underline-offset-2">
              {l.channel}
            </button>
          ))}
        </Field>
      </>
    );
  } else if (node.kind === "row") {
    const pl = node.portfolioLink;
    const instrument = instruments.get(pl.instrumentId);
    const position = snapshot.positions.find((p) => p.instrumentId === pl.instrumentId);
    const others = views.filter((v) => v.event.id !== view.event.id && isUpcoming(v) && v.portfolioLinks.some((l) => l.instrumentId === pl.instrumentId));
    title = `${instrument?.displayName ?? pl.instrumentId} · ${instrument?.sector ?? "sector not mapped"}`;
    body = (
      <>
        <Field label="Relation">
          <RelationTag relation={pl.relation} />
        </Field>
        <Field label="Exposure">
          {!pl.exposure || !position ? (
            "Watchlist only — tracked, not owned, so no monetary exposure is shown."
          ) : (
            <>
              <span className="font-mono">
                {formatINR(pl.exposure.value)} · {formatWeight(pl.exposure.weight)} of portfolio
              </span>
              <span className="block text-muted">
                {pl.exposure.kind === "MEASURED"
                  ? "Measured: this is your position in the issuer the event is about."
                  : "Indirect: this is your position value. The link is sector-level or a hypothesis, so it is not a measured exposure to this event."}
              </span>
              <span className="block font-mono text-xs text-muted">
                {position.quantity} shares × {formatINR(position.lastPrice ?? position.averagePrice)}{" "}
                {pl.exposure.basis === "MARKET" ? "last price" : "average cost (no last price available)"} · avg cost {formatINR(position.averagePrice)}
              </span>
            </>
          )}
        </Field>
        <Field label="Reached through">
          {node.linkIds.map((id) => linkById.get(id)).map((l) => l && (
            <button key={l.id} type="button" onClick={() => onSelect(`link:${l.id}`)} className="mr-3 inline-flex items-center gap-1.5 underline underline-offset-2">
              {l.channel} <span className="label text-muted">({LINK_META[l.linkType].label})</span>
            </button>
          ))}
        </Field>
        <Field label="Data">
          <span className="font-mono text-xs text-muted">
            {position?.dataSource ?? "Watchlist"} · as of {formatDateTime(pl.asOf)}
          </span>{" "}
          {position?.isIllustrative && <DemoTag />}
        </Field>
        <Field label="Other upcoming events">
          {others.length === 0
            ? "None reach this instrument."
            : others.map((v) => (
                <Link key={v.event.id} href={`/events/${v.event.id}`} className="block text-info underline underline-offset-2">
                  {v.event.title}
                </Link>
              ))}
        </Field>
      </>
    );
  } else {
    title = "Event context";
    body = (
      <>
        <Field label="How to read this">
          Follow a line from the event to your instruments. Select any box to see the reason, the mapping logic and the evidence behind
          that step.
        </Field>
        <Field label="Links found">
          {view.links.length} curated {view.links.length === 1 ? "link" : "links"} reaching {view.heldCount} held and {view.watchCount}{" "}
          watchlist {view.heldCount + view.watchCount === 1 ? "instrument" : "instruments"}.
        </Field>
        {view.rejected.length > 0 && (
          <Field label="Links not applied">
            {view.rejected.map((r) => (
              <span key={r.link.id} className="block text-warn">
                {r.link.channel}: {r.reason}
              </span>
            ))}
          </Field>
        )}
        <Field label="What this is not">A link shows a relationship. It is not a forecast of how any price will move.</Field>
      </>
    );
  }

  return (
    <Panel title={title} aside={back} className="mt-5">
      <dl className="px-4 py-1" aria-live="polite">
        {body}
      </dl>
    </Panel>
  );
}
