"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Textarea, FormStatus } from "@/components/ui";
import { MagneticWrapper, LinkHover } from "@/components/effects";

type FormState = "idle" | "sending" | "sent" | "error";

const directLinks = [
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
];

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("sending");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setFormState("sent");
        (e.target as HTMLFormElement).reset();
      } else {
        setFormState("error");
        setErrorMessage(data.error || "Something went wrong");
      }
    } catch {
      setFormState("error");
      setErrorMessage("Failed to send");
    }
  }

  return (
    <div className="grid gap-[var(--space-2xl)] md:gap-[var(--space-4xl)] md:grid-cols-[2fr_1fr]">
      {/* Form */}
      <section>
        <form onSubmit={handleSubmit} className="grid gap-[var(--space-2xl)]">
          <Input label="Name" name="name" type="text" required />
          <Input label="Email" name="email" type="email" required />
          <Textarea label="Message" name="message" required />
          <div className="flex items-center gap-[var(--space-lg)]">
            <MagneticWrapper>
              <Button type="submit" disabled={formState === "sending"}>
                {formState === "sending" ? "Sending..." : "Send message"}
              </Button>
            </MagneticWrapper>
            <FormStatus state={formState} errorMessage={errorMessage} />
          </div>
        </form>
      </section>

      {/* Direct links */}
      <section>
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          DIRECT
        </p>
        <div className="flex flex-col gap-[var(--space-md)]">
          {directLinks.map((link) => (
            <LinkHover key={link.label} href={link.href}>
              <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {link.label}
              </span>
            </LinkHover>
          ))}
        </div>
      </section>
    </div>
  );
}
