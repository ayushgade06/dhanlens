import type { Metadata } from "next";
import { EventRadar } from "@/components/radar";

export const metadata: Metadata = { title: "Event Radar" };

export default function Page() {
  return <EventRadar />;
}
