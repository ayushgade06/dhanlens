import type { Metadata } from "next";
import { EventDetail } from "@/components/event-detail";

export const metadata: Metadata = { title: "Event" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetail id={id} />;
}
