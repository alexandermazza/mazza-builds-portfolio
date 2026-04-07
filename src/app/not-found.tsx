import { Button } from "@/components/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[var(--space-lg)]">
      <h1 className="font-sans text-[72px] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
        404
      </h1>
      <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        [PAGE NOT FOUND]
      </p>
      <Link href="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
