/**
 * Resilience check for the homepage reveal.
 *
 * The hero is hidden behind a full-screen opaque boot overlay and every
 * section ships at opacity:0. Only client-side GSAP makes any of it visible.
 * That means a single client-side failure turns the whole site into a
 * permanent black screen - which is what a recruiter reported.
 *
 * This script asserts the site stays readable in three environments:
 *   1. a normal browser                  (the happy path)
 *   2. a browser where storage is blocked (sessionStorage access throws)
 *   3. a browser with JavaScript disabled
 *
 * Usage:
 *   node scripts/check-resilience.mjs [url]
 *   node scripts/check-resilience.mjs http://localhost:3000/
 */
import { chromium } from "playwright";

const TARGET = process.argv[2] || "https://mazzabuilds.com/";

// Reproduces a locked-down browser / corporate policy where reading
// sessionStorage throws SecurityError instead of returning null.
const POISON_STORAGE = `
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get() { throw new DOMException('The operation is insecure.', 'SecurityError'); }
  });
`;

async function check(label, { poison = false, js = true } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ javaScriptEnabled: js });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).split("\n")[0]));
  if (poison) await page.addInitScript(POISON_STORAGE);

  await page.goto(TARGET, { waitUntil: "load", timeout: 90000 });
  // Well past the ~11s boot animation, its safety deadline, and the 6s
  // no-JS watchdog - so a failure here means stuck, not merely slow.
  await page.waitForTimeout(22000);

  const state = await page.evaluate(() => {
    const h1 = [...document.querySelectorAll("h1")].find((el) =>
      el.textContent.replace(/\s+/g, " ").includes("MAZZA BUILDS")
    );
    if (!h1) return { found: false };
    const firstSpan = h1.querySelector("span");
    const spanOpacity = firstSpan
      ? getComputedStyle(firstSpan).opacity
      : getComputedStyle(h1).opacity;
    // Is a full-screen opaque overlay still covering the page?
    const overlay = [...document.querySelectorAll("div")].find((el) => {
      const s = getComputedStyle(el);
      return (
        s.position === "fixed" &&
        parseInt(s.zIndex, 10) >= 9999 &&
        s.display !== "none" &&
        parseFloat(s.opacity) > 0.5 &&
        el.getBoundingClientRect().height >= window.innerHeight * 0.9
      );
    });
    return {
      found: true,
      spanOpacity,
      overlayCovering: Boolean(overlay),
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });

  const readable =
    state.found && !state.overlayCovering && parseFloat(state.spanOpacity) > 0.1;

  console.log(`\n[${label}]`);
  console.log("  hero visible to visitor :", readable ? "YES" : "NO  <-- BLACK SCREEN");
  console.log("  details                 :", JSON.stringify(state));
  if (errors.length) console.log("  page errors             :", errors.slice(0, 3).join(" | "));

  await browser.close();
  return readable;
}

const results = {
  "normal browser": await check("BASELINE (normal browser)"),
  "storage blocked": await check("STORAGE BLOCKED (sessionStorage throws)", { poison: true }),
  "javascript disabled": await check("NO JAVASCRIPT", { js: false }),
};

console.log("\n================ SUMMARY ================");
console.log("target:", TARGET);
for (const [name, ok] of Object.entries(results)) {
  console.log(`  ${name.padEnd(22)}: ${ok ? "OK" : "BROKEN"}`);
}

const failed = Object.values(results).filter((ok) => !ok).length;
process.exit(failed > 0 ? 1 : 0);
