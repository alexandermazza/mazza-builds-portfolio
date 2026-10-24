"use client";

import { useSyncExternalStore } from "react";

const never = () => () => {};

/** The year in the browser. Static pages are built once, so they hydrate with the build's year, then move on. */
export function Year({ built }: { built: number }) {
  return useSyncExternalStore(never, () => new Date().getFullYear(), () => built);
}
