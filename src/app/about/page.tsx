import { TransitionLink } from "@/transitions";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-lg)] py-[var(--space-4xl)]">
      <h1
        className="mb-[var(--space-lg)] font-sans text-[var(--display-lg)] font-bold text-[var(--text-display)]"
        data-enter=""
      >
        About
      </h1>
      <p
        className="mb-[var(--space-2xl)] max-w-[480px] text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]"
        data-enter=""
      >
        Solo indie developer building iOS apps, Shopify tools, and AI automation
        systems.
      </p>
      <TransitionLink
        href="/"
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--accent)] hover:brightness-110"
      >
        ← Back to home
      </TransitionLink>
    </main>
  );
}
