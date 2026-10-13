import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { AppDataProvider } from "@/components/app-data";
import { Shell, StatusStrip } from "@/components/shell";
import { getSnapshot } from "@/lib/providers";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });

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
    <Shell status={<div className="bg-surface px-8 py-2 text-xs text-muted">Loading data sources…</div>}>
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
    <html lang="en-IN" className={`${body.variable} antialiased`}>
      <body>
        <Suspense fallback={<LoadingApp />}>
          <LoadedApp>{children}</LoadedApp>
        </Suspense>
      </body>
    </html>
  );
}
