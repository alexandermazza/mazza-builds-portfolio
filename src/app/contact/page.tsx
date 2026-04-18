import type { Metadata } from "next";
import { ScrollTextLines } from "@/components/ui";
import { ContactForm } from "@/components/ui/ContactForm";
import { ScrollLetterAnimation } from "@/components/effects";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch - have a project in mind, want to collaborate, or just say hello",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">
      {/* Heading */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          CONTACT
        </ScrollLetterAnimation>
      </section>

      {/* Intro */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          Have a project in mind, want to collaborate, or just want to say hello? Drop a message below or reach out directly.
        </ScrollTextLines>
      </section>

      <ContactForm />
    </main>
  );
}
