import { gsap, TRANSITION_EASE, TRANSITION_DURATION } from "@/lib/gsap";

export function backTransition(
  current: HTMLElement,
  next: HTMLElement
): gsap.core.Timeline {
  // Next page starts shifted left, underneath
  gsap.set(next, {
    x: "-30%",
    opacity: 0.7,
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    zIndex: 45,
  });

  // Current page (clone) stays on top
  gsap.set(current, { zIndex: 50 });

  const tl = gsap.timeline();

  // Current page slides out to the right
  tl.to(
    current,
    {
      x: "100%",
      opacity: 0.5,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  // Next page slides into place
  tl.to(
    next,
    {
      x: "0%",
      opacity: 1,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  return tl;
}
