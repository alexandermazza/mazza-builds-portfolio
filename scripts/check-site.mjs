/**
 * End-to-end site checks, run against a production build.
 *
 *   npm run build && npx next start -p 3000
 *   node scripts/check-site.mjs [baseUrl=http://localhost:3000] [group...]
 *
 * Every scripts/checks/<group>.mjs is a group: its default export is
 * `async ({ launch, base, helpers }) => void` and it throws to fail, with a
 * message that names the route. With no group names, every group runs.
 * Exits 1 if any group fails.
 *
 * Helpers (also importable from this file):
 *   openPage(url, { phone, js, webgl, reducedMotion, ...contextOptions })
 *     -> { page, errors, response }. url may be a path, resolved against base.
 *     phone: 390x844 touch, else 1440x900. js: false disables JavaScript.
 *     webgl: false launches Chromium with --disable-3d-apis.
 *     reducedMotion: "reduce" | "no-preference". Other keys go to newContext.
 *     errors collects { kind: "pageerror" | "console", text, url }.
 *     Google Analytics requests are answered empty, so runs never count as visits.
 *     Contexts are closed when the group finishes.
 *   assertNoOverflow(page)        at most innerWidth wide
 *   expectNoErrors(errors, route) no page errors and no console errors
 *   launch({ webgl })             the shared Browser, for custom contexts
 */
import { readdirSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const DESKTOP = { width: 1440, height: 900 };
export const PHONE = { width: 390, height: 844 };
const ANALYTICS = /^https:\/\/([\w-]+\.)*(googletagmanager|google-analytics)\.com\//;

let base = "http://localhost:3000";
const browsers = new Map();
const contexts = new Set();

export function launch({ webgl = true } = {}) {
  const key = webgl ? "webgl" : "no-webgl";
  if (!browsers.has(key)) {
    const args = webgl
      ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"]
      : ["--disable-3d-apis"];
    browsers.set(key, chromium.launch({ args }));
  }
  return browsers.get(key);
}

export async function openPage(
  url,
  { phone = false, js = true, webgl = true, reducedMotion = "no-preference", ...contextOptions } = {},
) {
  const target = new URL(url, base);
  const browser = await launch({ webgl });
  const context = await browser.newContext({
    viewport: phone ? PHONE : DESKTOP,
    ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    javaScriptEnabled: js,
    reducedMotion,
    ...contextOptions,
  });
  contexts.add(context);
  context.on("close", () => contexts.delete(context));
  // check runs must not count as visits in Google Analytics
  await context.route(ANALYTICS, (route) => route.fulfill({ status: 200, body: "" }));

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push({ kind: "pageerror", text: e.message, url: page.url() }));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push({ kind: "console", text: m.text(), url: m.location().url });
  });

  const response = await page.goto(target.href, { waitUntil: "load" });
  if (js) {
    // clicks before hydration do nothing, so wait until React owns the layout
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector("[data-transition-container]");
          return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber"));
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {
        throw new Error(`${target.pathname}: page never hydrated`);
      });
  }
  return { page, errors, response };
}

export async function assertNoOverflow(page) {
  // clientWidth, not innerWidth: phone emulation widens innerWidth to fit wide content, so that never fails
  const { sw, iw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: document.documentElement.clientWidth,
  }));
  if (sw > iw) {
    throw new Error(`${new URL(page.url()).pathname}: page is ${sw}px wide in a ${iw}px viewport`);
  }
}

export function expectNoErrors(errors, route) {
  if (errors.length) {
    const list = errors.map((e) => `[${e.kind}] ${e.text}${e.url ? ` (${e.url})` : ""}`).join("\n  ");
    throw new Error(`${route}: ${errors.length} error(s)\n  ${list}`);
  }
}

export const helpers = { openPage, assertNoOverflow, expectNoErrors, launch };

async function main() {
  const args = process.argv.slice(2);
  if (args[0]?.includes("://")) base = args.shift().replace(/\/$/, "");

  const dir = new URL("./checks/", import.meta.url);
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => f.slice(0, -4))
    .sort();
  const unknown = args.filter((g) => !all.includes(g));
  if (unknown.length) {
    console.error(`unknown group: ${unknown.join(", ")} (have: ${all.join(", ")})`);
    process.exit(1);
  }

  let failed = 0;
  for (const name of args.length ? args : all) {
    try {
      const { default: run } = await import(new URL(`${name}.mjs`, dir).href);
      await run({ launch, base, helpers });
      console.log(`${name}: OK`);
    } catch (e) {
      failed++;
      console.log(`${name}: FAIL ${e instanceof Error ? e.message : e}`);
    } finally {
      await Promise.all([...contexts].map((c) => c.close().catch(() => {})));
    }
  }
  await Promise.all([...browsers.values()].map(async (b) => (await b).close()));
  process.exit(failed ? 1 : 0);
}

// no top-level await: group files import this module, and a TLA cycle would deadlock
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
