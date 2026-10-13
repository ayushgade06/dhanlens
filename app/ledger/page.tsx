import type { Metadata } from "next";
import { EventLedger } from "@/components/ledger";

export const metadata: Metadata = { title: "Event Ledger" };

export default function Page() {
  return <EventLedger />;
}
