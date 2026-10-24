import type { Metadata } from "next";
import styles from "@/components/site/PlainPage.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What this site collects, what it does not, and how to get anything removed",
};

const LAST_UPDATED = "24 October 2026";

// plain markup on purpose: a page that states what the site does should render for everyone, animation or not
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
    <section className={styles.section}>
      <p className={styles.label}>{label}</p>
      <h2>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Privacy</h1>
      <p className={styles.updated}>Last updated {LAST_UPDATED}</p>

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
          Apart from what Google Analytics keeps, described above, the site
          stores nothing in your browser: no local storage and no session
          storage. If your browser blocks site storage entirely, the site works
          exactly the same.
        </p>
      </Section>

      <Section label="SPEC: CONTROL" title="Getting things removed">
        <p>
          Email{" "}
          <a href="mailto:hello@mazzabuilds.com">hello@mazzabuilds.com</a>{" "}
          and ask. If you have messaged me and want that correspondence deleted,
          say so and it will be. You do not need to explain why.
        </p>
      </Section>
    </main>
  );
}
