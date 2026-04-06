import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
}

export { gsap, ScrollTrigger };

/** Closer to the Codrops demo custom curve — dramatic in-out */
export const TRANSITION_EASE = "power2.inOut";

/** Enter choreography ease */
export const ENTER_EASE = "power3.out";

/** Transition duration — matches Codrops demo */
export const TRANSITION_DURATION = 0.7;
