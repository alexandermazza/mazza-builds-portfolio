export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
        style={{ animation: "pulse-text 1.5s ease-in-out infinite" }}
      >
        [LOADING...]
      </p>
    </div>
  );
}
