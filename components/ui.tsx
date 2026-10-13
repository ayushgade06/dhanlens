import type { ReactNode } from "react";
import type { Confidence, LifecycleStatus, LinkType, Relation } from "@/lib/domain/types";
import type { Band } from "@/lib/relevance/score";

type Tone = "ink" | "teal" | "amber" | "muted" | "lime";

const TONE: Record<Tone, string> = {
  ink: "border-ink text-ink",
  teal: "border-teal text-teal",
  amber: "border-amber text-amber",
  muted: "border-rule text-muted",
  lime: "border-ink bg-lime text-ink",
};

export function Tag({ tone = "muted", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <span title={title} className={`label inline-flex items-center gap-1 whitespace-nowrap border px-1.5 py-0.5 ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** Marks anything rendered from fixtures. Kept on every panel that shows demo numbers. */
export function DemoTag({ children = "Illustrative" }: { children?: ReactNode }) {
  return (
    <Tag tone="amber" title="Demo fixture — not live market data">
      {children}
    </Tag>
  );
}

export const LINK_META: Record<LinkType, { label: string; long: string; tone: Tone; dash: string; help: string }> = {
  DIRECT: {
    label: "Direct",
    long: "Direct issuer link",
    tone: "ink",
    dash: "",
    help: "The event is specifically about this issuer.",
  },
  SECTOR: {
    label: "Sector",
    long: "Sector relationship",
    tone: "teal",
    dash: "7 5",
    help: "The event maps to a sector that contains this instrument, per instrument metadata.",
  },
  MACRO: {
    label: "Macro",
    long: "Possible macro transmission channel",
    tone: "amber",
    dash: "1.5 5",
    help: "A curated hypothesis about how a macro event could reach a sector. Not a confirmed effect.",
  },
};

export const LINK_STROKE: Record<LinkType, string> = {
  DIRECT: "var(--ink)",
  SECTOR: "var(--teal)",
  MACRO: "var(--amber)",
};

/** Line sample + label, so link types differ by pattern as well as colour. */
export function LinkTypeTag({ type, long = false }: { type: LinkType; long?: boolean }) {
  const m = LINK_META[type];
  return (
    <Tag tone={m.tone} title={m.help}>
      <svg width="16" height="6" aria-hidden="true">
        <line x1="0" y1="3" x2="16" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={m.dash} strokeLinecap="round" />
      </svg>
      {long ? m.long : m.label}
    </Tag>
  );
}

export function RelationTag({ relation }: { relation: Relation }) {
  return relation === "HELD" ? (
    <Tag tone="ink">Held</Tag>
  ) : (
    <Tag tone="muted" title="Tracked, not owned — no monetary exposure is shown">
      Watchlist
    </Tag>
  );
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  VERIFIED: "Verified mapping",
  CURATED: "Curated taxonomy",
  HYPOTHESIS: "Hypothesis — unconfirmed",
};

const BAND_LABEL: Record<Band, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low", NOT_LINKED: "Not linked" };

/** Attention priority: a ranking heuristic, never a probability. */
export function BandMark({ band, score }: { band: Band; score: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 whitespace-nowrap"
      title="Attention priority: a transparent ranking heuristic, not a probability or price prediction"
    >
      <span className={`label ${band === "HIGH" ? "mark" : band === "NOT_LINKED" ? "text-muted" : ""}`}>{BAND_LABEL[band]}</span>
      {band !== "NOT_LINKED" && <span className="font-mono text-xs text-muted">{score}/100</span>}
    </span>
  );
}

const LIFECYCLE: Record<LifecycleStatus, { label: string; tone: Tone }> = {
  UPCOMING: { label: "Upcoming", tone: "muted" },
  OBSERVED: { label: "Observed", tone: "teal" },
  REVIEWED: { label: "Reviewed", tone: "lime" },
  DATA_UNAVAILABLE: { label: "Data unavailable", tone: "amber" },
};

export function LifecycleTag({ status }: { status: LifecycleStatus }) {
  return <Tag tone={LIFECYCLE[status].tone}>{LIFECYCLE[status].label}</Tag>;
}
export const lifecycleLabel = (s: LifecycleStatus) => LIFECYCLE[s].label;

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="rise mb-8 max-w-3xl">
      <p className="label text-muted">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
      {children && <div className="mt-3 text-[15px] leading-relaxed text-muted">{children}</div>}
    </header>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-rule bg-surface ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-2.5">
          <h2 className="label text-ink">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-rule px-6 py-10 text-center">
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export const buttonClass =
  "inline-flex items-center justify-center gap-2 border border-ink px-3 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 border border-ink bg-ink px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-lime hover:text-ink";
export const fieldClass = "w-full border border-rule bg-surface px-3 py-2 text-sm placeholder:text-muted";
