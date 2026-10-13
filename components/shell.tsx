"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, LayoutDashboard, Radar, Settings, Waypoints } from "lucide-react";
import type { ReactNode } from "react";
import type { PortfolioState } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/radar", label: "Event Radar", icon: Radar },
  { href: "/chains", label: "Impact Chains", icon: Waypoints },
  { href: "/ledger", label: "Event Ledger", icon: BookOpenCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Lockup() {
  return (
    <Link href="/" className="block">
      <span className="font-display text-[1.7rem] leading-none text-paper">
        Dhan<span className="text-lime">Lens</span>
      </span>
      <span className="label mt-1.5 hidden text-paper/60 lg:block">Portfolio-aware market event intelligence</span>
    </Link>
  );
}

function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/radar" && pathname.startsWith("/events"));
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
            isActive(href) ? "bg-lime font-medium text-ink" : "text-paper/75 hover:bg-paper/10 hover:text-paper"
          }`}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Persistent, truthful statement of what data is on screen. */
export function StatusStrip({ portfolio }: { portfolio: PortfolioState }) {
  const live = portfolio.mode === "dhan";
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule bg-surface px-4 py-2 sm:px-8">
      <span className={`label border px-1.5 py-0.5 font-medium ${live ? "border-teal text-teal" : "border-amber text-amber"}`}>
        {live ? "Dhan read-only" : "Demo data"}
      </span>
      <span className="text-xs text-muted">
        {live ? "Holdings read from your Dhan account. " : "Illustrative, not live market data. "}
        Events are illustrative scenarios in every mode.
      </span>
      {portfolio.status === "stale" && <span className="label border border-amber px-1.5 py-0.5 text-amber">Stale</span>}
      {portfolio.status === "partial" && <span className="label border border-amber px-1.5 py-0.5 text-amber">Partial</span>}
      {portfolio.message && <span className="text-xs text-amber">{portfolio.message}</span>}
      <span className="ml-auto font-mono text-[11px] text-muted">Data as of {formatDateTime(portfolio.asOf)}</span>
    </div>
  );
}

export function Shell({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-lime focus:p-2">
        Skip to content
      </a>
      <aside className="sticky top-0 z-20 flex flex-col gap-3 bg-ink px-3 py-3 [--focus:var(--lime)] lg:h-screen lg:gap-8 lg:px-4 lg:py-6">
        <Lockup />
        <Nav />
        <p className="mt-auto hidden text-[11px] leading-relaxed text-paper/50 lg:block">
          Independent prototype; not affiliated with or endorsed by Dhan. No orders, forecasts or advice.
        </p>
      </aside>
      <div className="min-w-0">
        {status}
        <main id="main" className="mx-auto max-w-[78rem] px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
