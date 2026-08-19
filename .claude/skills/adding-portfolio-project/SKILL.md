---
name: adding-portfolio-project
description: Use when adding a new project to this portfolio (the Mazza Builds site). Trigger when the user has dropped a logo plus an optional screen recording or screenshots into public/projects/ and wants it wired into the homepage showcase, the projects page work/play list, and its own detail page.
---

# Adding a Portfolio Project

## Overview

A new project is one append to `src/data/projects.ts` plus one slug in `src/app/projects/page.tsx`. The data drives everything: the homepage 3D showcase, the work/play projects page, and the `/projects/<slug>` detail page all read the `projects` array. There is no per-page work to do.

## Step 0 — Preflight: do the assets exist?

The user drops assets into `public/projects/<folder>/` first. Before asking anything, `ls` that folder and confirm:

- **Required:** at least one image to put on the device screen (a logo or a real UI screenshot).
- **Optional:** a screen recording (any format) for the detail page, and/or extra screenshots.

If the folder or a usable image is missing, stop and tell the user what to add. Don't invent assets. (If the folder is absent entirely, it's usually a typo in the slug or assets dropped in the wrong directory - check before asking.)

Folder names and dropped filenames often have **spaces** (e.g. `FP Events Logo.png`, `Screen Recording … .mov`). Quote paths and normalize filenames in Step 2.

## Step 1 — Ask the user three things

1. **Where** — Work or Play? (It goes at the **bottom** of the list either way — newest last.)
2. **Name** — display name (e.g. "Event Hub"). The **slug** is the kebab-case folder name under `public/projects/`.
3. **What to reference** — a GitHub repo (`owner/name`) and/or live URL. The repo README is the source for the description.

## Step 2 — Normalize the assets

In `public/projects/<slug>/`:

- Rename the logo/screenshot to `logo.png` (or `screen.png` for a real UI shot).
- Rename extra screenshots to `image-01.png`, `image-02.png`, …
- Rename + **compress** any video to `video.mp4`. Source recordings are often 50-100MB `.mov`; siblings are 2-10MB. The detail page autoplays muted, so drop audio:

```bash
ffmpeg -y -i "<source>.mov" -vf "scale=1280:-2,fps=30" \
  -c:v libx264 -crf 28 -preset medium -an -movflags +faststart \
  -pix_fmt yuv420p video.mp4
```

Then delete the original recording. Verify the result is single-digit MB (`du -h video.mp4`). Treat ~10MB as the ceiling before committing; if it's heavier, raise `-crf` to 30-32 or trim the clip.

## Step 3 — Write the copy from the reference

Read the repo README (private repos: `gh repo view <owner>/<name>`; languages: `gh api repos/<owner>/<name>/languages`). Write three fields in the **same voice and length** as existing entries:

- `context` — the problem, 2-3 sentences.
- `build` — what it is and the engineering decisions worth calling out, ~4-6 sentences.
- `result` — where it landed (live / in progress) and the payoff.
- `description` — one sentence; this shows on the cards.
- `tags` — 3-4, drawn from the actual stack. Use the house names the codebase already uses: the Anthropic SDK is tagged `Claude API`, not `@anthropic-ai/sdk`. Match the casing of existing tags.
- `status` — `LIVE` once it's deployed and used, even if it's an internal-only / auth-gated tool (matches event-hub, event-attributor). `IN PROGRESS` only if it isn't shipped yet.

No em dashes anywhere (project rule). Don't fabricate; if the README doesn't say it, leave it out.

## Step 4 — Append the entry to `src/data/projects.ts`

Add as the **last** array element. `issueNumber` = current max + 1. (Issue numbers are not strictly chronological: array position = issue number, and the top of the array is manually pinned for promotion - SecondRound (1, flagship, surfaced separately by `SpotlightSection`), then AI Web Tracker Scanner, Pipeline Attribution Agent, and Persona Automator. Leave those where they are and append everything else after them. If the user asks to reorder, renumber so issue numbers stay sequential.) Match this shape:

```ts
{
  slug: "event-hub",
  issueNumber: 14,
  name: "Event Hub",
  description: "...",        // one sentence, shown on cards
  context: "...",
  build: "...",
  result: "...",
  tags: ["Next.js", "TypeScript", "SQLite", "HubSpot"],
  status: "LIVE",            // "LIVE" | "IN PROGRESS" | "ARCHIVED"
  screenshot: "/projects/event-hub/logo.png",
  video: "/projects/event-hub/video.mp4",   // omit if no video
  images: [],                                // ["/projects/<slug>/image-01.png", ...]
  links: [],                                 // see convention below
  deviceType: "laptop",                      // "laptop" | "phone"
  screenTexture: "/projects/event-hub/logo.png",
  screenBgColor: "#FFFFFF",                  // logo-on-white only
  screenTextureScale: 0.6,                   // logo-on-white only
  logo: "/projects/event-hub/logo.png",      // 32px card icon on the projects page; same mark as the device
  // logoBgColor: "#000000",                 // only for transparent marks that need a dark ground
},
```

`logo` should be a tight square mark (not a full-bleed UI screenshot). If the device shows a UI screenshot, point `logo` at the project's actual logo file instead.

`screenshot` is the card / gallery image; `screenTexture` is what's mapped onto the 3D device on the homepage. They're almost always the same file.

### Picking the device + screen fields

| Asset on the device | deviceType | screenTexture | screenBgColor | screenTextureScale |
|---|---|---|---|---|
| Logo (transparent/centered) | `laptop` | the logo | `"#FFFFFF"` | `0.6` to start, tune down if it overflows |
| Real full-bleed UI screenshot | `laptop` | the screenshot | omit | omit |
| iOS app | `phone` | the screenshot | omit | omit |

The user's MacBook-with-white-screen request = the logo-on-white row.

### Detail-page media

- One screen recording → `video: "/projects/<slug>/video.mp4"` (plays full-width for laptops, half-width for phones). Like Daily Roman.
- Multiple recordings → `videos: ["…", "…"]`. Like ShopAI.
- Stills → `images: ["…", …]`.

### Links convention

Internal/private tools (private repo, auth-gated site) default to `links: []` — a link that 404s or walls out a recruiter is worse than none. Public projects link `Live` and/or `Source`. This is a judgment call, not absolute: `pipeline-attribution` links its private `Source` anyway. Default to `[]` for gated/internal tools and confirm with the user.

## Step 5 — Wire the category

If **Work**, add the slug to `WORK_SLUGS` in `src/app/projects/page.tsx`. Play needs nothing (it's the default). This is a second source of truth — forgetting it silently drops the project into Play.

## Step 6 — Verify

```bash
npx tsc --noEmit            # there is no "typecheck" npm script
```

Offer the user a visual check via `npm run build && npm run start` (Turbopack cache is flaky, so avoid `npm run dev` for verification). Don't drive a browser yourself — the user checks.

## Common mistakes

| Mistake | Fix |
|---|---|
| Committing a 90MB `.mov` | Always compress to `video.mp4` first (Step 2). |
| Project lands in Play | Add slug to `WORK_SLUGS` (Step 5). |
| Logo looks tiny/huge on the laptop | Tune `screenTextureScale` (0.5-0.6 is the working range). |
| Logo on a dark screen | Set `screenBgColor: "#FFFFFF"`. |
| Paths break on filenames with spaces | Rename to `logo.png` / `video.mp4` (Step 2). |
| Em dashes in copy | Project rule: never. Use hyphens or rephrase. |
| Made-up metrics/claims | Only state what the README/source supports. |
