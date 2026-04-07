# Infrastructure Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared footer, infrastructure pages (404/error/loading), SEO files, preload hints, and image optimization prep to the portfolio site.

**Architecture:** All additions are leaf files — no architectural changes to the existing transition system, component patterns, or data layer. The footer is a new UI component rendered in the root layout. Infrastructure pages use Next.js file conventions. SEO uses Next.js Metadata API. Preload uses `<link>` tags in layout head. Image optimization preps `next/image` for when screenshots are added.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, CSS custom properties (Nothing design system tokens)

**Spec:** `docs/superpowers/specs/2026-04-07-infrastructure-additions-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/ui/Footer.tsx` | Shared footer with nav, socials, copyright, attribution |
| Create | `src/app/not-found.tsx` | Custom 404 page |
| Create | `src/app/error.tsx` | Error boundary |
| Create | `src/app/loading.tsx` | Loading state |
| Create | `src/app/robots.ts` | Robots.txt generation |
| Create | `src/app/sitemap.ts` | Sitemap.xml generation |
| Create | `src/app/opengraph-image.tsx` | OG image generation |
| Create | `public/fonts/SpaceGrotesk-Bold.ttf` | Font file for OG image rendering |
| Create | `public/fonts/SpaceMono-Regular.ttf` | Font file for OG image rendering |
| Modify | `src/app/layout.tsx` | Add Footer, metadata, preload links |
| Modify | `src/app/page.tsx` | Remove inline footer, add metadata |
| Modify | `src/app/about/page.tsx` | Add metadata export |
| Modify | `src/app/contact/page.tsx` | Extract client form, add metadata |
| Create | `src/components/ui/ContactForm.tsx` | Client form extracted from contact page |
| Modify | `src/app/projects/page.tsx` | Add metadata export |
| Modify | `src/app/projects/[slug]/page.tsx` | Add generateMetadata, next/image prep |
| Modify | `src/components/ui/index.ts` | Export Footer |
| Modify | `src/app/globals.css` | Add pulse-text keyframe |

---

### Task 1: Footer Component

**Files:**
- Create: `src/components/ui/Footer.tsx`
- Modify: `src/components/ui/index.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create Footer component**

Create `src/components/ui/Footer.tsx`:

```tsx
"use client";

import { TransitionLink } from "@/transitions";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const socialLinks = [
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-xl)]">
      {/* Nav links */}
      <div className="flex flex-wrap gap-[var(--space-lg)] pb-[var(--space-lg)]">
        {navLinks.map((link) => (
          <TransitionLink
            key={link.label}
            href={link.href}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{
              transitionDuration: "var(--duration-micro)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {link.label}
          </TransitionLink>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      {/* Social links */}
      <div className="flex flex-wrap gap-[var(--space-lg)] py-[var(--space-lg)]">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            style={{
              transitionDuration: "var(--duration-micro)",
              transitionTimingFunction: "var(--ease-out)",
            }}
          >
            {link.label} ↗
          </a>
        ))}
      </div>

      <div className="h-px w-full bg-[var(--border)]" />

      {/* Bottom row */}
      <div className="flex flex-col gap-[var(--space-sm)] pt-[var(--space-lg)] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          &copy; {new Date().getFullYear()} MAZZA BUILDS
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          3D models:{" "}
          <a
            href="https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            iPhone 17 Pro Max
          </a>{" "}
          by MajdyModels,{" "}
          <a
            href="https://sketchfab.com/3d-models/macbook-pro-m3-16-inch-2024-8e34fc2b303144f78490007d91ff57c4"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            MacBook Pro M3
          </a>{" "}
          by jackbaeten — CC-BY-4.0
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Add Footer to barrel export**

Add this line to `src/components/ui/index.ts`:

```ts
export { Footer } from "./Footer";
```

- [ ] **Step 3: Add Footer to root layout**

In `src/app/layout.tsx`, add the Footer import and render it after `<TransitionContainer>`:

Import:
```ts
import { Footer } from "@/components/ui";
```

Replace the body content:
```tsx
<body className="min-h-full flex flex-col">
  <TransitionProvider>
    <TransitionContainer>{children}</TransitionContainer>
    <Footer />
    <ExpandingMenu items={menuItems} />
  </TransitionProvider>
</body>
```

- [ ] **Step 4: Remove inline footer from homepage**

In `src/app/page.tsx`, delete the entire `{/* Attribution */}` footer block (lines 61-83 — the `<footer>` element with 3D model credits). This content now lives in the shared Footer component.

- [ ] **Step 5: Verify the dev server renders the footer**

Run: `npm run dev`

Check: Visit `/`, `/projects`, `/about`, `/contact` — footer should appear on all pages with nav links, social links, and attribution.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Footer.tsx src/components/ui/index.ts src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add shared Footer component to all pages"
```

---

### Task 2: Loading Page + CSS Keyframe

**Files:**
- Create: `src/app/loading.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add pulse-text keyframe to globals.css**

In `src/app/globals.css`, add before the `@media (prefers-reduced-motion)` block:

```css
@keyframes pulse-text {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

- [ ] **Step 2: Create loading page**

Create `src/app/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p
        className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]"
        style={{ animation: "pulse-text 1.5s ease-in-out infinite" }}
      >
        [LOADING...]
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/loading.tsx src/app/globals.css
git commit -m "feat: add Nothing-style loading page with pulse animation"
```

---

### Task 3: Not Found Page

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Create not-found page**

Create `src/app/not-found.tsx`:

```tsx
import { Button } from "@/components/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[var(--space-lg)]">
      <h1 className="font-sans text-[72px] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]">
        404
      </h1>
      <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        [PAGE NOT FOUND]
      </p>
      <Link href="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
```

Note: We use `Link` from `next/link` here instead of `TransitionLink` because the not-found page renders outside the normal page transition flow — the `TransitionProvider` context may not be available in error states.

- [ ] **Step 2: Verify by visiting a nonexistent route**

Run: `npm run dev`
Visit: `http://localhost:3000/nonexistent`
Expected: Custom 404 with "404", "[PAGE NOT FOUND]", and "Back to home" button.

- [ ] **Step 3: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: add custom 404 page"
```

---

### Task 4: Error Page

**Files:**
- Create: `src/app/error.tsx`

- [ ] **Step 1: Create error page**

Create `src/app/error.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-[var(--space-lg)]">
      <p className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
        [SYSTEM ERROR]
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          REF: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/error.tsx
git commit -m "feat: add error boundary page"
```

---

### Task 5: SEO — robots.ts and sitemap.ts

**Files:**
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Create robots.ts**

Create `src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://mazzabuilds.com/sitemap.xml",
  };
}
```

- [ ] **Step 2: Create sitemap.ts**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";

const BASE_URL = "https://mazzabuilds.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${BASE_URL}/projects/${project.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...projectRoutes];
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`
Visit: `http://localhost:3000/robots.txt` — should show rules and sitemap URL.
Visit: `http://localhost:3000/sitemap.xml` — should list all pages including each project slug.

- [ ] **Step 4: Commit**

```bash
git add src/app/robots.ts src/app/sitemap.ts
git commit -m "feat: add robots.txt and sitemap.xml generation"
```

---

### Task 6: Per-page Metadata + Root Metadata Enhancements

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/projects/page.tsx`
- Create: `src/components/ui/ContactForm.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/projects/[slug]/page.tsx`

- [ ] **Step 1: Enhance root layout metadata**

In `src/app/layout.tsx`, replace the existing `metadata` export:

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://mazzabuilds.com"),
  title: {
    default: "Mazza Builds",
    template: "%s — Mazza Builds",
  },
  description:
    "Portfolio of Alex Mazza — solo indie developer building iOS apps, Shopify tools, and AI systems",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Mazza Builds",
  },
  twitter: {
    card: "summary_large_image",
  },
};
```

The `title.template` means child pages can export `title: "Projects"` and it renders as "Projects — Mazza Builds".

- [ ] **Step 2: Add metadata to about page**

In `src/app/about/page.tsx`, add after the imports:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Solo indie developer based in the Midwest. I build things from concept to production.",
};
```

- [ ] **Step 3: Add metadata to projects page**

In `src/app/projects/page.tsx`, add after the imports:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Things I've built — from iOS apps to trading bots to AI automation systems",
};
```

- [ ] **Step 4: Extract ContactForm client component**

The contact page is a client component (`"use client"`) which prevents it from exporting static metadata. Extract the form logic into a client sub-component.

Create `src/components/ui/ContactForm.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Textarea, FormStatus } from "@/components/ui";
import { MagneticWrapper, LinkHover } from "@/components/effects";

type FormState = "idle" | "sending" | "sent" | "error";

const directLinks = [
  { label: "Email", href: "mailto:hello@mazzabuilds.com" },
  { label: "GitHub", href: "https://github.com/alexandermazza" },
  { label: "Twitter", href: "https://twitter.com/maboroshi_alex" },
];

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("sending");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setFormState("sent");
        (e.target as HTMLFormElement).reset();
      } else {
        setFormState("error");
        setErrorMessage(data.error || "Something went wrong");
      }
    } catch {
      setFormState("error");
      setErrorMessage("Failed to send");
    }
  }

  return (
    <div className="grid gap-[var(--space-2xl)] md:gap-[var(--space-4xl)] md:grid-cols-[2fr_1fr]">
      {/* Form */}
      <section>
        <form onSubmit={handleSubmit} className="grid gap-[var(--space-2xl)]">
          <Input label="Name" name="name" type="text" required />
          <Input label="Email" name="email" type="email" required />
          <Textarea label="Message" name="message" required />
          <div className="flex items-center gap-[var(--space-lg)]">
            <MagneticWrapper>
              <Button type="submit" disabled={formState === "sending"}>
                {formState === "sending" ? "Sending..." : "Send message"}
              </Button>
            </MagneticWrapper>
            <FormStatus state={formState} errorMessage={errorMessage} />
          </div>
        </form>
      </section>

      {/* Direct links */}
      <section>
        <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
          DIRECT
        </p>
        <div className="flex flex-col gap-[var(--space-md)]">
          {directLinks.map((link) => (
            <LinkHover key={link.label} href={link.href}>
              <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                {link.label}
              </span>
            </LinkHover>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite contact page as server component with metadata**

Replace the entire contents of `src/app/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ScrollTextLines } from "@/components/ui";
import { ContactForm } from "@/components/ui/ContactForm";
import { ScrollLetterAnimation } from "@/components/effects";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch — have a project in mind, want to collaborate, or just say hello",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[960px] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-2xl)] md:py-[var(--space-4xl)]">
      {/* Heading */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollLetterAnimation
          as="h1"
          className="font-sans text-[clamp(36px,8vw,72px)] leading-[0.9] tracking-[-0.03em] text-[var(--text-display)]"
        >
          CONTACT
        </ScrollLetterAnimation>
      </section>

      {/* Intro */}
      <section className="mb-[var(--space-3xl)]">
        <ScrollTextLines className="max-w-[480px] font-sans text-[var(--body)] leading-[1.6] text-[var(--text-secondary)]">
          Have a project in mind, want to collaborate, or just want to say hello? Drop a message below or reach out directly.
        </ScrollTextLines>
      </section>

      <ContactForm />
    </main>
  );
}
```

- [ ] **Step 6: Add generateMetadata to project detail page**

In `src/app/projects/[slug]/page.tsx`, add `generateMetadata` after the existing imports:

```ts
import type { Metadata } from "next";
```

Add this function after the `generateStaticParams` function:

```ts
export async function generateMetadata({
  params,
}: ProjectDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) return {};

  return {
    title: project.name,
    description: project.description,
  };
}
```

- [ ] **Step 7: Verify metadata renders**

Run: `npm run dev`
View page source on each page and confirm:
- `/` — title "Mazza Builds", has og:site_name
- `/projects` — title "Projects — Mazza Builds"
- `/about` — title "About — Mazza Builds"
- `/contact` — title "Contact — Mazza Builds"
- `/projects/daily-roman` — title "Daily Roman — Mazza Builds"

- [ ] **Step 8: Commit**

```bash
git add src/app/layout.tsx src/app/about/page.tsx src/app/projects/page.tsx src/components/ui/ContactForm.tsx src/app/contact/page.tsx src/app/projects/\[slug\]/page.tsx
git commit -m "feat: add per-page metadata and extract ContactForm for server component contact page"
```

---

### Task 7: OG Image

**Files:**
- Create: `public/fonts/SpaceGrotesk-Bold.ttf`
- Create: `public/fonts/SpaceMono-Regular.ttf`
- Create: `src/app/opengraph-image.tsx`

- [ ] **Step 1: Download font files for OG image**

The OG image renderer (`ImageResponse`) can't use `next/font` — it needs raw font data loaded via `fetch` or `fs.readFile`. Download the fonts to `public/fonts/`:

```bash
mkdir -p public/fonts
curl -L -o public/fonts/SpaceGrotesk-Bold.ttf "https://github.com/floriankarsten/space-grotesk/raw/master/fonts/ttf/SpaceGrotesk-Bold.ttf"
curl -L -o public/fonts/SpaceMono-Regular.ttf "https://github.com/googlefonts/spacemono/raw/main/fonts/SpaceMono-Regular.ttf"
```

Verify both files exist and are non-zero size.

- [ ] **Step 2: Create OG image route**

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Mazza Builds — Solo Indie Developer";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  const spaceGroteskBold = await readFile(
    join(process.cwd(), "public/fonts/SpaceGrotesk-Bold.ttf")
  );
  const spaceMonoRegular = await readFile(
    join(process.cwd(), "public/fonts/SpaceMono-Regular.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "72px",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          MAZZA BUILDS
        </div>
        <div
          style={{
            fontFamily: "Space Mono",
            fontSize: "16px",
            fontWeight: 400,
            color: "#999999",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          SOLO INDIE DEVELOPER
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Space Grotesk",
          data: spaceGroteskBold,
          style: "normal",
          weight: 700,
        },
        {
          name: "Space Mono",
          data: spaceMonoRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
```

- [ ] **Step 3: Verify OG image**

Run: `npm run dev`
Visit: `http://localhost:3000/opengraph-image` — should return a 1200x630 PNG with "MAZZA BUILDS" on black background.
View page source on `/` — should have `<meta property="og:image" ...>` pointing to the generated image.

- [ ] **Step 4: Commit**

```bash
git add public/fonts/SpaceGrotesk-Bold.ttf public/fonts/SpaceMono-Regular.ttf src/app/opengraph-image.tsx
git commit -m "feat: add OG image with Space Grotesk and Space Mono"
```

---

### Task 8: Preload Hints for 3D Models

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add preload link tags**

In `src/app/layout.tsx`, add preload links inside the `<head>` of the `<html>` element. In Next.js App Router, you do this by adding a `<head>` element inside the `<html>`:

```tsx
<html
  lang="en"
  className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
>
  <head>
    <link
      rel="preload"
      as="fetch"
      crossOrigin="anonymous"
      href="/models/iphone.glb"
    />
    <link
      rel="preload"
      as="fetch"
      crossOrigin="anonymous"
      href="/models/macbook.glb"
    />
  </head>
  <body className="min-h-full flex flex-col">
    ...
  </body>
</html>
```

`crossOrigin="anonymous"` is required because Three.js loaders use CORS fetch.

- [ ] **Step 2: Verify preload**

Run: `npm run dev`
Open DevTools Network tab on `/`. The `.glb` files should appear early in the waterfall with "preload" as the initiator, before the React Three Fiber bundle requests them.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: preload 3D model files for faster initial render"
```

---

### Task 9: Image Optimization Prep

**Files:**
- Modify: `src/app/projects/[slug]/page.tsx`

- [ ] **Step 1: Add next/image import and update screenshot section**

In `src/app/projects/[slug]/page.tsx`, add the Image import:

```ts
import Image from "next/image";
```

Replace the screenshots section (the `{project.images.length > 0 && (...)}` block) with:

```tsx
{/* Screenshots */}
{project.images.length > 0 && (
  <section className="mb-[var(--space-3xl)]">
    <p className="mb-[var(--space-lg)] font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
      SCREENSHOTS
    </p>
    <ScrollGridAnimation
      variant="fade-up"
      className="grid grid-cols-1 gap-[var(--space-md)] sm:grid-cols-2"
    >
      {project.images.map((src, i) => (
        <div
          key={i}
          className="relative aspect-[16/10] overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Image
            src={src}
            alt={`${project.name} screenshot ${i + 1}`}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            {...(i === 0 ? { priority: true } : {})}
          />
          {/* Placeholder overlay — remove when real images are added */}
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-raised)]">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-disabled)]">
              [SCREENSHOT {String(i + 1).padStart(2, "0")}]
            </span>
          </div>
        </div>
      ))}
    </ScrollGridAnimation>
  </section>
)}
```

The `<Image>` with `fill` + `sizes` is ready for when real screenshots are dropped into `public/projects/`. The placeholder overlay sits on top and can be removed by deleting the `<div className="absolute inset-0 ...">` block once images exist.

First image gets `priority` for above-the-fold loading. Remaining images lazy-load by default.

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: No TypeScript or build errors. The `<Image>` components will 404 for missing images at runtime but won't break the build.

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/\[slug\]/page.tsx
git commit -m "feat: prep project screenshots with next/image optimization"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Clean build with no errors. Check for any TypeScript warnings.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`

Check each page:
- `/` — Footer visible, no duplicate attribution, preload links in source
- `/projects` — Footer visible, metadata in source
- `/projects/daily-roman` — Footer visible, dynamic title in source, screenshot placeholders with Image components
- `/about` — Footer visible, metadata in source
- `/contact` — Footer visible, form still works, metadata in source
- `/nonexistent` — Custom 404 page renders
- `/robots.txt` — Shows rules
- `/sitemap.xml` — Lists all routes
- `/opengraph-image` — Returns PNG

- [ ] **Step 4: Commit any final fixes if needed**
