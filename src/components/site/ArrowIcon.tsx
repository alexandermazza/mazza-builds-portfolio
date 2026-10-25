// The outbound-link arrow, drawn: the "↗" character isn't in the site's fonts, so phones fall back to an emoji.
// Sized in em, so it follows the text it sits beside. Decorative: the link's label says where it goes.
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="0.75em"
      height="0.75em"
      // the Tailwind reset makes every svg a block, which would drop the arrow onto its own line
      style={{ display: "inline-block", verticalAlign: "baseline" }}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}
