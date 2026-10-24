import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { ContactNote } from "@/components/contact/ContactNote";
import styles from "@/components/contact/ContactNote.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch - have a project in mind, want to collaborate, or just say hello",
};

const beat = (d: number) => ({ "--d": d }) as CSSProperties;

// shown after a send without JavaScript, when /api/contact redirects back here
const NOTICES: Record<string, ReactNode> = {
  sent: "Thanks, your message is on its way. I'll reply as soon as I can.",
  invalid: "Something was missing. Add your name, a valid email and a message, then send it again.",
  failed: (
    <>
      That didn&apos;t go through. Try again, or email <a href="mailto:hello@mazzabuilds.com">hello@mazzabuilds.com</a>.
    </>
  ),
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const notice = status && Object.hasOwn(NOTICES, status) ? NOTICES[status] : undefined;
  return (
    <main className={styles.main}>
      <ContactNote>
        <p className={`${styles.eyebrow} ${styles.rise}`} style={beat(0)}>
          Get in touch
        </p>
        <h1 className={`${styles.title} ${styles.rise}`} style={beat(1)}>
          Contact
        </h1>
        <p className={`${styles.intro} ${styles.rise}`} style={beat(2)}>
          Have a project in mind, want to collaborate, or just want to say hello? Drop a message below or reach out directly.
        </p>
        {notice && (
          <p className={status === "sent" ? styles.notice : `${styles.notice} ${styles.err}`} role="status">
            {notice}
          </p>
        )}
      </ContactNote>
    </main>
  );
}
