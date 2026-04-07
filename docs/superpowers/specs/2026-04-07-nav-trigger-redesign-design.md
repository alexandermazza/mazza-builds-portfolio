# Nav Trigger Redesign

## Problem

The current navigation trigger is a 44px circle containing a 6px dot, fixed to the bottom-right corner. Users miss it entirely and never discover the expanding overlay menu. The overlay animation itself is great — only the trigger and close UX need improvement.

## Scope

- Replace dot trigger with a recognizable hamburger icon
- Add hamburger-to-X morph animation on open/close
- Remove the separate close button — the trigger button doubles as the close button
- Add click-outside-to-dismiss on the overlay
- Mobile optimization for touch targets and icon sizing
- Preserve all existing behavior: clip-path expansion, menu item stagger, link styles, Escape key close, reduced-motion support

## Design

### 1. Hamburger Icon Trigger

**Replaces:** The 6px inner dot inside the 44px circular button.

**Icon spec:**
- Three horizontal lines, monoline 1.5px stroke
- Line width: 20px
- Line gap: 5px between each line (center-to-center ~6.5px)
- Color: `--text-secondary`, hover: `--text-primary`
- Transition on hover: `--duration-micro` with `--ease-out`

**Button spec (unchanged position/size):**
- Fixed position: `bottom: var(--space-lg), right: var(--space-lg)`
- Size: 44px x 44px (meets WCAG touch target minimum)
- `z-[9999]` — floats above the overlay at all times
- Border: `--border-visible`, background: `--surface`
- `border-radius: 50%` (circle)
- `aria-label`: toggles between "Open menu" and "Close menu"

**Mobile considerations:**
- Touch target remains 44px minimum (already compliant)
- On mobile viewports (< 768px), increase button to 48px for more comfortable thumb reach
- Position adjusts: `bottom: var(--space-md), right: var(--space-md)` on mobile to sit closer to screen edge without being clipped

### 2. Hamburger-to-X Morph Animation

When the menu opens, the three hamburger lines transform into an X:

**Open transition:**
1. Top line: rotates 45deg clockwise, translates down to center
2. Middle line: fades to opacity 0 and scales horizontally to 0
3. Bottom line: rotates -45deg counter-clockwise, translates up to center

**Close transition:** Reverse of open.

**Timing:**
- Duration: 0.3s (`DURATION.transition`)
- Easing: `EASE_OUT` cubic-bezier(0.25, 0.1, 0.25, 1)
- Starts immediately on click — runs concurrently with the clip-path overlay expansion
- The morph should feel like it's part of the same gesture as the overlay expanding

**Color shift:**
- Hamburger state (closed): lines use `--text-secondary`
- X state (open): lines use `--text-primary` for visibility against overlay

**Reduced motion:**
- With `prefers-reduced-motion: reduce`, skip the rotation/translation. Instead, instantly swap between hamburger and X (opacity crossfade, 0.15s).

### 3. Close Button Consolidation

**Remove:** The separate X close button currently positioned in the top-right of the overlay.

**Replace with:** The trigger button itself. Since it persists above the overlay at `z-[9999]` and morphs to an X, it serves as both open and close.

The button's `onClick` handler toggles between open and close. The `aria-label` updates to match current state.

### 4. Click-Outside Dismiss

When the overlay is open, clicking any area of the overlay that is **not** a menu link closes the menu.

**Implementation:**
- The overlay container gets an `onClick` handler
- Menu links call `e.stopPropagation()` to prevent the overlay's click handler from firing
- Clicking empty overlay space triggers the standard close sequence: reverse clip-path animation + X-to-hamburger morph

**Mobile considerations:**
- Touch events on the overlay work the same way — tap empty space to dismiss
- Sufficient spacing between menu links to avoid accidental dismiss when trying to tap a link

### 5. Close Methods Summary

| Method | Trigger | Animation |
|--------|---------|-----------|
| Hamburger/X button | Click the floating button | Reverse clip-path + X-to-hamburger morph |
| Click outside | Tap empty overlay area | Same as above |
| Escape key | Press Escape (existing) | Same as above |

All three methods produce the identical closing animation.

### 6. What Stays the Same

- Clip-path circle expansion from bottom-right corner
- Menu item stagger animation (fade up, 0.08s delay)
- Menu link styles, text sizing, hover states
- `TransitionLink` integration for page navigation
- Body scroll lock when overlay is open
- Escape key handler

## Files to Modify

- `src/components/effects/ExpandingMenu.tsx` — all changes are in this single component

## Out of Scope

- Menu link styles or hover effects
- Overlay background color or opacity
- Menu item list or ordering
- Adding a persistent top nav bar
