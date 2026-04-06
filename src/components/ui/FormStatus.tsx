"use client";

type FormState = "idle" | "sending" | "sent" | "error";

interface FormStatusProps {
  state: FormState;
  errorMessage?: string;
  className?: string;
}

const labels: Record<FormState, string> = {
  idle: "",
  sending: "[SENDING...]",
  sent: "[SENT]",
  error: "[ERROR]",
};

const colors: Record<FormState, string> = {
  idle: "var(--text-secondary)",
  sending: "var(--text-secondary)",
  sent: "var(--success)",
  error: "var(--error)",
};

export function FormStatus({ state, errorMessage, className = "" }: FormStatusProps) {
  if (state === "idle") return null;

  const text = state === "error" && errorMessage
    ? `[ERROR: ${errorMessage}]`
    : labels[state];

  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.08em] ${className}`}
      style={{ color: colors[state] }}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
