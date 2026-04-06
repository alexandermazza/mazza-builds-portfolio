import { gsap, TRANSITION_EASE, TRANSITION_DURATION } from "@/lib/gsap";

export function forwardTransition(
  current: HTMLElement,
  next: HTMLElement
): gsap.core.Timeline {
  // Position next page fixed, hidden behind clip-path
  gsap.set(next, {
    clipPath: "inset(100% 0% 0% 0%)",
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    zIndex: 50,
    opacity: 1,
  });

  const tl = gsap.timeline();

  // Current page slides up and fades
  tl.to(
    current,
    {
      y: "-20vh",
      opacity: 0.5,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  // Next page reveals from bottom
  tl.to(
    next,
    {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  return tl;
}
