# Nav Trigger Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the invisible dot trigger with a hamburger icon that morphs to an X, add click-outside dismiss, and remove the separate close button.

**Architecture:** Single-component refactor of `ExpandingMenu.tsx`. The hamburger icon is three `<span>` elements with CSS transforms controlled by the `isOpen` state. Click-outside dismiss is handled by an `onClick` on the overlay container with `stopPropagation` on menu links. Mobile viewports get a slightly larger touch target.

**Tech Stack:** React, Framer Motion (`motion/react`), Tailwind CSS, existing motion constants from `src/lib/motion.ts`

**Spec:** `docs/superpowers/specs/2026-04-07-nav-trigger-redesign-design.md`

---

### Task 1: Replace dot with hamburger icon

**Files:**
- Modify: `src/components/effects/ExpandingMenu.tsx:51-62`

- [ ] **Step 1: Replace the dot span with three hamburger lines**

Replace the trigger button's inner content (lines 59-61) and update the button to toggle `isOpen`:

```tsx
{/* Trigger button */}
<button
  onClick={() => setIsOpen((prev) => !prev)}
  className="fixed bottom-[var(--space-lg)] right-[var(--space-lg)] z-[9999] flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--border-visible)] bg-[var(--surface)] transition-colors hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)] md:h-[44px] md:w-[44px] max-md:bottom-[var(--space-md)] max-md:right-[var(--space-md)] max-md:h-[48px] max-md:w-[48px]"
  style={{
    transitionDuration: "var(--duration-micro)",
    transitionTimingFunction: "var(--ease-out)",
  }}
  aria-label={isOpen ? "Close menu" : "Open menu"}
>
  <span className="sr-only">Menu</span>
  <div className="flex w-[20px] flex-col items-center gap-[5px]">
    <span
      className="block h-[1.5px] w-full origin-center bg-current transition-all"
      style={{
        transitionDuration: `${DURATION.transition}s`,
        transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
        transform: isOpen ? "translateY(6.5px) rotate(45deg)" : "none",
        color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    />
    <span
      className="block h-[1.5px] w-full origin-center bg-current transition-all"
      style={{
        transitionDuration: `${DURATION.transition}s`,
        transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
        opacity: isOpen ? 0 : 1,
        transform: isOpen ? "scaleX(0)" : "none",
        color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    />
    <span
      className="block h-[1.5px] w-full origin-center bg-current transition-all"
      style={{
        transitionDuration: `${DURATION.transition}s`,
        transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
        transform: isOpen ? "translateY(-6.5px) rotate(-45deg)" : "none",
        color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    />
  </div>
</button>
```

Key changes from the original trigger:
- `onClick` toggles `isOpen` instead of only setting to `true` — this button now serves as both open and close
- `z-[9999]` (was `9998`) so it sits above the overlay
- `aria-label` is dynamic based on `isOpen`
- Three `<span>` lines replace the single dot `<span>`
- Each line uses inline `style` for `transform`, `opacity`, and `color` driven by `isOpen`
- `translateY(6.5px)` moves the top line to center (gap 5px + half of line height), then rotates 45deg
- `translateY(-6.5px)` moves the bottom line up to center, rotates -45deg
- Middle line fades out and scales to 0
- Mobile: `max-md:` classes bump button to 48px and position closer to edge

- [ ] **Step 2: Verify the hamburger renders and morphs**

Run the dev server and check:
```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npm run dev
```

Open `http://localhost:3000`. Verify:
- Three horizontal lines visible in bottom-right button
- Clicking toggles between hamburger and X
- X morph animation is smooth (top/bottom lines rotate, middle fades)
- Clicking again morphs back to hamburger
- On mobile viewport (< 768px), button is 48px and closer to edge

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/ExpandingMenu.tsx
git commit -m "feat: replace nav dot with hamburger icon + morph-to-X animation"
```

---

### Task 2: Remove the separate close button

**Files:**
- Modify: `src/components/effects/ExpandingMenu.tsx:90-97`

- [ ] **Step 1: Delete the close button inside the overlay**

Remove the entire close button block inside the overlay (lines 90-97 in the original file):

```tsx
{/* Close button */}
<button
  onClick={close}
  className="absolute top-[var(--space-lg)] right-[var(--space-lg)] flex h-[44px] w-[44px] items-center justify-center font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
  aria-label="Close menu"
>
  ✕
</button>
```

Delete this entire block. The trigger button (which now morphs to X and sits above the overlay at `z-[9999]`) handles closing.

- [ ] **Step 2: Verify close still works**

Open the menu. Verify:
- No "✕" button in the top-right of the overlay
- The hamburger/X button in the bottom-right still closes the menu
- Escape key still closes the menu

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/ExpandingMenu.tsx
git commit -m "refactor: remove separate close button, trigger button handles both open/close"
```

---

### Task 3: Add click-outside dismiss

**Files:**
- Modify: `src/components/effects/ExpandingMenu.tsx` (overlay `<motion.div>` and menu link `<TransitionLink>`)

- [ ] **Step 1: Add onClick handler to overlay container**

On the overlay `<motion.div>` (the `fixed inset-0` element), add an `onClick` to close:

```tsx
<motion.div
  className="fixed inset-0 z-[9998] flex flex-col items-center justify-center"
  style={{ backgroundColor: "var(--surface)" }}
  onClick={close}
  // ... existing initial/animate/exit/transition props unchanged
>
```

- [ ] **Step 2: Add stopPropagation to menu links**

Wrap each `TransitionLink`'s `onClick` to prevent the overlay's click handler from firing when a link is clicked. Update the `TransitionLink` inside the items map:

```tsx
<TransitionLink
  href={item.href}
  onClick={(e: React.MouseEvent) => {
    e.stopPropagation();
    close();
  }}
  className="block font-mono text-[clamp(24px,5vw,48px)] uppercase tracking-[0.06em] text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
  style={{
    transitionDuration: "var(--duration-micro)",
    transitionTimingFunction: "var(--ease-out)",
  }}
>
  {item.label}
</TransitionLink>
```

The `e.stopPropagation()` prevents the click from bubbling up to the overlay's `onClick={close}`, which would otherwise fire and interfere with the navigation transition.

- [ ] **Step 3: Verify click-outside works**

Open the menu. Verify:
- Clicking empty space on the overlay closes the menu with the reverse animation
- Clicking a menu link navigates (does NOT just close)
- Clicking the X button still closes
- Escape key still closes

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ExpandingMenu.tsx
git commit -m "feat: add click-outside dismiss to nav overlay"
```

---

### Task 4: Add reduced-motion support for hamburger morph

**Files:**
- Modify: `src/components/effects/ExpandingMenu.tsx` (trigger button lines)

- [ ] **Step 1: Use reducedMotion state for line transitions**

Update each of the three hamburger `<span>` elements to use instant transitions when reduced motion is preferred. Change the `transitionDuration` on each line:

```tsx
style={{
  transitionDuration: reducedMotion ? "0s" : `${DURATION.transition}s`,
  transitionTimingFunction: `cubic-bezier(${EASE_OUT_MOTION.join(",")})`,
  transform: isOpen ? "translateY(6.5px) rotate(45deg)" : "none",
  color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
}}
```

Apply the same `transitionDuration: reducedMotion ? "0s" : ...` pattern to all three lines.

- [ ] **Step 2: Verify reduced motion behavior**

In browser DevTools, enable "Emulate CSS media feature prefers-reduced-motion: reduce". Open and close the menu. Verify:
- Hamburger/X swap is instant (no rotation animation)
- Overlay still fades in/out (already handled by existing reduced motion code)

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/ExpandingMenu.tsx
git commit -m "feat: respect prefers-reduced-motion for hamburger morph animation"
```

---

### Task 5: Final verification

**Files:** None (testing only)

- [ ] **Step 1: Run TypeScript check**

```bash
cd "/Users/alexmazza/Documents/projects/Mazza Builds Portfolio" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Full manual test**

Open `http://localhost:3000`. Test the complete flow:

1. Hamburger icon visible in bottom-right — three horizontal lines
2. Click hamburger → lines morph to X, overlay expands from bottom-right
3. Menu items stagger in with fade-up animation
4. Click empty overlay space → overlay closes, X morphs back to hamburger
5. Re-open → click X button → closes
6. Re-open → press Escape → closes
7. Re-open → click a menu link → navigates to page, menu closes
8. Resize to mobile (< 768px) → button is 48px, positioned with `--space-md` offset
9. Enable reduced motion in DevTools → hamburger/X swap is instant, overlay fades

- [ ] **Step 3: Commit any final adjustments if needed**

```bash
git add src/components/effects/ExpandingMenu.tsx
git commit -m "fix: final nav trigger adjustments"
```
