/**
 * Mazza Builds — Motion Constants
 * Used with Framer Motion (motion/react) throughout the site.
 */

export const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const SPRING_FLUID = {
  type: "spring" as const,
  stiffness: 180,
  damping: 24,
};

export const SPRING_BOUNCY = {
  type: "spring" as const,
  stiffness: 550,
  damping: 22,
};

export const SCROLL_VELOCITY_MULTIPLIER = 0.3;

export const CHAR_SCATTER_STAGGER = 0.02;

export const TEXT_REVEAL_STAGGER = 0.035;

export const LINE_REVEAL_STAGGER = 0.08;

export const TICKER_SPEED = 60;

/** Nothing-style ease-out for non-spring animations */
export const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

/** Framer Motion compatible easing tuple */
export const EASE_OUT_MOTION: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/** Standard durations */
export const DURATION = {
  micro: 0.15,
  transition: 0.3,
} as const;
