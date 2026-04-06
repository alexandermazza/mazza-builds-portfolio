import { gsap, TRANSITION_EASE, TRANSITION_DURATION } from "@/lib/gsap";

export function forwardTransition(
  current: HTMLElement,
  next: HTMLElement
): gsap.core.Timeline {
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

  tl.to(
    current,
    {
      y: "-30vh",
      opacity: 0.4,
      scale: 0.8,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

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
