import type { Metadata } from "next";
import { ImpactChains } from "@/components/chains";

export const metadata: Metadata = { title: "Impact Chains" };

export default function Page() {
  return <ImpactChains />;
}
