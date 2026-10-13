import Link from "next/link";
import { buttonClass, Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <Empty title="Page not found">
      <p>There is nothing at this address.</p>
      <Link href="/" className={`${buttonClass} mt-4`}>
        Back to Overview
      </Link>
    </Empty>
  );
}
