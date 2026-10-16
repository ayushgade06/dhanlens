"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, LayoutDashboard, Radar, Settings, Waypoints } from "lucide-react";
import type { ReactNode } from "react";
import type { PortfolioState } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";

const NAV = [
  { href: "/", label: "Overview", short: "Overview", icon: LayoutDashboard },
  { href: "/radar", label: "Event Radar", short: "Radar", icon: Radar },
  { href: "/chains", label: "Impact Chains", short: "Chains", icon: Waypoints },
  { href: "/ledger", label: "Event Ledger", short: "Ledger", icon: BookOpenCheck },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
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
    // Below lg: a fixed bottom tab bar, as in a mobile app. From lg: the sidebar list.
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] lg:static lg:flex lg:flex-col lg:gap-1 lg:border-0 lg:bg-transparent lg:pb-0"
    >
      {NAV.map(({ href, label, short, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors lg:flex-row lg:gap-2.5 lg:rounded-lg lg:px-3 lg:text-sm ${
            isActive(href) ? "font-medium text-brand lg:bg-brand/15" : "text-muted hover:text-fg lg:hover:bg-card"
          }`}
        >
          <Icon size={18} aria-hidden="true" className="lg:size-4" />
          <span className="lg:hidden">{short}</span>
          <span className="hidden lg:inline">{label}</span>
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
        <main id="main" className="mx-auto max-w-[78rem] px-4 pb-24 pt-6 sm:px-8 sm:pt-10 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
