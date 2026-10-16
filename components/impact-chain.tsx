"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerUpLeft } from "lucide-react";
import type { EventLink, LinkType } from "@/lib/domain/types";
import { formatDateTime, formatINR, formatINRWhole, formatWeight } from "@/lib/format";
import { buildChain, EVENT_NODE, isNodeActive, linksThrough, type Chain, type ChainNode } from "@/lib/relevance/chain";
import { isUpcoming, type EventView } from "@/lib/view-model";
import { useAppData } from "./app-data";
import { buttonClass, CONFIDENCE_LABEL, DemoTag, LINK_META, LINK_STROKE, LinkTypeTag, Panel, RelationTag, Tag } from "./ui";

const NODE_H = 76;
const MOBILE_NODE_H = 60;
const MOBILE_GAP = 10; // px above each branch
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

/**
 * One child in the narrow tree: an elbow from the parent's spine into this node, styled like the link it follows.
 * The spine continues past non-last children so siblings stay joined. Children render after the node.
 */
function Branch({
  type,
  on,
  next,
  children,
}: {
  type: LinkType;
  on: boolean;
  /** The spine down to later siblings; styled like the next one, lit if any later one is. */
  next?: { type: LinkType; on: boolean };
  children: React.ReactNode;
}) {
  const line = (t: LinkType, lit: boolean) => ({ borderColor: LINK_STROKE[t], opacity: lit ? 1 : 0.2, transition: "opacity 200ms" });
  const elbow = MOBILE_GAP + MOBILE_NODE_H / 2;
  return (
    <div className="relative pl-5" style={{ paddingTop: MOBILE_GAP }}>
      <span aria-hidden="true" className={`absolute left-0 top-0 w-5 rounded-bl-xl border-b-2 border-l-2 ${BORDER_STYLE[type]}`} style={{ ...line(type, on), height: elbow }} />
      {next && (
        <span aria-hidden="true" className={`absolute bottom-0 left-0 border-l-2 ${BORDER_STYLE[next.type]}`} style={{ ...line(next.type, next.on), top: elbow }} />
      )}
      {children}
    </div>
  );
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
        onClick={() => select(node.id)}
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
  const channels = chain.nodes.filter((n): n is Extract<ChainNode, { kind: "channel" }> => n.kind === "channel");

  // On narrow screens the inspector sits below the whole tree, so bring it into view after a tap.
  const inspectorRef = useRef<HTMLDivElement>(null);
  const select = (id: string) => {
    onSelect(id);
    // A short pause lets the highlighted path register before the page moves.
    if (window.matchMedia("(max-width: 767px)").matches)
      setTimeout(() => inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
  };

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

      {/* Narrow: the same graph as a top-down tree, joined by link-styled connectors */}
      <div className="md:hidden" role="group" aria-label={`Impact chain for ${view.event.title}`}>
        {button(nodeById.get(EVENT_NODE)!, { height: MOBILE_NODE_H })}
        <div className="ml-4">
          {channels.map((channel, i) => {
            const link = channel.link;
            const target = chain.nodes.find((n) => n.kind === "target" && n.linkIds.includes(link.id));
            const ends = chain.nodes.filter((n) => n.col === 3 && n.linkIds.includes(link.id));
            const on = (n: ChainNode) => through.has(link.id) && activeIds.has(n.id);
            const later = channels.slice(i + 1);
            const next = later.length > 0 ? { type: later[0].link.linkType, on: later.some((c) => through.has(c.link.id)) } : undefined;
            return (
              <Branch key={channel.id} type={link.linkType} on={on(channel)} next={next}>
                {button(channel, { height: MOBILE_NODE_H })}
                {target && (
                  <div className="ml-4">
                    <Branch type={link.linkType} on={on(target)}>
                      {button(target, { height: MOBILE_NODE_H })}
                      <div className="ml-4">
                        {ends.map((n, k) => (
                          <Branch
                            key={n.id}
                            type={link.linkType}
                            on={on(n)}
                            next={k < ends.length - 1 ? { type: link.linkType, on: ends.slice(k + 1).some(on) } : undefined}
                          >
                            {button(n, { height: MOBILE_NODE_H })}
                          </Branch>
                        ))}
                      </div>
                    </Branch>
                  </div>
                )}
              </Branch>
            );
          })}
        </div>
      </div>

      {allRows.length > ROW_LIMIT && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className={`${buttonClass} mt-4`} aria-expanded={expanded}>
          {expanded ? `Show the ${ROW_LIMIT} most relevant` : `Show all ${allRows.length} linked instruments`}
        </button>
      )}

      <div ref={inspectorRef} className="scroll-mt-20">
        <ChainInspector view={view} node={nodeById.get(selectedId) ?? nodeById.get(EVENT_NODE)!} onSelect={onSelect} />
      </div>
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
