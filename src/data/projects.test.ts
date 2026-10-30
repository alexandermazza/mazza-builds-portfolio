import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { projects, projectsByHalf, nextProject } from "./projects.ts";

const slugs = (list: { slug: string }[]) => list.map((p) => p.slug);
const DAY = ["distill", "path", "roi-calculator", "pipeline-attribution", "event-hub", "web-tracker-scanner", "vendor-fingerprint", "persona-automator", "trailmix", "semrush-enricher", "event-attributor"];
const NIGHT = ["secondround", "daily-roman", "kalshi-trader", "shopify-app", "shakedown", "kalshi-mcp", "f1-globe"];

test("projects has 18 entries with unique slugs", () => {
  assert.equal(projects.length, 18);
  assert.equal(new Set(slugs(projects)).size, 18);
});

test("day order is distill, path, roi-calculator, pipeline-attribution, event-hub, web-tracker-scanner, vendor-fingerprint, persona-automator, trailmix, semrush-enricher, event-attributor", () => {
  assert.deepEqual(slugs(projectsByHalf("day")), DAY);
});

test("night order is secondround, daily-roman, kalshi-trader, shopify-app, shakedown, kalshi-mcp, f1-globe", () => {
  assert.deepEqual(slugs(projectsByHalf("night")), NIGHT);
});

test("story strings are non-empty and contain no em dash", () => {
  for (const p of projects) {
    const strings = [p.name, p.kind, p.line, p.what, p.why, p.impact, p.context, p.build, p.result, ...(p.stat ?? []), ...(p.link ?? [])];
    for (const s of strings) {
      assert.ok(s.trim().length > 0, `${p.slug} has an empty story string`);
      assert.ok(!s.includes("\u2014"), `${p.slug} has an em dash: ${s}`);
    }
  }
});

test("every stencil, image, video and poster path exists under public/", () => {
  const publicDir = fileURLToPath(new URL("../../public", import.meta.url));
  for (const p of projects) {
    const paths = [p.mark.type === "stencil" ? p.mark.src : undefined, p.image, p.video, p.poster];
    for (const src of paths) {
      if (src === undefined) continue;
      assert.ok(src.startsWith("/"), `${p.slug}: ${src} is not a root path`);
      assert.ok(existsSync(publicDir + src), `${p.slug}: public${src} is missing`);
    }
  }
});

test("each half fills whole bento rows", () => {
  const CELLS = { xl: 4, wide: 2, tall: 2, sm: 1 };
  for (const half of ["day", "night"] as const) {
    const sum = projectsByHalf(half).reduce((n, p) => n + CELLS[p.bento], 0);
    // 4 columns on desktop, 2 on phones: any multiple of 4 leaves no gap at the end
    assert.equal(sum % 4, 0, `${half} fills ${sum} cells, not whole rows`);
  }
});

test("nextProject walks all 18, crosses from event-attributor to secondround, and wraps from f1-globe to distill", () => {
  assert.equal(nextProject("event-attributor").slug, "secondround");
  assert.equal(nextProject("f1-globe").slug, "distill");
  const walk = ["distill"];
  while (walk.length < 18) walk.push(nextProject(walk[walk.length - 1]).slug);
  assert.deepEqual(walk, [...DAY, ...NIGHT]);
  assert.equal(nextProject("f1-globe").slug, walk[0]);
});

test("the five proprietary screenshots are gone", () => {
  for (const slug of ["event-hub", "pipeline-attribution", "trailmix", "vendor-fingerprint", "semrush-enricher"]) {
    assert.equal(projects.find((p) => p.slug === slug)!.image, undefined, `${slug} still has an image`);
  }
});
