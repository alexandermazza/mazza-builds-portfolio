import { gsap, ENTER_EASE } from "@/lib/gsap";

/**
 * Animate elements marked with [data-enter] after a page transition completes.
 * Elements without this attribute are left to Framer Motion scroll triggers.
 */
export function enterAnimation(container: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();

  const enterEls = container.querySelectorAll<HTMLElement>("[data-enter]");
  if (enterEls.length === 0) return tl;

  tl.fromTo(
    enterEls,
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: ENTER_EASE,
      stagger: 0.06,
    }
  );

  return tl;
}
