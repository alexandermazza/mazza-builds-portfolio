import { gsap, TRANSITION_EASE, TRANSITION_DURATION } from "@/lib/gsap";

export function backTransition(
  current: HTMLElement,
  next: HTMLElement
): gsap.core.Timeline {
  gsap.set(next, {
    x: "-30%",
    opacity: 0.7,
    scale: 0.8,
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    zIndex: 45,
  });

  gsap.set(current, { zIndex: 50 });

  const tl = gsap.timeline();

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

  tl.to(
    next,
    {
      x: "0%",
      opacity: 1,
      scale: 1,
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
      force3D: true,
    },
    0
  );

  return tl;
}
