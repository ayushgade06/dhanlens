"use client";

import { buttonClass, Empty } from "@/components/ui";

export default function ErrorState({ retry }: { error: Error; retry: () => void }) {
  return (
    <Empty title="This view could not be shown">
      <p>Something went wrong while rendering. Your saved notes are not affected.</p>
      <button type="button" onClick={() => retry()} className={`${buttonClass} mt-4`}>
        Try again
      </button>
    </Empty>
  );
}
