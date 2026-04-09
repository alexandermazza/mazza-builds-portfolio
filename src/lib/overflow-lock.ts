/**
 * Ref-counted body overflow lock.
 *
 * Multiple components (TerminalHero, ExpandingMenu, TransitionProvider)
 * independently need to prevent scrolling. A simple set/clear on
 * `document.body.style.overflow` causes them to step on each other.
 *
 * Usage:
 *   lockOverflow();   // increment — sets overflow:hidden
 *   unlockOverflow(); // decrement — only clears when count reaches 0
 */

let lockCount = 0;

export function lockOverflow() {
  lockCount++;
  document.body.style.overflow = "hidden";
}

export function unlockOverflow() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
}
