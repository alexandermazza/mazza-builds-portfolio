import type { Metadata } from "next";
import { ScrollLetterAnimation } from "@/components/effects";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site collects, what it does not, and how to get anything removed",
};

const LAST_UPDATED = "15 September 2026";

/**
 * Body copy is intentionally plain markup rather than the scroll-reveal
 * components used elsewhere. A page whose job is to state plainly what the site
 * does should render for everyone, with no dependency on animation running.
 */
function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-[var(--space-3xl)]">
      <p className="mb-[var(--space-sm)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
        {label}
      </p>
      <h2 className="mb-[var(--space-md)] font-sans text-[var(--heading)] leading-[1.2] tracking-[-0.02em] text-[var(--text-display)]">
        {title}
      </h2>
      <div className="max-w-[640px] space-y-[var(--space-md)] font-sans text-[var(--body-sm)] leading-[1.6] text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">
      <section className="mb-[var(--space-2xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          PRIVACY
        </ScrollLetterAnimation>
        <p className="mt-[var(--space-md)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          LAST UPDATED {LAST_UPDATED}
        </p>
      </section>

      <Section label="SPEC: SUMMARY" title="The short version">
        <p>
          This is a personal portfolio run by one person. It sells nothing, runs
          no advertising, and has no accounts to sign up for. Nothing you do
          here is sold or shared with data brokers, and there is no tracking of
          you across other websites.
        </p>
      </Section>

      <Section label="SPEC: ANALYTICS" title="Analytics">
        <p>
          The site uses Google Analytics to count visits and see which pages get
          read. That records things like the pages you view, rough location
          derived from your IP address, your browser, and whether you arrived
          from a link or a search. It is used only to understand whether the
          site is working and worth maintaining.
        </p>
        <p>
          If you would rather not be counted, any ad or tracker blocker will
          stop it, as will your browser&apos;s &ldquo;do not track&rdquo;
          setting where Google honours it. The site works exactly the same
          either way.
        </p>
      </Section>

      <Section label="SPEC: CONTACT FORM" title="If you message me">
        <p>
          The contact form sends me your name, email address, and whatever you
          write in the message. It is delivered by email through Resend and
          lands in a normal inbox. It is used to reply to you and nothing else
          - no mailing list, no newsletter, no forwarding to anyone.
        </p>
      </Section>

      <Section label="SPEC: BROWSER STORAGE" title="Storage on your device">
        <p>
          The site stores a single flag in your browser&apos;s session storage
          to remember that you have already seen the intro animation, so it does
          not replay on every page. It holds no personal information, is not
          readable by anyone else, and disappears when you close the tab. If
          your browser blocks site storage entirely, the site still works.
        </p>
      </Section>

      <Section label="SPEC: CONTROL" title="Getting things removed">
        <p>
          Email{" "}
          <a
            href="mailto:hello@mazzabuilds.com"
            className="text-[var(--text-primary)] underline underline-offset-4 transition-colors hover:text-[var(--accent)]"
          >
            hello@mazzabuilds.com
          </a>{" "}
          and ask. If you have messaged me and want that correspondence deleted,
          say so and it will be. You do not need to explain why.
        </p>
      </Section>
    </main>
  );
}
