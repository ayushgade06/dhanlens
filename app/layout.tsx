import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { AppDataProvider } from "@/components/app-data";
import { Shell, StatusStrip } from "@/components/shell";
import { getSnapshot } from "@/lib/providers";
import "./globals.css";

const display = Instrument_Serif({ variable: "--font-display-face", subsets: ["latin"], weight: "400" });
const body = Hanken_Grotesk({ variable: "--font-body", subsets: ["latin"] });
const data = IBM_Plex_Mono({ variable: "--font-data", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "DhanLens", template: "%s · DhanLens" },
  description:
    "Portfolio-aware market event intelligence. An independent prototype; not affiliated with or endorsed by Dhan.",
};

async function LoadedApp({ children }: { children: ReactNode }) {
  const snapshot = await getSnapshot();
  return (
    <Shell status={<StatusStrip portfolio={snapshot.portfolio} />}>
      <AppDataProvider snapshot={snapshot}>{children}</AppDataProvider>
    </Shell>
  );
}

function LoadingApp() {
  return (
    <Shell status={<div className="border-b border-rule bg-surface px-8 py-2 text-xs text-muted">Loading data sources…</div>}>
      <div role="status" aria-label="Loading" className="space-y-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-12 w-2/3" />
        <div className="skeleton h-64 w-full" />
      </div>
    </Shell>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} ${data.variable} antialiased`}>
      <body>
        <Suspense fallback={<LoadingApp />}>
          <LoadedApp>{children}</LoadedApp>
        </Suspense>
      </body>
    </html>
  );
}
