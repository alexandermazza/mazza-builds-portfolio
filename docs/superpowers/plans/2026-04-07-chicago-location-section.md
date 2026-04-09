# Chicago Location Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SPEC: LOCATION section to the about page with a two-column layout — text left, interactive Chicago SVG map right — featuring a cursor-following displacement warp effect.

**Architecture:** The Chicago SVG (from city-roads) lives in `public/` and is fetched + injected into the DOM at runtime so we can manipulate its internal elements. A `ChicagoMap` client component handles the fetch, defines an SVG displacement filter in `<defs>`, applies it to the street grid, and tracks the mouse to update the filter's radial gradient origin. The about page gets a new section between IDENTITY and SYSTEMS.

**Tech Stack:** React, SVG filters (`feImage`, `feDisplacementMap`), `requestAnimationFrame`, CSS Grid, existing design tokens from `.blueprint` palette.

---

### Task 1: Move Chicago SVG to public directory

**Files:**
- Move: `Chicago.svg` → `public/chicago-map.svg`

- [ ] **Step 1: Move the SVG file**

```bash
mv "Chicago.svg" "public/chicago-map.svg"
```

- [ ] **Step 2: Edit the SVG to remove the background rect**

Open `public/chicago-map.svg` and change the background rect fill to `"none"` so the page surface color shows through:

```xml
<!-- Change this: -->
<rect id="background" fill="#4a7fb5" x="0" y="0" width="1535" height="1264"></rect>

<!-- To this: -->
<rect id="background" fill="none" x="0" y="0" width="1535" height="1264"></rect>
```

Also update the stroke color on the `<g id="lines">` to use a CSS custom property fallback so it respects the blueprint palette:

```xml
<!-- Change this: -->
<g id="lines" fill="none" stroke-width="1" stroke="#1b3a5c">

<!-- To this: -->
<g id="lines" fill="none" stroke-width="0.8" stroke="var(--border, #1b3a5c)">
```

- [ ] **Step 3: Verify the file is accessible**

```bash
ls -lh public/chicago-map.svg
```

Expected: file exists, ~8MB.

- [ ] **Step 4: Commit**

```bash
git add public/chicago-map.svg
git commit -m "chore: add Chicago city-roads SVG to public directory"
```

---

### Task 2: Create ChicagoMap component — static SVG rendering

**Files:**
- Create: `src/components/effects/ChicagoMap.tsx`

This task gets the SVG loading, cropping, pin, and CHICAGO label working — no displacement filter yet.

- [ ] **Step 1: Create the ChicagoMap component**

Create `src/components/effects/ChicagoMap.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState } from "react";

interface ChicagoMapProps {
  className?: string;
}

export function ChicagoMap({ className = "" }: ChicagoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/chicago-map.svg")
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch(() => {
        /* SVG failed to load — component renders nothing */
      });
  }, []);

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const wrapper = container.querySelector(".chicago-svg-wrapper");
    if (!wrapper) return;

    // Inject raw SVG into DOM so we can manipulate it
    wrapper.innerHTML = svgContent;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    // Crop viewBox to emphasize east side / lakefront
    svg.setAttribute("viewBox", "400 0 1135 1264");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";
    svg.removeAttribute("version");

    // Remove the background rect (already set to fill="none" but ensure)
    const bg = svg.querySelector("#background");
    if (bg) bg.setAttribute("fill", "none");
  }, [svgContent]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Injected SVG goes here */}
      <div className="chicago-svg-wrapper h-full w-full" />

      {/* CHICAGO label — positioned over the lake negative space */}
      <span
        className="pointer-events-none absolute font-mono text-[48px] font-bold uppercase leading-none tracking-[0.08em]"
        style={{
          color: "var(--border-visible)",
          right: "5%",
          top: "20%",
        }}
      >
        CHICAGO
      </span>

      {/* Accent pin */}
      <div
        className="pointer-events-none absolute h-5 w-5 rounded-full"
        style={{
          backgroundColor: "var(--accent)",
          /* Approximate position for central Chicago in cropped viewBox */
          left: "35%",
          top: "45%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 0 4px rgba(255, 107, 53, 0.2)",
        }}
      />
    </div>
  );
}
```

Note: The pin position (`left: 35%`, `top: 45%`) and CHICAGO label position (`right: 5%`, `top: 20%`) are starting values. These will need visual tuning once the map renders — adjust percentages until the pin sits over central Chicago and the label sits comfortably in the lake area.

- [ ] **Step 2: Run the dev server and verify the SVG renders**

```bash
npm run dev
```

Navigate to `/about` and confirm:
- The map SVG loads and displays in the right column
- The viewBox crop shows the east side / lakefront prominently
- The CHICAGO label is visible in the lake area
- The orange pin is visible

- [ ] **Step 3: Commit**

```bash
git add src/components/effects/ChicagoMap.tsx
git commit -m "feat: add ChicagoMap component with static SVG rendering"
```

---

### Task 3: Add displacement filter interaction

**Files:**
- Modify: `src/components/effects/ChicagoMap.tsx`

- [ ] **Step 1: Add the displacement filter and mouse tracking**

Replace the full content of `src/components/effects/ChicagoMap.tsx` with:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface ChicagoMapProps {
  className?: string;
}

export function ChicagoMap({ className = "" }: ChicagoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const gradientRef = useRef<SVGRadialGradientElement | null>(null);
  const rafRef = useRef<number>(0);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    setIsMobile(window.matchMedia("(max-width: 767px)").matches);
  }, []);

  useEffect(() => {
    fetch("/chicago-map.svg")
      .then((res) => res.text())
      .then((text) => setSvgContent(text))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const container = containerRef.current;
    const wrapper = container.querySelector(".chicago-svg-wrapper");
    if (!wrapper) return;

    wrapper.innerHTML = svgContent;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    // Crop viewBox to emphasize east side / lakefront
    svg.setAttribute("viewBox", "400 0 1135 1264");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";
    svg.removeAttribute("version");

    // Remove background
    const bg = svg.querySelector("#background");
    if (bg) bg.setAttribute("fill", "none");

    // Skip filter setup if reduced motion or mobile
    if (prefersReduced || isMobile) return;

    const linesGroup = svg.querySelector("#lines");
    if (!linesGroup) return;

    // Create filter with displacement map
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");

    // Radial gradient for displacement
    const gradient = document.createElementNS(ns, "radialGradient");
    gradient.id = "displace-gradient";
    gradient.setAttribute("cx", "0.5");
    gradient.setAttribute("cy", "0.5");
    gradient.setAttribute("r", "0.15");

    const stop1 = document.createElementNS(ns, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "white");

    const stop2 = document.createElementNS(ns, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "black");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    // Displacement map rect (used as feImage source)
    const displaceRect = document.createElementNS(ns, "rect");
    displaceRect.id = "displace-source";
    displaceRect.setAttribute("width", "100%");
    displaceRect.setAttribute("height", "100%");
    displaceRect.setAttribute("fill", "url(#displace-gradient)");

    // Filter definition
    const filter = document.createElementNS(ns, "filter");
    filter.id = "warp";
    filter.setAttribute("x", "-10%");
    filter.setAttribute("y", "-10%");
    filter.setAttribute("width", "120%");
    filter.setAttribute("height", "120%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const feImage = document.createElementNS(ns, "feImage");
    feImage.setAttribute("href", "#displace-source");
    feImage.setAttribute("result", "displacementMap");

    const feDisplacement = document.createElementNS(ns, "feDisplacementMap");
    feDisplacement.setAttribute("in", "SourceGraphic");
    feDisplacement.setAttribute("in2", "displacementMap");
    feDisplacement.setAttribute("scale", "12");
    feDisplacement.setAttribute("xChannelSelector", "R");
    feDisplacement.setAttribute("yChannelSelector", "G");

    filter.appendChild(feImage);
    filter.appendChild(feDisplacement);
    defs.appendChild(filter);

    svg.insertBefore(defs, svg.firstChild);
    svg.insertBefore(displaceRect, defs.nextSibling);

    // Hide the displacement source rect visually
    displaceRect.style.opacity = "0";

    // Apply filter to street lines
    linesGroup.setAttribute("filter", "url(#warp)");

    // Store gradient ref for mouse tracking
    gradientRef.current = gradient;
  }, [svgContent, prefersReduced, isMobile]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced || isMobile || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      targetRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };

      if (rafRef.current) return;

      const animate = () => {
        const lerp = 0.12;
        currentRef.current.x +=
          (targetRef.current.x - currentRef.current.x) * lerp;
        currentRef.current.y +=
          (targetRef.current.y - currentRef.current.y) * lerp;

        if (gradientRef.current) {
          gradientRef.current.setAttribute(
            "cx",
            String(currentRef.current.x)
          );
          gradientRef.current.setAttribute(
            "cy",
            String(currentRef.current.y)
          );
        }

        const dx = targetRef.current.x - currentRef.current.x;
        const dy = targetRef.current.y - currentRef.current.y;

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          rafRef.current = 0;
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    },
    [prefersReduced, isMobile]
  );

  const handleMouseLeave = useCallback(() => {
    // Animate back to center
    targetRef.current = { x: 0.5, y: 0.5 };

    if (rafRef.current) return;

    const animate = () => {
      const lerp = 0.08;
      currentRef.current.x +=
        (targetRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y +=
        (targetRef.current.y - currentRef.current.y) * lerp;

      if (gradientRef.current) {
        gradientRef.current.setAttribute(
          "cx",
          String(currentRef.current.x)
        );
        gradientRef.current.setAttribute(
          "cy",
          String(currentRef.current.y)
        );
      }

      const dx = targetRef.current.x - currentRef.current.x;
      const dy = targetRef.current.y - currentRef.current.y;

      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = 0;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="chicago-svg-wrapper h-full w-full" />

      {/* CHICAGO label in the lake negative space */}
      <span
        className="pointer-events-none absolute font-mono text-[48px] font-bold uppercase leading-none tracking-[0.08em]"
        style={{
          color: "var(--border-visible)",
          right: "5%",
          top: "20%",
        }}
      >
        CHICAGO
      </span>

      {/* Accent pin */}
      <div
        className="pointer-events-none absolute h-5 w-5 rounded-full"
        style={{
          backgroundColor: "var(--accent)",
          left: "35%",
          top: "45%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 0 4px rgba(255, 107, 53, 0.2)",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Test the displacement effect in browser**

```bash
npm run dev
```

Navigate to `/about`. Hover over the map and verify:
- The street grid warps outward following the cursor
- The warp lerps smoothly (not snapping)
- Moving the cursor off the map animates the warp back to center
- No visual artifacts at map edges (overflow is hidden)

- [ ] **Step 3: Test reduced motion and mobile**

In browser DevTools:
- Enable "Prefer reduced motion" in Rendering tab — verify the map renders static (no filter applied)
- Toggle responsive mode to < 768px — verify the map is static

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/ChicagoMap.tsx
git commit -m "feat: add displacement filter hover effect to ChicagoMap"
```

---

### Task 4: Export ChicagoMap from barrel and wire into about page

**Files:**
- Modify: `src/components/effects/index.ts`
- Modify: `src/app/about/page.tsx`

- [ ] **Step 1: Add barrel export**

In `src/components/effects/index.ts`, add this line alongside the other exports:

```ts
export { ChicagoMap } from "./ChicagoMap";
```

- [ ] **Step 2: Add the SPEC: LOCATION section to the about page**

In `src/app/about/page.tsx`, add `ChicagoMap` to the effects import:

```tsx
import {
  ScrollLetterAnimation,
  SpecBlock,
  ConnectionLine,
  AnimatedRule,
  SystemDiagram,
  ProcessFlow,
  ExperienceTimeline,
  ScrollGridAnimation,
  ChicagoMap,
} from "@/components/effects";
```

Then add the new section between the closing `</section>` of SPEC: IDENTITY (line 85) and the opening of SPEC: SYSTEMS (line 88). Insert this block:

```tsx
        {/* Location Spec */}
        <section className="mb-[var(--space-4xl)]">
          <div className="grid grid-cols-1 gap-[var(--space-2xl)] md:grid-cols-[2fr_3fr] md:items-start">
            <SpecBlock label="SPEC: LOCATION">
              <p className="mb-[var(--space-md)] font-mono text-[13px] tracking-[0.06em] text-[var(--text-secondary)]">
                41.8781° N, 87.6298° W
              </p>
              <ScrollTextLines className="max-w-[400px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
                Based in Chicago — a city built on a grid, which felt
                appropriate.
              </ScrollTextLines>
            </SpecBlock>
            <ChicagoMap className="min-h-[300px] md:min-h-[400px]" />
          </div>
        </section>
```

- [ ] **Step 3: Verify the full section in browser**

```bash
npm run dev
```

Navigate to `/about` and confirm:
- SPEC: LOCATION appears between IDENTITY and SYSTEMS
- Two-column layout on desktop: text left with SpecBlock measurement line, map right
- Stacks on mobile: text on top, map below
- Map displacement effect works
- Pin and CHICAGO label are visible
- Page scrolls naturally — no layout shifts

- [ ] **Step 4: Commit**

```bash
git add src/components/effects/index.ts src/app/about/page.tsx
git commit -m "feat: add SPEC: LOCATION section to about page"
```

---

### Task 5: Visual tuning pass

**Files:**
- Modify: `src/components/effects/ChicagoMap.tsx`

This task is for adjusting values that can only be dialed in visually.

- [ ] **Step 1: Tune the viewBox crop**

Adjust the `viewBox` attribute in ChicagoMap.tsx. The starting value is `"400 0 1135 1264"`. Open the about page and experiment:
- Shift the first value (x origin) higher to crop more of the west side
- Reduce the third value (width) to zoom in tighter
- Goal: the lake takes up roughly the right 30-40% of the map, providing clear negative space for the CHICAGO label

- [ ] **Step 2: Tune the pin position**

Adjust the `left` and `top` percentages on the accent pin `<div>`. The pin should sit over the approximate Loop / central Chicago area in the cropped viewBox.

- [ ] **Step 3: Tune the CHICAGO label position**

Adjust `right` and `top` percentages on the CHICAGO `<span>`. It should sit comfortably in the lake area without overlapping street lines. Adjust `text-[48px]` up or down if needed — the label should feel like a blueprint region annotation.

- [ ] **Step 4: Tune displacement filter intensity**

Adjust the `scale` attribute on `feDisplacementMap` (currently `"12"`). Test values between 8 and 20. The warp should be noticeable on hover but not cartoonish. Also adjust the gradient `r` attribute (currently `"0.15"`) — larger values create a wider bulge area.

- [ ] **Step 5: Commit**

```bash
git add src/components/effects/ChicagoMap.tsx
git commit -m "style: tune ChicagoMap viewBox, pin position, and displacement intensity"
```
