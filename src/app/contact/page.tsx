import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ContactNote } from "@/components/contact/ContactNote";
import styles from "@/components/contact/ContactNote.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch - have a project in mind, want to collaborate, or just say hello",
};

const beat = (d: number) => ({ "--d": d }) as CSSProperties;

export default function ContactPage() {
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
      </ContactNote>
    </main>
  );
}
