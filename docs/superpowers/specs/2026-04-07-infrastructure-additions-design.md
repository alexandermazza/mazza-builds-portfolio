# Infrastructure Additions — Design Spec

**Date:** 2026-04-07
**Scope:** Footer component, infrastructure pages (404/error/loading), SEO files, preload hints, image optimization

---

## 1. Footer Component

**File:** `src/components/ui/Footer.tsx`
**Placement:** `src/app/layout.tsx`, rendered after `<TransitionContainer>` but inside `<TransitionProvider>`

### Structure

Three rows separated by `--border` horizontal rules:

1. **Nav links** — Home, Projects, About, Contact
   - `<TransitionLink>` for internal navigation (works with existing page transitions)
   - Space Mono, 11px, ALL CAPS, 0.08em tracking, `--text-secondary`
   - Horizontal flex, `--space-lg` gap
2. **Social links** — GitHub, Twitter, Email
   - External links with `target="_blank"` and `rel="noopener noreferrer"`
   - Same typography as nav links
   - `↗` suffix on external links
3. **Bottom row** — Two-column flex (space-between)
   - Left: `© 2026 MAZZA BUILDS`
   - Right: 3D model attribution (moved from homepage inline footer)
   - Both: Space Mono, 10px, ALL CAPS, 0.08em tracking, `--text-disabled`

### Layout

- Max-width `960px`, centered with `mx-auto`
- Horizontal padding: `--space-md` (mobile), `--space-lg` (md+)
- Vertical padding: `--space-xl` top and bottom
- Background: `--black` (inherits from body)

### Migration

- Remove the existing inline `<footer>` from `src/app/page.tsx` (lines 61-83)
- The 3D model attribution text and links move into the shared footer's bottom row

---

## 2. Infrastructure Pages

### 2a. `not-found.tsx`

**File:** `src/app/not-found.tsx`

- Server component (no `"use client"` needed)
- Centered vertically and horizontally (`min-h-screen flex items-center justify-center`)
- Content:
  - `404` — Space Grotesk, `--display-xl` (72px), `--text-display`
  - `[PAGE NOT FOUND]` — Space Mono, 13px, ALL CAPS, 0.06em tracking, `--text-secondary`
  - `<Button>` linking to `/` via `<TransitionLink>` — "Back to home"
- Spacing: `--space-lg` gap between elements
- No animations (this is an error state — don't make users wait)

### 2b. `error.tsx`

**File:** `src/app/error.tsx`

- **Must be a client component** (`"use client"`) — Next.js requirement
- Props: `{ error: Error & { digest?: string }; reset: () => void }`
- Same centered layout as not-found
- Content:
  - `[SYSTEM ERROR]` — Space Mono, 13px, ALL CAPS, `--text-secondary`
  - Error digest displayed if available: `REF: {digest}` — Space Mono, 11px, `--text-disabled`
  - `<Button onClick={reset}>` — "Try again"
- No error message content exposed to the user (security)

### 2c. `loading.tsx`

**File:** `src/app/loading.tsx`

- Server component
- Centered: `min-h-screen flex items-center justify-center`
- Content: `[LOADING...]` — Space Mono, 13px, ALL CAPS, 0.06em tracking, `--text-secondary`
- CSS animation: pulsing opacity (0.4 to 1.0), 1.5s ease-in-out infinite
- Defined in `globals.css` as `@keyframes pulse-text`
- Respects `prefers-reduced-motion` (already handled by the global reduced-motion rule in globals.css)

---

## 3. SEO

### 3a. `robots.ts`

**File:** `src/app/robots.ts`

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://mazzabuilds.com/sitemap.xml",
  };
}
```

### 3b. `sitemap.ts`

**File:** `src/app/sitemap.ts`

- Imports `projects` from `@/data/projects`
- Static routes: `/`, `/projects`, `/about`, `/contact`
- Dynamic routes: `/projects/${project.slug}` for each project
- `changeFrequency`: `monthly` for static, `weekly` for projects index
- `priority`: 1.0 for home, 0.8 for projects/about, 0.6 for contact, 0.7 for individual projects

### 3c. Per-page Metadata

**Root layout** (`src/app/layout.tsx`):
- Add `metadataBase: new URL("https://mazzabuilds.com")`
- Add `openGraph` defaults: type `"website"`, locale `"en_US"`, siteName `"Mazza Builds"`
- Add `twitter` defaults: card `"summary_large_image"`

**Per-page metadata exports:**

| Page | Title | Description |
|------|-------|-------------|
| `/` | `Mazza Builds` | `Portfolio of Alex Mazza — solo indie developer building iOS apps, Shopify tools, and AI systems` |
| `/projects` | `Projects — Mazza Builds` | `Things I've built — from iOS apps to trading bots to AI automation systems` |
| `/about` | `About — Mazza Builds` | `Solo indie developer based in the Midwest. I build things from concept to production.` |
| `/contact` | `Contact — Mazza Builds` | `Get in touch — have a project in mind, want to collaborate, or just say hello` |

**Note:** The contact page (`src/app/contact/page.tsx`) is a client component (`"use client"`). Client components cannot export `metadata` directly. Solution: extract the metadata into a separate `src/app/contact/layout.tsx` server component that wraps the page, or convert the contact page to a server component with a client form sub-component. The latter is cleaner — extract the form into `src/components/ui/ContactForm.tsx` (client) and keep the page as a server component that renders it.
| `/projects/[slug]` | `{project.name} — Mazza Builds` | `{project.description}` (dynamic via `generateMetadata`) |

### 3d. OG Image

**File:** `src/app/opengraph-image.tsx`

- Uses Next.js `ImageResponse` API
- Dimensions: 1200x630 (standard OG)
- Design: Black (`#000000`) background, "MAZZA BUILDS" centered in white, tagline "SOLO INDIE DEVELOPER" below in `--text-secondary` gray
- Font: Space Grotesk for title, Space Mono for tagline (loaded via fetch in the route)
- Single global image — not per-page

---

## 4. Preload & Image Optimization

### 4a. 3D Model Preload

**File:** `src/app/layout.tsx`

Add to `<head>` (or via Next.js metadata API):
- `<link rel="preload" as="fetch" crossOrigin="anonymous" href="/models/iphone.glb" />`
- `<link rel="preload" as="fetch" crossOrigin="anonymous" href="/models/macbook.glb" />`

These are 2.7MB and 4MB respectively. Preloading starts the fetch before React Three Fiber's lazy `useGLTF` hook requests them, shaving time off the initial 3D render.

`crossOrigin="anonymous"` is required because Three.js's loader uses fetch with CORS.

### 4b. Image Optimization

**File:** `src/app/projects/[slug]/page.tsx`

Replace the screenshot placeholder `<div>` elements with `next/image`:

```tsx
import Image from "next/image";

<Image
  src={imagePath}
  alt={`${project.name} screenshot ${i + 1}`}
  width={800}
  height={500}
  sizes="(max-width: 640px) 100vw, 50vw"
  className="..."
  placeholder="empty"
/>
```

- `width`/`height` set aspect ratio (16:10 to match existing placeholder)
- `sizes` tells Next.js to generate appropriate srcsets
- First image gets `priority` prop (above the fold)
- Remaining images lazy-load by default
- When images don't exist yet, the `<Image>` will 404 gracefully — the component still renders its dimensions correctly, just with no visual. The existing `[SCREENSHOT 01]` placeholder text can be shown as a fallback via CSS `:not([src])` or conditional rendering based on whether the image file exists.

**Decision:** Keep the current placeholder divs for now since images don't exist yet. Add a comment marking where `next/image` should be swapped in. The `next/image` pattern will be ready to drop in when screenshots are added.

---

## Files Changed (Summary)

| Action | File |
|--------|------|
| Create | `src/components/ui/Footer.tsx` |
| Create | `src/app/not-found.tsx` |
| Create | `src/app/error.tsx` |
| Create | `src/app/loading.tsx` |
| Create | `src/app/robots.ts` |
| Create | `src/app/sitemap.ts` |
| Create | `src/app/opengraph-image.tsx` |
| Modify | `src/app/layout.tsx` — add Footer, metadata, preload links |
| Modify | `src/app/page.tsx` — remove inline footer |
| Modify | `src/app/about/page.tsx` — add metadata export |
| Modify | `src/app/contact/page.tsx` — add metadata export |
| Modify | `src/app/projects/page.tsx` — add metadata export |
| Modify | `src/app/projects/[slug]/page.tsx` — add generateMetadata, next/image prep |
| Modify | `src/components/ui/index.ts` — export Footer |
| Modify | `src/app/globals.css` — add pulse-text keyframe |
