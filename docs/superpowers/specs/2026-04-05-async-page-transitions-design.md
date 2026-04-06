# Async Page Transitions — Design Spec

## Overview

A reusable page transition system for the Mazza Builds portfolio, adapted from the [Codrops async page transitions tutorial](https://tympanus.net/codrops/2026/02/26/building-async-page-transitions-in-vanilla-javascript/). Translates the vanilla JS SPA router + GSAP pattern into a Next.js App Router–compatible architecture using a custom React context provider.

## Goals

- Smooth, choreographed transitions between pages (home, section pages, project detail pages)
- Forward and back transitions with distinct visual identities
- Reusable transition registry that scales as pages are added
- Nothing design language compliance (no springs, no scale distortion, flat surfaces)
- GSAP for transition choreography; Framer Motion retained for scroll-triggered component animations

## Architecture

Four components form the system:

### 1. TransitionProvider

React context provider in `layout.tsx`. Owns:

- Transition state: `idle` | `animating`
- `navigate(href)` function exposed via context
- Reference to the current `TransitionContainer` DOM element
- `isTransitioning` guard flag
- `popstate` listener for browser back/forward
- `prefers-reduced-motion` check — skips animations if enabled

### 2. TransitionContainer

Wrapper component used in `template.tsx` (remounts on every route change). On mount, registers its root DOM ref with the provider. This is the element that gets cloned during transitions.

### 3. TransitionLink

Drop-in replacement for `next/link`. Intercepts clicks and calls `provider.navigate(href)` instead of allowing default Next.js navigation. Accepts an optional `namespace` prop for explicit registry lookup. Falls through to normal `<a>` behavior for external links.

### 4. TransitionRegistry

A map of route-pair keys to GSAP animation functions. Ships with two defaults:

- `"default"` — forward transition (clip-path reveal from bottom)
- `"default-back"` — back transition (horizontal slide)

Custom entries can be added per route pair (e.g. `"home-to-project"`).

## Navigation Flow

1. User clicks `TransitionLink` → provider receives `navigate(href)`
2. Provider sets `isTransitioning = true`
3. Provider reads current `TransitionContainer` DOM ref, clones it via `cloneNode(true)`
4. Provider appends clone to a wrapper element (positioned fixed, layered above)
5. Provider calls `router.push(href)` — Next.js swaps the route, `template.tsx` remounts
6. New page's `TransitionContainer` registers its ref with provider
7. Provider waits for images in the new container to load (2s timeout max)
8. Provider looks up the transition function from the registry
9. GSAP timeline animates both containers simultaneously
10. Timeline completes → clone removed from DOM, state reset to `idle`
11. Enter choreography runs on the new page

## Transition Animations

### Forward (navigating deeper or lateral)

Triggered when navigating to a deeper or equal-depth route.

**Current page (clone):**
- `translateY(-20vh)`
- `opacity: 0.5`
- No scale transform
- Duration: `0.6s`
- Easing: `power2.out`

**Next page:**
- Initial: `clip-path: inset(100% 0% 0% 0%)`, `position: fixed`, full viewport
- Animate to: `clip-path: inset(0% 0% 0% 0%)`
- Duration: `0.6s`
- Easing: `power2.out`

Both run simultaneously on a single GSAP timeline at position `0`.

### Back (navigating up)

Triggered when navigating to a shallower route or via browser back button (`popstate`).

**Current page (clone):**
- `translateX(100%)`
- `opacity: 0.5`
- Duration: `0.6s`
- Easing: `power2.out`

**Next page:**
- Initial: `translateX(-30%)`, `opacity: 0.7`
- Animate to: `translateX(0)`, `opacity: 1`
- Duration: `0.6s`
- Easing: `power2.out`

### Direction Heuristic

- Compare URL path segment depth: `/projects/daily-roman` (depth 2) → `/projects` (depth 1) = back
- `popstate` events always trigger the back transition
- Equal depth = forward

### Enter Choreography (post-transition)

Runs after the transition timeline completes and cleanup finishes. Uses GSAP.

- **Headline**: characters translate from `y: 100%` → `y: 0`, stagger `0.02s`, `power3.out`, `0.5s` duration
- **Body elements**: `opacity: 0 → 1` + `y: 12px → 0`, stagger `0.06s`

On first page load (no preceding transition), enter choreography runs immediately on `TransitionContainer` mount.

### Nothing Design Constraints

- No spring/bounce easing — `power2.out` or equivalent cubic bezier only
- No scale transforms on page containers
- 0.6s duration — tight and purposeful
- No blur or shadow during transition — flat surfaces throughout
- `prefers-reduced-motion: reduce` → skip animations, instant swap

## File Structure

### New files

```
src/
├── lib/
│   └── gsap.ts                          # GSAP imports + custom eases
├── transitions/
│   ├── TransitionProvider.tsx            # Context provider, navigate(), lifecycle
│   ├── TransitionContainer.tsx           # DOM ref wrapper for template.tsx
│   ├── TransitionLink.tsx               # Drop-in <Link> replacement
│   ├── registry.ts                      # Route-pair → animation function map
│   ├── animations/
│   │   ├── forward.ts                   # Default forward transition
│   │   ├── back.ts                      # Default back transition
│   │   └── enter.ts                     # Page enter choreography
│   └── index.ts                         # Barrel export
```

### Modified files

- `src/app/layout.tsx` — wrap children with `<TransitionProvider>`
- `src/app/template.tsx` — new file (Next.js convention), wraps `{children}` in `<TransitionContainer>`

## Component APIs

### TransitionProvider

```tsx
// No props — wraps children in layout.tsx
<TransitionProvider>
  {children}
</TransitionProvider>
```

### TransitionContainer

```tsx
// No props — wraps children in template.tsx
<TransitionContainer>
  {children}
</TransitionContainer>
```

### TransitionLink

```tsx
// Same API surface as next/link, plus optional namespace
<TransitionLink href="/projects/daily-roman" namespace="project">
  View project
</TransitionLink>
```

- `namespace` — optional. Used for registry lookup. If omitted, derived from URL path segments.
- External links (different origin) fall through to normal `<a>` behavior.

### Registry

```ts
type TransitionFn = (
  current: HTMLElement,
  next: HTMLElement
) => gsap.core.Timeline;

const registry: Record<string, TransitionFn> = {
  "default": forwardTransition,
  "default-back": backTransition,
};

function getTransition(currentPath: string, nextPath: string): TransitionFn;
```

## Edge Cases

### Image loading
Wait for images in the next container to finish loading before starting the transition. Timeout after 2 seconds to avoid hanging.

### Rapid navigation
`isTransitioning` flag prevents double-navigation. Clicks on `TransitionLink` during an active transition are ignored.

### Browser back/forward
`popstate` listener triggers the back transition regardless of route depth.

### Scroll position
After transition completes, scroll new page to top via `window.scrollTo(0, 0)`. No scroll restoration for back navigation initially.

### Reduced motion
`window.matchMedia('(prefers-reduced-motion: reduce)')` checked in the provider. If true, Next.js navigates normally with no animation.

### First page load
No transition on initial visit. Enter choreography still runs, triggered by `TransitionContainer` mounting without a preceding transition.

## Dependencies

- `gsap` — core only, no Club plugins required. Handles `clip-path`, `opacity`, and `transform` natively.
- No new Framer Motion usage in the transition layer.

## Reference

- [Codrops tutorial](https://tympanus.net/codrops/2026/02/26/building-async-page-transitions-in-vanilla-javascript/)
- [Demo](https://async-page-transitions.crnacura.workers.dev/)
- [Source code](https://github.com/blenkcode/codrops-demo)
