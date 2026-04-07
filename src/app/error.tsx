"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[var(--space-lg)]">
      <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        [SYSTEM ERROR]
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          REF: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
