"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { RULES, validateContact, type ContactField } from "@/lib/contact-rules";
import { PlatformIcon } from "@/components/site/PlatformIcon";
import { PlaneSky } from "./PlaneSky";
import styles from "./ContactNote.module.css";

const EMAIL = "hello@mazzabuilds.com";
const FIELDS = Object.keys(RULES) as ContactField[];
const EMPTY: Record<ContactField, string> = { name: "", email: "", message: "" };
const LINKS = [
  { href: "https://github.com/alexandermazza", label: "GitHub", icon: "github" },
  { href: "https://www.linkedin.com/in/alexander-mazza/", label: "LinkedIn", icon: "linkedin" },
  { href: "https://twitter.com/mazza_builds", label: "X", icon: "x" },
] as const;

const rise = (d: number) => ({ "--d": d }) as CSSProperties;

// "sent" and "back" keep the note faded for a beat while it leaves or returns
type Stage = "note" | "sent" | "done" | "back";

/** The fill-in-the-blank note, its thank-you, the plane and the direct links. children is the page's heading. */
export function ContactNote({ children }: { children: ReactNode }) {
  const [values, setValues] = useState(EMPTY);
  const [tried, setTried] = useState(false);
  const [send, setSend] = useState<"idle" | "sending" | "failed">("idle");
  const [stage, setStage] = useState<Stage>("note");
  const [sentTo, setSentTo] = useState<{ name: string; email: string } | null>(null);
  const message = useRef<HTMLTextAreaElement>(null);
  const done = useRef<HTMLElement>(null);

  const valid = (k: ContactField) => RULES[k][0](values[k]);
  const first = FIELDS.find((k) => !valid(k));
  const state = (k: ContactField) => (valid(k) ? styles.ok : tried ? styles.bad : "");
  const set = (k: ContactField) => (v: string) => setValues((old) => ({ ...old, [k]: v }));
  const chars = values.message.trim().length;

  // the message box grows too, up to a point; it measures zero while hidden, so this runs on every render
  useLayoutEffect(() => {
    const box = message.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight + 2, 520)}px`;
  });

  useEffect(() => {
    if (stage === "done") done.current?.focus({ preventScroll: true });
    if (stage !== "back") return;
    document.getElementById("name")?.focus();
    const frame = requestAnimationFrame(() => setStage("note"));
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (send === "sending") return;
    setTried(true);
    const result = validateContact(values);
    if (!result.ok) {
      document.getElementById(result.field)?.focus();
      return;
    }
    setSend("sending");
    // hold at least the mockup's 1.1s, so the button's paper plane finishes flying off even on a quick reply
    const [ok] = await Promise.all([post(result.value), new Promise((r) => setTimeout(r, 1100))]);
    if (!ok) {
      setSend("failed");
      return;
    }
    setSentTo({ name: result.value.name.split(/\s+/)[0], email: result.value.email });
    setStage("sent");
    setTimeout(() => setStage("done"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500);
  }

  function again() {
    setValues(EMPTY);
    setTried(false);
    setSend("idle");
    setStage("back");
  }

  const away = stage === "note" ? "" : styles.away;
  return (
    <div className={styles.grid}>
      <div>
        {children}

        <form className={`${styles.note} ${styles.rise} ${away}`} style={rise(3)} id="note" noValidate hidden={stage === "done"} onSubmit={submit}>
          <p className={styles.letter}>
            Hi Alex, my name is{" "}
            <Blank field="name" label="Your name" type="text" autoComplete="name" placeholder="your name"
              state={state("name")} invalid={tried && !valid("name")} value={values.name} onValue={set("name")} />
            , and you can reach me at{" "}
            <Blank field="email" label="Your email" type="email" autoComplete="email" inputMode="email" placeholder="your email"
              state={state("email")} invalid={tried && !valid("email")} value={values.email} onValue={set("email")} />
            . Here&apos;s what&apos;s on my mind:
          </p>
          <div className={`${styles.box} ${state("message")}`} data-f="message">
            <label className={styles.srOnly} htmlFor="message">
              Your message
            </label>
            <textarea
              ref={message}
              id="message"
              name="message"
              rows={5}
              placeholder="A project, a job, a question, or just hello."
              required
              aria-describedby="hint"
              aria-invalid={tried && !valid("message")}
              value={values.message}
              onChange={(e) => set("message")(e.target.value)}
            />
            <span className={styles.count} id="count" aria-hidden="true">
              {chars ? `${chars} characters` : ""}
            </span>
          </div>
          <p className={styles.hint} id="hint" aria-live="polite">
            {tried && first ? RULES[first][1] : ""}
          </p>
          <div className={styles.sendRow}>
            <button className={send === "sending" ? `${styles.send} ${styles.going}` : styles.send} type="submit" id="send" disabled={send === "sending"}>
              <span id="send-label">{send === "sending" ? "Sending" : send === "failed" ? "Try again" : "Send it"}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 2 15 22l-4-9-9-4z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
            <p className={send === "failed" ? `${styles.status} ${styles.err}` : styles.status} id="status" role="status" aria-live="polite">
              {send === "failed" && (
                <>
                  That didn&apos;t go through. Try again, or email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
                </>
              )}
            </p>
          </div>
        </form>

        <section ref={done} className={stage === "done" ? `${styles.done} ${styles.on}` : styles.done} id="done" aria-live="polite" tabIndex={-1}>
          <h2>It&apos;s on its way</h2>
          <p id="done-msg">
            {sentTo && (
              <>
                Thanks, <b>{sentTo.name}</b>. I&apos;ll reply to <b>{sentTo.email}</b> as soon as I can.
              </>
            )}
          </p>
          <button className={styles.again} type="button" id="again" onClick={again}>
            Write another
          </button>
        </section>

        {/* phones get the same links, under the note */}
        <section className={styles.directM} aria-label="Other ways to reach me">
          <p className={styles.eyebrow}>Or reach out directly</p>
          <Links />
        </section>
      </div>

      <aside className={styles.side}>
        <PlaneSky charge={FIELDS.filter(valid).length / FIELDS.length} sent={stage === "sent" || stage === "done"} />
        <section className={`${styles.direct} ${styles.rise}`} style={rise(4)} aria-labelledby="l-direct">
          <p className={styles.eyebrow} id="l-direct">
            Or reach out directly
          </p>
          <Links />
        </section>
      </aside>
    </div>
  );
}

async function post(value: Record<ContactField, string>) {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    return (await res.json()).success === true;
  } catch {
    return false;
  }
}

// the inline blanks grow with what's typed, measured against a hidden copy of the text
function fit(blank: HTMLElement | null, mirror: HTMLElement | null) {
  if (blank && mirror) blank.style.setProperty("--w", `${Math.ceil(mirror.offsetWidth) + 8}px`);
}

function Blank({
  field,
  label,
  state,
  invalid,
  value,
  onValue,
  ...input
}: {
  field: ContactField;
  label: string;
  state: string;
  invalid: boolean;
  value: string;
  onValue: (value: string) => void;
} & InputHTMLAttributes<HTMLInputElement>) {
  const blank = useRef<HTMLSpanElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  // every render, as the note's text and visibility both change the width
  useLayoutEffect(() => fit(blank.current, mirror.current));
  useEffect(() => {
    document.fonts?.ready.then(() => fit(blank.current, mirror.current));
  }, []);

  return (
    <span ref={blank} className={`${styles.blank} ${state}`} data-f={field}>
      <label className={styles.srOnly} htmlFor={field}>
        {label}
      </label>
      <input
        {...input}
        id={field}
        name={field}
        required
        aria-describedby="hint"
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      <span ref={mirror} className={styles.mirror} aria-hidden="true">
        {value || input.placeholder}
      </span>
    </span>
  );
}

function Links() {
  return (
    <ul className={styles.links}>
      <li>
        <EmailRow />
      </li>
      {LINKS.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noopener">
            <PlatformIcon name={link.icon} className={styles.plat} />
            <b>{link.label}</b>
            <span className={styles.arr} aria-hidden="true">
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function EmailRow() {
  const [label, setLabel] = useState("Copy");
  const addr = useRef<HTMLSpanElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setLabel("Copied");
    } catch {
      // no clipboard access: select the address so it can be copied by hand
      const range = document.createRange();
      if (addr.current) range.selectNodeContents(addr.current);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      setLabel("Selected");
    }
    setTimeout(() => setLabel("Copy"), 1800);
  }

  return (
    <div className={styles.row}>
      <PlatformIcon name="email" className={styles.plat} />
      <b>Email</b>
      <button type="button" className={styles.copy} onClick={copy}>
        {label}
      </button>
      <span ref={addr} className={styles.addr}>
        {EMAIL}
      </span>
    </div>
  );
}
