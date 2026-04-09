"use client";

interface SplitFlapTextProps {
  children: string;
  /** Text to flip to — bottom half shows toText characters instead of duplicating children */
  toText?: string;
  className?: string;
  staggerMs?: number;
  /** When true, omits the group/flap wrapper — expects an ancestor with `group/flap` */
  externalTrigger?: boolean;
  /** When true, applies the flip transform directly (bypasses CSS hover trigger) */
  isActive?: boolean;
}

export function SplitFlapText({
  children,
  toText,
  className = "",
  staggerMs = 30,
  externalTrigger = false,
  isActive,
}: SplitFlapTextProps) {
  const fromChars = children.split("");
  const toChars = toText ? toText.split("") : fromChars;
  const maxLen = Math.max(fromChars.length, toChars.length);

  const label = isActive && toText ? toText : children;

  return (
    <span className={`${externalTrigger ? "" : "group/flap "}inline-flex ${className}`} aria-label={label}>
      {Array.from({ length: maxLen }, (_, i) => {
        const fromChar = fromChars[i];
        const toChar = toChars[i];
        const fromExists = fromChar !== undefined;
        const toExists = toChar !== undefined;

        // Slot only exists in one string — animate width
        const dynamic = toText !== undefined && (!fromExists || !toExists);
        const expanded = dynamic
          ? (toExists && !fromExists ? isActive : !isActive)
          : true;

        return (
          <span
            key={i}
            className="inline-block overflow-hidden leading-[1.3]"
            style={{
              height: "1.3em",
              ...(dynamic
                ? {
                    width: expanded ? "1ch" : "0px",
                    transitionProperty: "width",
                    transitionDuration: "var(--duration-transition)",
                    transitionTimingFunction: "var(--ease-out)",
                    transitionDelay: `${i * staggerMs}ms`,
                  }
                : {}),
            }}
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
              <span className="block">{!fromExists || fromChar === " " ? "\u00A0" : fromChar}</span>
              <span className="block">{!toExists || toChar === " " ? "\u00A0" : toChar}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
