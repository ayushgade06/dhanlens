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
      <span className="text-xl font-bold leading-none tracking-tight text-fg">
        Dhan<span className="text-brand">Lens</span>
      </span>
      <span className="label mt-1.5 hidden text-muted lg:block">Portfolio-aware market event intelligence</span>
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
          className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive(href) ? "bg-brand/15 font-medium text-brand" : "text-muted hover:bg-card hover:text-fg"
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
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-surface px-4 py-2 sm:px-8">
      <span className={`label rounded px-1.5 py-0.5 ${live ? "bg-info/15 text-info" : "bg-warn/15 text-warn"}`}>
        {live ? "Dhan read-only" : "Demo data"}
      </span>
      <span className="text-xs text-muted">
        {live ? "Holdings read from your Dhan account. " : "Illustrative, not live market data. "}
        Events are illustrative scenarios in every mode.
      </span>
      {portfolio.status === "stale" && <span className="label rounded bg-warn/15 px-1.5 py-0.5 text-warn">Stale</span>}
      {portfolio.status === "partial" && <span className="label rounded bg-warn/15 px-1.5 py-0.5 text-warn">Partial</span>}
      {portfolio.message && <span className="text-xs text-warn">{portfolio.message}</span>}
      <span className="ml-auto text-xs text-muted">Data as of {formatDateTime(portfolio.asOf)}</span>
    </div>
  );
}

export function Shell({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-brand focus:p-2 focus:text-canvas">
        Skip to content
      </a>
      <aside className="sticky top-0 z-20 flex flex-col gap-3 bg-surface px-3 py-3 lg:h-screen lg:gap-8 lg:px-4 lg:py-6">
        <Lockup />
        <Nav />
        <p className="mt-auto hidden text-xs leading-relaxed text-muted lg:block">
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
