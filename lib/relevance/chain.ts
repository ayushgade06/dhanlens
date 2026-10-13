import type { EventLink, EventPortfolioLink, Instrument, LinkType } from "../domain/types";
import type { ResolvedEvent } from "./links";

// Graph data for the Impact Chain, kept separate from how it is drawn.
// Columns: 0 event → 1 evidence/channel → 2 issuer or sector → 3 the user's instruments.

export type ChainNode =
  | { id: string; col: 0; kind: "event" }
  | { id: string; col: 1; kind: "channel"; link: EventLink }
  | { id: string; col: 2; kind: "target"; label: string; isSector: boolean; linkIds: string[] }
  | { id: string; col: 3; kind: "row"; portfolioLink: EventPortfolioLink; linkIds: string[] }
  | { id: string; col: 3; kind: "none"; linkIds: string[] };

export interface ChainEdge {
  id: string;
  from: string;
  to: string;
  linkId: string;
  linkType: LinkType;
}

export interface Chain {
  nodes: ChainNode[];
  edges: ChainEdge[];
}

export const EVENT_NODE = "event";
export const rowNodeId = (instrumentId: string) => `row:${instrumentId}`;
export const channelNodeId = (linkId: string) => `link:${linkId}`;

const targetKey = (link: EventLink) =>
  link.target.kind === "sector" ? `sector:${link.target.sector}` : `instrument:${link.target.instrumentId}`;

export function buildChain(resolved: ResolvedEvent, instruments: Map<string, Instrument>): Chain {
  const nodes: ChainNode[] = [{ id: EVENT_NODE, col: 0, kind: "event" }];
  const edges: ChainEdge[] = [];
  const linkById = new Map(resolved.links.map((l) => [l.id, l]));
  const targets = new Map<string, Extract<ChainNode, { kind: "target" }>>();
  const edge = (from: string, to: string, link: EventLink) =>
    edges.push({ id: `${from}>${to}>${link.id}`, from, to, linkId: link.id, linkType: link.linkType });

  for (const link of resolved.links) {
    const channelId = channelNodeId(link.id);
    nodes.push({ id: channelId, col: 1, kind: "channel", link });
    edge(EVENT_NODE, channelId, link);

    const key = targetKey(link);
    let target = targets.get(key);
    if (!target) {
      target = {
        id: `target:${key}`,
        col: 2,
        kind: "target",
        isSector: link.target.kind === "sector",
        label:
          link.target.kind === "sector"
            ? link.target.sector
            : (instruments.get(link.target.instrumentId)?.displayName ?? link.target.instrumentId),
        linkIds: [],
      };
      targets.set(key, target);
      nodes.push(target);
    }
    target.linkIds.push(link.id);
    edge(channelId, target.id, link);
  }

  const reached = new Set<string>();
  for (const pl of resolved.portfolioLinks) {
    const linkIds = [pl.linkId, ...pl.alsoViaLinkIds];
    const id = rowNodeId(pl.instrumentId);
    nodes.push({ id, col: 3, kind: "row", portfolioLink: pl, linkIds });
    for (const linkId of linkIds) {
      const link = linkById.get(linkId);
      if (!link) continue;
      const target = targets.get(targetKey(link));
      if (!target) continue;
      reached.add(target.id);
      edge(target.id, id, link);
    }
  }

  // A target that reaches nothing the user holds or watches still gets a terminal node saying so.
  for (const target of targets.values()) {
    if (reached.has(target.id)) continue;
    const id = `none:${target.id}`;
    nodes.push({ id, col: 3, kind: "none", linkIds: target.linkIds });
    const link = linkById.get(target.linkIds[0]);
    if (link) edge(target.id, id, link);
  }
  return { nodes, edges };
}

/** Link ids on the paths that run through the selected node. */
export function linksThrough(chain: Chain, selectedId: string): Set<string> {
  const node = chain.nodes.find((n) => n.id === selectedId);
  if (!node || node.kind === "event") return new Set(chain.edges.map((e) => e.linkId));
  return new Set(node.kind === "channel" ? [node.link.id] : node.linkIds);
}

export function isNodeActive(node: ChainNode, selectedId: string, through: Set<string>): boolean {
  if (node.kind === "event" || node.id === selectedId) return true;
  // Selecting one portfolio row dims its siblings even when they share a link.
  if (node.col === 3 && selectedId.startsWith("row:")) return false;
  if (node.kind === "channel") return through.has(node.link.id);
  return node.linkIds.some((id) => through.has(id));
}
