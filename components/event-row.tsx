import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EventType, LinkType } from "@/lib/domain/types";
import { formatDateTime, formatRelativeDay } from "@/lib/format";
import type { RelevanceScore } from "@/lib/relevance/score";
import type { EventView } from "@/lib/view-model";
import { BandMark, DemoTag, LifecycleTag, LinkTypeTag, Tag } from "./ui";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  EARNINGS: "Earnings",
  CORPORATE_ACTION: "Corporate action",
  SECTOR: "Sector",
  MACRO: "Macro",
};

const ORDER: LinkType[] = ["DIRECT", "SECTOR", "MACRO"];

export function linkTypesOf(view: EventView): LinkType[] {
  return ORDER.filter((t) => view.portfolioLinks.some((l) => l.linkType === t));
}

export function reachSummary(view: EventView): string {
  if (view.portfolioLinks.length === 0) return "No holdings or watchlist instruments linked";
  const parts = [];
  if (view.heldCount) parts.push(`${view.heldCount} held`);
  if (view.watchCount) parts.push(`${view.watchCount} on watchlist`);
  return parts.join(" · ");
}

export function EventRow({ view, now, index = 0 }: { view: EventView; now: string; index?: number }) {
  const { event } = view;
  const unlinked = view.portfolioLinks.length === 0;
  return (
    <Link
      href={`/events/${event.id}`}
      style={{ "--i": index } as React.CSSProperties}
      className={`rise group grid gap-x-5 gap-y-2 border-b border-rule px-4 py-3.5 transition-colors hover:bg-card sm:grid-cols-[9.5rem_1fr_auto] ${
        unlinked ? "opacity-70" : ""
      }`}
    >
      <div>
        <p className="font-mono text-xs">{formatDateTime(event.startsAt)}</p>
        <p className="label mt-1 text-muted">{formatRelativeDay(now, event.startsAt)}</p>
      </div>
      <div className="min-w-0">
        <p className="flex items-start gap-1.5 text-sm font-medium leading-snug">
          {event.title}
          <ArrowUpRight size={14} aria-hidden="true" className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Tag>{EVENT_TYPE_LABEL[event.type]}</Tag>
          <Tag>Importance: {event.importance.toLowerCase()}</Tag>
          {linkTypesOf(view).map((t) => (
            <LinkTypeTag key={t} type={t} />
          ))}
          <span className="text-xs text-muted">{reachSummary(view)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
        <BandMark band={view.score.band} score={view.score.score} />
        <LifecycleTag status={view.lifecycle} />
        {event.isIllustrative && <DemoTag>Demo source</DemoTag>}
      </div>
    </Link>
  );
}

/** Expandable breakdown of the ranking heuristic's inputs. Renders nothing for unlinked events. */
export function WhyRanked({ score }: { score: RelevanceScore }) {
  if (score.factors.length === 0) return null;
  return (
    <details className="text-sm">
      <summary className="label cursor-pointer text-muted hover:text-fg">Why ranked here?</summary>
      <table className="mt-2 w-full max-w-md font-mono text-xs">
        <tbody>
          {score.factors.map((factor) => (
            <tr key={factor.label}>
              <td className="py-0.5 pr-4 font-sans text-sm">{factor.label}</td>
              <td className="py-0.5 text-right">+{factor.points}</td>
            </tr>
          ))}
          <tr className="border-t border-rule">
            <td className="py-1 pr-4 font-sans text-sm font-medium">Attention priority (max 100)</td>
            <td className="py-1 text-right font-medium">{score.score}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-xs text-muted">Points are ranking weights, not probabilities. Source confidence is shown per link.</p>
    </details>
  );
}
