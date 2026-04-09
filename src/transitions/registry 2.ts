import type gsap from "gsap";

export type TransitionFn = (
  current: HTMLElement,
  next: HTMLElement
) => gsap.core.Timeline;

// Lazy imports — animation modules register themselves
let forwardFn: TransitionFn | null = null;
let backFn: TransitionFn | null = null;

export function registerTransitions(forward: TransitionFn, back: TransitionFn) {
  forwardFn = forward;
  backFn = back;
}

/**
 * Determine navigation direction from URL path depth.
 * Deeper or equal = forward, shallower = back.
 */
export function getDirection(
  currentPath: string,
  nextPath: string
): "forward" | "back" {
  const currentDepth = currentPath.split("/").filter(Boolean).length;
  const nextDepth = nextPath.split("/").filter(Boolean).length;
  return nextDepth < currentDepth ? "back" : "forward";
}

/**
 * Look up the transition animation for a given route change.
 * popstate always uses the back transition.
 */
export function getTransition(
  currentPath: string,
  nextPath: string,
  isPopState = false
): TransitionFn {
  if (!forwardFn || !backFn) {
    throw new Error("Transitions not registered. Call registerTransitions() first.");
  }

  if (isPopState) return backFn;

  const direction = getDirection(currentPath, nextPath);
  return direction === "back" ? backFn : forwardFn;
}
