"use client";

interface SplitFlapTextProps {
  children: string;
  className?: string;
  staggerMs?: number;
  /** When true, omits the group/flap wrapper — expects an ancestor with `group/flap` */
  externalTrigger?: boolean;
  /** When true, applies the flip transform directly (bypasses CSS hover trigger) */
  isActive?: boolean;
}

export function SplitFlapText({
  children,
  className = "",
  staggerMs = 30,
  externalTrigger = false,
  isActive,
}: SplitFlapTextProps) {
  const chars = children.split("");

  return (
    <span className={`${externalTrigger ? "" : "group/flap "}inline-flex ${className}`} aria-label={children}>
      {chars.map((char, i) => (
        <span
          key={`${char}-${i}`}
          className="inline-block overflow-hidden leading-[1.3]"
          style={{ height: "1.3em" }}
          aria-hidden="true"
        >
          <span
            className={`block transition-transform ${isActive === undefined ? "group-hover/flap:-translate-y-1/2" : ""}`}
            style={{
              transitionDuration: "var(--duration-transition)",
              transitionTimingFunction: "var(--ease-out)",
              transitionDelay: `${i * staggerMs}ms`,
              ...(isActive !== undefined ? { transform: isActive ? "translateY(-50%)" : "translateY(0)" } : {}),
            }}
          >
            <span className="block">{char === " " ? "\u00A0" : char}</span>
            <span className="block">{char === " " ? "\u00A0" : char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
