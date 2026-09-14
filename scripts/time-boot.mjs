import { chromium } from "playwright";
const TARGET = process.argv[2] || "http://localhost:3123/";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(`
  window.__marks = {};
  document.addEventListener('DOMContentLoaded', () => { window.__marks.dcl = performance.now(); });
`);
await page.goto(TARGET, { waitUntil: "commit", timeout: 90000 });
// Poll until the boot overlay is gone.
const hidden = await page.evaluate(async () => {
  const t0 = performance.now();
  for (;;) {
    const el = document.querySelector("[data-boot-overlay]");
    if (el) {
      const s = getComputedStyle(el);
      if (s.display === "none" || parseFloat(s.opacity) < 0.05) {
        return { ms: performance.now() - t0, effectStart: window.__bootEffectAt ?? null };
      }
    }
    if (performance.now() - t0 > 40000) return { ms: -1 };
    await new Promise((r) => setTimeout(r, 50));
  }
});
console.log("boot overlay hidden after", Math.round(hidden.ms), "ms from navigation");
const warn = await page.evaluate(() => window.__sawSafetyWarning ?? "n/a");
console.log("safety warning seen:", warn);
await browser.close();
