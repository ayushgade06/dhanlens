"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import type { ProviderStatus } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { useAppData } from "./app-data";
import { buttonClass, PageHeader, Panel, Tag } from "./ui";

const STATUS_COPY: Record<ProviderStatus, string> = {
  demo: "Demo fixtures. No broker connection is in use.",
  live: "Holdings were read from DhanHQ on the last request.",
  stale: "The last DhanHQ request failed; showing the most recent successful read.",
  partial: "Holdings were read from DhanHQ, but last prices were not available. Values use average cost.",
  unauthenticated: "DhanHQ rejected the access token (tokens expire after 24 hours). Showing demo data.",
  unavailable: "DhanHQ could not be reached or returned an unusable response. Showing demo data.",
};

const SOURCES: [label: string, href: string][] = [
  ["DhanHQ developer docs", "https://docs.dhanhq.co/"],
  ["DhanHQ authentication", "https://dhanhq.co/docs/v2/authentication/"],
  ["DhanHQ portfolio API", "https://dhanhq.co/docs/v2/portfolio/"],
  ["DhanHQ market quote API", "https://dhanhq.co/docs/v2/market-quote/"],
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-rule px-4 py-2.5 last:border-b-0 sm:grid-cols-[13rem_1fr]">
      <dt className="label pt-0.5 text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function SettingsView() {
  const { snapshot, ledger } = useAppData();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const { portfolio } = snapshot;
  const live = portfolio.mode === "dhan";
  const userNotes = Object.values(ledger.notes).filter((n) => !n.isSeed).length;

  const categories: [name: string, source: string, state: string][] = [
    ["Holdings", live ? "DhanHQ GET /v2/holdings" : "Demo fixtures", live ? "Read-only" : "Illustrative"],
    [
      "Last prices",
      live ? "DhanHQ POST /v2/marketfeed/ltp" : "Demo fixtures",
      live ? (portfolio.status === "partial" ? "Unavailable" : "Read-only") : "Illustrative",
    ],
    ["Watchlist", "Demo fixtures", "Illustrative"],
    ["Events and links", "Demo fixtures (no event feed is integrated)", "Illustrative"],
    ["Post-event prices", "Demo fixtures", "Simulated"],
    ["Sector taxonomy", "Curated demo list", "Illustrative"],
    ["Notes and watch items", "This browser (localStorage)", "Yours"],
  ];

  return (
    <>
      <PageHeader eyebrow="Connections / Settings" title="What is on screen, and where it came from.">
        Independent prototype; not affiliated with or endorsed by Dhan. It places no orders, makes no forecasts and gives no advice.
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Data mode"
          aside={
            <button type="button" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing} className={buttonClass}>
              <RefreshCw size={14} aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Checking…" : "Re-check sources"}
            </button>
          }
          className="rise"
        >
          <dl>
            <Row label="Current mode">
              <Tag tone={live ? "info" : "warn"}>{live ? "Dhan read-only" : "Demo data"}</Tag>
            </Row>
            <Row label="Provider status">
              <span className="font-mono text-xs uppercase">{portfolio.status}</span>
              <span className="mt-0.5 block text-muted">{STATUS_COPY[portfolio.status]}</span>
              {portfolio.message && <span className="mt-0.5 block text-warn">{portfolio.message}</span>}
            </Row>
            <Row label="Data as of">
              <span className="font-mono text-xs">{formatDateTime(portfolio.asOf)}</span>
            </Row>
            <Row label="Last successful Dhan sync">
              <span className="font-mono text-xs">
                {portfolio.lastSuccessfulSync ? formatDateTime(portfolio.lastSuccessfulSync) : "Never in this server session"}
              </span>
            </Row>
          </dl>
        </Panel>

        <Panel title="Data categories" className="rise">
          <table className="w-full text-sm">
            <thead>
              <tr className="label border-b border-rule text-left text-muted">
                <th scope="col" className="px-4 py-2 font-normal">Category</th>
                <th scope="col" className="px-2 py-2 font-normal">Source</th>
                <th scope="col" className="px-4 py-2 font-normal">State</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(([name, source, state]) => (
                <tr key={name} className="border-b border-rule last:border-b-0">
                  <th scope="row" className="px-4 py-2 text-left font-medium">{name}</th>
                  <td className="px-2 py-2 text-muted">{source}</td>
                  <td className="px-4 py-2 font-mono text-xs uppercase">{state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Developer setup: read-only DhanHQ (optional)" className="rise">
          <div className="space-y-3 p-4 text-sm">
            <p>
              There is no in-app login. For local testing against <em>your own</em> account, set these server-side variables in{" "}
              <code className="font-mono text-xs">.env.local</code> and restart the server:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed">
              {"DHAN_READ_ONLY_ENABLED=true\nDHAN_CLIENT_ID=<your client id>\nDHAN_ACCESS_TOKEN=<24-hour access token>"}
            </pre>
            <ul className="list-disc space-y-1 pl-4 text-muted marker:text-muted">
              <li>The token stays on the server. It is never sent to the browser, stored in the browser, or logged.</li>
              <li>Only holdings and last traded prices are read. No order endpoint is called anywhere in this app.</li>
              <li>A personal access token is not a multi-user integration; that needs Dhan&rsquo;s partner authentication.</li>
              <li>Last prices need a Data API entitlement on your account; without it, values fall back to average cost.</li>
            </ul>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              {SOURCES.map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" className="text-info underline underline-offset-2">
                  {label}
                </a>
              ))}
            </p>
          </div>
        </Panel>

        <Panel title="Demo data" className="rise">
          <div className="space-y-3 p-4 text-sm">
            <p>
              Your notes, watch items and reflections are stored in this browser only. Resetting removes them and restores the seeded demo
              note.
            </p>
            {confirming ? (
              <div role="alertdialog" aria-label="Confirm reset" className="rounded-xl bg-warn/15 p-3">
                <p className="font-medium">
                  {userNotes > 0
                    ? `This will permanently delete ${userNotes} ledger ${userNotes === 1 ? "entry" : "entries"} you created or edited.`
                    : "This will restore the original demo ledger."}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      ledger.reset();
                      setConfirming(false);
                    }}
                    className={buttonClass}
                  >
                    Yes, reset
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={buttonClass}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={buttonClass}>
                <RotateCcw size={14} aria-hidden="true" /> Reset demo data
              </button>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
